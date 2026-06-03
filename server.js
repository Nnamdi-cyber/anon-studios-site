const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const {
  buildProposalEmail,
  buildStoryFirstEmail,
  isPortfolioBotConfigured,
  sendCustomHtmlEmail,
  sendProposalEmail,
  sendStoryFirstEmail,
} = require('./services/portfolio-bot-mailer');
const {
  createPublicPlaybackPayload,
  getCachedDoodstreamDirectLink,
  getDoodstreamConfig,
  uploadLocalFileToDoodstream,
  isDoodstreamConfigured,
  streamPassthroughHeaders,
} = require('./services/doodstream');
const {
  isPinataConfigured,
  uploadBufferToPinata,
} = require('./services/pinata');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const doodUploadDir = path.join(os.tmpdir(), 'anon-studios-doodstream');
if (!fs.existsSync(doodUploadDir)) fs.mkdirSync(doodUploadDir, { recursive: true });
const videoUpload = multer({
  dest: doodUploadDir,
  limits: { fileSize: Number(process.env.ADMIN_VIDEO_UPLOAD_LIMIT_MB || 2048) * 1024 * 1024 },
});
const port = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, 'data');
const contentFile = path.join(dataDir, 'content.json');
const defaultPassword = process.env.ADMIN_PASSWORD || 'anon2025';
const sessionSecret = process.env.SESSION_SECRET || 'anon-studios-session';
const sessionCookieName = 'anon_admin_session';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function defaultSettings() {
  return {
    heroSlots: {
      hero_card_1: '',
      hero_card_2: '',
      hero_card_3: '',
      about_main: '',
      about_sec: '',
    },
    featuredWorkIds: ['', '', '', '', '', ''],
  };
}

function defaultStore() {
  return {
    items: [],
    settings: defaultSettings(),
    auth: {
      passwordHash: hashValue(defaultPassword),
      updatedAt: Date.now(),
    },
  };
}

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(contentFile)) {
    fs.writeFileSync(contentFile, JSON.stringify(defaultStore(), null, 2));
  }
}

function normalizeSettings(settings) {
  const base = defaultSettings();
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

function readStore() {
  ensureDataFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      settings: normalizeSettings(parsed.settings),
      auth: {
        passwordHash: String(parsed.auth && parsed.auth.passwordHash ? parsed.auth.passwordHash : hashValue(defaultPassword)),
        updatedAt: Number(parsed.auth && parsed.auth.updatedAt ? parsed.auth.updatedAt : Date.now()),
      },
    };
  } catch (error) {
    return defaultStore();
  }
}

function writeStore(store) {
  ensureDataFile();
  const clean = {
    items: Array.isArray(store.items) ? store.items : [],
    settings: normalizeSettings(store.settings),
    auth: {
      passwordHash: String(store.auth && store.auth.passwordHash ? store.auth.passwordHash : hashValue(defaultPassword)),
      updatedAt: Number(store.auth && store.auth.updatedAt ? store.auth.updatedAt : Date.now()),
    },
  };
  fs.writeFileSync(contentFile, JSON.stringify(clean, null, 2));
  return clean;
}

function publicStore(store) {
  return {
    items: store.items,
    settings: store.settings,
  };
}

function normalizeTag(tag) {
  return String(tag || '')
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, '-')
    .replace(/\s+/g, '-');
}

function normalizeTags(tags) {
  const raw = Array.isArray(tags) ? tags : String(tags || '').split(',');
  return [...new Set(raw.map(normalizeTag).filter(Boolean))];
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
      films: 'documentary',
      event: 'documentary',
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

function normalizeSeriesKey(value) {
  return slugify(String(value || '').trim());
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

function normalizeItem(item) {
  if (!item || !item.src || !item.type) return null;
  const type = item.type === 'video' ? 'video' : 'image';
  const category = normalizeCategory(type, item.category || (Array.isArray(item.tags) ? item.tags[0] : String(item.tags || '').split(',')[0]));
  const tags = normalizeTags(item.tags);
  const mergedTags = [...new Set([category, ...tags])];
  const normalized = {
    id: String(item.id || slugify(item.title || item.src)),
    type,
    title: String(item.title || '').trim() || 'Untitled',
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
    seriesKey: type === 'image' ? String(item.seriesKey || normalizeSeriesKey(item.seriesName || category)).trim() : '',
    seriesName: type === 'image' ? String(item.seriesName || '').trim() : '',
    seriesDescription: type === 'image' ? String(item.seriesDescription || '').trim() : '',
    seriesYear: type === 'image' ? String(item.seriesYear || '').trim() : '',
    year: String(item.year || '').trim(),
    client: String(item.client || '').trim(),
    duration: String(item.duration || '').trim(),
    description: String(item.description || '').trim(),
    tags: mergedTags,
    featured: Boolean(item.featured),
    createdAt: Number(item.createdAt || Date.now()),
  };
  return withProjectQuote(normalized);
}

function optimizedImageUrl(publicId, width) {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    width,
    crop: 'limit',
    secure: true,
  });
}

