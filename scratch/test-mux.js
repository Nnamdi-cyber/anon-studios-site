const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Helper to get configured accounts
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
    } else {
      console.log(`Mux Account ${i} is NOT fully configured in .env.`);
      console.log(`- Token ID present: ${!!tokenId}`);
      console.log(`- Token Secret present: ${!!tokenSecret}`);
      console.log(`- Data Env Key present: ${!!dataEnvKey}`);
    }
  }
  return accounts;
}

async function testAccounts() {
  const accounts = getConfiguredAccounts();
  console.log(`\nFound ${accounts.length} configured Mux accounts.\n`);

  for (const account of accounts) {
    console.log(`Testing Mux Account ${account.index}...`);
    console.log(`- Token ID: ${account.tokenId.substring(0, 8)}...`);
    
    const auth = Buffer.from(`${account.tokenId}:${account.tokenSecret}`).toString('base64');
    try {
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
        const errorText = await response.text();
        console.error(`❌ Mux Account ${account.index} FAILED with status ${response.status}:`);
        console.error(errorText);
      } else {
        const payload = await response.json();
        console.log(`✅ Mux Account ${account.index} SUCCESS! Created upload ID: ${payload.data.id}`);
      }
    } catch (err) {
      console.error(`❌ Mux Account ${account.index} encountered fetch error:`, err.message);
    }
    console.log('-'.repeat(50));
  }
}

testAccounts();
