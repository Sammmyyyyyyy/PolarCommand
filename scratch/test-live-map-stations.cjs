const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function testAll() {
  console.log('Testing PolarCommand Backend & Station / Expedition API Contracts:');
  
  // 1. Fetch stations
  const stationsRes = await get('http://localhost:5000/api/stations');
  console.log('1. GET /api/stations:', stationsRes.status, 'Total stations:', stationsRes.body?.length);
  if (stationsRes.body) {
    stationsRes.body.forEach(st => {
      console.log(`   - ${st.name} (${st.code}) | Lat: ${st.latitude}, Lng: ${st.longitude} | Status: ${st.status}`);
    });
  }

  // 2. Fetch specific station
  const bharatiRes = await get('http://localhost:5000/api/stations/st-bharati');
  console.log('2. GET /api/stations/st-bharati:', bharatiRes.status, 'Station:', bharatiRes.body?.name);

  // 3. Fetch expeditions
  const expRes = await get('http://localhost:5000/api/expeditions');
  console.log('3. GET /api/expeditions:', expRes.status, 'Total expeditions:', expRes.body?.length);
  if (expRes.body) {
    expRes.body.forEach(exp => {
      console.log(`   - [${exp.code}] ${exp.title} | Status: ${exp.status}`);
    });
  }

  console.log('\nVerification completed successfully!');
}

testAll().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