function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

function isCloudinaryUrl(url) {
  return /res\.cloudinary\.com/i.test(String(url || ''));
}

async function optimizeRemoteThumb(url, title, category) {
  const source = String(url || '').trim();
  if (!source) return '';
  if (isCloudinaryUrl(source) || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return source;

  try {
    const result = await cloudinary.uploader.upload(source, {
      folder: 'anon-studios/video-thumbs',
      public_id: slugify(`${title || 'video-thumb'}-${Date.now()}`),
      resource_type: 'image',
      tags: normalizeTags([category, 'video-thumb']),
      overwrite: true,
    });
    return optimizedImageUrl(result.public_id, 1400);
  } catch (error) {
    return source;
  }
}

function extractYouTubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.replace(/^\/+/, '').split('/')[0] || '';
    if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');
    const parts = parsed.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex(part => part === 'embed' || part === 'shorts');
    return idx >= 0 && parts[idx + 1] ? parts[idx + 1] : '';
  } catch (error) {
    return '';
  }
}

function extractVimeoId(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split('/').filter(Boolean).reverse().find(part => /^\d+$/.test(part)) || '';
  } catch (error) {
    return '';
  }
}

async function enrichVideoItem(item) {
  if (!item || item.type !== 'video') return item;
  const src = String(item.sourceUrl || item.src || '').trim();
  if (!src) return item;

  if (/youtu\.be|youtube\.com/i.test(src)) {
    const id = extractYouTubeId(src);
    if (!id) return item;
    let metadata = {};
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(src)}&format=json`);
      if (response.ok) metadata = await response.json();
    } catch (error) {}
    const normalized = normalizeItem({
      ...item,
      title: item.title || metadata.title || 'YouTube Video',
      sourceUrl: src,
      src,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      videoProvider: 'youtube',
      thumb: item.thumb || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
    if (!normalized) return normalized;
    normalized.thumb = await optimizeRemoteThumb(normalized.thumb, normalized.title, normalized.category);
    return normalized;
  }

  if (/vimeo\.com/i.test(src)) {
    let metadata = {};
    try {
      const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(src)}`);
      if (response.ok) metadata = await response.json();
    } catch (error) {}
    const vimeoId = extractVimeoId(src);
    const normalized = normalizeItem({
      ...item,
      title: item.title || metadata.title || 'Vimeo Video',
      description: item.description || metadata.description || '',
      sourceUrl: src,
      src,
      embedUrl: metadata.video_id ? `https://player.vimeo.com/video/${metadata.video_id}` : (vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : ''),
      videoProvider: 'vimeo',
      thumb: item.thumb || metadata.thumbnail_url || '',
    });
    if (!normalized) return normalized;
    normalized.thumb = await optimizeRemoteThumb(normalized.thumb, normalized.title, normalized.category);
    return normalized;
  }

  const normalized = normalizeItem({
    ...item,
    sourceUrl: src,
    src,
  });
  if (!normalized) return normalized;
  normalized.thumb = await optimizeRemoteThumb(normalized.thumb, normalized.title, normalized.category);
  return normalized;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function buildSessionToken(passwordHash) {
  return hashValue(passwordHash + ':' + sessionSecret);
}

