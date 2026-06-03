const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PINATA_JWT = process.env.PINATA_JWT;
const DIST_DIR = path.join(__dirname, '../dist-ipfs');

if (!PINATA_JWT) {
  console.error('❌ Error: PINATA_JWT is not configured in your .env file.');
  process.exit(1);
}

if (!fs.existsSync(DIST_DIR)) {
  console.error(`❌ Error: dist-ipfs directory does not exist at ${DIST_DIR}. Please package it first.`);
  process.exit(1);
}

// Helper to get all files recursively
function getFilesRecursively(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, baseDir));
    } else {
      const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
      results.push({
        absolutePath: filePath,
        relativePath: relativePath,
      });
    }
  });
  return results;
}

async function uploadFolder() {
  console.log('Scanning dist-ipfs directory...');
  const files = getFilesRecursively(DIST_DIR);
  console.log(`Found ${files.length} files to upload to IPFS via Pinata.`);

  const form = new FormData();

  // Add files with their relative paths
  for (const file of files) {
    const buffer = fs.readFileSync(file.absolutePath);
    // Pinata expects directory uploads to have the path as the filename (third parameter in form.append)
    const fileBlob = new Blob([buffer]);
    form.append('file', fileBlob, `dist-ipfs/${file.relativePath}`);
  }

  // Add Pinata metadata
  form.append('pinataMetadata', JSON.stringify({
    name: 'anon-studios-frontend',
  }));

  // Add Pinata options
  form.append('pinataOptions', JSON.stringify({
    cidVersion: 0,
  }));

  console.log('Sending request to Pinata...');
  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: form,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pinata upload failed with status ${response.status}: ${errText}`);
    }

    const result = await response.json();
    console.log('\n==================================================');
    console.log(' 🎉 SUCCESS: FRONTEND SUCCESSFULLY UPLOADED! 🎉');
    console.log('==================================================');
    console.log(`IPFS CID (Hash): ${result.IpfsHash}`);
    console.log(`Pin Size: ${result.PinSize} bytes`);
    console.log(`Timestamp: ${result.Timestamp}`);
    console.log('\nDeploy URL Options:');
    console.log(`1. Pinata Dedicated Gateway: https://${process.env.PINATA_GATEWAY_KEY ? 'YOUR_GATEWAY_SUBDOMAIN' : 'gateway.pinata.cloud'}/ipfs/${result.IpfsHash}`);
    console.log(`2. Cloudflare IPFS Gateway: https://cloudflare-ipfs.com/ipfs/${result.IpfsHash}`);
    console.log(`3. Public IPFS Gateway: https://ipfs.io/ipfs/${result.IpfsHash}`);
    console.log('==================================================\n');
  } catch (error) {
    console.error('\n❌ Pinata Upload Failed ❌');
    console.error(error.message);
    process.exit(1);
  }
}

uploadFolder();
