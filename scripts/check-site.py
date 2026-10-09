"""Check the static site's local links, article anchors, and navigation."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, urljoin, unquote
import re
import sys
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
pages = sorted(p for p in root.rglob('*.html') if not any(part in {'batch-size-blog','node_modules','.git'} for part in p.relative_to(root).parts))
errors = []

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path, self.ids, self.refs, self.nav_links = path, set(), [], 0
        self.brands, self.stylesheets = [], []
        self.footer_count = 0
        self.nav_depth = 0
        self.feed(path.read_text())
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'footer': self.footer_count += 1
        if a.get('id'):
            if a['id'] in self.ids: errors.append(f'{self.path.relative_to(root)}: duplicate ID {a["id"]}')
            self.ids.add(a['id'])
        if tag == 'nav' and a.get('aria-label') == 'Main navigation': self.nav_depth = 1
        elif self.nav_depth and tag == 'nav': self.nav_depth += 1
        if self.nav_depth and tag == 'a': self.nav_links += 1
        if tag == 'a' and 'site-brand' in a.get('class', '').split(): self.brands.append(a.get('href', ''))
        if tag == 'link' and 'stylesheet' in a.get('rel', '').split(): self.stylesheets.append(a.get('href', ''))
        for attribute in ('href','src'):
            if a.get(attribute): self.refs.append(a[attribute])
        if tag == 'meta' and a.get('http-equiv', '').lower() == 'refresh':
            redirect = re.match(r'[0-9]+\s*;\s*url=(.*)', a.get('content', ''), re.I)
            if redirect: self.refs.append(redirect.group(1))
    def handle_endtag(self, tag):
        if tag == 'nav' and self.nav_depth: self.nav_depth -= 1

parsed = {path:Page(path) for path in pages}
def local_target(path, reference):
    url = urlsplit(reference)
    if url.scheme or url.netloc: return None
    target = root / unquote(url.path.lstrip('/')) if url.path.startswith('/') else path.parent / unquote(url.path) if url.path else path
    target = target.resolve()
    return target / 'index.html' if target.is_dir() else target

for path,page in parsed.items():
    if page.nav_links != 3: errors.append(f'{path.relative_to(root)}: expected three primary navigation links, found {page.nav_links}')
    if [local_target(path, href) for href in page.brands] != [root / 'index.html']:
        errors.append(f'{path.relative_to(root)}: the header must link to the main homepage')
    stylesheets = [local_target(path, href) for href in page.stylesheets]
    required_styles = [root / 'css/site.css']
    if path == root / 'lab/research/index.html': required_styles.append(root / 'css/research.css')
    if path == root / 'blog/batch-size/index.html': required_styles.append(root / 'css/interactive-shell.css')
    if path == root / 'blog/batch-size/index.html' and page.footer_count:
        errors.append('The website copy of the batch-size article must not contain a footer')
    for stylesheet in required_styles:
        if stylesheets.count(stylesheet) != 1:
            errors.append(f'{path.relative_to(root)}: expected one link to {stylesheet.relative_to(root)}')
    for reference in page.refs:
        url = urlsplit(reference)
        if url.scheme or url.netloc: continue
        target = (root/url.path.lstrip('/')) if url.path.startswith('/') else (path.parent/url.path) if url.path else path
        target = target.resolve()
        if target.is_dir(): target = target/'index.html'
        if not target.is_file():
            errors.append(f'{path.relative_to(root)}: missing {reference}')
            continue
        # Local files do not have a web-server root or directory index routing.
        file_url = urlsplit(urljoin(path.as_uri(), reference))
        file_target = Path(unquote(file_url.path)).resolve()
        if file_target != target or not file_target.is_file():
            errors.append(f'{path.relative_to(root)}: link fails when opened as a file: {reference}')
        # Relative links must also work when hosted beneath a URL prefix.
        relative_page = path.relative_to(root).as_posix()
        for web_path in (relative_page, relative_page.removesuffix('index.html')):
            web_url = urlsplit(urljoin('https://preview.invalid/site/' + web_path, reference))
            if not web_url.path.startswith('/site/'):
                errors.append(f'{path.relative_to(root)}: link escapes the hosted site folder: {reference}')
                continue
            web_target = (root / unquote(web_url.path.removeprefix('/site/'))).resolve()
            if web_target.is_dir(): web_target = web_target / 'index.html'
            if web_target != target:
                errors.append(f'{path.relative_to(root)}: hosted link resolves incorrectly: {reference}')
        if url.fragment and target in parsed and unquote(url.fragment) not in parsed[target].ids:
            errors.append(f'{path.relative_to(root)}: missing anchor {reference}')

feed = ET.parse(root/'feed.xml').getroot()
for link in feed.iter('{http://www.w3.org/2005/Atom}link'):
    url = urlsplit(link.attrib['href'])
    if url.scheme != 'https' or url.netloc != 'sadhikamalladi.github.io': errors.append('Feed contains an invalid URL: '+link.attrib['href'])
ET.parse(root/'sitemap.xml')
if errors:
    print('\n'.join(errors))
    sys.exit(1)
print(f'PASS: {len(pages)} HTML pages, shared stylesheet links, one homepage destination, file and hosted paths, redirects, article anchors, navigation, feed, and sitemap.')
