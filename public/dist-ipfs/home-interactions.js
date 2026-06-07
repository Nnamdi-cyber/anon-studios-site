(function () {
  const body = document.body;
  const nav = document.getElementById('nav');
  const pacCursor = document.getElementById('pacCursor');
  const pacShell = pacCursor ? pacCursor.querySelector('.pac-shell') : null;
  const pacScroll = document.getElementById('pacScroll');
  const pacScrollIcon = pacScroll ? pacScroll.querySelector('.pac-scroll-icon') : null;

  let forceStyle = document.getElementById('pac-cursor-force');
  let mx = window.innerWidth * 0.5;
  let my = Math.min(window.innerHeight * 0.22, 180);
  let px = mx;
  let py = my;
  let lastX = px;
  let lastY = py;
  let moveQueued = false;
  let nextX = mx;
  let nextY = my;

  function ensureForceStyle() {
    if (forceStyle) return forceStyle;
    forceStyle = document.createElement('style');
    forceStyle.id = 'pac-cursor-force';
    document.head.appendChild(forceStyle);
    return forceStyle;
  }

  function isTouchLike() {
    return window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 900;
  }

  function applyPointerMode() {
    const touchLike = isTouchLike();
    body.classList.toggle('pac-touch', touchLike);
    body.classList.toggle('pac-desktop', !touchLike);

    if (touchLike) {
      if (forceStyle) forceStyle.textContent = '';
      if (pacCursor) {
        pacCursor.style.display = 'none';
        pacCursor.style.opacity = '0';
      }
      if (pacScroll) pacScroll.style.display = 'block';
      return;
    }

    ensureForceStyle().textContent = 'html,body,body *,a,button{cursor:none !important;}';
    if (pacCursor) {
      pacCursor.style.display = 'block';
      pacCursor.style.opacity = '1';
      pacCursor.style.transform = `translate3d(${px - 14}px,${py - 14}px,0)`;
    }
    if (pacScroll) pacScroll.style.display = 'none';
  }

  function syncNavState() {
    if (!nav) return;
    const scrolled = window.scrollY > 8;
    nav.classList.toggle('scrolled', scrolled);
    if (scrolled) {
      nav.style.background = 'rgba(2,2,2,.97)';
      nav.style.backdropFilter = 'blur(28px)';
      nav.style.webkitBackdropFilter = 'blur(28px)';
      nav.style.borderBottomColor = 'rgba(255,255,255,.08)';
      nav.style.boxShadow = '0 18px 48px rgba(0,0,0,.56)';
    } else {
      nav.style.background = 'linear-gradient(180deg, rgba(4,4,4,.16) 0%, rgba(4,4,4,.06) 42%, rgba(4,4,4,0) 100%)';
      nav.style.backdropFilter = 'none';
      nav.style.webkitBackdropFilter = 'none';
      nav.style.borderBottomColor = 'transparent';
      nav.style.boxShadow = 'none';
    }
  }

  function syncPacHoverScale() {
    if (!pacShell) return;
    const dx = px - lastX;
    const dy = py - lastY;
    const angle = Math.atan2(dy || 0.001, dx || 1) * 180 / Math.PI;
    const scale = body.classList.contains('cs-link') ? 1.16 : 1;
    pacShell.style.transform = `rotate(${angle}deg) scale(${scale})`;
    lastX = px;
    lastY = py;
  }

  function animatePac() {
    if (pacCursor && body.classList.contains('pac-desktop')) {
      px += (mx - px) * 0.28;
      py += (my - py) * 0.28;
      pacCursor.style.transform = `translate3d(${px - 14}px,${py - 14}px,0)`;
      syncPacHoverScale();
    }
    requestAnimationFrame(animatePac);
  }

  function updatePacScroll() {
    if (!pacScrollIcon || !body.classList.contains('pac-touch')) return;
    const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
    const available = Math.max(pacScroll.offsetHeight - pacScrollIcon.offsetHeight, 0);
    pacScrollIcon.style.transform = `translateY(${available * progress}px)`;
  }

  document.addEventListener('pointermove', (event) => {
    if (body.classList.contains('pac-touch')) return;
    nextX = event.clientX;
    nextY = event.clientY;
    if (!moveQueued) {
      moveQueued = true;
      requestAnimationFrame(() => {
        mx = nextX;
        my = nextY;
        moveQueued = false;
      });
    }
  }, { passive: true });

  document.addEventListener('pointerover', (event) => {
    if (event.target.closest('a,button,.wcard,.ttag,.nbtn,.btn-fill,.btn-outline,.cf-soc-item,.cf-cta,.srv-card,.wi')) {
      body.classList.add('cs-link');
      syncPacHoverScale();
    }
  }, { passive: true });

  document.addEventListener('pointerout', (event) => {
    if (event.target.closest('a,button,.wcard,.ttag,.nbtn,.btn-fill,.btn-outline,.cf-soc-item,.cf-cta,.srv-card,.wi')) {
      body.classList.remove('cs-link');
      syncPacHoverScale();
    }
  }, { passive: true });

  document.addEventListener('focusin', (event) => {
    if (event.target.closest('a,button,.wcard,.ttag,.nbtn,.btn-fill,.btn-outline,.cf-soc-item,.cf-cta,.srv-card,.wi')) {
      body.classList.add('cs-link');
      syncPacHoverScale();
    }
  });

  document.addEventListener('focusout', () => {
    body.classList.remove('cs-link');
    syncPacHoverScale();
  });

  window.addEventListener('scroll', () => {
    syncNavState();
    updatePacScroll();
  }, { passive: true });

  window.addEventListener('resize', () => {
    applyPointerMode();
    syncNavState();
    updatePacScroll();
  }, { passive: true });

  applyPointerMode();
  syncNavState();
  updatePacScroll();
  animatePac();
})();
