/* Shared behaviour for every page: the mobile navigation toggle and the copy
   buttons on code blocks. Vanilla JS, no build step, no dependencies. Product
   pages keep their own app.js for things only they have. */

(() => {
  'use strict';

  // ---- Mobile navigation ----------------------------------------------------
  // The stylesheet only collapses the menu when <html> carries the `js` class,
  // which each page adds inline in <head>; this script just drives the toggle.
  const head = document.querySelector('.site-head');
  const toggle = head && head.querySelector('.nav-toggle');
  if (head && toggle) {
    const setOpen = (open) => {
      head.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    toggle.addEventListener('click', () => setOpen(!head.classList.contains('open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', (e) => { if (!head.contains(e.target)) setOpen(false); });
    window.matchMedia('(min-width: 861px)').addEventListener('change', () => setOpen(false));
  }

  // ---- Copy buttons on code blocks -------------------------------------------
  // Say "failed" rather than "copied" when the clipboard is blocked (insecure
  // origins, some browser settings), so the label never lies.
  document.querySelectorAll('.codeblock').forEach((block) => {
    const button = block.querySelector('.copy');
    const code = block.querySelector('pre');
    if (!button || !code) return;
    const idle = button.textContent;
    let timer = 0;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent.replace(/\s+$/, ''));
        button.textContent = 'Copied';
        button.dataset.state = 'done';
      } catch {
        button.textContent = 'Copy failed';
        button.dataset.state = 'fail';
      }
      clearTimeout(timer);
      timer = setTimeout(() => { button.textContent = idle; delete button.dataset.state; }, 1800);
    });
  });
})();
