/*
 * Efeitos ligados à rolagem:
 * - [data-reveal]: aparece suave ao entrar na tela (uma vez só).
 * - [data-parallax="velocidade"]: imagem anda mais devagar que a página, dentro do contêiner.
 * - --hero-progress (0 a 1): quanto da capa já passou; o CSS usa para afastar foto e nomes.
 * Com "reduzir movimento" ligado no aparelho, tudo aparece direto e nada se mexe.
 */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  function revealAll(elements) {
    elements.forEach((element) => element.classList.add('is-revealed'));
  }

  function observeReveals() {
    const elements = document.querySelectorAll('[data-reveal]');
    if (reducedMotion || !('IntersectionObserver' in window)) return revealAll(elements);
    const observer = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
  }

  // Limita o deslocamento à sobra da imagem, para nunca aparecer borda vazia.
  function updateParallax(image) {
    const container = image.parentElement.getBoundingClientRect();
    const spare = Math.max(0, (image.offsetHeight - container.height) / 2);
    const distanceFromCenter = container.top + container.height / 2 - window.innerHeight / 2;
    const offset = Math.max(-spare, Math.min(spare, -distanceFromCenter * Number(image.dataset.parallax)));
    image.style.setProperty('--parallax', `${offset.toFixed(1)}px`);
  }

  function updateHeroProgress() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const progress = Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight));
    root.style.setProperty('--hero-progress', progress.toFixed(3));
  }

  let frameRequested = false;
  function onScroll() {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(() => {
      document.querySelectorAll('[data-parallax]').forEach(updateParallax);
      updateHeroProgress();
      frameRequested = false;
    });
  }

  root.classList.add('has-scroll-effects');
  observeReveals();
  if (reducedMotion) return;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', onScroll);
  onScroll();
})();
