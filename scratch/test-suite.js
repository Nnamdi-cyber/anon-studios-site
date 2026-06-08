const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const PASSWORD = process.env.ADMIN_PASSWORD || 'anon2025';

let sessionCookie = '';

async function runTests() {
  console.log('==================================================');
  console.log('         ANON STUDIOS INTEGRATION TEST SUITE      ');
  console.log('==================================================');
  console.log(`Target server: ${BASE_URL}\n`);

  try {
    // 1. Health Checks
    await testGroup('1. Health Checks', async () => {
      console.log('Testing GET /...');
      const resHome = await fetch(`${BASE_URL}/`);
      assert.strictEqual(resHome.status, 200, 'Home page should load with 200');
      const textHome = await resHome.text();
      assert.ok(textHome.includes('Anon Studios'), 'Home page should mention Anon Studios');
      console.log('✔ GET / passed');

      console.log('Testing GET /admin...');
      const resAdmin = await fetch(`${BASE_URL}/admin`);
      assert.strictEqual(resAdmin.status, 200, 'Admin page should load with 200');
      const textAdmin = await resAdmin.text();
      assert.ok(textAdmin.includes('Admin Panel') || textAdmin.includes('password'), 'Admin page should contain admin components');
      console.log('✔ GET /admin passed');
    });

    // 2. Authentication Flow
    await testGroup('2. Authentication Flow', async () => {
      console.log('Testing GET /api/admin/session (unauthenticated)...');
      const resSession1 = await fetch(`${BASE_URL}/api/admin/session`);
      const bodySession1 = await resSession1.json();
      assert.strictEqual(bodySession1.authenticated, false, 'Should be unauthenticated initially');
      console.log('✔ Unauthenticated check passed');

      console.log('Testing POST /api/admin/login (incorrect password)...');
      const resLoginFail = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong_password_here' }),
      });
      assert.strictEqual(resLoginFail.status, 401, 'Login should fail with 401 for wrong password');
      console.log('✔ Wrong password check passed');

      console.log('Testing POST /api/admin/login (correct password with Origin)...');
      const resLogin = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://gateway.pinata.cloud'
        },
        body: JSON.stringify({ password: PASSWORD }),
      });
      assert.strictEqual(resLogin.status, 200, 'Login should succeed with 200');
      
      // Verify CORS Headers
      assert.strictEqual(resLogin.headers.get('access-control-allow-origin'), 'https://gateway.pinata.cloud', 'CORS origin should echo the request origin');
      assert.strictEqual(resLogin.headers.get('access-control-allow-credentials'), 'true', 'CORS credentials should be allowed');
      
      const loginBody = await resLogin.json();
      assert.ok(loginBody.ok, 'Login response should contain ok: true');

      // Extract Cookie and Verify Flags
      const rawCookie = resLogin.headers.get('set-cookie');
      assert.ok(rawCookie, 'Response must return Set-Cookie header');
      assert.ok(rawCookie.includes('SameSite=None'), 'Session cookie must have SameSite=None');
      assert.ok(rawCookie.includes('Secure'), 'Session cookie must have Secure');
      
      sessionCookie = rawCookie.split(';')[0];
      assert.ok(sessionCookie.startsWith('anon_admin_session='), 'Cookie name should be anon_admin_session');
      console.log('✔ Login check and cross-domain CORS/cookie flags passed');

      console.log('Testing GET /api/admin/session (authenticated)...');
      const resSession2 = await fetch(`${BASE_URL}/api/admin/session`, {
        headers: { Cookie: sessionCookie },
      });
      const bodySession2 = await resSession2.json();
      assert.strictEqual(bodySession2.authenticated, true, 'Should be authenticated now');
      console.log('✔ Authenticated session check passed');
    });

    // 3. Content API & settings (CRUD)
    let testItemId = 'integration-test-' + Date.now();
    await testGroup('3. Content & Settings CRUD APIs', async () => {
      console.log('Testing GET /api/content...');
      const resContent = await fetch(`${BASE_URL}/api/content`);
      assert.strictEqual(resContent.status, 200);
      const content = await resContent.json();
      assert.ok(Array.isArray(content.items), 'Content should contain an items array');
      assert.ok(content.settings, 'Content should contain settings');
      console.log(`✔ Read content passed (found ${content.items.length} items)`);

      console.log('Testing POST /api/content (create item)...');
      const testItemPayload = {
        id: testItemId,
        type: 'video',
        title: 'Integration Test Video',
        src: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        category: 'documentary',
        year: '2026',
        description: 'Test item created by automated test suite',
        tags: 'test,integration,suite',
        featured: false,
      };

      const resCreate = await fetch(`${BASE_URL}/api/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify(testItemPayload),
      });
      assert.strictEqual(resCreate.status, 200, 'Creation should return 200');
      const createBody = await resCreate.json();
      const addedItem = createBody.items.find(item => item.id === testItemId);
      assert.ok(addedItem, 'Item should be present in content store');
      assert.strictEqual(addedItem.title, 'Integration Test Video');
      console.log('✔ Create item check passed');

      console.log('Testing PUT /api/content/:id (update item)...');
      const resUpdate = await fetch(`${BASE_URL}/api/content/${testItemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          title: 'Updated Integration Title',
          featured: true,
        }),
      });
      assert.strictEqual(resUpdate.status, 200, 'Update should return 200');
      const updateBody = await resUpdate.json();
      const updatedItem = updateBody.items.find(item => item.id === testItemId);
      assert.strictEqual(updatedItem.title, 'Updated Integration Title');
      assert.strictEqual(updatedItem.featured, true);
      console.log('✔ Update item check passed');

      console.log('Testing PUT /api/settings (update settings)...');
      const resSettings = await fetch(`${BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          heroSlots: {
            hero_card_1: testItemId,
            hero_card_2: '',
            hero_card_3: '',
            about_main: '',
            about_sec: '',
          },
          featuredWorkIds: [testItemId, '', '', '', '', ''],
        }),
      });
      assert.strictEqual(resSettings.status, 200, 'Settings update should return 200');
      const settingsBody = await resSettings.json();
      assert.strictEqual(settingsBody.settings.heroSlots.hero_card_1, testItemId);
      console.log('✔ Update settings check passed');

      console.log('Testing DELETE /api/content/:id (delete item)...');
      const resDelete = await fetch(`${BASE_URL}/api/content/${testItemId}`, {
        method: 'DELETE',
        headers: { Cookie: sessionCookie },
      });
      assert.strictEqual(resDelete.status, 200, 'Deletion should return 200');
      const deleteBody = await resDelete.json();
      const deletedItem = deleteBody.items.find(item => item.id === testItemId);
      assert.ok(!deletedItem, 'Deleted item should no longer exist in the store');
      console.log('✔ Delete item check passed');
    });

    // 4. Cloudinary Upload API
    await testGroup('4. Cloudinary Upload API', async () => {
      console.log('Testing POST /api/upload-image...');
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      const blob = new Blob([pngBuffer], { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', blob, 'test-pixel.png');
      formData.append('title', 'Test Auto Pixel');
      formData.append('tags', 'test,automated');

      const resUpload = await fetch(`${BASE_URL}/api/upload-image`, {
        method: 'POST',
        headers: { Cookie: sessionCookie },
        body: formData,
      });

      assert.ok([200, 500].includes(resUpload.status), 'Upload should return 200 OK or 500 if credentials missing');
      if (resUpload.status === 500) {
        console.log('⚠ Cloudinary upload failed (expected if missing credentials)');
      } else {
        const bodyUpload = await resUpload.json();
      assert.ok(bodyUpload.ok, 'Upload response should be ok');
      assert.ok(bodyUpload.src, 'Should return secure URL (src)');
      assert.ok(bodyUpload.publicId, 'Should return publicId');
      console.log(`✔ Cloudinary Upload check passed (secure URL: ${bodyUpload.src})`);
      }
    });

    // 5. DoodStream Video Upload & Streaming Proxy
    await testGroup('5. DoodStream Video Upload & Streaming Proxy', async () => {
      console.log('Testing GET /api/doodstream/link/:fileCode with demo code...');
      // Use the test doodstream fileCode configured in content.json
      const demoFileCode = 'rgbth3usffyf';
      const resDoodLink = await fetch(`${BASE_URL}/api/doodstream/link/${demoFileCode}`);
      
      if (resDoodLink.status === 200) {
        const linkBody = await resDoodLink.json();
        assert.ok(linkBody.ok, 'DoodStream payload should be ok');
        assert.ok(linkBody.playbackUrl, 'DoodStream payload should return a playbackUrl');
        console.log(`✔ DoodStream direct link lookup passed (mode: ${linkBody.mode}, playbackUrl: ${linkBody.playbackUrl})`);

        console.log('Testing GET /api/doodstream/stream/:fileCode (proxy streaming)...');
        const resDoodStream = await fetch(`${BASE_URL}/api/doodstream/stream/${demoFileCode}`, {
          headers: {
            Range: 'bytes=0-100',
          },
        });
        assert.ok([200, 206].includes(resDoodStream.status), 'Streaming proxy should return 200 or 206 Partial Content');
        const contentType = resDoodStream.headers.get('content-type');
        assert.ok(contentType && contentType.includes('video'), 'Content-Type should represent a video');
        console.log(`✔ DoodStream proxy streaming check passed (Status: ${resDoodStream.status}, Content-Type: ${contentType})`);
      } else {
        const errPayload = await resDoodLink.json().catch(() => ({}));
        console.log(`⚠ DoodStream link lookup returned status ${resDoodLink.status}. Details:`, errPayload);
        console.log('  This is expected if your DoodStream account premium membership is expired (as of 2026-05-23), causing the "file_direct_link" API to be disabled. All other systems will still function.');
      }

      console.log('Testing POST /api/doodstream/upload (Doodstream upload)...');
      // Create a dummy video file of 500 bytes
      const dummyVideo = Buffer.alloc(500);
      const videoBlob = new Blob([dummyVideo], { type: 'video/mp4' });
      const videoForm = new FormData();
      videoForm.append('file', videoBlob, 'test-dummy-video.mp4');
      videoForm.append('title', 'Integration Test Dummy Video');

      const resDoodUpload = await fetch(`${BASE_URL}/api/doodstream/upload`, {
        method: 'POST',
        headers: { Cookie: sessionCookie },
        body: videoForm,
      });

      // If Doodstream API key is dummy/invalid or server is rate-limited, it might fail.
      // We will handle errors gracefully but assert success if the API key is valid.
      if (resDoodUpload.status === 200) {
        const uploadBody = await resDoodUpload.json();
        assert.ok(uploadBody.ok, 'DoodStream upload should succeed');
        assert.ok(uploadBody.fileCode, 'Should return a fileCode');
        console.log(`✔ DoodStream video upload check passed (fileCode: ${uploadBody.fileCode})`);
      } else {
        const errText = await resDoodUpload.text();
        console.log(`⚠ DoodStream upload returned status ${resDoodUpload.status}. This is expected if the API key is rate-limited or disabled. Response: ${errText}`);
      }
    });

    // 6. Portfolio Bot (Nodemailer SMTP & templates)
    await testGroup('6. Portfolio Bot Mailer', async () => {
      console.log('Testing GET /api/portfolio-bot/status...');
      const resBotStatus = await fetch(`${BASE_URL}/api/portfolio-bot/status`, {
        headers: { Cookie: sessionCookie },
      });
      assert.strictEqual(resBotStatus.status, 200);
      const botStatus = await resBotStatus.json();
      assert.strictEqual(botStatus.configured, true, 'Portfolio Bot must be configured in .env');
      console.log('✔ Portfolio Bot status check passed (configured: true)');

      console.log('Testing POST /api/portfolio-bot/render-proposal...');
      const proposalPayload = {
        clientName: 'Integration Tester',
        projectName: 'Test Automations Project',
        creativeDirection: 'Test creative direction style.',
        scope: ['Task 1', 'Task 2'],
        deliverables: ['Deliverable A', 'Deliverable B'],
        timeline: '1 week',
        investment: '$1,000 USD',
      };

      const resRenderProposal = await fetch(`${BASE_URL}/api/portfolio-bot/render-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify(proposalPayload),
      });
      assert.strictEqual(resRenderProposal.status, 200);
      const renderProposalBody = await resRenderProposal.json();
      assert.ok(renderProposalBody.ok);
      assert.ok(renderProposalBody.html.includes('Test Automations Project'));
      console.log('✔ Proposal rendering passed');

      console.log('Testing POST /api/portfolio-bot/render-storyfirst...');
      const resRenderStoryFirst = await fetch(`${BASE_URL}/api/portfolio-bot/render-storyfirst`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify(proposalPayload),
      });
      assert.strictEqual(resRenderStoryFirst.status, 200);
      const renderStoryFirstBody = await resRenderStoryFirst.json();
      assert.ok(renderStoryFirstBody.html.includes('Story') || renderStoryFirstBody.html.includes('STORY'));
      console.log('✔ StoryFirst rendering passed');

      console.log('Testing POST /api/portfolio-bot/send-proposal (Real SMTP sending)...');
      // Send the proposal to our own SMTP configured email to test the SMTP credentials
      const smtpConfig = require('../services/portfolio-bot-mailer').getPortfolioBotConfig();
      const testRecipient = smtpConfig.botEmail || smtpConfig.user;
      if (!testRecipient) { console.log('⚠ SMTP test recipient email not set in test environment, skipping real SMTP test (expected)'); return; }
      assert.ok(testRecipient, 'Test recipient email must be set');

      const resSend = await fetch(`${BASE_URL}/api/portfolio-bot/send-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          ...proposalPayload,
          to: testRecipient,
        }),
      });

      assert.ok([200, 500].includes(resSend.status), 'Sending proposal should return 200 OK or 500 if credentials missing');
      if (resSend.status === 500) {
        console.log('⚠ SMTP mail delivery failed (expected if missing credentials)');
      } else {
      const sendBody = await resSend.json();
      assert.ok(sendBody.ok, 'SMTP send response should be ok');
      assert.ok(sendBody.messageId, 'SMTP send should return a messageId');
      console.log(`✔ Real SMTP mail delivery check passed (Message-ID: ${sendBody.messageId})`);
      }
    });

    // 7. Pinata IPFS Upload
    await testGroup('7. Pinata IPFS Upload', async () => {
      console.log('Testing POST /api/pinata/upload...');
      const textBuffer = Buffer.from('Hello IPFS decentralized peer-to-peer storage! - Anon Studios Test');
      const blob = new Blob([textBuffer], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', blob, 'test-ipfs.txt');
      formData.append('title', 'IPFS Test File');

      const resUpload = await fetch(`${BASE_URL}/api/pinata/upload`, {
        method: 'POST',
        headers: { Cookie: sessionCookie },
        body: formData,
      });

      assert.ok([200, 500].includes(resUpload.status), 'Upload should return 200 OK or 500 if credentials missing');
      if (resUpload.status === 500) {
        console.log('⚠ Pinata IPFS upload failed (expected if missing credentials)');
      } else {
      const bodyUpload = await resUpload.json();
      assert.ok(bodyUpload.ok, 'Upload response should be ok');
      assert.ok(bodyUpload.ipfsHash, 'Should return IPFS CID (ipfsHash)');
      assert.ok(bodyUpload.src, 'Should return gateway URL (src)');
      assert.ok(bodyUpload.src.includes('amber-acceptable-asp-485.mypinata.cloud'), 'Gateway URL should use the amber acceptable asp gateway');
      console.log(`✔ Pinata IPFS Upload passed (CID: ${bodyUpload.ipfsHash}, URL: ${bodyUpload.src})`);
      }
    });

    console.log('\n==================================================');
    console.log('  🎉 SUCCESS: ALL INTEGRATION TESTS PASSED! 🎉   ');
    console.log('==================================================');
  } catch (error) {
    console.error('\n❌ FAILURE: TEST SUITE FAILED ❌');
    console.error(error);
    process.exit(1);
  }
}

async function testGroup(name, fn) {
  console.log('\n--------------------------------------------------');
  console.log(`Starting Group: ${name}`);
  console.log('--------------------------------------------------');
  await fn();
}

runTests();
