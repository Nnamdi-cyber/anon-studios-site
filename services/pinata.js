const path = require('path');

function isPinataConfigured() {
  return !!(process.env.PINATA_JWT && process.env.PINATA_GATEWAY_KEY);
}

async function uploadBufferToPinata(buffer, filename, mimetype) {
  if (!isPinataConfigured()) {
    throw new Error('Pinata credentials are not configured on the server');
  }

  const jwt = process.env.PINATA_JWT.trim();
  const gatewayUrl = 'https://amber-acceptable-asp-485.mypinata.cloud';

  // Create standard file Blob
  const fileBlob = new Blob([buffer], { type: mimetype });
  
  const formData = new FormData();
  formData.append('file', fileBlob, filename);
  
  formData.append('pinataMetadata', JSON.stringify({
    name: filename,
    keyvalues: {
      uploadedAt: new Date().toISOString(),
      mimetype: mimetype
    }
  }));

  formData.append('pinataOptions', JSON.stringify({
    cidVersion: 0
  }));

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata API upload failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (!data || !data.IpfsHash) {
    throw new Error('Pinata response did not return an IpfsHash');
  }

  const pinataGatewayKey = process.env.PINATA_GATEWAY_KEY.trim();
  const cid = data.IpfsHash;
  // Construct direct authorized gateway URL
  const ipfsUrl = `${gatewayUrl}/ipfs/${cid}?pinataGatewayToken=${pinataGatewayKey}`;

  return {
    ipfsHash: cid,
    gatewayUrl: ipfsUrl,
    size: data.PinSize
  };
}

module.exports = {
  isPinataConfigured,
  uploadBufferToPinata
};
