/**
 * Automated test suite for AI-Powered Task Manager API.
 * Uses native node fetch (no external libraries).
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

let passedTests = 0;
let totalTests = 0;

// Helper to log test outcomes
const logResult = (name, passed, timeMs, info = '') => {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`${colors.green}✅ PASS${colors.reset} | ${colors.cyan}${name}${colors.reset} (${timeMs}ms)${info ? ' - ' + info : ''}`);
  } else {
    console.log(`${colors.red}❌ FAIL${colors.reset} | ${colors.magenta}${name}${colors.reset} (${timeMs}ms)${info ? ' - ' + info : ''}`);
  }
};

const logWarning = (msg) => {
  console.log(`${colors.yellow}⚠️  WARN | ${msg}${colors.reset}`);
};

const runFetchTest = async (name, path, options = {}, expectedStatus) => {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const duration = Date.now() - start;
    const isStatusCorrect = res.status === expectedStatus;
    
    logResult(
      name, 
      isStatusCorrect, 
      duration, 
      `Expected ${expectedStatus}, Got ${res.status}`
    );
    return res;
  } catch (err) {
    const duration = Date.now() - start;
    logResult(name, false, duration, err.message);
    return null;
  }
};

async function startTests() {
  console.log(`${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.cyan}⚡ Running Automated Task Manager API Test Suite ⚡${colors.reset}`);
  console.log(`${colors.cyan}BASE_URL: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.cyan}====================================================\n${colors.reset}`);

  // --- SECTION A: Unauthenticated Endpoint Access Tests ---
  console.log(`${colors.cyan}[1] Testing Unauthenticated Route Protections...${colors.reset}`);
  
  await runFetchTest('GET /api/auth/me should return 401', '/api/auth/me', {}, 401);
  await runFetchTest('GET /api/tasks should return 401', '/api/tasks', {}, 401);
  await runFetchTest('POST /api/tasks should return 401', '/api/tasks', { method: 'POST', body: '{}' }, 401);
  await runFetchTest('POST /api/ai/suggest should return 401', '/api/ai/suggest', { method: 'POST', body: '{}' }, 401);
  await runFetchTest('POST /api/ai/suggest-routine should return 401', '/api/ai/suggest-routine', { method: 'POST' }, 401);
  await runFetchTest('POST /api/ai/deadline-check should return 401', '/api/ai/deadline-check', { method: 'POST' }, 401);
  await runFetchTest('POST /api/ai/write-description should return 401', '/api/ai/write-description', { method: 'POST', body: '{}' }, 401);
  await runFetchTest('GET /api/ai/productivity-score should return 401', '/api/ai/productivity-score', {}, 401);
  
  // --- SECTION B: Static / Core Route Availability Tests ---
  console.log(`\n${colors.cyan}[2] Testing Static and Nonexistent Routing...${colors.reset}`);
  await runFetchTest('GET / (Root Page) should return 200', '/', {}, 200);
  
  // Because server.js has a catch-all redirect (res.redirect('/')) returning a 302 redirect code, 
  // we check that nonexistent routes correctly redirect back to the home page with status 302.
  await runFetchTest(
    'GET /nonexistent-route redirects to / with 302', 
    '/nonexistent-route', 
    { redirect: 'manual' }, 
    302
  );

  // --- SECTION C: Dedicated Gemini AI Endpoint Tests ---
  console.log(`\n${colors.cyan}[3] Dedicated Gemini AI Live Integration Tests...${colors.reset}`);
  
  // Check if Mock/Real JWT cookie is provided as environment variable
  const testCookie = process.env.TEST_AUTH_COOKIE;
  if (!testCookie) {
    logWarning('Skipping live Gemini AI auth tests. To run them, retrieve an accessToken from your browser and supply it via environment:');
    console.log(`         $env:TEST_AUTH_COOKIE="accessToken=eyJhbGciOi..."`);
    console.log('         node tests/test.js\n');
  } else {
    // Proactively format the cookie to prepended accessToken= if only raw JWT was provided
    let formattedCookie = testCookie.trim();
    if (!formattedCookie.startsWith('accessToken=')) {
      formattedCookie = `accessToken=${formattedCookie}`;
    }

    const headers = { 'Cookie': formattedCookie, 'Content-Type': 'application/json' };

    // 1. Live AI Suggest with Valid Title
    console.log(`${colors.cyan}--- Live Gemini test: POST /api/ai/suggest (Valid input) ---${colors.reset}`);
    const reqPayload = { title: 'Implement JWT refresh token mechanism' };
    console.log(`Payload: ${JSON.stringify(reqPayload)}`);
    
    const startSuggest = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/ai/suggest`, {
        method: 'POST',
        headers,
        body: JSON.stringify(reqPayload)
      });
      const duration = Date.now() - startSuggest;
      const resJson = await res.json();
      
      console.log(`Raw Gemini response status: ${res.status}`);
      console.log(`Parsed response: ${JSON.stringify(resJson, null, 2)}`);

      const hasFields = resJson.priority && resJson.deadlineDays !== undefined && Array.isArray(resJson.subtasks);
      logResult('POST /api/ai/suggest successfully structured priority, deadline, and subtasks', res.status === 200 && hasFields, duration);
    } catch (err) {
      logResult('POST /api/ai/suggest live test failed', false, Date.now() - startSuggest, err.message);
    }

    // 2. AI Suggest with Empty Title (400 Bad Request)
    console.log(`\n${colors.cyan}--- Live Gemini test: POST /api/ai/suggest (Empty title) ---${colors.reset}`);
    const emptyPayload = { title: '' };
    const startEmpty = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/ai/suggest`, {
        method: 'POST',
        headers,
        body: JSON.stringify(emptyPayload)
      });
      const duration = Date.now() - startEmpty;
      logResult('POST /api/ai/suggest with empty title correctly returns 400', res.status === 400, duration);
    } catch (err) {
      logResult('POST /api/ai/suggest empty test failed', false, Date.now() - startEmpty, err.message);
    }

    // 3. AI Suggest with Extremely Long Title (500 chars)
    console.log(`\n${colors.cyan}--- Live Gemini test: POST /api/ai/suggest (Extremely long title) ---${colors.reset}`);
    const longTitle = 'Refactor all the core components '.repeat(15); // > 500 chars
    const longPayload = { title: longTitle };
    const startLong = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/ai/suggest`, {
        method: 'POST',
        headers,
        body: JSON.stringify(longPayload)
      });
      const duration = Date.now() - startLong;
      logResult('POST /api/ai/suggest handles long title gracefully (status 200 or 400, no crash)', res.status === 200 || res.status === 400, duration);
    } catch (err) {
      logResult('POST /api/ai/suggest long title test failed', false, Date.now() - startLong, err.message);
    }
  }

  // --- FINAL SUMMARY ---
  console.log(`\n${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.cyan}🏁 Final Test Suite Summary 🏁${colors.reset}`);
  console.log(`${colors.cyan}====================================================${colors.reset}`);
  const passRate = (passedTests / totalTests) * 100;
  console.log(`Total Run: ${totalTests}`);
  console.log(`Passed:    ${colors.green}${passedTests}${colors.reset}`);
  console.log(`Failed:    ${colors.red}${totalTests - passedTests}${colors.reset}`);
  console.log(`Success:   ${colors.green}${passRate.toFixed(1)}%${colors.reset}`);
  console.log(`${colors.cyan}====================================================${colors.reset}`);
}

startTests();
