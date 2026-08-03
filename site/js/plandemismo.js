document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.disabled) return;
      const targetId = tab.dataset.tab;

      tabs.forEach(t => {
        const isActive = t === tab;
        t.classList.toggle('tab--active', isActive);
        t.setAttribute('aria-selected', String(isActive));
      });

      panels.forEach(panel => {
        const shouldShow = panel.id === `tab-${targetId}`;
        panel.classList.toggle('tab-panel--hidden', !shouldShow);
        if (shouldShow) {
          panel.setAttribute('role', 'tabpanel');
        }
      });
    });
  });

  const videoCards = document.querySelectorAll('.video-card');
  videoCards.forEach(card => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const cta = card.querySelector('.video-card__cta');
        if (cta) cta.click();
      }
    });
  });
});
