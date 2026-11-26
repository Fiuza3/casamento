/*
 * Menu do topo: transparente sobre a foto de abertura, sólido depois dela,
 * para o link "Confirmar presença" continuar legível e alcançável durante a leitura.
 */
(function () {
  'use strict';

  const topbar = document.querySelector('[data-sticky-topbar]');
  const hero = document.querySelector('.hero');
  if (!topbar || !hero) return;

  const observer = new IntersectionObserver(([entry]) => {
    topbar.classList.toggle('is-solid', !entry.isIntersecting);
  }, { rootMargin: '-80px 0px 0px 0px' });

  observer.observe(hero);
})();
