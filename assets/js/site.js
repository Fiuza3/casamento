/*
 * Ponto de entrada comum aos modelos: liga a tela de abertura, o som do mar, a contagem,
 * o formulário de presença e a lista de presentes.
 * A tela de abertura existe porque navegadores bloqueiam áudio com som sem um clique do convidado.
 */
(function () {
  'use strict';

  const site = (window.WeddingSite = window.WeddingSite || {});
  const SOUND_LABELS = {
    idle: 'Ligar som do mar',
    loading: 'Carregando som do mar',
    playing: 'Desligar som do mar',
    paused: 'Ligar som do mar',
    unavailable: 'Som do mar indisponível',
  };

  site.reportProblem = function reportProblem(area, error) {
    console.warn(JSON.stringify({ level: 'warn', area, message: String(error && error.message || error) }));
  };

  function enterSite() {
    const intro = document.querySelector('[data-intro]');
    document.body.classList.add('is-entered');
    if (!intro) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const exitMilliseconds = reducedMotion ? 0 : Number(intro.dataset.introExitMs || 1200);
    window.setTimeout(() => {
      intro.hidden = true;
      document.querySelector('main')?.focus({ preventScroll: true });
    }, exitMilliseconds);
  }

  function renderSoundState(state) {
    document.querySelectorAll('[data-ocean-toggle]').forEach((button) => {
      button.dataset.state = state;
      button.setAttribute('aria-pressed', String(state === 'playing'));
      button.setAttribute('aria-label', SOUND_LABELS[state]);
      button.disabled = state === 'unavailable';
      const label = button.querySelector('[data-ocean-label]');
      if (label) label.textContent = state === 'playing' ? 'Som ligado' : 'Som desligado';
    });
  }

  function bindOceanControls(sound) {
    document.querySelectorAll('[data-ocean-start]').forEach((button) => {
      button.addEventListener('click', () => { sound.play(); enterSite(); });
    });
    document.querySelectorAll('[data-enter-silent]').forEach((button) => button.addEventListener('click', enterSite));
    document.querySelectorAll('[data-ocean-toggle]').forEach((button) => button.addEventListener('click', () => sound.toggle()));
    sound.onChange(renderSoundState);
  }

  // Cada página carrega só os scripts que usa; aqui liga o que estiver presente.
  function start() {
    const config = window.WEDDING_CONFIG;
    if (site.createOceanSound && document.querySelector('[data-ocean-toggle]')) {
      bindOceanControls(site.createOceanSound({ source: config.audioSource }));
    }
    site.startCountdowns?.(config.ceremonyStartIso);
    site.bindRsvpForms?.();
    site.renderGiftList?.({ pix: config.pix });
  }

  document.addEventListener('DOMContentLoaded', start);
})();
