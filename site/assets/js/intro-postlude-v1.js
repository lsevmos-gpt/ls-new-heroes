(() => {
  const root = document.documentElement;
  const intro = document.querySelector('[data-intro]');
  const siteStart = document.querySelector('#about-club');
  const zones = document.querySelector('#zones');
  const brand = document.querySelector('.brand');

  if (!intro || !siteStart) return;

  const navEntry = performance.getEntriesByType?.('navigation')?.[0];
  const isReload = navEntry?.type === 'reload';
  const AUDIO_DURATION = 11.2;
  const AUDIO_VOLUME = 0.58;
  const AUDIO_SOURCE = '/assets/audio/formation-b.m4a?v=2';

  if (isReload && location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }

  if (brand) {
    brand.setAttribute('href', '#about-club');
    brand.setAttribute('aria-label', 'Линия спорта — спортивный клуб в Симферополе');
    brand.addEventListener('click', event => {
      event.preventDefault();
      if (root.classList.contains('intro-autoplay-lock')) return;
      siteStart.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, true);
  }

  const soundStyle = document.createElement('style');
  soundStyle.textContent = `
    .intro-sound{
      position:absolute;right:max(22px,env(safe-area-inset-right));bottom:max(24px,env(safe-area-inset-bottom));
      z-index:50;display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:44px;padding:0 15px;
      border:1px solid rgba(255,255,255,.30);border-radius:999px;background:rgba(3,7,5,.60);
      color:rgba(255,255,255,.94);font:600 9px/1 Manrope,Arial,sans-serif;letter-spacing:.12em;
      backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);cursor:pointer;
      opacity:.96;transition:opacity .28s ease,border-color .28s ease,background .28s ease,color .28s ease;
      -webkit-tap-highlight-color:transparent;touch-action:manipulation;pointer-events:auto;
    }
    .intro-sound::before{content:"";width:7px;height:7px;border-radius:50%;background:#a6aaa7;box-shadow:0 0 0 0 rgba(149,201,61,0);transition:.28s ease}
    .intro-sound:hover,.intro-sound:focus-visible{opacity:1;border-color:rgba(255,255,255,.48);outline:none}
    .intro-sound.is-on{color:#fff;background:rgba(8,18,12,.74);border-color:rgba(149,201,61,.62);opacity:1}
    .intro-sound.is-on::before{background:#95c93d;box-shadow:0 0 14px rgba(149,201,61,.64)}
    @media(max-width:768px){.intro-sound{right:max(16px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));min-height:42px;padding:0 13px;font-size:8px}}
  `;
  document.head.appendChild(soundStyle);

  const soundButton = document.createElement('button');
  soundButton.type = 'button';
  soundButton.className = 'intro-sound';
  soundButton.setAttribute('aria-label', 'Включить музыку');
  soundButton.setAttribute('aria-pressed', 'false');
  soundButton.textContent = 'ЗВУК';
  intro.querySelector('.intro-stage')?.appendChild(soundButton);

  ['pointerdown', 'touchstart'].forEach(type => {
    soundButton.addEventListener(type, event => event.stopPropagation(), { passive: true });
  });

  const audio = new Audio(AUDIO_SOURCE);
  audio.preload = 'auto';
  audio.playsInline = true;
  audio.setAttribute('playsinline', '');
  audio.setAttribute('webkit-playsinline', '');
  audio.volume = AUDIO_VOLUME;
  audio.load();

  let soundEnabled = false;

  const getProgress = () => {
    const p = Number.parseFloat(root.style.getPropertyValue('--intro-progress')) || 0;
    return Math.min(1, Math.max(0, p));
  };

  const seekToProgress = () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const target = Math.min(AUDIO_DURATION - .03, Math.max(0, getProgress() * AUDIO_DURATION));
    try { audio.currentTime = target; } catch {}
  };

  const setSoundUi = on => {
    soundButton.classList.toggle('is-on', on);
    soundButton.setAttribute('aria-pressed', String(on));
    soundButton.setAttribute('aria-label', on ? 'Выключить музыку' : 'Включить музыку');
    soundButton.textContent = on ? 'ЗВУК ВКЛ' : 'ЗВУК';
  };

  soundButton.addEventListener('click', () => {
    if (soundEnabled) {
      soundEnabled = false;
      audio.pause();
      setSoundUi(false);
      return;
    }

    soundEnabled = true;
    audio.muted = false;
    audio.volume = AUDIO_VOLUME;
    seekToProgress();
    setSoundUi(true);

    const playback = audio.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(error => {
        soundEnabled = false;
        audio.pause();
        setSoundUi(false);
        soundButton.textContent = 'ЕЩЁ РАЗ';
        console.warn('Intro sound playback blocked:', error);
      });
    }
  });

  audio.addEventListener('loadedmetadata', () => {
    if (soundEnabled) seekToProgress();
  });

  let retired = false;
  const retireIntro = () => {
    if (retired || !intro.isConnected) return;
    retired = true;

    const deepLink = location.hash && !['#top', '#club', '#promo', '#zones'].includes(location.hash)
      ? document.querySelector(location.hash)
      : null;

    audio.pause();
    soundStyle.remove();
    intro.remove();

    requestAnimationFrame(() => {
      if (deepLink) deepLink.scrollIntoView({ block: 'start' });
      else window.scrollTo(0, 0);
    });
  };

  const watchCompletion = () => {
    const p = getProgress();
    const locked = root.classList.contains('intro-autoplay-lock');

    if (p >= .999 && !locked) {
      retireIntro();
      return;
    }

    requestAnimationFrame(watchCompletion);
  };

  requestAnimationFrame(watchCompletion);
})();