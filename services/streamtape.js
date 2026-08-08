const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

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

// Helper to stream file to Streamtape via native HTTP/HTTPS multipart POST
function uploadFileStream(uploadUrl, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const boundary = '----Boundary' + Math.random().toString(36).substring(2, 9);
    const parsedUrl = new URL(uploadUrl);
    const fileStream = fs.createReadStream(filePath);
    
    const header = `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: video/mp4\r\n\r\n`;
      
    const footer = `\r\n--${boundary}--\r\n`;
    const stat = fs.statSync(filePath);
    const contentLength = Buffer.byteLength(header) + stat.size + Buffer.byteLength(footer);
    
    const isHttps = parsedUrl.protocol === 'https:';
    const httpLib = isHttps ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': contentLength
      }
    };
    
    const req = httpLib.request(options, (res) => {
      let resBody = '';
      res.on('data', (chunk) => resBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(resBody);
        } else {
          reject(new Error(`Server returned status code ${res.statusCode}: ${resBody}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(header);
    
    fileStream.on('data', (chunk) => {
      req.write(chunk);
    });
    
    fileStream.on('end', () => {
      req.write(footer);
      req.end();
    });
    
    fileStream.on('error', (err) => {
      req.destroy();
      reject(err);
    });
  });
}

// Upload local file to Streamtape
async function uploadLocalFileToStreamtape(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error('Local video file does not exist');
  }

  const uploadUrl = await getUploadServerUrl();
  const fileName = options.originalName || path.basename(filePath);
  
  const responseText = await uploadFileStream(uploadUrl, filePath, fileName);
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
