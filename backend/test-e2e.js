/**
 * CodeSprint - End-to-End User Simulation Script
 */

const BASE_URL = 'http://localhost:5050/api';

async function testFullUserFlow() {
  console.log('🚀 Running Full-Stack User Flow Simulation...\n');

  // 1. Register new user
  const username = 'speed_coder_' + Date.now().toString().slice(-4);
  const email = `${username}@example.com`;
  const password = 'mySecretPassword123';

  console.log(`1. Registering user "${username}"...`);
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      password,
      cfHandle: 'tourist',
      preferredStage: 'Intermediate'
    })
  });
  const regData = await regRes.json();
  if (!regData.success) throw new Error('Registration failed: ' + regData.message);
  console.log('   ✅ Registered! Token received:', regData.token.slice(0, 20) + '...');

  const token = regData.token;

  // 2. Record Practice Session (Solved 1941A)
  console.log('2. Recording solved practice session for 1941A...');
  const sessRes = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      problemId: '1941A',
      contestId: 1941,
      index: 'A',
      name: 'Rudolf and the Ticket',
      rating: 800,
      level: 'A',
      tags: ['brute force', 'math'],
      durationSeconds: 320,
      targetTimeSeconds: 600,
      status: 'solved'
    })
  });
  const sessData = await sessRes.json();
  if (!sessData.success) throw new Error('Session save failed: ' + sessData.message);
  console.log('   ✅ Session recorded! Problem automatically marked solved in MongoDB.');

  // 3. Check Progress
  console.log('3. Fetching user progress...');
  const progRes = await fetch(`${BASE_URL}/progress`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const progData = await progRes.json();
  console.log('   ✅ Total solved in cloud DB:', progData.totalSolved);
  if (progData.totalSolved !== 1) throw new Error('Expected 1 solved problem');

  // 4. Fetch Progress Stats
  console.log('4. Fetching user dashboard stats...');
  const statsRes = await fetch(`${BASE_URL}/progress/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const statsData = await statsRes.json();
  console.log('   ✅ Stats: Level A Solved =', statsData.stats.levelCounts.A, '| Success Rate =', statsData.stats.successRate + '%');

  // 5. Update Profile
  console.log('5. Updating profile preferences...');
  const upRes = await fetch(`${BASE_URL}/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      preferredStage: 'Advanced',
      targetPerDay: 5
    })
  });
  const upData = await upRes.json();
  console.log('   ✅ Profile updated: Stage =', upData.user.preferredStage, '| Daily Target =', upData.user.targetPerDay);

  console.log('\n🎉 ALL FULL-STACK USER FLOWS VALIDATED SUCCESSFULLY!\n');
}

testFullUserFlow().catch(e => {
  console.error('E2E Test Failed:', e);
  process.exit(1);
});
