const http = require('http');

const routes = [
  '/feed',
  '/explore',
  '/community/verlyn',
  '/trending',
  '/notifications',
  '/updates',
  '/settings',
  '/profile'
];

async function testRoutes() {
  console.log('--- PRODUCTION SERVER ROUTE BENCHMARK (next start) ---');
  for (const r of routes) {
    const t0 = Date.now();
    await new Promise((resolve) => {
      http.get('http://localhost:3000' + r, (res) => {
        const duration = Date.now() - t0;
        console.log(`[PROD ROUTE] ${r} -> HTTP ${res.statusCode} in ${duration} ms`);
        resolve();
      }).on('error', (e) => {
        console.log(`ERR ${r}: ${e.message}`);
        resolve();
      });
    });
  }
}

testRoutes();
