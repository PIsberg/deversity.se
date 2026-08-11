/* Vanilla JavaScript for the VibeTags page. No build step, no dependencies. */

document.addEventListener('DOMContentLoaded', () => {

  // Header: soften the border until the page scrolls.
  const header = document.getElementById('site-header');
  const onScroll = () => {
    header.style.boxShadow = window.scrollY > 8 ? '0 4px 20px rgba(0,0,0,0.45)' : 'none';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Code blocks: copy on click of an injected button.
  document.querySelectorAll('.code-block').forEach((block) => {
    const button = document.createElement('button');
    button.textContent = 'copy';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    button.style.cssText = [
      'position:absolute', 'top:8px', 'right:8px', 'font:600 0.7rem ui-monospace,monospace',
      'color:#94a3b8', 'background:rgba(255,255,255,0.06)', 'border:1px solid rgba(255,255,255,0.1)',
      'border-radius:5px', 'padding:3px 9px', 'cursor:pointer',
    ].join(';');
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    block.parentNode.insertBefore(wrap, block);
    wrap.appendChild(block);
    wrap.appendChild(button);
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(block.textContent);
        button.textContent = 'copied';
      } catch {
        button.textContent = 'ctrl+c';
      }
      setTimeout(() => { button.textContent = 'copy'; }, 1600);
    });
  });
});
