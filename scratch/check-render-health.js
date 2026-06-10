async function checkHealth() {
  console.log('Sending request to live Render API...');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
  
  try {
    const start = Date.now();
    const res = await fetch('https://anon-studios-site.onrender.com/api/content', {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    console.log(`Response status: ${res.status} (${Date.now() - start}ms)`);
    if (res.ok) {
      const data = await res.json();
      console.log(`Successfully parsed JSON. Items count: ${data.items ? data.items.length : 0}`);
      if (data.items) {
        console.log('Items list:');
        data.items.forEach(item => {
          console.log(`- [${item.type}] "${item.title}" (ID: ${item.id})`);
        });
      }
    } else {
      const text = await res.text();
      console.log('Error body:', text);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Error during fetch:', err.message);
  }
}

checkHealth();
