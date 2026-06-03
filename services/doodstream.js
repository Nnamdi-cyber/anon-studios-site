const fs = require('fs');

const DEFAULT_API_BASE = 'https://doodapi.co/api';
const DEFAULT_REFERER = 'https://doodstream.com/';
const DEFAULT_TTL_MS = 60 * 60 * 1000;

const directLinkCache = new Map();

function getDoodstreamConfig() {
  return {
    apiKey: String(process.env.DOODSTREAM_API_KEY || '').trim(),
    apiBaseUrl: String(process.env.DOODSTREAM_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, ''),
    referer: String(process.env.DOODSTREAM_REFERER || DEFAULT_REFERER).trim(),
    cacheTtlMs: Math.max(Number(process.env.DOODSTREAM_CACHE_TTL_MS || DEFAULT_TTL_MS), 60 * 1000),
  };
}

function isDoodstreamConfigured() {
  return Boolean(getDoodstreamConfig().apiKey);
}

function buildCacheKey(fileCode, options = {}) {
  const quality = String(options.quality || 'n').trim().toLowerCase();
  const useHls = options.useHls ? '1' : '0';
  return `${String(fileCode || '').trim()}::${quality}::${useHls}`;
}

function buildOrigin(referer) {
  try {
    return new URL(referer).origin;
  } catch (error) {
    return 'https://doodstream.com';
  }
}

function pickVersion(result, quality) {
  const versions = Array.isArray(result && result.versions) ? result.versions : [];
  if (!versions.length) return null;
  const wanted = String(quality || 'n').trim().toLowerCase();
  return versions.find(version => String(version && version.name || '').trim().toLowerCase() === wanted)
    || versions.find(version => String(version && version.name || '').trim().toLowerCase() === 'n')
    || versions[0];
}

function normalizeDoodResult(fileCode, result, options = {}) {
  const useHls = Boolean(options.useHls);
  const quality = String(options.quality || 'n').trim().toLowerCase();
  const version = pickVersion(result, quality);
  const streamUrl = useHls && result && result.hls_direct
    ? String(result.hls_direct).trim()
    : String(
      result && (
        result.direct_link
        || result.url
        || (version && version.url)
        || ''
      )
    ).trim();

  if (!streamUrl) {
    throw new Error('DoodStream did not return a playable direct link');
  }

  return {
    fileCode: String(fileCode || '').trim(),
    streamUrl,
    poster: String(result && (result.player_img || result.single_img || result.thumb_img || result.splash_img) || '').trim(),
    duration: String(result && (result.file_length || result.length || '') || '').trim(),
    quality: version && version.name ? String(version.name) : quality,
    useHls,
    expiresAt: Date.now() + getDoodstreamConfig().cacheTtlMs,
  };
}

async function fetchDoodstreamDirectLink(fileCode, options = {}) {
  const config = getDoodstreamConfig();
  if (!config.apiKey) {
    throw new Error('DoodStream API key is not configured');
  }

  const params = new URLSearchParams({
    key: config.apiKey,
    file_code: String(fileCode || '').trim(),
  });

  const quality = String(options.quality || 'n').trim().toLowerCase();
  if (quality) params.set('q', quality);
  if (options.useHls) params.set('hls', '1');

  const response = await fetch(`${config.apiBaseUrl}/file/direct_link?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      Referer: config.referer,
      Origin: buildOrigin(config.referer),
      'User-Agent': 'AnonStudiosPortfolio/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`DoodStream API request failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload || Number(payload.status) !== 200 || !payload.result) {
    throw new Error(payload && payload.msg ? payload.msg : 'DoodStream API returned an invalid response');
  }

  return normalizeDoodResult(fileCode, payload.result, options);
}

