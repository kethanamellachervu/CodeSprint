/**
 * CodeSprint - Contest Simulation Controller
 * Simulates a 5-problem virtual contest with timer, live solve tracker, and score summary.
 */

let contestProblems = [];
let contestDurationSeconds = 2 * 60 * 60; // 2 hours default
let contestRemainingSeconds = 2 * 60 * 60;
let contestElapsedSeconds = 0;
let contestTimerInterval = null;
let contestIsActive = false;
let contestIsPaused = false;
let contestTier = 'div2'; // 'warmup', 'div2', 'advanced'

document.addEventListener('DOMContentLoaded', async () => {
  setupContestControls();
  await prepareContestProblems();
});

/**
 * Setup buttons and event listeners for contest
 */
function setupContestControls() {
  const btnStart = document.getElementById('btnStartContest');
  const btnPause = document.getElementById('btnPauseContest');
  const btnResume = document.getElementById('btnResumeContest');
  const btnFinish = document.getElementById('btnFinishContest');
  const btnNewContest = document.getElementById('btnNewContest');
  const tierSelect = document.getElementById('contestTierSelect');
  const durationSelect = document.getElementById('contestDurationSelect');

  if (btnStart) btnStart.addEventListener('click', startContest);
  if (btnPause) btnPause.addEventListener('click', pauseContest);
  if (btnResume) btnResume.addEventListener('click', resumeContest);
  if (btnFinish) btnFinish.addEventListener('click', finishContest);
  if (btnNewContest) btnNewContest.addEventListener('click', () => prepareContestProblems(true));

  if (tierSelect) {
    tierSelect.addEventListener('change', (e) => {
      contestTier = e.target.value;
      if (!contestIsActive) {
        prepareContestProblems(true);
      }
    });
  }

  if (durationSelect) {
    durationSelect.addEventListener('change', (e) => {
      const minutes = parseInt(e.target.value, 10);
      contestDurationSeconds = minutes * 60;
      if (!contestIsActive) {
        contestRemainingSeconds = contestDurationSeconds;
        updateContestTimerDisplay();
      }
    });
  }
}

/**
 * Pick 5 problems matching chosen tier
 */
async function prepareContestProblems(force = false) {
  const listContainer = document.getElementById('contestProblemsList');
  if (listContainer) {
    listContainer.innerHTML = `
      <div class="text-center py-4">
        <span class="spinner-border spinner-border-sm text-danger me-2"></span>
        <span class="text-secondary">Generating 5 contest problems from Codeforces catalog...</span>
      </div>
    `;
  }

  try {
    const problems = await CodeforcesAPI.fetchProblems();
    
    // Choose 5 problems based on tier
    // Warmup: A, A, B, B, C
    // Div. 2: A, B, C, D, E
    // Advanced: C, D, E, F, G
    let targetLevels = ['A', 'B', 'C', 'D', 'E'];
    if (contestTier === 'warmup') {
      targetLevels = ['A', 'A', 'B', 'B', 'C'];
    } else if (contestTier === 'advanced') {
      targetLevels = ['C', 'D', 'E', 'F', 'G'];
    }

    const letters = ['A', 'B', 'C', 'D', 'E'];
    contestProblems = [];

    targetLevels.forEach((lvl, idx) => {
      const pool = problems.filter(p => p.level === lvl);
      let chosen;
      if (pool.length > 0) {
        chosen = pool[Math.floor(Math.random() * pool.length)];
      } else {
        chosen = {
          contestId: 1900 + idx,
          index: letters[idx],
          name: `Contest Challenge ${letters[idx]}`,
          rating: 800 + idx * 300,
          level: lvl,
          tags: ['implementation'],
          cfUrl: `https://codeforces.com/problemset`
        };
      }

      contestProblems.push({
        letter: letters[idx],
        contestId: chosen.contestId,
        index: chosen.index,
        name: chosen.name,
        rating: chosen.rating,
        level: chosen.level,
        tags: chosen.tags || [],
        cfUrl: chosen.cfUrl,
        solved: false,
        solveTimeSeconds: 0
      });
    });

    renderContestProblemList();
  } catch (e) {
    console.error('Error generating contest', e);
  }
}

