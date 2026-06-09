function getConfiguredAccounts() {
  const accounts = [];
  for (let i = 1; i <= 4; i++) {
    const tokenId = process.env[`MUX_TOKEN_ID_${i}`];
    const tokenSecret = process.env[`MUX_TOKEN_SECRET_${i}`];
    const dataEnvKey = process.env[`MUX_DATA_ENV_KEY_${i}`];
    if (tokenId && tokenSecret && dataEnvKey) {
      accounts.push({
        index: i,
        tokenId: tokenId.trim(),
        tokenSecret: tokenSecret.trim(),
        dataEnvKey: dataEnvKey.trim()
      });
    }
  }
  return accounts;
}

function isMuxConfigured() {
  return getConfiguredAccounts().length > 0;
}

function getUploadAccount(store) {
  const accounts = getConfiguredAccounts();
  if (accounts.length === 0) {
    throw new Error('No Mux accounts are configured on the server');
  }
  const muxItems = (store.items || []).filter(item => item.videoProvider === 'mux');
  const index = muxItems.length % accounts.length;
  return accounts[index];
}

async function createDirectUpload(account) {
  const auth = Buffer.from(`${account.tokenId}:${account.tokenSecret}`).toString('base64');
  
  const response = await fetch('https://api.mux.com/video/v1/uploads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify({
      cors_origin: '*',
      new_asset_settings: {
        playback_policies: ['public'],
        mp4_support: 'capped-1080p'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'No response body');
    throw new Error(`Mux direct upload initialization failed with status ${response.status}: ${errorText}`);
  }

  const payload = await response.json();
  if (!payload || !payload.data || !payload.data.url) {
    throw new Error('Mux did not return a valid direct upload payload');
  }

  return {
    uploadId: payload.data.id,
    uploadUrl: payload.data.url,
    status: payload.data.status
  };
}

async function resolveMuxAsset(accountIndex, uploadId) {
  const accounts = getConfiguredAccounts();
  const account = accounts.find(acc => acc.index === Number(accountIndex));
  if (!account) {
    throw new Error(`Mux Account with index ${accountIndex} is not configured`);
  }

  const auth = Buffer.from(`${account.tokenId}:${account.tokenSecret}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${auth}`
  };

  let assetId = null;
  let status = null;

  // Poll upload status on Mux
  for (let i = 0; i < 60; i++) {
    const response = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, { headers });
    if (!response.ok) {
      throw new Error(`Failed to query upload status from Mux: ${response.status}`);
    }

    const payload = await response.json();
    status = payload.data && payload.data.status;
    assetId = payload.data && payload.data.asset_id;

    if (status === 'asset_created' && assetId) {
      break;
    }
    if (status === 'errored') {
      throw new Error(`Mux upload processing failed: ${payload.data.error?.message || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (!assetId) {
    throw new Error(`Mux asset was not created in time. Status: ${status}`);
  }

  // Retrieve asset details for playback ID and duration
  const assetResponse = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, { headers });
  if (!assetResponse.ok) {
    throw new Error(`Failed to fetch Mux asset details: ${assetResponse.status}`);
  }

  const assetPayload = await assetResponse.json();
  const asset = assetPayload.data;
  if (!asset) {
    throw new Error('Mux returned an empty asset payload');
  }

  const playbackIds = asset.playback_ids || [];
  const publicPlayback = playbackIds.find(p => p.policy === 'public');
  if (!publicPlayback) {
    throw new Error('No public playback ID found for Mux asset');
  }

  return {
    assetId: asset.id,
    playbackId: publicPlayback.id,
    duration: asset.duration || 0, // float in seconds
    status: asset.status
  };
}

module.exports = {
  getConfiguredAccounts,
  isMuxConfigured,
  getUploadAccount,
  createDirectUpload,
  resolveMuxAsset
};
