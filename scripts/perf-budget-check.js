/**
 * Verlyn Performance Budget Enforcement Engine
 * Runs during CI/CD to prevent performance regressions from merging.
 */

const fs = require('fs');
const path = require('path');

console.log('⚡ [PERF GOVERNANCE] Running automated performance budget verification...');

const budgetPath = path.join(__dirname, '..', 'performance.budget.json');
if (!fs.existsSync(budgetPath)) {
  console.error('❌ Missing performance.budget.json config file!');
  process.exit(1);
}

const budget = JSON.parse(fs.readFileSync(budgetPath, 'utf8')).budgets;

let failures = 0;

// 1. Verify App Router Loading Skeletons for all route directories
const mainRoutesDir = path.join(__dirname, '..', 'apps', 'web', 'src', 'app', '(main)');
if (fs.existsSync(mainRoutesDir)) {
  const routes = fs.readdirSync(mainRoutesDir).filter(f => fs.statSync(path.join(mainRoutesDir, f)).isDirectory());
  for (const route of routes) {
    const routeDir = path.join(mainRoutesDir, route);
    const hasDirectLoading = fs.existsSync(path.join(routeDir, 'loading.tsx'));
    let hasNestedLoading = false;
    
    if (!hasDirectLoading) {
      // Check subdirectories (e.g. community/[name]/loading.tsx or messages/[[...id]]/loading.tsx)
      const subdirs = fs.readdirSync(routeDir).filter(f => fs.statSync(path.join(routeDir, f)).isDirectory());
      hasNestedLoading = subdirs.some(sub => fs.existsSync(path.join(routeDir, sub, 'loading.tsx')));
    }

    if (!hasDirectLoading && !hasNestedLoading && budget.navigation.routeSkeletonBoundaryRequired) {
      console.error(`❌ REGRESSION: Route '/(main)/${route}' is missing a 'loading.tsx' skeleton boundary!`);
      failures++;
    }
  }
}

// 2. Verify Middleware HMAC Singleton Caching
const middlewarePath = path.join(__dirname, '..', 'apps', 'web', 'src', 'middleware.ts');
if (fs.existsSync(middlewarePath)) {
  const middlewareCode = fs.readFileSync(middlewarePath, 'utf8');
  if (!middlewareCode.includes('cachedCryptoKey')) {
    console.error('❌ REGRESSION: middleware.ts is missing cachedCryptoKey singleton optimization!');
    failures++;
  }
}

// 3. Verify Realtime Socket Isolation
const rtPath = path.join(__dirname, '..', 'apps', 'web', 'src', 'hooks', 'useRealtimeMessages.ts');
if (fs.existsSync(rtPath)) {
  const rtCode = fs.readFileSync(rtPath, 'utf8');
  if (!rtCode.includes('_rt.sendCh')) {
    console.error('❌ REGRESSION: useRealtimeMessages.ts lost persistent channel pooling!');
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n🚨 PERFORMANCE GOVERNANCE FAILED: ${failures} release-blocking performance regressions detected.`);
  process.exit(1);
}

console.log('✅ [PERF GOVERNANCE] All performance budget checks PASSED cleanly! Release is cleared.');
process.exit(0);
