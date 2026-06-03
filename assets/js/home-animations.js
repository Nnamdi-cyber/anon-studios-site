(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const isTouchLike = () => window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 900;

  function loadThree() {
    if (window.__anonThreePromise) return window.__anonThreePromise;
    window.__anonThreePromise = import('/assets/vendor/three.module.min.js');
    return window.__anonThreePromise;
  }

  function initFeaturedWorkDepth() {
    const workItems = Array.from(document.querySelectorAll('#work .wi'));
    if (!workItems.length || isTouchLike() || window.innerWidth < 1200) return;

    let activeCanvas = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let points = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    function ensureCanvas(media) {
      if (!media) return null;
      let canvas = media.querySelector('.wi-depth');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'wi-depth';
        media.prepend(canvas);
        const meta = document.createElement('div');
        meta.className = 'wi-media-meta';
        meta.innerHTML = '<span class="wi-media-label">Preview Depth</span><span class="wi-media-line"></span>';
        media.appendChild(meta);
      }
      return canvas;
    }

    function resizeRenderer() {
      if (!activeCanvas || !renderer || !camera) return;
      const rect = activeCanvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function animate() {
      if (!renderer || !scene || !camera || !points) return;
      currentX += (targetX - currentX) * 0.028;
      currentY += (targetY - currentY) * 0.028;
      points.rotation.y += 0.0011;
      points.rotation.x = currentY * 0.16;
      points.rotation.z = -0.08 + currentX * 0.12;
      points.position.x = currentX * 0.16;
      points.position.y = currentY * 0.12;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    function mountDepth(canvas) {
      if (activeCanvas === canvas && renderer) return;
      activeCanvas = canvas;
      targetX = 0;
      targetY = 0;
      currentX = 0;
      currentY = 0;

      loadThree().then((THREE) => {
        if (!activeCanvas) return;

        if (!renderer) {
          renderer = new THREE.WebGLRenderer({ canvas: activeCanvas, alpha: true, antialias: false, powerPreference: 'low-power' });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
          renderer.setClearColor(0x000000, 0);
          scene = new THREE.Scene();
          camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
          camera.position.z = 7;

          const geometry = new THREE.BufferGeometry();
          const count = 96;
          const positions = new Float32Array(count * 3);
          for (let i = 0; i < count; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.22 + Math.pow(Math.random(), 0.82) * 2.5;
            positions[i * 3] = Math.cos(angle) * radius * (1.85 + Math.random() * 0.55);
            positions[(i * 3) + 1] = Math.sin(angle) * radius * (0.78 + Math.random() * 0.28);
            positions[(i * 3) + 2] = (Math.random() - 0.5) * 1.2;
          }
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

          const material = new THREE.PointsMaterial({
            color: 0x41f1b7,
            size: 0.04,
            transparent: true,
            opacity: 0.28,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
          });

          points = new THREE.Points(geometry, material);
          scene.add(points);

          const glowGeometry = new THREE.PlaneGeometry(4.8, 2.7, 1, 1);
          const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x19d9a0,
            transparent: true,
            opacity: 0.03,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          const glowPlane = new THREE.Mesh(glowGeometry, glowMaterial);
          glowPlane.position.z = -0.45;
          scene.add(glowPlane);
          animate();
          window.addEventListener('resize', resizeRenderer);
        } else if (renderer.domElement !== activeCanvas) {
          renderer.dispose();
          renderer = new THREE.WebGLRenderer({ canvas: activeCanvas, alpha: true, antialias: false, powerPreference: 'low-power' });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
          renderer.setClearColor(0x000000, 0);
        }

        resizeRenderer();
      }).catch(() => {});
    }

    workItems.forEach((item) => {
      const media = item.querySelector('.wi-media');
      if (!media) return;
      const canvas = ensureCanvas(media);
      item.addEventListener('mouseenter', () => mountDepth(canvas));
      item.addEventListener('mousemove', (event) => {
        if (!activeCanvas) return;
        const rect = media.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 1.05;
        targetY = ((event.clientY - rect.top) / rect.height - 0.5) * -1.05;
      });
      item.addEventListener('mouseleave', () => {
        targetX = 0;
        targetY = 0;
      });
    });
  }

  function initHeroInteractiveGlow() {
    const hero = document.querySelector('.hero');
    const canvas = document.getElementById('heroThree');
    if (!hero || !canvas) return;
    const mobileLike = isTouchLike();

    let pointerX = 0.62;
    let pointerY = 0.38;
    let glowX = pointerX;
    let glowY = pointerY;
    let group = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let resizeTimer = 0;

    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      pointerY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    }, { passive: true });

    hero.addEventListener('pointerleave', () => {
      pointerX = 0.62;
      pointerY = 0.38;
    });

    function applyGlowVars() {
      glowX += (pointerX - glowX) * 0.04;
      glowY += (pointerY - glowY) * 0.04;
      hero.style.setProperty('--hero-glow-x', (glowX * 100).toFixed(2) + '%');
      hero.style.setProperty('--hero-glow-y', (glowY * 100).toFixed(2) + '%');
      const dx = glowX - 0.62;
      const dy = glowY - 0.38;
      const base = mobileLike ? 0.034 : 0.042;
      const extra = mobileLike ? 0.011 : 0.018;
      const strength = base + Math.min(extra, Math.sqrt(dx * dx + dy * dy) * (mobileLike ? 0.028 : 0.04));
      hero.style.setProperty('--hero-glow-strength', strength.toFixed(3));
    }

    function setup(THREE) {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.z = 12;

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
      renderer.setClearColor(0x000000, 0);

      group = new THREE.Group();
      const layers = [
        mobileLike
          ? { count: 42, color: 0x41f1b7, radiusX: 2.4, radiusY: 1.1, spread: 0.3, size: 0.05, opacity: 0.16 }
          : { count: 84, color: 0x41f1b7, radiusX: 3.1, radiusY: 1.45, spread: 0.4, size: 0.058, opacity: 0.22 },
        mobileLike
          ? { count: 14, color: 0xa4ffe2, radiusX: 1.45, radiusY: 0.56, spread: 0.12, size: 0.04, opacity: 0.1 }
          : { count: 30, color: 0xa4ffe2, radiusX: 1.9, radiusY: 0.72, spread: 0.18, size: 0.045, opacity: 0.14 }
      ];

      layers.forEach((cfg) => {
        const positions = new Float32Array(cfg.count * 3);
        for (let i = 0; i < cfg.count; i += 1) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.pow(Math.random(), 0.72);
          positions[i * 3] = Math.cos(angle) * cfg.radiusX * radius + (Math.random() - 0.5) * cfg.spread;
          positions[(i * 3) + 1] = Math.sin(angle) * cfg.radiusY * radius + (Math.random() - 0.5) * (cfg.spread * 0.6);
          positions[(i * 3) + 2] = (Math.random() - 0.5) * 1.1;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
          color: cfg.color,
          size: cfg.size,
          transparent: true,
          opacity: cfg.opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true
        });
        group.add(new THREE.Points(geometry, material));
      });

      const coreGeometry = new THREE.PlaneGeometry(4.8, 3, 1, 1);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x1dd8a4,
        transparent: true,
        opacity: mobileLike ? 0.012 : 0.018,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      group.add(new THREE.Mesh(coreGeometry, coreMaterial));
      group.position.set(1.9, 1.2, 0);
      group.rotation.z = -0.18;
      scene.add(group);
      canvas.classList.add('is-ready');

      const onResize = () => {
        const rect = hero.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      onResize();
      window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(onResize, 60);
      });

      const animate = () => {
        applyGlowVars();
        if (group) {
          const px = (glowX - 0.5) * (mobileLike ? 0.34 : 0.55);
          const py = (0.5 - glowY) * (mobileLike ? 0.2 : 0.32);
          group.position.x += ((1.9 + px) - group.position.x) * (mobileLike ? 0.014 : 0.018);
          group.position.y += ((1.2 + py) - group.position.y) * (mobileLike ? 0.014 : 0.018);
          group.rotation.z += ((-0.18 + (glowX - 0.5) * (mobileLike ? 0.018 : 0.028)) - group.rotation.z) * (mobileLike ? 0.012 : 0.016);
          renderer.render(scene, camera);
        }
        requestAnimationFrame(animate);
      };

      animate();
    }

    applyGlowVars();
    loadThree().then(setup).catch(() => {});
  }

  const workSection = document.querySelector('#work');
  if (workSection && !isTouchLike() && window.innerWidth >= 1200) {
    const workObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        initFeaturedWorkDepth();
        workObserver.disconnect();
      });
    }, { rootMargin: '220px 0px' });
    workObserver.observe(workSection);
  }

  initHeroInteractiveGlow();
})();