function requireAdmin(req, res, next) {
  const store = readStore();
  const cookies = parseCookies(req);
  const token = cookies[sessionCookieName];
  if (token && token === buildSessionToken(store.auth.passwordHash)) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

function setSessionCookie(res, passwordHash) {
  const token = buildSessionToken(passwordHash);
  res.setHeader('Set-Cookie', `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=None; Secure`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${sessionCookieName}=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0`);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    callback(null, origin);
  },
  credentials: true
}));
app.use(compression({
  threshold: 1024,
  level: 6,
}));
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'portfolio (5).html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.use(express.static(__dirname, {
  etag: true,
  lastModified: true,
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache');
      return;
    }
    if (['.js', '.css'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      return;
    }
    if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.mp4', '.webm', '.woff', '.woff2'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
    }
  },
}));

app.get('/api/content', (req, res) => {
  res.json(publicStore(readStore()));
});

app.get('/api/admin/session', (req, res) => {
  const store = readStore();
  const cookies = parseCookies(req);
  const authenticated = cookies[sessionCookieName] === buildSessionToken(store.auth.passwordHash);
  res.json({ authenticated });
});

app.post('/api/admin/login', (req, res) => {
  const store = readStore();
  const password = String(req.body && req.body.password ? req.body.password : '');
  if (hashValue(password) !== store.auth.passwordHash) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  setSessionCookie(res, store.auth.passwordHash);
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.post('/api/admin/password', requireAdmin, (req, res) => {
  const store = readStore();
  const currentPassword = String(req.body && req.body.currentPassword ? req.body.currentPassword : '');
  const nextPassword = String(req.body && req.body.nextPassword ? req.body.nextPassword : '');
  if (hashValue(currentPassword) !== store.auth.passwordHash) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  if (nextPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  store.auth.passwordHash = hashValue(nextPassword);
  store.auth.updatedAt = Date.now();
  writeStore(store);
  setSessionCookie(res, store.auth.passwordHash);
  res.json({ ok: true });
});

app.post('/api/content', requireAdmin, async (req, res) => {
  const store = readStore();
  const item = await enrichVideoItem(normalizeItem(req.body));
  if (!item) return res.status(400).json({ error: 'Invalid content payload' });
  store.items = store.items.filter(entry => entry.id !== item.id);
  store.items.unshift(item);
  res.json(publicStore(writeStore(store)));
});

app.put('/api/content', requireAdmin, async (req, res) => {
  const store = readStore();
  const incoming = Array.isArray(req.body && req.body.items) ? req.body.items : [];
  store.items = (await Promise.all(incoming.map(item => enrichVideoItem(normalizeItem(item))))).filter(Boolean);
  res.json(publicStore(writeStore(store)));
});

app.put('/api/content/:id', requireAdmin, async (req, res) => {
  const store = readStore();
  const existing = store.items.find(item => item.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Content item not found' });
  const item = await enrichVideoItem(normalizeItem({ ...existing, ...req.body, id: existing.id, createdAt: existing.createdAt }));
  if (!item) return res.status(400).json({ error: 'Invalid content payload' });
  store.items = store.items.map(entry => entry.id === existing.id ? item : entry);
  res.json(publicStore(writeStore(store)));
});

app.delete('/api/content/:id', requireAdmin, (req, res) => {
  const store = readStore();
  store.items = store.items.filter(item => item.id !== req.params.id);
  res.json(publicStore(writeStore(store)));
});

app.put('/api/settings', requireAdmin, (req, res) => {
  const store = readStore();
  store.settings = normalizeSettings(req.body || {});
  res.json(publicStore(writeStore(store)));
});

app.post('/api/upload-image', requireAdmin, upload.single('file'), async (req, res) => {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({ error: 'Cloudinary server credentials are not configured' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file received' });

  try {
    const title = String(req.body.title || '').trim() || req.file.originalname;
    const tags = normalizeTags(req.body.tags);
    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'anon-studios',
      public_id: slugify(title + '-' + Date.now()),
      resource_type: 'image',
      tags,
      overwrite: true,
      context: {
        title,
        tags: tags.join('|'),
      },
    });

    res.json({
      ok: true,
      publicId: result.public_id,
      src: optimizedImageUrl(result.public_id, 1800),
      thumb: optimizedImageUrl(result.public_id, 900),
      original: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Cloudinary upload failed',
      detail: error && error.message ? error.message : 'Unknown upload error',
    });
  }
});

app.post('/api/pinata/upload', requireAdmin, upload.single('file'), async (req, res) => {
  if (!isPinataConfigured()) {
    return res.status(500).json({ error: 'Pinata credentials are not configured on the server' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file received' });

  try {
    const filename = String(req.body.title || '').trim() || req.file.originalname;
    const mimetype = req.file.mimetype;
    const result = await uploadBufferToPinata(req.file.buffer, filename, mimetype);

    res.json({
      ok: true,
      ipfsHash: result.ipfsHash,
      src: result.gatewayUrl,
      gatewayUrl: result.gatewayUrl,
      size: result.size
    });
  } catch (error) {
    res.status(500).json({
      error: 'Pinata IPFS upload failed',
      detail: error && error.message ? error.message : 'Unknown upload error',
    });
  }
});

app.post('/api/doodstream/upload', requireAdmin, videoUpload.single('file'), async (req, res) => {
  if (!isDoodstreamConfigured()) {
    return res.status(500).json({ error: 'DoodStream API key is not configured on the server' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No video file received' });
  }

  const tempPath = req.file.path;
  try {
    const uploaded = await uploadLocalFileToDoodstream(tempPath, {
      title: String(req.body && req.body.title ? req.body.title : '').trim(),
      originalName: req.file.originalname,
    });
    const streamPath = `/api/doodstream/stream/${encodeURIComponent(uploaded.fileCode)}`;
    res.json({
      ok: true,
      provider: 'doodstream',
      fileCode: uploaded.fileCode,
      src: streamPath,
      sourceUrl: uploaded.sourceUrl || streamPath,
      thumb: uploaded.thumb,
      splash: uploaded.splash,
      duration: uploaded.duration,
      canPlay: uploaded.canPlay,
      title: uploaded.title || String(req.body && req.body.title ? req.body.title : '').trim(),
      useHls: false,
    });
  } catch (error) {
    res.status(500).json({
      error: 'DoodStream upload failed',
      detail: error && error.message ? error.message : 'Unknown DoodStream error',
    });
  } finally {
    if (tempPath) {
      fs.promises.unlink(tempPath).catch(() => {});
    }
  }
});

app.get('/api/portfolio-bot/status', requireAdmin, (req, res) => {
  res.json({
    ok: true,
    configured: isPortfolioBotConfigured(),
  });
});

app.post('/api/portfolio-bot/render-proposal', requireAdmin, (req, res) => {
  try {
    const rendered = buildProposalEmail(req.body || {});
    res.json({
      ok: true,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      meta: rendered.meta,
    });
  } catch (error) {
    res.status(400).json({
      error: 'Unable to render proposal email',
      detail: error && error.message ? error.message : 'Unknown render error',
    });
  }
});

app.post('/api/portfolio-bot/render-storyfirst', requireAdmin, (req, res) => {
  try {
    const rendered = buildStoryFirstEmail(req.body || {});
    res.json({
      ok: true,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  } catch (error) {
    res.status(400).json({
      error: 'Unable to render Story First email',
      detail: error && error.message ? error.message : 'Unknown render error',
    });
  }
});

app.post('/api/portfolio-bot/send-proposal', requireAdmin, async (req, res) => {
  try {
    const result = await sendProposalEmail(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Portfolio Bot could not send the proposal email',
      detail: error && error.message ? error.message : 'Unknown mail error',
    });
  }
});

app.post('/api/portfolio-bot/send-storyfirst', requireAdmin, async (req, res) => {
  try {
    const result = await sendStoryFirstEmail(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Portfolio Bot could not send the Story First email',
      detail: error && error.message ? error.message : 'Unknown mail error',
    });
  }
});

app.post('/api/portfolio-bot/send-custom-html', requireAdmin, async (req, res) => {
  try {
    const result = await sendCustomHtmlEmail(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Portfolio Bot could not send the custom HTML email',
      detail: error && error.message ? error.message : 'Unknown mail error',
    });
  }
});

app.get('/api/doodstream/link/:fileCode', async (req, res) => {
  if (!isDoodstreamConfigured()) {
    return res.status(500).json({ error: 'DoodStream API key is not configured on the server' });
  }

  try {
    const fileCode = String(req.params.fileCode || '').trim();
    const quality = String(req.query.quality || 'n').trim().toLowerCase();
    const useHls = String(req.query.hls || '').trim() === '1';
    const mode = String(req.query.mode || 'player').trim().toLowerCase();
    const linkInfo = await getCachedDoodstreamDirectLink(fileCode, { quality, useHls });
    res.json(createPublicPlaybackPayload(req, fileCode, linkInfo, { quality, useHls, mode }));
  } catch (error) {
    res.status(500).json({
      error: 'Unable to resolve the DoodStream direct link',
      detail: error && error.message ? error.message : 'Unknown DoodStream error',
    });
  }
});

app.get('/api/doodstream/stream/:fileCode', async (req, res) => {
  if (!isDoodstreamConfigured()) {
    return res.status(500).json({ error: 'DoodStream API key is not configured on the server' });
  }

  try {
    const fileCode = String(req.params.fileCode || '').trim();
    const quality = String(req.query.quality || 'n').trim().toLowerCase();
    const useHls = String(req.query.hls || '').trim() === '1';
    const linkInfo = await getCachedDoodstreamDirectLink(fileCode, { quality, useHls });
    const doodConfig = getDoodstreamConfig();
    const range = req.headers.range;

    const upstream = await fetch(linkInfo.streamUrl, {
      headers: {
        Accept: '*/*',
        Referer: doodConfig.referer,
        Origin: (() => {
          try {
            return new URL(doodConfig.referer).origin;
          } catch (error) {
            return 'https://doodstream.com';
          }
        })(),
        'User-Agent': 'AnonStudiosPortfolio/1.0',
        ...(range ? { Range: range } : {}),
      },
    });

    if (!upstream.ok && upstream.status !== 206) {
      const detail = await upstream.text().catch(() => '');
      return res.status(upstream.status).json({
        error: 'DoodStream stream proxy could not fetch the upstream video',
        detail: detail || `Upstream status ${upstream.status}`,
      });
    }

    streamPassthroughHeaders(upstream.headers, res);
    res.status(upstream.status);

    if (!upstream.body) return res.end();
    for await (const chunk of upstream.body) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    res.status(500).json({
      error: 'Unable to proxy the DoodStream stream',
      detail: error && error.message ? error.message : 'Unknown proxy error',
    });
  }
});

app.listen(port, () => {
  ensureDataFile();
  console.log(`Anon Studios server running on http://localhost:${port}`);
});
