# Malladi Lab and Sadhika Malladi

A plain HTML website. Pages are served as written; no Jekyll or build step is required.

## Preview locally

From this folder, run:

```sh
python3 scripts/preview.py
```

Open `http://127.0.0.1:8765/` for the homepage. The preview server disables browser caching so edits appear on reload.

You can also open `index.html` directly in Safari or another browser. Pages load their formatting from shared CSS files through relative links. Images and navigation use relative paths, including explicit `index.html` links between pages.

## Site structure

- `/lab/`: compatibility redirect to the homepage.
- `/lab/research/`: research themes and selected publications.
- `/lab/about/`: group introduction, founder profile, and recruitment links.
- `/blog/`: research essays and interactive articles, with a link to Under the Assumptions on Substack.
- `/blog/batch-size/`: compatibility redirect to <https://batch-size-scaling.com/>. The Writing page links directly to the external article.
- `/`: the homepage, with Sadhika's bio and links to the other pages.
- Existing publication, recruitment, teaching, and dated post URLs remain available.

`css/site.css` holds the shared visual design, and `css/research.css` holds the research page's compact layout. Pages link directly to these files; no build or synchronization step is required. Every Malladi Lab header links back to the main homepage.

The three primary navigation links are Research, Writing, and About. Headers and footers are ordinary HTML so they work without JavaScript. The writing archive contains research posts and works without JavaScript. Existing mathematical articles use locally bundled KaTeX, and retain their original pre-rendered equations and figures. The site checker verifies both direct-file links and hosted links, including hosting beneath a subfolder.

## Adding a post

Write an HTML page in `blog/<year>/<month>/<day>/<slug>/index.html`. Use an existing post as a page template, keep the shared navigation and stylesheet, and set its title, description, and canonical URL. Put its images and other assets in a dedicated folder. Add its link, date, authors, and summary to `blog/index.html`, and update `feed.xml` and `sitemap.xml`. Externally hosted articles can be linked directly from the Writing page without copying their files into this repository.

The batch-size article is hosted at <https://batch-size-scaling.com/> and is maintained in <https://github.com/dangxingyu/batch-size-blog>. The original cloned repository in `batch-size-blog/` is a local reference and is excluded from this repository. Vendor code is excluded from formatting.

## Check changes

```sh
python3 scripts/check-site.py
git diff --check
```

Inspect the relevant desktop and phone layouts, and test any changed interactive figure. GitHub Pages publishes this repository's `master` branch. Publishing requires the owner's explicit instruction.

## Restore the previous site

A complete checkpoint of the site before the redesign, including the existing uncommitted recruitment edit, is saved outside the website:

`/Users/sadhika/.codex/visualizations/2026/10/07/01a11743-20c2-7633-bf80-e813efd8f6bf/website-before-redesign/`

To verify the checkpoint without restoring anything:

```sh
python3 /Users/sadhika/.codex/visualizations/2026/10/07/01a11743-20c2-7633-bf80-e813efd8f6bf/website-before-redesign/restore.py
```

Add `--apply` only when a restore is wanted. The restore first saves current files in a recovery archive, then restores the exact original files and removes only files added by this redesign. It leaves the cloned reference repository and Git history untouched. The checkpoint manifest records checksums and the original Git status. Its restoration was checked in a separate temporary directory.
