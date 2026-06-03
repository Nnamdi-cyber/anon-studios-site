(function () {
  const body = document.body;
  const nav = document.getElementById('nav');
  function syncNavState() {
    if (!nav) return;
    const scrolled = window.scrollY > 2;
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

  window.addEventListener('scroll', () => {
    syncNavState();
  }, { passive: true });

  window.addEventListener('resize', () => {
    syncNavState();
  }, { passive: true });

  syncNavState();
})();
