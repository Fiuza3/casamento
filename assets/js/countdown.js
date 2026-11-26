(function () {
  'use strict';

  const site = (window.WeddingSite = window.WeddingSite || {});
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  function splitRemaining(milliseconds) {
    return {
      days: Math.floor(milliseconds / DAY),
      hours: Math.floor((milliseconds % DAY) / HOUR),
      minutes: Math.floor((milliseconds % HOUR) / MINUTE),
    };
  }

  function renderCountdown(element, targetTime) {
    const remaining = targetTime - Date.now();
    const finished = remaining <= 0;
    element.querySelector('[data-countdown-done]')?.toggleAttribute('hidden', !finished);
    element.querySelector('[data-countdown-running]')?.toggleAttribute('hidden', finished);
    if (finished) return;
    const parts = splitRemaining(remaining);
    Object.entries(parts).forEach(([unit, value]) => {
      element.querySelectorAll(`[data-countdown-${unit}]`).forEach((slot) => { slot.textContent = String(value); });
    });
  }

  site.startCountdowns = function startCountdowns(targetIso) {
    const targetTime = new Date(targetIso).getTime();
    const elements = document.querySelectorAll('[data-countdown]');
    if (!elements.length) return;
    const tick = () => elements.forEach((element) => renderCountdown(element, targetTime));
    tick();
    window.setInterval(tick, 30 * 1000);
  };
})();
