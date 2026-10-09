/* Native anchor navigation with a responsive outline and citation sidenotes. */
'use strict';
(function () {
  const layout = document.querySelector('.article-layout');
  if (!layout) return;
  const content = layout.querySelector('.article-content');
  const rail = layout.querySelector('.article-sidenotes');
  const disclosure = layout.querySelector('.article-outline-disclosure');
  const outline = [...layout.querySelectorAll('a[data-outline]')].map(link => ({
    link,
    section: document.getElementById(link.hash.slice(1))
  })).filter(item => item.section);
  const notes = rail ? [...rail.querySelectorAll('.citation-note[data-citation]')].map(note => {
    const placeholder = document.createComment(`Sidenote ${note.id}`);
    note.before(placeholder);
    return { note, placeholder, citation: document.getElementById(note.dataset.citation) };
  }) : [];
  const memos = [...layout.querySelectorAll('.widget-memo')];
  const wide = matchMedia('(min-width: 1280px)');
  const inlineLists = new Map();
  let mode, layoutFrame = 0, outlineFrame = 0, currentSection;

  function updateOutline() {
    outlineFrame = 0;
    if (!outline.length) return;
    const boundary = Math.min(140, Math.max(72, innerHeight * .15));
    let current = outline[0];
    for (const item of outline) {
      if (item.section.getBoundingClientRect().top <= boundary) current = item;
    }
    if (current.section === currentSection) return;
    currentSection = current.section;
    for (const item of outline) {
      const active = item === current;
      item.link.classList.toggle('active', active);
      if (active) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    }
  }

  function updateHashHighlight() {
    const target = document.getElementById(location.hash.slice(1));
    for (const { note, citation } of notes) {
      const selected = target === note || target === citation;
      note.classList.toggle('is-highlighted', selected);
      citation?.classList.toggle('is-highlighted', selected);
    }
  }

  function restoreNotes() {
    for (const { note, placeholder } of notes) {
      placeholder.after(note);
    }
    for (const list of inlineLists.values()) list.remove();
    inlineLists.clear();
    if (rail) rail.hidden = false;
  }

  function placeInlineNotes() {
    for (const { note, citation } of notes) {
      note.style.removeProperty('top');
      if (!citation) continue;
      const host = citation.closest('p') || citation.closest('span.small-text') || citation.closest('.small-text');
      if (!host || !content?.contains(host)) continue;
      let list = inlineLists.get(host);
      if (!list) {
        list = document.createElement('ol');
        list.className = 'inline-sidenotes';
        host.after(list);
        inlineLists.set(host, list);
      }
      list.append(note);
    }
    if (rail) {
      rail.style.removeProperty('min-height');
      rail.hidden = notes.length > 0 && notes.every(({ note }) => !rail.contains(note));
    }
  }

  function arrange() {
    layoutFrame = 0;
    const desktop = wide.matches;
    if (mode !== desktop) {
      mode = desktop;
      if (disclosure) disclosure.open = desktop;
      if (desktop) restoreNotes();
      else placeInlineNotes();
    }
    if (desktop && rail) {
      const origin = rail.getBoundingClientRect().top;
      // Keep citations clear of the invitations anchored beside their widgets.
      const reserved = memos.map(memo => {
        const rect = memo.getBoundingClientRect();
        return { top: rect.top - origin, bottom: rect.bottom - origin };
      }).sort((a, b) => a.top - b.top);
      let bottom = 0;
      for (const { note, citation } of notes) {
        const noteHeight = note.getBoundingClientRect().height;
        let top = Math.max(0, citation ? citation.getBoundingClientRect().top - origin : bottom, bottom);
        for (const space of reserved) {
          if (top < space.bottom + 20 && top + noteHeight + 20 > space.top) top = space.bottom + 20;
        }
        const offset = `${Math.round(top)}px`;
        if (note.style.top !== offset) note.style.top = offset;
        bottom = top + noteHeight + 20;
      }
      const height = `${Math.ceil(Math.max(bottom, ...reserved.map(space => space.bottom)))}px`;
      if (rail.style.minHeight !== height) rail.style.minHeight = height;
    }
    updateOutline();
  }

  function scheduleLayout() {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(arrange);
  }
  function scheduleOutline() {
    if (!outlineFrame) outlineFrame = requestAnimationFrame(updateOutline);
  }
  addEventListener('scroll', scheduleOutline, { passive: true });
  addEventListener('resize', scheduleLayout, { passive: true });
  addEventListener('hashchange', () => { updateHashHighlight(); scheduleOutline(); });
  wide.addEventListener('change', scheduleLayout);
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(scheduleLayout);
    if (content) observer.observe(content);
    notes.forEach(({ note }) => observer.observe(note));
    memos.forEach(memo => observer.observe(memo));
  }
  document.fonts?.ready.then(scheduleLayout);
  layout.classList.add('notes-ready');
  arrange();
  updateHashHighlight();
})();
