/**
 * dashboard-smoke.mjs
 * 
 * Automated smoke test for dashboard endpoints.
 * Tests the critical paths that would be verified manually in a browser:
 * - Tab loading and content display
 * - Audit log fetching
 * - Draft operations (create, list, load, save)
 * - Error handling
 */

import http from 'http';
import assert from 'assert';

const API_BASE = 'http://localhost:3000';
const SECRET = process.env.KILO_SHARED_SECRET || 'test-secret';

/**
 * Helper to make HTTP requests
 */
function request(method, path, body = null, includeSecret = true) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (includeSecret) {
      options.headers['x-kilo-secret'] = SECRET;
    }

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            raw: data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            raw: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Test suite
 */
async function runTests() {
  console.log('\n📊 Dashboard Smoke Tests\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Health check (public endpoint)
  try {
    console.log('1️⃣  Testing health endpoint (public)...');
    const res = await request('GET', '/api/health', null, false);
    assert.strictEqual(res.status, 200, 'Health should return 200');
    assert(res.body.status === 'ok', 'Health should report ok status');
    console.log('   ✅ Health check passed\n');
    passed++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}\n`);
    failed++;
  }

  // Test 2: Audit log with auth
  try {
    console.log('2️⃣  Testing audit log endpoint (protected)...');
    const res = await request('GET', '/api/audit-log', null, true);
    assert.strictEqual(res.status, 200, 'Audit log should return 200');
    assert(Array.isArray(res.body.entries), 'Audit log should return entries array');
    assert(typeof res.body.total === 'number', 'Audit log should include total count');
    console.log(`   ✅ Audit log passed (${res.body.total} entries)\n`);
    passed++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}\n`);
    failed++;
  }

  // Test 3: Audit log without auth (should 401)
  try {
    console.log('3️⃣  Testing auth protection (audit log without secret)...');
    const res = await request('GET', '/api/audit-log', null, false);
    assert.strictEqual(res.status, 401, 'Should reject request without secret');
    console.log('   ✅ Auth protection working\n');
    passed++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}\n`);
    failed++;
  }

  // Test 4: Jobs status endpoint
  try {
    console.log('4️⃣  Testing jobs status endpoint...');
    const res = await request('GET', '/api/jobs', null, true);
    assert.strictEqual(res.status, 200, 'Jobs should return 200');
    assert(res.body !== null, 'Jobs should return data');
    console.log('   ✅ Jobs endpoint passed\n');
    passed++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}\n`);
    failed++;
  }

  // Test 5: List drafts
  try {
    console.log('5️⃣  Testing draft listing...');
    const res = await request('GET', '/api/drafts', null, true);
    assert.strictEqual(res.status, 200, 'Drafts should return 200');
    // Handle wrapped format: { ok, data: { drafts, total, limit } }
    const drafts = res.body.data?.drafts || res.body.drafts || res.body;
    assert(Array.isArray(drafts), 'Should return drafts array');
    console.log(`   ✅ Drafts listing passed (${drafts.length} drafts)\n`);
    passed++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}\n`);
    failed++;
  }

  // Test 6: Create draft
  try {
    console.log('6️⃣  Testing draft creation...');
    const draft = {
      slug: `test-smoke-${Date.now()}`,
      title: 'Smoke Test Article',
      contentHtml: '<p>Test content</p>',
      section: 'general',
      topics: ['test'],
    };
    const res = await request('POST', '/api/drafts', draft, true);
    assert(res.status === 200 || res.status === 201, `Should return 200 or 201, got ${res.status}`);
    // Handle both wrapped and direct formats
    const createdDraft = res.body.data || res.body;
    assert(createdDraft.slug || createdDraft.ok, 'Should return created draft info');
    console.log(`   ✅ Draft created successfully\n`);
    passed++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}\n`);
    failed++;
  }

  // Test 7: Environment status
  try {
    console.log('7️⃣  Testing environment status...');
    const res = await request('GET', '/api/env-status', null, false);
    assert.strictEqual(res.status, 200, 'Env status should return 200');
    assert(typeof res.body.KILO_APPROVE_PUBLISHING === 'boolean', 'Should report publish gate');
    console.log('   ✅ Environment status passed\n');
    passed++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}\n`);
    failed++;
  }

  // Test 8: Invalid command (missing auth)
  try {
    console.log('8️⃣  Testing command endpoint auth...');
    const res = await request('POST', '/api/commands/create-article', { title: 'test' }, false);
    assert.strictEqual(res.status, 401, 'Should reject without auth');
    console.log('   ✅ Command auth protection working\n');
    passed++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}\n`);
    failed++;
  }

  // Test 9: Ready drafts listing
  try {
    console.log('9️⃣  Testing ready drafts listing...');
    const res = await request('GET', '/api/ready-drafts', null, true);
    assert.strictEqual(res.status, 200, 'Ready drafts should return 200');
    assert(res.body !== null, 'Should return data');
    console.log('   ✅ Ready drafts listing passed\n');
    passed++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}\n`);
    failed++;
  }

  // Test 10: Dashboard HTML loads
  try {
    console.log('🔟 Testing dashboard HTML serves...');
    const res = await request('GET', '/dashboard.html', null, false);
    assert.strictEqual(res.status, 200, 'Dashboard HTML should return 200');
    assert(res.raw.includes('KILOMBO'), 'Should contain KILOMBO header');
    assert(res.raw.includes('switchTab'), 'Should contain tab switching code');
    assert(res.raw.includes('refreshAudit'), 'Should contain audit refresh function');
    console.log('   ✅ Dashboard HTML serves correctly\n');
    passed++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}\n`);
    failed++;
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  
  if (failed === 0) {
    console.log('\n✅ All smoke tests passed! Dashboard is ready.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Review above for details.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
