// @ts-check
document.addEventListener('DOMContentLoaded', () => {
  // Only add keyboard handling to non-anchor cards (e.g. <article>, <div>).
  // Native <a> elements are already focusable and respond to Enter natively.
  const cards = document.querySelectorAll('.card:not(a)');
  cards.forEach(card => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
});
