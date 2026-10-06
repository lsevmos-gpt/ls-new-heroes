(() => {
  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector('[data-header]');
  const progressWrap = document.querySelector('.scroll-progress');
  const progressBar = document.querySelector('.scroll-progress span');
  const intro = document.querySelector('[data-intro]');
  const mediaStack = intro?.querySelector('.intro-media-stack');
  const menuButton = document.querySelector('[data-menu-button]');
  const menu = document.querySelector('[data-menu]');
  const ua = navigator.userAgent || '';
  const isYandexAndroid = /Android/i.test(ua) && /YaBrowser\//i.test(ua);
  const reducedMotionRequested = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prefersReduced = reducedMotionRequested && !isYandexAndroid;

  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const range = (p, a, b) => smooth((p - a) / Math.max(.0001, b - a));
  const fadeWindow = (p, a, b, c, d) => clamp(Math.min(range(p, a, b), 1 - range(p, c, d)));

  const IDLE_DELAY = 1400;
  const TARGET_P = .999;
  const FULL_DURATION = 11200;
  const FIRST_HOLD_P = 1000 / FULL_DURATION;
  const FIRST_FADE_END_P = 1700 / FULL_DURATION;

  let autoplayRAF = 0;
  let autoplayActive = false;
  let idleTimer = 0;
  let lastManualInput = performance.now();
  let ticking = false;
  let savedInlineState = null;

  if ('scrollRestoration' in history && !location.hash) history.scrollRestoration = 'manual';
  if (isYandexAndroid) root.classList.add('is-yandex-android');

  function installIntroFrames() {
    if (!mediaStack) return;

    const frames = ['01', '02', '04', '05', '06', '07'];
    mediaStack.innerHTML = frames.map((n, index) => {
      const priority = index === 0 ? ' fetchpriority="high"' : '';
      return `<picture class="intro-media intro-media--${n}">
        <source media="(max-width: 768px)" srcset="/assets/images/mobile/intro-${n}.webp?v=7.0">
        <img src="/assets/images/desktop/intro-${n}.webp?v=7.0" alt="" decoding="async"${priority}>
      </picture>`;
    }).join('');
  }

  function getIntroProgress() {
    if (!intro || !intro.isConnected) return 1;
    const rect = intro.getBoundingClientRect();
    const track = intro.offsetHeight - innerHeight;
    return clamp(-rect.top / Math.max(1, track));
  }

  function paintIntro(p) {
    p = clamp(p);
    root.style.setProperty('--intro-progress', p.toFixed(4));
    root.style.setProperty('--intro-camera', p.toFixed(4));

    // Opening beat: 1.0 s clean hold, then a 0.7 s true crossfade into scene 2.
    root.style.setProperty('--intro-s1', (1 - range(p, FIRST_HOLD_P, FIRST_FADE_END_P)).toFixed(4));
    root.style.setProperty('--intro-s2', fadeWindow(p, FIRST_HOLD_P, FIRST_FADE_END_P, .325, .415).toFixed(4));
    root.style.setProperty('--intro-s3', '0');
    root.style.setProperty('--intro-s4', fadeWindow(p, .475, .565, .675, .775).toFixed(4));
    root.style.setProperty('--intro-s5', fadeWindow(p, .685, .775, .835, .925).toFixed(4));
    root.style.setProperty('--intro-s6', '0');
    root.style.setProperty('--intro-s7', '0');
    root.style.setProperty('--intro-s8', range(p, .865, .945).toFixed(4));

    root.style.setProperty('--intro-f1', (1 - range(p, FIRST_HOLD_P, FIRST_FADE_END_P)).toFixed(4));
    root.style.setProperty('--intro-f2', fadeWindow(p, FIRST_HOLD_P, FIRST_FADE_END_P, .315, .415).toFixed(4));
    root.style.setProperty('--intro-f3', '0');
    root.style.setProperty('--intro-f4', fadeWindow(p, .315, .415, .455, .565).toFixed(4));
    root.style.setProperty('--intro-f5', fadeWindow(p, .455, .565, .665, .775).toFixed(4));
    root.style.setProperty('--intro-f6', fadeWindow(p, .665, .775, .825, .935).toFixed(4));
    root.style.setProperty('--intro-f7', range(p, .825, .935).toFixed(4));

    const blackout = Math.max(
      fadeWindow(p, .325, .350, .385, .415),
      fadeWindow(p, .465, .490, .530, .560),
      fadeWindow(p, .675, .700, .740, .770),
      fadeWindow(p, .835, .860, .900, .930)
    );
    root.style.setProperty('--intro-blackout', (blackout * .16).toFixed(4));

    const passed = p > .985;
    header?.classList.toggle('intro-passed', passed);
    progressWrap?.classList.toggle('visible', passed);
  }

  function updateScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const globalP = max > 0 ? scrollY / max : 0;
    if (progressBar) progressBar.style.transform = `scaleX(${globalP})`;
    header?.classList.toggle('scrolled', scrollY > 24);
    if (intro && !prefersReduced) paintIntro(getIntroProgress());
  }

  function saveInlineState() {
    if (savedInlineState) return;
    savedInlineState = {
      rootScrollBehavior: root.style.getPropertyValue('scroll-behavior'),
      rootScrollBehaviorPriority: root.style.getPropertyPriority('scroll-behavior'),
      rootOverflow: root.style.getPropertyValue('overflow'),
      rootOverflowPriority: root.style.getPropertyPriority('overflow'),
      rootOverscroll: root.style.getPropertyValue('overscroll-behavior'),
      rootOverscrollPriority: root.style.getPropertyPriority('overscroll-behavior'),
      bodyOverflow: body.style.getPropertyValue('overflow'),
      bodyOverflowPriority: body.style.getPropertyPriority('overflow'),
      bodyOverscroll: body.style.getPropertyValue('overscroll-behavior'),
      bodyOverscrollPriority: body.style.getPropertyPriority('overscroll-behavior'),
      bodyTouchAction: body.style.getPropertyValue('touch-action'),
      bodyTouchActionPriority: body.style.getPropertyPriority('touch-action')
    };
  }

  function setOrRemove(el, prop, value, priority) {
    if (value) el.style.setProperty(prop, value, priority || '');
    else el.style.removeProperty(prop);
  }

  function enableAutoplayScroll() {
    saveInlineState();
    root.classList.add('intro-autoplay-lock');
    root.style.setProperty('scroll-behavior', 'auto', 'important');
    root.style.setProperty('overflow', 'visible', 'important');
    root.style.setProperty('overscroll-behavior', 'auto', 'important');
    body.style.setProperty('overflow', 'visible', 'important');
    body.style.setProperty('overscroll-behavior', 'auto', 'important');
    body.style.setProperty('touch-action', 'auto', 'important');
  }

  function disableAutoplayScroll() {
    root.classList.remove('intro-autoplay-lock');
    if (!savedInlineState) return;

    setOrRemove(root, 'scroll-behavior', savedInlineState.rootScrollBehavior, savedInlineState.rootScrollBehaviorPriority);
    setOrRemove(root, 'overflow', savedInlineState.rootOverflow, savedInlineState.rootOverflowPriority);
    setOrRemove(root, 'overscroll-behavior', savedInlineState.rootOverscroll, savedInlineState.rootOverscrollPriority);
    setOrRemove(body, 'overflow', savedInlineState.bodyOverflow, savedInlineState.bodyOverflowPriority);
    setOrRemove(body, 'overscroll-behavior', savedInlineState.bodyOverscroll, savedInlineState.bodyOverscrollPriority);
    setOrRemove(body, 'touch-action', savedInlineState.bodyTouchAction, savedInlineState.bodyTouchActionPriority);
    savedInlineState = null;
  }

  function stopAutoplay(markManual = false) {
    if (autoplayRAF) cancelAnimationFrame(autoplayRAF);
    autoplayRAF = 0;
    autoplayActive = false;
    disableAutoplayScroll();

    if (markManual) {
      lastManualInput = performance.now();
      scheduleIdleAutoplay();
    }
  }

  function autoplayIntro() {
    if (!intro || !intro.isConnected || prefersReduced || autoplayActive) return;

    const p0 = getIntroProgress();
    if (p0 >= TARGET_P) return;

    const introTop = scrollY + intro.getBoundingClientRect().top;
    const track = Math.max(1, intro.offsetHeight - innerHeight);
    const y0 = scrollY;
    const y1 = introTop + track * TARGET_P;
    const remaining = clamp((TARGET_P - p0) / TARGET_P, .08, 1);
    const duration = Math.max(1800, FULL_DURATION * remaining);
    const startedAt = performance.now();

    enableAutoplayScroll();
    autoplayActive = true;

    const frame = now => {
      if (!autoplayActive || !intro?.isConnected) return;
      const t = clamp((now - startedAt) / duration);
      window.scrollTo(0, y0 + (y1 - y0) * t);

      if (t < 1) {
        autoplayRAF = requestAnimationFrame(frame);
      } else {
        autoplayRAF = 0;
        autoplayActive = false;
        disableAutoplayScroll();
      }
    };

    autoplayRAF = requestAnimationFrame(frame);
  }

  function scheduleIdleAutoplay() {
    clearTimeout(idleTimer);
    if (prefersReduced || !intro || !intro.isConnected) return;

    idleTimer = setTimeout(() => {
      if (performance.now() - lastManualInput >= IDLE_DELAY - 50 && getIntroProgress() < TARGET_P) {
        autoplayIntro();
      }
    }, IDLE_DELAY);
  }

  ['wheel', 'touchstart', 'pointerdown'].forEach(type => {
    addEventListener(type, () => stopAutoplay(true), { passive: true });
  });

  addEventListener('keydown', e => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar'].includes(e.key)) {
      stopAutoplay(true);
    }
  });

  addEventListener('scroll', () => {
    if (!autoplayActive) {
      lastManualInput = performance.now();
      scheduleIdleAutoplay();
    }

    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        updateScroll();
        ticking = false;
      });
    }
  }, { passive: true });

  addEventListener('resize', () => {
    stopAutoplay(false);
    updateScroll();
    scheduleIdleAutoplay();
  }, { passive: true });

  addEventListener('pageshow', e => {
    if (!location.hash && e.persisted && intro?.isConnected) {
      window.scrollTo(0, 0);
      paintIntro(0);
      lastManualInput = performance.now();
      scheduleIdleAutoplay();
    }
  });

  installIntroFrames();

  if (location.hash && !['#top', '#club'].includes(location.hash)) {
    paintIntro(1);
  } else {
    if (!location.hash) window.scrollTo(0, 0);
    paintIntro(getIntroProgress());
    requestAnimationFrame(autoplayIntro);
  }

  updateScroll();

  const revealTargets = document.querySelectorAll('[data-reveal], .space-scene');
  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) entry.target.classList.add('is-visible');
    }, { threshold: .12, rootMargin: '0px 0px -7% 0px' });
    revealTargets.forEach(el => observer.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('is-visible'));
  }

  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    menu?.classList.toggle('open', open);
    menu?.setAttribute('aria-hidden', String(!open));
    menuButton?.setAttribute('aria-expanded', String(open));
    menuButton?.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (open) requestAnimationFrame(() => menu?.querySelector('a')?.focus());
  }

  menuButton?.addEventListener('click', () => setMenu(!menu?.classList.contains('open')));
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu?.classList.contains('open')) {
      setMenu(false);
      menuButton?.focus();
    }
  });

  document.querySelectorAll('[data-smart-store]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const currentUA = navigator.userAgent || '';
      if (/iPhone|iPad|iPod/i.test(currentUA)) location.href = 'https://apps.apple.com/us/app/%D0%BB%D0%B8%D0%BD%D0%B8%D1%8F-%D1%81%D0%BF%D0%BE%D1%80%D1%82%D0%B0/id6739219471';
      else if (/Android/i.test(currentUA)) location.href = 'https://play.google.com/store/apps/details?id=ru.devpark.liniyasporta.customer';
      else document.querySelector('#stores')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
})();
