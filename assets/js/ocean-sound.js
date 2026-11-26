/*
 * Som do mar em loop contínuo.
 * Por que Web Audio com crossfade: o trecho gravado não fecha em loop, então `<audio loop>` dá um
 * corte audível no fim; e no iOS `audio.volume` é somente leitura, sem fade possível.
 * O navegador só libera áudio dentro de um gesto do usuário: o AudioContext é criado e retomado de
 * forma síncrona no clique (o iOS recusa se isso acontecer depois de um `await`).
 * Fallback para `<audio loop>` quando o fetch falha (ex.: arquivo aberto via file://).
 */
(function () {
  'use strict';

  const site = (window.WeddingSite = window.WeddingSite || {});
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  function buildEqualPowerCurves(steps) {
    const fadeIn = new Float32Array(steps);
    const fadeOut = new Float32Array(steps);
    for (let index = 0; index < steps; index += 1) {
      const progress = index / (steps - 1);
      fadeIn[index] = Math.sin(progress * Math.PI / 2);
      fadeOut[index] = Math.cos(progress * Math.PI / 2);
    }
    return { fadeIn, fadeOut };
  }

  function createWebAudioLoop({ bytesPromise, volume, crossfadeSeconds }) {
    const context = new AudioContextClass();
    const master = context.createGain();
    const curves = buildEqualPowerCurves(64);
    let buffer = null;
    let nextStartTime = 0;
    let loopTimer = 0;
    master.gain.value = 0;
    master.connect(context.destination);

    function armTimer() {
      window.clearTimeout(loopTimer);
      const delaySeconds = Math.max(0, nextStartTime - context.currentTime - 1.5);
      loopTimer = window.setTimeout(() => scheduleSegment(nextStartTime), delaySeconds * 1000);
    }

    function scheduleSegment(startAt) {
      const source = context.createBufferSource();
      const gain = context.createGain();
      const endAt = startAt + buffer.duration;
      source.buffer = buffer;
      source.connect(gain).connect(master);
      gain.gain.setValueCurveAtTime(curves.fadeIn, startAt, crossfadeSeconds);
      gain.gain.setValueCurveAtTime(curves.fadeOut, endAt - crossfadeSeconds, crossfadeSeconds);
      source.start(startAt);
      source.stop(endAt);
      nextStartTime = endAt - crossfadeSeconds;
      armTimer();
    }

    function rampMaster(target, seconds) {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(target, now + seconds);
    }

    let decoding = null;

    // Pode ser chamado de novo enquanto o primeiro resume() espera: um novo toque libera o contexto.
    async function play() {
      const resuming = context.resume();
      decoding = decoding || bytesPromise.then((bytes) => context.decodeAudioData(bytes));
      buffer = await decoding;
      await resuming;
      if (nextStartTime === 0) scheduleSegment(context.currentTime + 0.05);
      else armTimer();
      rampMaster(volume, 3);
    }

    async function pause() {
      window.clearTimeout(loopTimer);
      rampMaster(0, 0.6);
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      await context.suspend();
    }

    return { play, pause };
  }

  function createElementLoop({ source, volume }) {
    const audio = new Audio(source);
    audio.loop = true;
    audio.volume = volume;
    return {
      play: () => audio.play(),
      pause: async () => audio.pause(),
    };
  }

  function prefetchBytes(source) {
    return fetch(source).then((response) => {
      if (!response.ok) throw new Error(`Áudio indisponível (HTTP ${response.status})`);
      return response.arrayBuffer();
    });
  }

  /** Estados: idle | loading | playing | paused | unavailable */
  site.createOceanSound = function createOceanSound({ source, volume = 0.5, crossfadeSeconds = 5 }) {
    const bytesPromise = prefetchBytes(source);
    const listeners = new Set();
    let canFetch = true;
    let engine = null;
    let state = 'idle';
    let wasPlayingBeforeHidden = false;
    bytesPromise.catch(() => { canFetch = false; });

    function setState(nextState) {
      state = nextState;
      listeners.forEach((listener) => listener(state));
    }

    function createEngine() {
      if (canFetch && AudioContextClass) return createWebAudioLoop({ bytesPromise, volume, crossfadeSeconds });
      return createElementLoop({ source, volume });
    }

    async function play() {
      if (state === 'playing' || state === 'unavailable') return;
      setState('loading');
      engine = engine || createEngine();
      try {
        await engine.play();
        setState('playing');
      } catch (error) {
        // NotAllowedError: o navegador ainda não liberou áudio; o próximo toque no botão tenta de novo.
        setState(error && error.name === 'NotAllowedError' ? 'paused' : 'unavailable');
        site.reportProblem?.('ocean-sound', error);
      }
    }

    async function pause() {
      if (state !== 'playing') return;
      await engine.pause();
      setState('paused');
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        wasPlayingBeforeHidden = state === 'playing';
        pause();
        return;
      }
      if (wasPlayingBeforeHidden) play();
    });

    return {
      play,
      pause,
      toggle: () => (state === 'playing' ? pause() : play()),
      onChange(listener) {
        listeners.add(listener);
        listener(state);
      },
    };
  };
})();