/**
 * Render the 5 problems in the contest list
 */
function renderContestProblemList() {
  const container = document.getElementById('contestProblemsList');
  if (!container) return;

  let html = '';
  contestProblems.forEach((p, idx) => {
    const solvedClass = p.solved ? 'solved' : '';
    const ratingClass = CodeforcesAPI.getRatingBadgeClass(p.rating);

    html += `
      <div class="contest-problem-item ${solvedClass}" id="contestProblemRow-${idx}">
        <div class="d-flex align-items-center gap-3">
          <div class="contest-letter-badge ${solvedClass}" id="badgeLetter-${idx}">${p.letter}</div>
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="text-white fw-bold">${p.name}</span>
              <span class="badge ${ratingClass} small">${p.rating || 'Unrated'}</span>
            </div>
            <div class="text-muted small">
              Codeforces ${p.contestId}${p.index} • ${(p.tags || []).slice(0, 3).join(', ')}
            </div>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <a href="${p.cfUrl}" target="_blank" rel="noopener noreferrer" class="btn-cs-outline small py-1 px-3">
            <i class="bi bi-box-arrow-up-right"></i> Problem ${p.letter}
          </a>

          <button class="btn-cs-${p.solved ? 'success' : 'secondary'} small py-1 px-3" 
                  id="btnSolveContest-${idx}" 
                  onclick="toggleSolveContestProblem(${idx})"
                  ${!contestIsActive ? 'disabled' : ''}>
            <i class="bi bi-${p.solved ? 'check-circle-fill' : 'circle'}"></i> 
            <span>${p.solved ? 'Solved' : 'Mark Solved'}</span>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  updateContestStatsBar();
}

/**
 * Start contest simulation
 */
function startContest() {
  contestIsActive = true;
  contestIsPaused = false;
  contestElapsedSeconds = 0;
  contestRemainingSeconds = contestDurationSeconds;

  // Enable problem buttons
  contestProblems.forEach((_, idx) => {
    const btn = document.getElementById(`btnSolveContest-${idx}`);
    if (btn) btn.disabled = false;
  });

  const btnStart = document.getElementById('btnStartContest');
  const btnPause = document.getElementById('btnPauseContest');
  const btnFinish = document.getElementById('btnFinishContest');

  if (btnStart) btnStart.classList.add('d-none');
  if (btnPause) btnPause.classList.remove('d-none');
  if (btnFinish) btnFinish.classList.remove('d-none');

  clearInterval(contestTimerInterval);
  contestTimerInterval = setInterval(contestTimerTick, 1000);

  showToast('🚀 Virtual Contest Started! Good luck!', 'success');
}

/**
 * Pause contest
 */
function pauseContest() {
  if (!contestIsActive || contestIsPaused) return;

  contestIsPaused = true;
  clearInterval(contestTimerInterval);

  const btnPause = document.getElementById('btnPauseContest');
  const btnResume = document.getElementById('btnResumeContest');

  if (btnPause) btnPause.classList.add('d-none');
  if (btnResume) btnResume.classList.remove('d-none');
}

/**
 * Resume contest
 */
function resumeContest() {
  if (!contestIsActive || !contestIsPaused) return;

  contestIsPaused = false;

  const btnPause = document.getElementById('btnPauseContest');
  const btnResume = document.getElementById('btnResumeContest');

  if (btnResume) btnResume.classList.add('d-none');
  if (btnPause) btnPause.classList.remove('d-none');

  clearInterval(contestTimerInterval);
  contestTimerInterval = setInterval(contestTimerTick, 1000);
}

/**
 * Timer tick
 */
function contestTimerTick() {
  contestElapsedSeconds++;
  if (contestRemainingSeconds > 0) {
    contestRemainingSeconds--;
    updateContestTimerDisplay();

    if (contestRemainingSeconds === 0) {
      clearInterval(contestTimerInterval);
      showToast('⏰ Contest Time Expired! Generating results...', 'error');
      finishContest();
    }
  } else {
    updateContestTimerDisplay();
  }
}

/**
 * Update remaining and elapsed timers
 */
function updateContestTimerDisplay() {
  const remainingEl = document.getElementById('contestTimeRemaining');
  const elapsedEl = document.getElementById('contestTimeElapsed');
  const progressEl = document.getElementById('contestProgressBar');

  if (remainingEl) remainingEl.textContent = CodeforcesAPI.formatTime(contestRemainingSeconds);
  if (elapsedEl) elapsedEl.textContent = CodeforcesAPI.formatTime(contestElapsedSeconds);

  if (progressEl) {
    const fraction = (contestRemainingSeconds / contestDurationSeconds) * 100;
    progressEl.style.width = `${Math.max(0, fraction)}%`;
  }
}

/**
 * Toggle solve status of a contest problem
 */
window.toggleSolveContestProblem = function(index) {
  if (!contestIsActive) {
    showToast('Start the contest before submitting solves.', 'info');
    return;
  }

  const p = contestProblems[index];
  p.solved = !p.solved;
  if (p.solved) {
    p.solveTimeSeconds = contestElapsedSeconds;
    showToast(`Problem ${p.letter} marked solved at ${CodeforcesAPI.formatTime(p.solveTimeSeconds)}!`, 'success');
  } else {
    p.solveTimeSeconds = 0;
  }

  renderContestProblemList();
};

/**
 * Update solved counter in stats bar
 */
function updateContestStatsBar() {
  const solvedCount = contestProblems.filter(p => p.solved).length;
  const countEl = document.getElementById('contestSolvedCounter');
  if (countEl) {
    countEl.textContent = `${solvedCount} / ${contestProblems.length} Solved`;
  }
}

/**
 * Finish contest and show summary dialog
 */
function finishContest() {
  clearInterval(contestTimerInterval);
  contestIsActive = false;
  contestIsPaused = false;

  const solvedCount = contestProblems.filter(p => p.solved).length;

  const contestResult = {
    title: `Virtual Contest (${contestTier.toUpperCase()})`,
    problemsCount: contestProblems.length,
    solvedCount: solvedCount,
    totalTimeSeconds: contestDurationSeconds,
    elapsedTimeSeconds: contestElapsedSeconds,
    problems: contestProblems.map(p => ({
      letter: p.letter,
      name: p.name,
      rating: p.rating,
      solved: p.solved,
      timeSpent: p.solveTimeSeconds
    }))
  };

  CodeSprintStorage.addContestResult(contestResult);

  // Show summary modal
  showContestSummaryModal(contestResult);
}

/**
 * Display contest completion summary modal
 */
function showContestSummaryModal(result) {
  const modalEl = document.getElementById('contestSummaryModal');
  if (!modalEl) return;

  const scoreEl = document.getElementById('summaryContestScore');
  const timeEl = document.getElementById('summaryContestTime');
  const tierBadgeEl = document.getElementById('summaryContestTier');
  const detailsListEl = document.getElementById('summaryContestProblemsList');

  if (scoreEl) scoreEl.textContent = `${result.solvedCount} / ${result.problemsCount}`;
  if (timeEl) timeEl.textContent = CodeforcesAPI.formatTime(result.elapsedTimeSeconds);

  let rankText = 'Good Effort';
  let rankClass = 'text-warning';
  if (result.solvedCount === 5) {
    rankText = 'Legendary Performance!';
    rankClass = 'text-success';
  } else if (result.solvedCount >= 3) {
    rankText = 'Mastery Speed!';
    rankClass = 'text-info';
  }

  if (tierBadgeEl) {
    tierBadgeEl.innerHTML = `<span class="${rankClass} fw-bold fs-5">${rankText}</span>`;
  }

  if (detailsListEl) {
    detailsListEl.innerHTML = result.problems.map(p => `
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
        <div>
          <span class="badge ${p.solved ? 'bg-success' : 'bg-secondary'} me-2">${p.letter}</span>
          <span class="text-white">${p.name}</span>
          <small class="text-muted ms-1">(${p.rating || 'Unrated'})</small>
        </div>
        <div>
          ${p.solved ? `<span class="text-success small"><i class="bi bi-check-lg"></i> Solved in ${CodeforcesAPI.formatTime(p.timeSpent)}</span>` : '<span class="text-muted small">Unsolved</span>'}
        </div>
      </div>
    `).join('');
  }

  if (window.bootstrap) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}
