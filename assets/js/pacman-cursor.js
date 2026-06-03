(function () {
  if (window.__anonPacmanCursorLoaded) return;
  window.__anonPacmanCursorLoaded = true;

  const body = document.body;
  if (!body) return;

  const style = document.createElement('style');
  style.id = 'anon-pacman-cursor-style';
  style.textContent = `
    #pacCursor{position:fixed;top:0;left:0;z-index:99998;pointer-events:none;opacity:0;width:56px;height:56px;transform:translate3d(-120px,-120px,0);transition:opacity .14s ease;will-change:transform}
    #pacCursor .pac-shell{position:absolute;left:14px;top:14px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;transform-origin:center center;transition:transform .14s ease}
    #pacCursor .pac-body{width:28px;height:28px;border-radius:50%;background:conic-gradient(from 38deg, transparent 0 72deg, #2dd4a0 72deg 360deg);filter:drop-shadow(0 0 16px rgba(45,212,160,.18));animation:anonPacChomp .34s linear infinite}
    #pacCursor .pac-eye{position:absolute;top:7px;left:14px;width:4px;height:4px;border-radius:50%;background:#080807}
    #pacCursor .pac-crumbs{position:absolute;left:30px;top:50%;display:flex;align-items:center;gap:7px;transform:translateY(-50%)}
    #pacCursor .pac-crumbs span{width:5px;height:5px;border-radius:50%;background:rgba(240,235,226,.82);box-shadow:0 0 10px rgba(240,235,226,.12);animation:anonPacDot .8s ease-in-out infinite}
    #pacCursor .pac-crumbs span:nth-child(2){animation-delay:.12s}
    #pacCursor .pac-crumbs span:nth-child(3){animation-delay:.24s}
    body.cs-link #pacCursor .pac-shell{transform:scale(1.14)}
    body.cs-link #pacCursor .pac-body{background:conic-gradient(from 38deg, transparent 0 72deg, #ffffff 72deg 360deg)}
    body.cs-link #pacCursor .pac-crumbs span{background:rgba(255,255,255,.95)}
    #pacScroll{position:fixed;right:14px;top:118px;bottom:18px;width:28px;z-index:9997;pointer-events:none;display:none}
    #pacScroll .pac-scroll-track{position:absolute;top:0;bottom:0;left:50%;width:1px;transform:translateX(-50%);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(45,212,160,.26),rgba(255,255,255,.04))}
    #pacScroll .pac-scroll-dots{position:absolute;top:16px;bottom:16px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;justify-content:space-between;align-items:center}
    #pacScroll .pac-scroll-dots span{width:4px;height:4px;border-radius:50%;background:rgba(240,235,226,.56)}
    #pacScroll .pac-scroll-icon{position:absolute;left:50%;top:0;transform:translate(-50%,0);width:18px;height:18px;transition:transform .12s linear}
    #pacScroll .pac-scroll-icon .pac-body{width:18px;height:18px;border-radius:50%;background:conic-gradient(from 38deg, transparent 0 72deg, #2dd4a0 72deg 360deg);animation:anonPacChomp .34s linear infinite;filter:drop-shadow(0 0 10px rgba(45,212,160,.16))}
    #pacScroll .pac-scroll-icon .pac-eye{position:absolute;top:4px;left:9px;width:3px;height:3px;border-radius:50%;background:#080807}
    @keyframes anonPacChomp{0%,100%{clip-path:polygon(50% 50%,100% 14%,100% 86%,50% 50%,0 100%,0 0)}50%{clip-path:polygon(50% 50%,100% 32%,100% 68%,50% 50%,0 100%,0 0)}}
    @keyframes anonPacDot{0%,100%{opacity:.25;transform:translateX(0) scale(.84)}50%{opacity:1;transform:translateX(2px) scale(1)}}
  `;
  document.head.appendChild(style);

  let pacCursor = document.getElementById('pacCursor');
  if (!pacCursor) {
    pacCursor = document.createElement('div');
    pacCursor.id = 'pacCursor';
    pacCursor.setAttribute('aria-hidden', 'true');
    pacCursor.innerHTML = '<div class="pac-shell"><div class="pac-body"></div><div class="pac-eye"></div></div><div class="pac-crumbs"><span></span><span></span><span></span></div>';
    body.prepend(pacCursor);
  }

  let pacScroll = document.getElementById('pacScroll');
  if (!pacScroll) {
    pacScroll = document.createElement('div');
    pacScroll.id = 'pacScroll';
    pacScroll.setAttribute('aria-hidden', 'true');
    pacScroll.innerHTML = '<div class="pac-scroll-track"></div><div class="pac-scroll-dots"><span></span><span></span><span></span></div><div class="pac-scroll-icon"><div class="pac-body"></div><div class="pac-eye"></div></div>';
    body.prepend(pacScroll);
  }

  const pacShell = pacCursor.querySelector('.pac-shell');
  const pacScrollIcon = pacScroll.querySelector('.pac-scroll-icon');
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
      document.documentElement.classList.remove('pacman-prehide');
      if (forceStyle) forceStyle.textContent = '';
      pacCursor.style.display = 'none';
      pacCursor.style.opacity = '0';
      pacScroll.style.display = 'block';
      return;
    }
    ensureForceStyle().textContent = 'html,body,body *,a,button{cursor:none !important;}';
    document.documentElement.classList.remove('pacman-prehide');
    pacCursor.style.display = 'block';
    pacCursor.style.opacity = '1';
    pacCursor.style.transform = `translate3d(${px - 14}px,${py - 14}px,0)`;
    pacScroll.style.display = 'none';
  }

  function syncPacHoverScale() {
    const dx = px - lastX;
    const dy = py - lastY;
    const angle = Math.atan2(dy || 0.001, dx || 1) * 180 / Math.PI;
    const scale = body.classList.contains('cs-link') ? 1.14 : 1;
    pacShell.style.transform = `rotate(${angle}deg) scale(${scale})`;
    lastX = px;
    lastY = py;
  }

  function animatePac() {
    if (body.classList.contains('pac-desktop')) {
      px += (mx - px) * 0.28;
      py += (my - py) * 0.28;
      pacCursor.style.transform = `translate3d(${px - 14}px,${py - 14}px,0)`;
      syncPacHoverScale();
    }
    requestAnimationFrame(animatePac);
  }

  function updatePacScroll() {
    if (!body.classList.contains('pac-touch')) return;
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

  const interactiveSelector = 'a,button,.wcard,.ttag,.nbtn,.btn-fill,.btn-outline,.cf-soc-item,.cf-cta,.srv-card,.wi,.pcard,.vpanel,.sec-cta,.spanel,.series-list-item,.vcard,.cat-tab';
  document.addEventListener('pointerover', (event) => {
    if (event.target.closest(interactiveSelector)) body.classList.add('cs-link');
  }, { passive: true });
  document.addEventListener('pointerout', (event) => {
    if (event.target.closest(interactiveSelector)) body.classList.remove('cs-link');
  }, { passive: true });
  document.addEventListener('focusin', (event) => {
    if (event.target.closest(interactiveSelector)) body.classList.add('cs-link');
  });
  document.addEventListener('focusout', () => body.classList.remove('cs-link'));

  window.addEventListener('scroll', updatePacScroll, { passive: true });
  window.addEventListener('resize', () => {
    applyPointerMode();
    updatePacScroll();
  }, { passive: true });

  applyPointerMode();
  updatePacScroll();
  animatePac();
})();
