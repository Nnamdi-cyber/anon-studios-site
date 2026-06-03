(function () {
  const STORAGE_KEY = 'anon-studios-content-v3';
  const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://anon-studios-site.onrender.com'; // Adjust this to your real Render backend URL
  const API_BASE = BACKEND_URL + '/api/content';
  const UPDATE_EVENT = 'anon-content-updated';

  function normalizeTag(tag) {
    return String(tag || '')
      .trim()
      .toLowerCase()
      .replace(/[_/]+/g, '-')
      .replace(/\s+/g, '-');
  }

  function normalizeTags(tags) {
    const raw = Array.isArray(tags) ? tags : String(tags || '').split(',');
    return raw.map(normalizeTag).filter(Boolean);
  }

  function normalizeCategory(type, value) {
    const tag = normalizeTag(value);
    if (type === 'video') {
      const map = {
        documentary: 'documentary',
        wedding: 'wedding',
        weddings: 'wedding',
        advert: 'advert',
        advertising: 'advert',
        church: 'church',
        'music-video': 'music-video',
        'music-videos': 'music-video',
        music: 'music-video',
      };
      return map[tag] || 'documentary';
    }

    const map = {
      portrait: 'portrait',
      portraits: 'portrait',
      editorial: 'editorial',
      editorials: 'editorial',
      commercial: 'commercial',
      street: 'street',
      fashion: 'fashion',
    };
    return map[tag] || 'portrait';
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || ('item-' + Date.now());
  }

  const PHOTO_QUOTE_BANK = {
    'portrait-craft': [
      'A portrait is not taken when a face appears, but when presence settles into the frame.',
      'The strongest portrait holds more than likeness; it keeps the weight of a person in view.',
      'A portrait becomes honest when light stops describing and starts revealing.',
      'To photograph a face well is to leave room for who they are, not only how they look.',
    ],
    'light-and-shadow': [
      'Photography begins where light decides to speak and shadow agrees to listen.',
      'The frame becomes memorable when light carries the feeling as much as the subject does.',
      'A photograph lasts when contrast turns atmosphere into memory.',
      'Light does more than illuminate the scene; it tells us where the feeling lives.',
    ],
    'editorial-form': [
      'Editorial images work when shape, gesture, and restraint arrive in the same breath.',
      'A refined frame is built from intention: line, styling, atmosphere, and what is left unsaid.',
      'Strong visual storytelling comes from knowing which detail should lead and which should disappear.',
      'Style becomes meaningful when composition gives it structure and tension.',
    ],
    'commercial-detail': [
      'Commercial photography succeeds when detail carries desire before a word is spoken.',
      'A product frame feels premium when precision and atmosphere share the same surface.',
      'The best campaign images make craft visible without ever feeling forced.',
      'In commercial work, clarity matters most when it still leaves room for mood.',
    ],
    'street-observation': [
      'Street photography lasts because it notices what the city reveals for only a second.',
      'A documentary frame becomes powerful when observation arrives before interruption.',
      'The city gives you the image quickly; the photographer gives it meaning by being ready.',
      'The best street photographs feel found, but never accidental.',
    ],
    'movement-and-time': [
      'Photography gives motion a place to pause without losing its energy.',
      'A strong frame can hold movement still without taking the life out of it.',
      'The camera does not stop time; it chooses which fraction of it should remain.',
      'Some images stay with you because they preserve momentum, not just the moment.',
    ],
    'general-photography': [
      'Photography remembers the feeling long after the moment itself has moved on.',
      'A lasting image is made when intention and timing arrive at the same instant.',
      'Every photograph becomes stronger when form and feeling are allowed to meet.',
      'The frame matters most when it lets the viewer feel more than it explains.',
    ],
  };

  function hashSeed(value) {
    let total = 0;
    const seed = String(value || '');
    for (let index = 0; index < seed.length; index += 1) {
      total = (total + (seed.charCodeAt(index) * (index + 1))) % 2147483647;
    }
    return total;
  }

  function choosePhotoQuote(item) {
    const text = [
      item.category,
      ...(Array.isArray(item.tags) ? item.tags : []),
      item.title,
      item.description,
      item.seriesName,
      item.seriesDescription,
    ].join(' ').toLowerCase();

    const score = {
      'portrait-craft': 0,
      'light-and-shadow': 0,
      'editorial-form': 0,
      'commercial-detail': 0,
      'street-observation': 0,
      'movement-and-time': 0,
      'general-photography': 1,
    };

    const addScore = (theme, words, weight) => {
      words.forEach(word => {
        if (text.includes(word)) score[theme] += weight;
      });
    };

    if (item.category === 'portrait') score['portrait-craft'] += 4;
    if (item.category === 'editorial' || item.category === 'fashion') score['editorial-form'] += 4;
    if (item.category === 'commercial') score['commercial-detail'] += 4;
    if (item.category === 'street') score['street-observation'] += 4;

    addScore('portrait-craft', ['portrait', 'face', 'faces', 'subject', 'person', 'people', 'presence', 'gaze'], 2);
    addScore('light-and-shadow', ['light', 'shadow', 'glow', 'gold', 'golden', 'haze', 'sun', 'harmattan', 'silhouette', 'night'], 2);
    addScore('editorial-form', ['editorial', 'fashion', 'style', 'styled', 'lookbook', 'beauty', 'wardrobe'], 2);
    addScore('commercial-detail', ['commercial', 'brand', 'product', 'campaign', 'detail', 'studio', 'advert'], 2);
    addScore('street-observation', ['street', 'city', 'lagos', 'market', 'documentary', 'travel', 'urban'], 2);
    addScore('movement-and-time', ['motion', 'movement', 'dance', 'running', 'walking', 'drive', 'journey', 'pace'], 2);

    const theme = Object.keys(score).sort((a, b) => score[b] - score[a])[0] || 'general-photography';
    const bank = PHOTO_QUOTE_BANK[theme] || PHOTO_QUOTE_BANK['general-photography'];
    const seed = [
      item.seriesKey,
      item.seriesName,
      item.category,
      (Array.isArray(item.tags) ? item.tags.join('|') : ''),
      item.title,
    ].join('|');
    const quote = bank[hashSeed(seed) % bank.length];
    const analysisHintMap = {
      'portrait-craft': 'metadata cue: subject-centered portrait language',
      'light-and-shadow': 'metadata cue: strong light and atmosphere terms',
      'editorial-form': 'metadata cue: styling and editorial composition terms',
      'commercial-detail': 'metadata cue: brand/product/campaign terms',
      'street-observation': 'metadata cue: city/documentary/street terms',
      'movement-and-time': 'metadata cue: movement and timing terms',
      'general-photography': 'metadata cue: fallback photography language',
    };

    return {
      projectQuote: quote,
      quoteTheme: theme,
      quoteSource: 'metadata-v1',
      analysisHint: analysisHintMap[theme] || analysisHintMap['general-photography'],
    };
  }

  function withProjectQuote(item) {
    if (!item || item.type !== 'image') return item;
    const derived = choosePhotoQuote(item);
    return {
      ...item,
      projectQuote: String(item.projectQuote || derived.projectQuote || '').trim(),
      quoteTheme: String(item.quoteTheme || derived.quoteTheme || '').trim(),
      quoteSource: String(item.quoteSource || derived.quoteSource || 'metadata-v1').trim(),
      analysisHint: String(item.analysisHint || derived.analysisHint || '').trim(),
    };
  }

  function uniqueTags(tags) {
    return [...new Set(normalizeTags(tags))];
  }

  function getDefaultStore() {
    return {
      items: [],
      settings: {
        heroSlots: {
          hero_card_1: '',
          hero_card_2: '',
          hero_card_3: '',
          about_main: '',
          about_sec: '',
        },
        featuredWorkIds: ['', '', '', '', '', ''],
      },
    };
  }

  function normalizeSettings(settings) {
    const base = getDefaultStore().settings;
    const heroSlots = { ...base.heroSlots, ...(settings && settings.heroSlots ? settings.heroSlots : {}) };
    const featuredWorkIds = Array.isArray(settings && settings.featuredWorkIds) ? settings.featuredWorkIds.slice(0, 6) : base.featuredWorkIds;
    while (featuredWorkIds.length < 6) featuredWorkIds.push('');
    return {
      heroSlots: {
        hero_card_1: String(heroSlots.hero_card_1 || ''),
        hero_card_2: String(heroSlots.hero_card_2 || ''),
        hero_card_3: String(heroSlots.hero_card_3 || ''),
        about_main: String(heroSlots.about_main || ''),
        about_sec: String(heroSlots.about_sec || ''),
      },
      featuredWorkIds: featuredWorkIds.map(value => String(value || '')),
    };
  }

  function getStore() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultStore();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return getDefaultStore();
      return {
        items: parsed.items.map(normalizeItem).filter(Boolean),
        settings: normalizeSettings(parsed.settings),
      };
    } catch (error) {
      return getDefaultStore();
    }
  }

  function saveStore(store) {
    const clean = {
      items: (store.items || []).map(normalizeItem).filter(Boolean),
      settings: normalizeSettings(store.settings),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  }

  function storesMatch(a, b) {
    return JSON.stringify(a || getDefaultStore()) === JSON.stringify(b || getDefaultStore());
  }

  function canUseApi() {
    return typeof window !== 'undefined' && window.location && /^https?:$/i.test(window.location.protocol);
  }

  function normalizeItem(item) {
    if (!item || !item.src || !item.type) return null;
    const type = item.type === 'video' ? 'video' : 'image';
    const title = String(item.title || '').trim() || 'Untitled';
    const category = normalizeCategory(type, item.category || (Array.isArray(item.tags) ? item.tags[0] : String(item.tags || '').split(',')[0]));
    const tags = [...new Set([category].concat(uniqueTags(item.tags)))];
    const normalized = {
      id: String(item.id || slugify(title + '-' + item.src)),
      type,
      title,
      src: String(item.src || '').trim(),
      sourceUrl: String(item.sourceUrl || item.src || '').trim(),
      thumb: String(item.thumb || '').trim(),
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      embedUrl: String(item.embedUrl || '').trim(),
      videoProvider: String(item.videoProvider || '').trim(),
      fileCode: String(item.fileCode || '').trim(),
      useHls: Boolean(item.useHls),
      category,
      seriesKey: type === 'image' ? String(item.seriesKey || '').trim() : '',
      seriesName: type === 'image' ? String(item.seriesName || '').trim() : '',
      seriesDescription: type === 'image' ? String(item.seriesDescription || '').trim() : '',
      seriesYear: type === 'image' ? String(item.seriesYear || '').trim() : '',
      year: String(item.year || '').trim(),
      client: String(item.client || '').trim(),
      duration: String(item.duration || '').trim(),
      description: String(item.description || '').trim(),
      tags,
      featured: Boolean(item.featured),
      createdAt: Number(item.createdAt || Date.now()),
    };
    return withProjectQuote(normalized);
  }

  function addItem(item) {
    const store = getStore();
    const normalized = normalizeItem(item);
    if (!normalized) return store;
    store.items.unshift(normalized);
    return saveStore(store);
  }

  function deleteItem(id) {
    const store = getStore();
    store.items = store.items.filter(item => item.id !== id);
    return saveStore(store);
  }

  function replaceStore(nextStore) {
    return saveStore(nextStore || getDefaultStore());
  }

  async function refreshRemote() {
    if (!canUseApi()) return getStore();
    try {
      const response = await fetch(API_BASE, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error('Failed to fetch content');
      const remoteStore = await response.json();
      const normalized = {
        items: (remoteStore.items || []).map(normalizeItem).filter(Boolean),
        settings: normalizeSettings(remoteStore.settings),
      };
      const localStore = getStore();
      if (!storesMatch(localStore, normalized)) {
        saveStore(normalized);
        window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: normalized }));
      }
      return normalized;
    } catch (error) {
      return getStore();
    }
  }

  async function saveRemoteItem(item) {
    if (!canUseApi()) return addItem(item);
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(normalizeItem(item)),
    });
    if (!response.ok) throw new Error('Failed to save content');
    const store = await response.json();
    return saveStore(store);
  }

  async function updateRemoteItem(id, item) {
    if (!canUseApi()) {
      const store = getStore();
      store.items = store.items.map(entry => entry.id === id ? normalizeItem({ ...entry, ...item, id }) : entry);
      return saveStore(store);
    }
    const response = await fetch(API_BASE + '/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('Failed to update content');
    const store = await response.json();
    return saveStore(store);
  }

  async function deleteRemoteItem(id) {
    if (!canUseApi()) return deleteItem(id);
    const response = await fetch(API_BASE + '/' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to delete content');
    const store = await response.json();
    return saveStore(store);
  }

  async function replaceRemoteStore(nextStore) {
    if (!canUseApi()) return replaceStore(nextStore);
    const response = await fetch(API_BASE, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(nextStore || getDefaultStore()),
    });
    if (!response.ok) throw new Error('Failed to replace content store');
    const store = await response.json();
    return saveStore(store);
  }

  async function saveRemoteSettings(settings) {
    const localStore = getStore();
    if (!canUseApi()) {
      localStore.settings = normalizeSettings(settings);
      return saveStore(localStore);
    }
    const response = await fetch(BACKEND_URL + '/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(normalizeSettings(settings)),
    });
    if (!response.ok) throw new Error('Failed to save settings');
    const store = await response.json();
    return saveStore(store);
  }

  function hasAnyTag(item, tags) {
    const normalized = tags.map(normalizeTag);
    return normalized.some(tag => item.tags.includes(tag));
  }

  function pick(items, tags, limit) {
    return items.filter(item => hasAnyTag(item, tags)).slice(0, limit);
  }

  function fillSlots(overrides, slots, items) {
    slots.forEach((slot, index) => {
      const item = items[index];
      if (!item) return;
      overrides[slot] = buildMediaOverride(item);
    });
  }

  function buildMediaOverride(item) {
    const embeddedVideoPreview = item.type === 'video' && item.embedUrl && item.thumb;
    return {
      src: embeddedVideoPreview ? item.thumb : item.src,
      sourceUrl: item.sourceUrl || item.src,
      type: embeddedVideoPreview ? 'image' : item.type,
      alt: item.title,
      thumb: item.thumb || '',
      embedUrl: item.embedUrl || '',
      videoProvider: item.videoProvider || '',
      item,
    };
  }

  function chooseFeatured(items, type, tags) {
    const pool = items.filter(item => item.type === type);
    return (
      pool.find(item => item.featured && hasAnyTag(item, tags)) ||
      pool.find(item => hasAnyTag(item, tags)) ||
      pool.find(item => item.featured) ||
      pool[0] ||
      null
    );
  }

  function findItemById(items, id) {
    return items.find(item => item.id === id) || null;
  }

  function findSeriesMeta(items, category, fallback) {
    const pool = items.filter(item => item.type === 'image' && (item.category === category || hasAnyTag(item, [category])));
    const source = pool.find(item => item.seriesName || item.seriesDescription || item.seriesYear) || pool[0] || null;
    return {
      title: source && source.seriesName ? source.seriesName : fallback.title,
      description: source && source.seriesDescription ? source.seriesDescription : fallback.description,
      year: source && source.seriesYear ? source.seriesYear : fallback.year,
      category: source && source.category ? source.category : category,
      projectQuote: source && source.projectQuote ? source.projectQuote : '',
      quoteTheme: source && source.quoteTheme ? source.quoteTheme : '',
      quoteSource: source && source.quoteSource ? source.quoteSource : '',
      analysisHint: source && source.analysisHint ? source.analysisHint : '',
    };
  }

  function groupPhotoProjects(items) {
    const groups = new Map();
    items.forEach(item => {
      if (item.type !== 'image') return;
      const category = item.category === 'fashion' ? 'editorial' : item.category;
      const projectKey = item.seriesKey || slugify((item.seriesName || item.title || category) + '-' + category);
      const key = category + '::' + projectKey;
      if (!groups.has(key)) {
        groups.set(key, {
          category,
          projectKey,
          title: item.seriesName || item.title || category,
          description: item.seriesDescription || item.description || '',
          year: item.seriesYear || item.year || '',
          projectQuote: item.projectQuote || '',
          quoteTheme: item.quoteTheme || '',
          quoteSource: item.quoteSource || '',
          analysisHint: item.analysisHint || '',
          items: [],
          latestAt: 0,
        });
      }
      const group = groups.get(key);
      group.items.push(item);
      group.latestAt = Math.max(group.latestAt, Number(item.createdAt || 0));
      if (!group.description && item.seriesDescription) group.description = item.seriesDescription;
      if (!group.year && item.seriesYear) group.year = item.seriesYear;
      if (item.seriesName) group.title = item.seriesName;
      if (!group.projectQuote && item.projectQuote) group.projectQuote = item.projectQuote;
      if (!group.quoteTheme && item.quoteTheme) group.quoteTheme = item.quoteTheme;
      if (!group.quoteSource && item.quoteSource) group.quoteSource = item.quoteSource;
      if (!group.analysisHint && item.analysisHint) group.analysisHint = item.analysisHint;
    });
    groups.forEach(group => group.items.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));
    return [...groups.values()];
  }

  function pickPhotoProject(projects, category) {
    return projects
      .filter(project => project.category === category)
      .sort((a, b) => b.latestAt - a.latestAt)[0] || null;
  }

  function normalizeVideoCategoryLabel(category) {
    const map = {
      documentary: 'Documentary',
      'music-video': 'Music Video',
      wedding: 'Wedding',
      advert: 'Brand Advert',
      church: 'Church Highlight',
    };
    return map[category] || 'Video';
  }

  function choosePreviewPool(items, criteria) {
    const limit = criteria.limit || 4;
    return items.filter(item => {
      if (criteria.type && item.type !== criteria.type) return false;
      if (criteria.categories && criteria.categories.includes(item.category)) return true;
      if (criteria.tags && hasAnyTag(item, criteria.tags)) return true;
      return false;
    }).sort((a, b) => {
      const aPlayable = a.type === 'video' && !a.embedUrl ? 1 : 0;
      const bPlayable = b.type === 'video' && !b.embedUrl ? 1 : 0;
      if (bPlayable !== aPlayable) return bPlayable - aPlayable;
      return Number(b.createdAt || 0) - Number(a.createdAt || 0);
    }).slice(0, limit);
  }

  function buildOverrides(store) {
    const items = (store.items || []).slice().sort((a, b) => {
      if (Number(b.featured) !== Number(a.featured)) return Number(b.featured) - Number(a.featured);
      return b.createdAt - a.createdAt;
    });
    const settings = normalizeSettings(store.settings);

    const videos = items.filter(item => item.type === 'video');
    const photos = items.filter(item => item.type === 'image');

    const documentary = videos.filter(item => item.category === 'documentary' || hasAnyTag(item, ['documentary', 'doc', 'story'])).slice(0, 6);
    const music = videos.filter(item => item.category === 'music-video' || hasAnyTag(item, ['music-video', 'music', 'performance'])).slice(0, 6);
    const wedding = videos.filter(item => item.category === 'wedding' || hasAnyTag(item, ['wedding', 'event-video', 'event', 'conference', 'corporate-event'])).slice(0, 5);
    const advert = videos.filter(item => item.category === 'advert' || hasAnyTag(item, ['brand', 'advert', 'commercial', 'campaign'])).slice(0, 3);
    const church = videos.filter(item => item.category === 'church' || hasAnyTag(item, ['church', 'ministry', 'worship'])).slice(0, 3);

    const photoProjects = groupPhotoProjects(photos);
    const portraitProject = pickPhotoProject(photoProjects, 'portrait');
    const editorialProject = pickPhotoProject(photoProjects, 'editorial');
    const commercialProject = pickPhotoProject(photoProjects, 'commercial');
    const streetProject = pickPhotoProject(photoProjects, 'street');

    const portraits = (portraitProject ? portraitProject.items : photos.filter(item => item.category === 'portrait' || hasAnyTag(item, ['portrait', 'headshot', 'people']))).slice(0, 5);
    const editorial = (editorialProject ? editorialProject.items : photos.filter(item => item.category === 'editorial' || item.category === 'fashion' || hasAnyTag(item, ['editorial', 'fashion', 'style']))).slice(0, 5);
    const commercial = (commercialProject ? commercialProject.items : photos.filter(item => item.category === 'commercial' || hasAnyTag(item, ['commercial', 'brand', 'product', 'campaign']))).slice(0, 5);
    const street = (streetProject ? streetProject.items : photos.filter(item => item.category === 'street' || hasAnyTag(item, ['street', 'documentary', 'travel', 'city']))).slice(0, 5);
    const fashion = photos.filter(item => item.category === 'fashion' || hasAnyTag(item, ['fashion', 'editorial', 'style'])).slice(0, 1);

    const overrides = {};

    fillSlots(overrides, ['vg_doc_1', 'vg_doc_2', 'vg_doc_3', 'vg_doc_4', 'vg_doc_5', 'vg_doc_6'], documentary);
    fillSlots(overrides, ['vg_mv_1', 'vg_mv_2', 'vg_mv_3', 'vg_mv_4', 'vg_mv_5', 'vg_mv_6'], music);
    fillSlots(overrides, ['vg_wed_1', 'vg_wed_2', 'vg_wed_3', 'vg_wed_4', 'vg_wed_5'], wedding);
    fillSlots(overrides, ['vg_ad_1', 'vg_ad_2', 'vg_ad_3'], advert);
    fillSlots(overrides, ['vg_ch_1', 'vg_ch_2', 'vg_ch_3'], church);

    fillSlots(overrides, ['pg_s1_p1', 'pg_s1_p2', 'pg_s1_p3', 'pg_s1_p4', 'pg_s1_p5'], portraits);
    fillSlots(overrides, ['pg_s2_p1', 'pg_s2_p2', 'pg_s2_p3', 'pg_s2_p4', 'pg_s2_p5'], editorial);
    fillSlots(overrides, ['pg_s3_p1', 'pg_s3_p2', 'pg_s3_p3', 'pg_s3_p4', 'pg_s3_p5'], commercial);
    fillSlots(overrides, ['pg_s4_p1', 'pg_s4_p2', 'pg_s4_p3', 'pg_s4_p4', 'pg_s4_p5'], street);

    fillSlots(overrides, ['g_vpanel_1'], documentary.slice(0, 1));
    fillSlots(overrides, ['g_vpanel_2'], music.slice(0, 1));
    fillSlots(overrides, ['g_vpanel_3'], wedding.slice(0, 1));
    fillSlots(overrides, ['g_vpanel_4'], advert.slice(0, 1));
    fillSlots(overrides, ['g_vpanel_5'], church.slice(0, 1));

    fillSlots(overrides, ['g_pcard_1'], portraits.slice(0, 1));
    fillSlots(overrides, ['g_pcard_2'], editorial.slice(0, 1));
    fillSlots(overrides, ['g_pcard_3'], commercial.slice(0, 1));
    fillSlots(overrides, ['g_pcard_4'], street.slice(0, 1));
    fillSlots(overrides, ['g_pcard_5'], fashion);

    const portfolioImage = chooseFeatured(items, 'image', ['portrait', 'editorial', 'commercial', 'street']);
    const portfolioVideo = chooseFeatured(items, 'video', ['documentary', 'wedding', 'music-video', 'brand', 'church']);
    const portfolioFeatured = [
      chooseFeatured(items, 'image', ['editorial', 'fashion']),
      chooseFeatured(items, 'image', ['commercial', 'brand']),
      chooseFeatured(items, 'video', ['documentary', 'music-video', 'wedding', 'brand']),
    ];

    ['hero_card_1', 'hero_card_2', 'hero_card_3'].forEach((slot, index) => {
      const item = findItemById(items, settings.heroSlots[slot]) || portfolioFeatured[index];
      if (!item) return;
      overrides[slot] = buildMediaOverride(item);
    });

    const aboutMain = findItemById(items, settings.heroSlots.about_main) || portfolioImage;
    const aboutSec = findItemById(items, settings.heroSlots.about_sec) || portfolioVideo;
    if (aboutMain) overrides.about_main = buildMediaOverride(aboutMain);
    if (aboutSec) overrides.about_sec = buildMediaOverride(aboutSec);

    const featuredWorks = [
      chooseFeatured(items, 'image', ['editorial']),
      chooseFeatured(items, 'video', ['documentary']),
      chooseFeatured(items, 'image', ['commercial', 'brand']),
      chooseFeatured(items, 'image', ['portrait']),
      videos.find(item => item.title && item.title !== (overrides.work_02 && overrides.work_02.alt) && hasAnyTag(item, ['documentary', 'church', 'event'])) || null,
      chooseFeatured(items, 'video', ['music-video']),
    ];
    ['work_01', 'work_02', 'work_03', 'work_04', 'work_05', 'work_06'].forEach((slot, index) => {
      const item = findItemById(items, settings.featuredWorkIds[index]) || featuredWorks[index];
      if (!item) return;
      overrides[slot] = buildMediaOverride(item);
    });

    return {
      overrides,
      settings,
      videoMeta: {
        documentary: { label: normalizeVideoCategoryLabel('documentary'), items: documentary },
        'music-video': { label: normalizeVideoCategoryLabel('music-video'), items: music },
        wedding: { label: normalizeVideoCategoryLabel('wedding'), items: wedding },
        advert: { label: normalizeVideoCategoryLabel('advert'), items: advert },
        church: { label: normalizeVideoCategoryLabel('church'), items: church },
      },
      seriesMeta: {
        portrait: portraitProject ? {
          title: portraitProject.title,
          description: portraitProject.description || 'An ongoing portrait series documenting the raw, unguarded humanity of Lagos.',
          year: portraitProject.year || '2023 — Ongoing',
          category: 'portrait',
          projectKey: portraitProject.projectKey,
          projectQuote: portraitProject.projectQuote || '',
          quoteTheme: portraitProject.quoteTheme || '',
          quoteSource: portraitProject.quoteSource || '',
          analysisHint: portraitProject.analysisHint || '',
          items: portraitProject.items,
        } : findSeriesMeta(items, 'portrait', {
          title: 'Faces of Lagos',
          description: 'An ongoing portrait series documenting the raw, unguarded humanity of Lagos.',
          year: '2023 — Ongoing',
        }),
        editorial: editorialProject ? {
          title: editorialProject.title,
          description: editorialProject.description || 'A sun-drenched editorial series exploring light, texture, and the atmospheric haze of harmattan.',
          year: editorialProject.year || '2024',
          category: 'editorial',
          projectKey: editorialProject.projectKey,
          projectQuote: editorialProject.projectQuote || '',
          quoteTheme: editorialProject.quoteTheme || '',
          quoteSource: editorialProject.quoteSource || '',
          analysisHint: editorialProject.analysisHint || '',
          items: editorialProject.items,
        } : findSeriesMeta(items, 'editorial', {
          title: 'Harmattan Gold',
          description: 'A sun-drenched editorial series exploring light, texture, and the atmospheric haze of harmattan.',
          year: '2024',
        }),
        commercial: commercialProject ? {
          title: commercialProject.title,
          description: commercialProject.description || 'Full commercial campaign imagery from concept to delivery.',
          year: commercialProject.year || '2023',
          category: 'commercial',
          projectKey: commercialProject.projectKey,
          projectQuote: commercialProject.projectQuote || '',
          quoteTheme: commercialProject.quoteTheme || '',
          quoteSource: commercialProject.quoteSource || '',
          analysisHint: commercialProject.analysisHint || '',
          items: commercialProject.items,
        } : findSeriesMeta(items, 'commercial', {
          title: 'Brand Pulse',
          description: 'Full commercial campaign imagery from concept to delivery.',
          year: '2023',
        }),
        street: streetProject ? {
          title: streetProject.title,
          description: streetProject.description || 'Street photography across Lagos from dusk to dawn.',
          year: streetProject.year || '2022 — 2024',
          category: 'street',
          projectKey: streetProject.projectKey,
          projectQuote: streetProject.projectQuote || '',
          quoteTheme: streetProject.quoteTheme || '',
          quoteSource: streetProject.quoteSource || '',
          analysisHint: streetProject.analysisHint || '',
          items: streetProject.items,
        } : findSeriesMeta(items, 'street', {
          title: 'The City Breathes',
          description: 'Street photography across Lagos from dusk to dawn.',
          year: '2022 — 2024',
        }),
      },
      counts: {
        videos: videos.length,
        photos: photos.length,
        photoProjects: photoProjects.length,
        photoSeries: [portraitProject, editorialProject, commercialProject, streetProject].filter(Boolean).length,
        videoCategoriesUsed: [documentary, music, wedding, advert, church].filter(list => list.length > 0).length,
        documentary: documentary.length,
        music: music.length,
        wedding: wedding.length,
        advert: advert.length,
        church: church.length,
        portrait: portraits.length,
        editorial: editorial.length,
        commercial: commercial.length,
        street: street.length,
      },
      serviceMedia: {
        'film-video': choosePreviewPool(items, {
          type: 'video',
          categories: ['advert', 'documentary', 'music-video'],
          tags: ['brand', 'advert', 'campaign', 'documentary', 'music-video'],
          limit: 4,
        }),
        'outdoor-photo': choosePreviewPool(items, {
          type: 'image',
          categories: ['editorial', 'street', 'portrait'],
          tags: ['editorial', 'street', 'portrait', 'fashion', 'lifestyle'],
          limit: 5,
        }),
        'events-coverage': choosePreviewPool(items, {
          type: 'video',
          categories: ['church', 'wedding', 'documentary'],
          tags: ['church', 'wedding', 'event', 'conference', 'worship'],
          limit: 4,
        }),
        'post-production': choosePreviewPool(items, {
          categories: ['advert', 'church', 'wedding', 'editorial', 'commercial'],
          tags: ['brand', 'commercial', 'church', 'wedding', 'editorial', 'campaign'],
          limit: 4,
        }),
      },
    };
  }

  function mergeIntoConfig(target) {
    const { overrides } = buildOverrides(getStore());
    Object.keys(overrides).forEach(key => {
      if (!target[key]) return;
      Object.assign(target[key], overrides[key]);
    });
    return overrides;
  }

  function applyText(el, selector, value) {
    if (!el || !value) return;
    const node = el.querySelector(selector);
    if (node) node.textContent = value;
  }

  function hydrateGalleryPage() {
    const { overrides, counts } = buildOverrides(getStore());
    ['g_vpanel_1', 'g_vpanel_2', 'g_vpanel_3', 'g_vpanel_4', 'g_vpanel_5'].forEach(key => {
      const wrap = document.getElementById('mw-' + key);
      const card = wrap ? wrap.closest('.vpanel') : null;
      const item = overrides[key] && overrides[key].item;
      if (!card || !item) return;
      applyText(card, '.vpanel-type', item.tags[0] ? item.tags[0].replace(/-/g, ' ') : item.type);
      applyText(card, '.vpanel-cat', item.tags[0] ? item.tags[0].replace(/-/g, ' ') : item.type);
      applyText(card, '.vpanel-name', item.title);
      applyText(card, '.vpanel-year', item.year || '');
    });

    ['g_pcard_1', 'g_pcard_2', 'g_pcard_3', 'g_pcard_4', 'g_pcard_5'].forEach(key => {
      const wrap = document.getElementById('mw-' + key);
      const card = wrap ? wrap.closest('.pcard') : null;
      const item = overrides[key] && overrides[key].item;
      if (!card || !item) return;
      applyText(card, '.pcard-cat', item.tags[0] ? item.tags[0].replace(/-/g, ' ') : item.type);
      applyText(card, '.pcard-name', item.title);
    });

    const countsEls = document.querySelectorAll('.sec-count');
    if (countsEls[0]) countsEls[0].textContent = '(' + counts.videos + ' films)';
    if (countsEls[1]) countsEls[1].textContent = '(' + counts.photos + ' works)';

    const statNums = document.querySelectorAll('.photo-stat-n');
    const statLabels = document.querySelectorAll('.photo-stat-l');
    if (statNums[0] && statLabels[0] && /Film Projects/i.test(statLabels[0].textContent)) statNums[0].textContent = String(counts.videos);
    if (statNums[1] && statLabels[1] && /Categories/i.test(statLabels[1].textContent)) statNums[1].textContent = String(counts.videoCategoriesUsed || 5);
    if (statNums[2] && statLabels[2] && /Photo Projects/i.test(statLabels[2].textContent)) statNums[2].textContent = String(counts.photoProjects || counts.photos);
    if (statNums[3] && statLabels[3] && /Series/i.test(statLabels[3].textContent)) statNums[3].textContent = String(counts.photoSeries || 4);
  }

  function hydratePortfolioPage() {
    const { counts } = buildOverrides(getStore());
    document.querySelectorAll('.stats > div').forEach(statCard => {
      const valueEl = statCard.querySelector('.stat-n');
      const labelEl = statCard.querySelector('.stat-l');
      if (!valueEl || !labelEl) return;
      const label = labelEl.textContent.trim().toLowerCase();
      if (label === 'years active') valueEl.textContent = '3+';
      if (label === 'projects done') valueEl.textContent = String(counts.videos);
    });
  }

  function hydrateVideoPage() {
    const { overrides, counts, videoMeta } = buildOverrides(getStore());
    const countMap = {
      doc: counts.documentary,
      music: counts.music,
      wedding: counts.wedding,
      advert: counts.advert,
      church: counts.church,
    };

    document.querySelectorAll('.cat-tab').forEach(button => {
      const onclick = button.getAttribute('onclick') || '';
      const match = onclick.match(/'([^']+)'/g);
      const cat = match && match[1] ? match[1].replace(/'/g, '') : '';
      const countEl = button.querySelector('.cat-tab-count');
      if (countEl && countMap[cat] !== undefined) {
        countEl.textContent = countMap[cat] + ' films';
      }
    });

    const sectionMap = {
      'cat-doc': counts.documentary,
      'cat-music': counts.music,
      'cat-wedding': counts.wedding,
      'cat-advert': counts.advert,
      'cat-church': counts.church,
    };
    Object.keys(sectionMap).forEach(id => {
      const section = document.getElementById(id);
      if (!section) return;
      const countEl = section.querySelector('.cat-section-head span:last-child');
      if (countEl) countEl.textContent = String(sectionMap[id]).padStart(2, '0') + ' FILMS';
    });

    Object.keys(overrides).filter(key => key.startsWith('vg_')).forEach(key => {
      const wrap = document.getElementById('mw-' + key);
      const card = wrap ? wrap.closest('.vcard') : null;
      const item = overrides[key] && overrides[key].item;
      if (!card || !item) return;
      const category = item.tags[0] ? item.tags[0].replace(/-/g, ' ') : 'Video';
      applyText(card, '.vcard-type', category);
      applyText(card, '.vcard-year', item.year || '');
      applyText(card, '.vcard-title', item.title);
      applyText(card, '.vcard-client', item.client || 'Anon Studios');
      applyText(card, '.vcard-dur', item.duration || '');
      card.onclick = function () {
        if (typeof window.openVideo === 'function') {
          window.openVideo(category, item.title, item.description || item.title, key);
        }
      };
    });

    document.querySelectorAll('.vg-stats > div').forEach(statCard => {
      const valueEl = statCard.querySelector('.vg-stat-n');
      const labelEl = statCard.querySelector('.vg-stat-l');
      if (!valueEl || !labelEl) return;
      const label = labelEl.textContent.trim().toLowerCase();
      if (label === 'films') valueEl.textContent = String(counts.videos);
      if (label === 'categories') valueEl.textContent = String(counts.videoCategoriesUsed || 5);
      if (label === 'years') valueEl.textContent = '3+';
    });
  }

  function hydratePhotoPage() {
    const { overrides, counts, seriesMeta } = buildOverrides(getStore());
    const filterCounts = {
      portrait: counts.portrait,
      editorial: counts.editorial,
      commercial: counts.commercial,
      street: counts.street,
    };

    document.querySelectorAll('.series').forEach(series => {
      const wraps = series.querySelectorAll('.media-wrap[id^="mw-pg_"]');
      const firstKey = wraps[0] ? wraps[0].id.replace('mw-', '') : '';
      const seriesType = firstKey.startsWith('pg_s1_') ? 'portrait' :
        firstKey.startsWith('pg_s2_') ? 'editorial' :
        firstKey.startsWith('pg_s3_') ? 'commercial' :
        firstKey.startsWith('pg_s4_') ? 'street' : '';
      const meta = seriesMeta[seriesType];
      if (meta) {
        applyText(series, '.series-title', meta.title);
        applyText(series, '.series-desc', meta.description);
        applyText(series, '.series-cat', meta.category.replace(/-/g, ' '));
        applyText(series, '.series-yr', meta.year);
      }
      wraps.forEach((wrap, index) => {
        const key = wrap.id.replace('mw-', '');
        const item = overrides[key] && overrides[key].item;
        const panel = wrap.closest('.spanel');
        const listItem = series.querySelectorAll('.series-list-item')[index];
        if (!item) return;
        if (panel) {
          applyText(panel, '.spanel-cat', item.tags[0] ? item.tags[0].replace(/-/g, ' ') : 'Photo');
          applyText(panel, '.spanel-name', item.title);
          panel.onclick = function () {
            if (typeof window.openLB === 'function') {
              window.openLB(meta ? meta.title : item.seriesName || item.title, meta ? meta.category.replace(/-/g, ' ') : (item.category || 'Photo'), item.description || (meta ? meta.description : item.title), index);
            }
          };
        }
        if (listItem) {
          listItem.childNodes[0].textContent = item.title + ' ';
          listItem.onclick = function () {
            if (typeof window.openLB === 'function') {
              window.openLB(meta ? meta.title : item.seriesName || item.title, meta ? meta.category.replace(/-/g, ' ') : (item.category || 'Photo'), item.description || (meta ? meta.description : item.title), index);
            }
          };
        }
      });

      const cta = series.querySelector('.series-cta');
      if (cta && meta) {
        cta.onclick = function () {
          if (typeof window.openLB === 'function') {
            window.openLB(meta.title, meta.category.replace(/-/g, ' '), meta.description, 0);
          }
        };
      }
    });

    document.querySelectorAll('.filter-btn').forEach(button => {
      const onclick = button.getAttribute('onclick') || '';
      const match = onclick.match(/'([^']+)'/g);
      const filter = match && match[1] ? match[1].replace(/'/g, '') : '';
      if (!filter || filter === 'all') return;
      const count = filterCounts[filter];
      if (typeof count === 'number' && count === 0) {
        button.style.opacity = '0.55';
      }
    });

    const statStrong = document.querySelectorAll('.ph-stat strong');
    if (statStrong[0]) statStrong[0].textContent = String(counts.photos);
    if (statStrong[1]) statStrong[1].textContent = String(counts.photoProjects || 0);
    if (statStrong[2]) statStrong[2].textContent = String(counts.photoSeries || 4);
  }

  window.AnonContent = {
    STORAGE_KEY,
    getStore,
    saveStore,
    addItem,
    deleteItem,
    replaceStore,
    refreshRemote,
    saveRemoteItem,
    updateRemoteItem,
    deleteRemoteItem,
    replaceRemoteStore,
    saveRemoteSettings,
    buildOverrides: function () { return buildOverrides(getStore()); },
    getPhotoSeriesMeta: function () { return buildOverrides(getStore()).seriesMeta; },
    getVideoCategoryMeta: function () { return buildOverrides(getStore()).videoMeta; },
    getServicePreviewMedia: function () { return buildOverrides(getStore()).serviceMedia; },
    mergeIntoConfig,
    refreshRemote,
    hydratePortfolioPage,
    hydrateGalleryPage,
    hydrateVideoPage,
    hydratePhotoPage,
    normalizeTags,
    events: {
      updated: UPDATE_EVENT,
    },
  };

  refreshRemote();
})();