async function requestDoodstreamJson(endpoint, params = {}) {
  const config = getDoodstreamConfig();
  if (!config.apiKey) {
    throw new Error('DoodStream API key is not configured');
  }

  const query = new URLSearchParams({
    key: config.apiKey,
    ...Object.fromEntries(
      Object.entries(params).filter(([, value]) => value != null && value !== '')
        .map(([key, value]) => [key, String(value)])
    ),
  });

  const response = await fetch(`${config.apiBaseUrl}${endpoint}?${query.toString()}`, {
    headers: {
      Accept: 'application/json',
      Referer: config.referer,
      Origin: buildOrigin(config.referer),
      'User-Agent': 'AnonStudiosPortfolio/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`DoodStream API request failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload || Number(payload.status) !== 200) {
    throw new Error(payload && payload.msg ? payload.msg : 'DoodStream API returned an invalid response');
  }

  return payload;
}

async function getUploadServerUrl() {
  const payload = await requestDoodstreamJson('/upload/server');
  const uploadUrl = String(payload && payload.result || '').trim();
  if (!uploadUrl) {
    throw new Error('DoodStream did not return an upload server URL');
  }
  return uploadUrl;
}

async function renameDoodstreamFile(fileCode, title) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return;

  try {
    await requestDoodstreamJson('/file/rename', {
      file_code: String(fileCode || '').trim(),
      title: cleanTitle,
    });
  } catch (error) {
    // Renaming is helpful but non-critical; leave upload usable if rename fails.
  }
}

async function uploadLocalFileToDoodstream(filePath, options = {}) {
  const resolvedPath = String(filePath || '').trim();
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    throw new Error('Video file was not found for DoodStream upload');
  }

  const config = getDoodstreamConfig();
  const uploadServerUrl = await getUploadServerUrl();
  const originalName = String(options.originalName || 'upload.mp4').trim() || 'upload.mp4';
  const fileBuffer = await fs.promises.readFile(resolvedPath);
  const form = new FormData();
  form.append('api_key', config.apiKey);
  form.append('file', new Blob([fileBuffer]), originalName);

  const response = await fetch(`${uploadServerUrl}?${encodeURIComponent(config.apiKey)}`, {
    method: 'POST',
    headers: {
      Referer: config.referer,
      Origin: buildOrigin(config.referer),
      'User-Agent': 'AnonStudiosPortfolio/1.0',
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`DoodStream upload failed with status ${response.status}`);
  }

  const payload = await response.json();
  const result = Array.isArray(payload && payload.result) ? payload.result[0] : null;
  if (!payload || Number(payload.status) !== 200 || !result || !result.filecode) {
    throw new Error(payload && payload.msg ? payload.msg : 'DoodStream upload returned an invalid response');
  }

  const fileCode = String(result.filecode || '').trim();
  const title = String(options.title || '').trim();
  if (title) {
    await renameDoodstreamFile(fileCode, title);
  }

  return {
    ok: true,
    provider: 'doodstream',
    fileCode,
    sourceUrl: String(result.protected_embed || result.download_url || '').trim(),
    downloadUrl: String(result.download_url || '').trim(),
    protectedEmbed: String(result.protected_embed || '').trim(),
    thumb: String(result.single_img || result.thumb_img || result.splash_img || '').trim(),
    splash: String(result.splash_img || '').trim(),
    canPlay: Number(result.canplay || 0) === 1,
    duration: String(result.length || '').trim(),
    title: String(result.title || title || '').trim(),
  };
}

async function getCachedDoodstreamDirectLink(fileCode, options = {}) {
  const cacheKey = buildCacheKey(fileCode, options);
  const cached = directLinkCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached,
      cacheHit: true,
    };
  }

  const fresh = await fetchDoodstreamDirectLink(fileCode, options);
  directLinkCache.set(cacheKey, fresh);
  return {
    ...fresh,
    cacheHit: false,
  };
}

function createPublicPlaybackPayload(req, fileCode, linkInfo, options = {}) {
  const basePath = `/api/doodstream/stream/${encodeURIComponent(fileCode)}`;
  const params = new URLSearchParams();
  if (options.quality) params.set('quality', String(options.quality));
  if (options.useHls) params.set('hls', '1');
  const playbackUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;

  return {
    ok: true,
    provider: 'doodstream',
    fileCode,
    mode: options.mode || 'player',
    playbackUrl,
    poster: linkInfo.poster,
    duration: linkInfo.duration,
    quality: linkInfo.quality,
    hls: Boolean(options.useHls),
    expiresAt: linkInfo.expiresAt,
    cacheHit: Boolean(linkInfo.cacheHit),
    cachedAt: Date.now(),
  };
}

function streamPassthroughHeaders(upstreamHeaders, response) {
  const allowed = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'etag',
    'last-modified',
  ];

  allowed.forEach(headerName => {
    const value = upstreamHeaders.get(headerName);
    if (value) response.setHeader(headerName, value);
  });

  response.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=60');
}

module.exports = {
  createPublicPlaybackPayload,
  getCachedDoodstreamDirectLink,
  getDoodstreamConfig,
  getUploadServerUrl,
  isDoodstreamConfigured,
  uploadLocalFileToDoodstream,
  streamPassthroughHeaders,
};
