// @ts-check
// main.js — progressive-enhancement helpers for index.html.
//
// Intentionally a plain script (no import/export) so it works without
// type="module" and executes synchronously in older environments.
// All other JS in this project is loaded as type="module".
document.addEventListener('DOMContentLoaded', () => {
  // Only add keyboard handling to non-anchor cards (e.g. <article>, <div>).
  // Native <a> elements are already focusable and respond to Enter natively.
  const cards = document.querySelectorAll('.card:not(a)');
  cards.forEach((card) => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
});
