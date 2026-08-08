const fs = require('fs');
const path = require('path');

function getStreamtapeConfig() {
  return {
    username: String(process.env.STREAMTAPE_USERNAME || '4cc2f9ef6e570364726e').trim(),
    password: String(process.env.STREAMTAPE_PASSWORD || '').trim(),
    apiBaseUrl: 'https://api.streamtape.com',
  };
}

function isStreamtapeConfigured() {
  const config = getStreamtapeConfig();
  return Boolean(config.username && config.password);
}

// Fetch dynamic upload server url from Streamtape
async function getUploadServerUrl() {
  const config = getStreamtapeConfig();
  const url = `${config.apiBaseUrl}/file/ul?login=${config.username}&key=${config.password}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get Streamtape upload server: ${response.status}`);
  }
  
  const payload = await response.json();
  if (payload.status !== 200 || !payload.result || !payload.result.url) {
    throw new Error(payload.msg || 'Streamtape upload server query returned an invalid status');
  }
  
  return payload.result.url;
}

// Upload local file to Streamtape
async function uploadLocalFileToStreamtape(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error('Local video file does not exist');
  }

  const uploadUrl = await getUploadServerUrl();
  
  // Use Form data block
  const formData = new FormData();
  const fileBlob = await fs.openAsBlob(filePath, { type: 'video/mp4' });
  formData.append('file', fileBlob, options.originalName || path.basename(filePath));
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Streamtape upload request failed with status ${response.status}`);
  }

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (err) {
    throw new Error(`Failed to parse Streamtape upload response. Response body: ${responseText}`);
  }

  if (payload.status !== 200 || !payload.result) {
    throw new Error(payload.msg || 'Streamtape upload returned an invalid response');
  }

  const result = payload.result;
  const fileCode = String(result.idcode || result.id || '').trim();

  return {
    ok: true,
    provider: 'streamtape',
    fileCode,
    sourceUrl: `https://streamtape.com/e/${fileCode}`,
    downloadUrl: `https://streamtape.com/v/${fileCode}`,
    title: options.title || options.originalName || 'Streamtape Video',
  };
}

module.exports = {
  getStreamtapeConfig,
  isStreamtapeConfigured,
  uploadLocalFileToStreamtape
};
