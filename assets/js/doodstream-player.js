(function () {
  if (window.__anonDoodstreamPlayerLoaded) return;
  window.__anonDoodstreamPlayerLoaded = true;

  const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://anon-studios-backend.onrender.com'; // Adjust this to your real Render backend URL

  const SESSION_TTL_MS = 60 * 60 * 1000;

  function normalizeSelector(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    return target;
  }

  function cacheKey(fileCode, options = {}) {
    return `anon:doodstream:${String(fileCode || '').trim()}:${String(options.quality || 'n').trim().toLowerCase()}:${options.useHls ? '1' : '0'}:${options.mode || 'player'}`;
  }

  function readSessionCache(key) {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (!parsed || !parsed.cachedAt) return null;
      if ((Date.now() - Number(parsed.cachedAt)) > SESSION_TTL_MS) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writeSessionCache(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify({
        ...value,
        cachedAt: Date.now(),
      }));
    } catch (error) {}
  }

  async function fetchPlaybackPayload(fileCode, options = {}) {
    const key = cacheKey(fileCode, options);
    const cached = readSessionCache(key);
    if (cached && cached.playbackUrl) return cached;

    const params = new URLSearchParams();
    if (options.quality) params.set('quality', String(options.quality));
    if (options.useHls) params.set('hls', '1');
    if (options.mode) params.set('mode', String(options.mode));

    const url = BACKEND_URL + `/api/doodstream/link/${encodeURIComponent(fileCode)}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Unable to load DoodStream source (${response.status})`);
    }

    const payload = await response.json();
    if (!payload || !payload.playbackUrl) {
      throw new Error('DoodStream source payload is invalid');
    }

    writeSessionCache(key, payload);
    return payload;
  }

  function buildVideoNode(options = {}) {
    const video = document.createElement('video');
    video.className = options.className || 'doodstream-video';
    video.controls = options.controls !== false;
    video.playsInline = true;
    video.preload = options.preload || 'metadata';
    if (options.muted) video.muted = true;
    if (options.loop) video.loop = true;
    if (options.autoplay) {
      video.autoplay = true;
      video.setAttribute('autoplay', 'autoplay');
    }
    if (options.poster) video.poster = options.poster;
    return video;
  }

  async function initDoodstreamPlayer(target, options = {}) {
    const container = normalizeSelector(target);
    if (!container) throw new Error('Player container not found');

    const fileCode = String(options.fileCode || container.dataset.fileCode || '').trim();
    if (!fileCode) throw new Error('Missing DoodStream file code');

    container.classList.add('doodstream-shell');
    if (!container.querySelector('.doodstream-stage')) {
      container.innerHTML = '<div class="doodstream-stage"><div class="doodstream-loading">Loading showreel...</div></div>';
    }

    const stage = container.querySelector('.doodstream-stage');
    const payload = await fetchPlaybackPayload(fileCode, {
      quality: options.quality || container.dataset.quality || 'n',
      useHls: Boolean(options.useHls || container.dataset.hls === '1'),
      mode: 'player',
    });

    stage.innerHTML = '';
    const video = buildVideoNode({
      poster: payload.poster,
      controls: true,
      preload: 'metadata',
    });
    video.src = payload.playbackUrl;
    stage.appendChild(video);

    if (window.Plyr) {
      return new window.Plyr(video, {
        controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
        settings: ['quality', 'speed'],
        keyboard: { focused: true, global: false },
      });
    }

    return video;
  }

  async function initDoodstreamBackground(target, options = {}) {
    const container = normalizeSelector(target);
    if (!container) throw new Error('Background video container not found');

    const fileCode = String(options.fileCode || container.dataset.fileCode || '').trim();
    if (!fileCode) throw new Error('Missing DoodStream file code');

    container.classList.add('doodstream-background-shell');
    const payload = await fetchPlaybackPayload(fileCode, {
      quality: options.quality || container.dataset.quality || 'n',
      useHls: Boolean(options.useHls || container.dataset.hls === '1'),
      mode: 'background',
    });

    container.innerHTML = '';
    const video = buildVideoNode({
      className: 'doodstream-background-video',
      muted: true,
      loop: true,
      autoplay: true,
      controls: false,
      preload: 'metadata',
      poster: payload.poster,
    });

    video.src = payload.playbackUrl;
    video.setAttribute('muted', 'muted');
    video.setAttribute('playsinline', 'playsinline');
    container.appendChild(video);

    try {
      await video.play();
    } catch (error) {}

    return video;
  }

  window.AnonDoodstream = {
    fetchPlaybackPayload,
    initDoodstreamBackground,
    initDoodstreamPlayer,
  };
})();
