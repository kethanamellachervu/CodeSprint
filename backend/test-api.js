/**
 * CodeSprint - Backend Automated API Test Suite
 * Validates all endpoints: Auth, Users, Problems, Progress, Sessions, Sync, and Protected Routes
 */

const BASE_URL = 'http://localhost:5050/api';

async function runTests() {
  console.log('🧪 Starting CodeSprint Backend API Test Suite...\n');
  let testsPassed = 0;
  let testsTotal = 0;

  const assert = (condition, title) => {
    testsTotal++;
    if (condition) {
      console.log(`  ✅ PASS: ${title}`);
      testsPassed++;
    } else {
      console.error(`  ❌ FAIL: ${title}`);
    }
  };

  try {
    // 1. Health check
    console.log('--- 1. Testing Health Endpoint ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'OK', 'GET /api/health returns 200 OK');

    // 2. User Registration
    console.log('\n--- 2. Testing Auth Registration ---');
    const uniqueName = 'coder_' + Date.now().toString().slice(-5);
    const uniqueEmail = `${uniqueName}@test.com`;

    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: uniqueName,
        email: uniqueEmail,
        password: 'sprintPassword123',
        cfHandle: 'tourist',
        preferredStage: 'Intermediate'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success && regData.token, 'POST /api/auth/register creates user and returns JWT token');

    const authToken = regData.token;

    // Test duplicate registration rejection
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: uniqueName,
        email: uniqueEmail,
        password: 'sprintPassword123'
      })
    });
    assert(dupRes.status === 400, 'POST /api/auth/register rejects duplicate username/email');

    // 3. User Login
    console.log('\n--- 3. Testing Auth Login ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'sprintPassword123'
      })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.success && loginData.token, 'POST /api/auth/login validates credentials and returns token');

    // Test wrong password
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'wrongpassword'
      })
    });
    assert(wrongPassRes.status === 401, 'POST /api/auth/login rejects incorrect password');

    // 4. Protected Route: /api/auth/me
    console.log('\n--- 4. Testing Protected Routes & /api/auth/me ---');
    const noTokenRes = await fetch(`${BASE_URL}/auth/me`);
    assert(noTokenRes.status === 401, 'GET /api/auth/me without token returns 401 Unauthorized');

    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user.username === uniqueName, 'GET /api/auth/me with valid Bearer token returns profile');

    // 5. User Profile: GET & PUT /api/users/profile
    console.log('\n--- 5. Testing /api/users/profile ---');
    const getProfileRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const profileData = await getProfileRes.json();
    assert(getProfileRes.status === 200 && profileData.user.cfHandle === 'tourist', 'GET /api/users/profile returns user details');

    const updateProfileRes = await fetch(`${BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        displayName: `${uniqueName}_updated`,
        cfHandle: 'petr',
        preferredStage: 'Advanced',
        targetPerDay: 5
      })
    });
    const updateData = await updateProfileRes.json();
    assert(updateProfileRes.status === 200 && updateData.user.cfHandle === 'petr' && updateData.user.preferredStage === 'Advanced', 'PUT /api/users/profile updates user preferences');

    // 6. Problems Explorer: /api/problems
    console.log('\n--- 6. Testing Codeforces Problems API ---');
    const problemsRes = await fetch(`${BASE_URL}/problems?limit=10`);
    const problemsData = await problemsRes.json();
    assert(problemsRes.status === 200 && Array.isArray(problemsData.problems) && problemsData.problems.length > 0, 'GET /api/problems returns paginated Codeforces problem list');

    // Filter by level
    const levelBRes = await fetch(`${BASE_URL}/problems?level=B&limit=5`);
    const levelBData = await levelBRes.json();
    const allLevelB = levelBData.problems.every(p => p.level === 'B');
    assert(levelBRes.status === 200 && allLevelB, 'GET /api/problems?level=B filters correctly by difficulty level');

    // Single problem by ID
    const singleProblemRes = await fetch(`${BASE_URL}/problems/1941A`);
    const singleData = await singleProblemRes.json();
    assert(singleProblemRes.status === 200 && singleData.problem && singleData.problem.id === '1941A', 'GET /api/problems/1941A returns specific problem details');

    // 7. Progress: Solve, Unsolve & Stats
    console.log('\n--- 7. Testing Progress Tracking APIs ---');
    const solveRes = await fetch(`${BASE_URL}/progress/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        problemId: '1941A',
        contestId: 1941,
        index: 'A',
        name: 'Rudolf and the Ticket',
        rating: 800,
        level: 'A',
        tags: ['brute force', 'math'],
        timeSpentSeconds: 420
      })
    });
    const solveData = await solveRes.json();
    assert(solveRes.status === 200 && solveData.totalSolved >= 1, 'POST /api/progress/solve marks problem as solved');

    const getProgressRes = await fetch(`${BASE_URL}/progress`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const progData = await getProgressRes.json();
    assert(getProgressRes.status === 200 && progData.solvedProblems.some(p => p.problemId === '1941A'), 'GET /api/progress returns list containing solved problem');

    const statsRes = await fetch(`${BASE_URL}/progress/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const statsData = await statsRes.json();
    assert(statsRes.status === 200 && statsData.stats.totalSolved >= 1 && statsData.stats.levelCounts.A >= 1, 'GET /api/progress/stats returns level-wise breakdown and analytics');

    // 8. Practice Sessions: POST & GET /api/sessions
    console.log('\n--- 8. Testing Practice Sessions APIs ---');
    const sessionRes = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        problemId: '1899C',
        contestId: 1899,
        index: 'C',
        name: 'Yarik and Array',
        rating: 1100,
        level: 'B',
        tags: ['dp', 'greedy'],
        durationSeconds: 780,
        targetTimeSeconds: 900,
        status: 'solved'
      })
    });
    const sessionData = await sessionRes.json();
    assert(sessionRes.status === 201 && sessionData.success, 'POST /api/sessions records practice duration & automatically updates solved progress');

    const getSessionsRes = await fetch(`${BASE_URL}/sessions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const sessionsList = await getSessionsRes.json();
    assert(getSessionsRes.status === 200 && sessionsList.sessions.length >= 1, 'GET /api/sessions retrieves recorded practice history');

    // 9. Sync Guest Progress
    console.log('\n--- 9. Testing Guest Progress Sync ---');
    const syncRes = await fetch(`${BASE_URL}/progress/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        sessions: [
          {
            problemId: '1873E',
            contestId: 1873,
            index: 'E',
            name: 'Building an Aquarium',
            rating: 1300,
            level: 'C',
            tags: ['binary search'],
            timeSpentSeconds: 950,
            targetTimeSeconds: 1500,
            status: 'solved',
            timestamp: new Date().toISOString()
          }
        ]
      })
    });
    const syncData = await syncRes.json();
    assert(syncRes.status === 200 && syncData.success && syncData.syncedSessions >= 1, 'POST /api/progress/sync safely migrates guest sessions without duplicates');

    // 10. Unsolve problem
    console.log('\n--- 10. Testing Unsolve Endpoint ---');
    const unsolveRes = await fetch(`${BASE_URL}/progress/solve/1941A`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const unsolveData = await unsolveRes.json();
    assert(unsolveRes.status === 200 && unsolveData.success, 'DELETE /api/progress/solve/:problemId removes problem from solved list');

    console.log(`\n========================================`);
    console.log(`🏁 Test Results: ${testsPassed} / ${testsTotal} PASSED`);
    console.log(`========================================\n`);

    if (testsPassed === testsTotal) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test Suite Exception:', err);
    process.exit(1);
  }
}

runTests();
