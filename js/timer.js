/**
 * CodeSprint - Practice Timer Controller
 * Robust countdown timer with Start, Pause, Resume, Reset, target adjustment,
 * accurate time recording, and LocalStorage persistence.
 */

let activeProblem = null;
let timerInterval = null;
let isRunning = false;
let isPaused = false;
let initialTargetSeconds = 15 * 60; // Default 15 minutes
let remainingSeconds = 15 * 60;
let timeSpentSeconds = 0;
let sessionStartTime = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initPracticePage();
  setupTimerControls();
});

/**
 * Initialize practice problem from URL or LocalStorage
 */
async function initPracticePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const contestId = urlParams.get('contestId');
  const index = urlParams.get('index');

  if (contestId && index) {
    activeProblem = await CodeforcesAPI.getProblem(contestId, index);
  } else {
    // Check active practice in storage
    activeProblem = CodeSprintStorage.getActivePractice();
  }

  // If still null, pick a default problem
  if (!activeProblem) {
    activeProblem = {
      contestId: 1941,
      index: 'A',
      id: '1941A',
      name: 'Rudolf and the Ticket',
      rating: 800,
      level: 'A',
      tags: ['brute force', 'math'],
      cfUrl: 'https://codeforces.com/problemset/problem/1941/A'
    };
  }

  // Display problem metadata
  renderProblemHeader(activeProblem);

  // Set initial target seconds based on problem level or rating
  initialTargetSeconds = CodeforcesAPI.getTargetSeconds(activeProblem.level || activeProblem.rating);
  remainingSeconds = initialTargetSeconds;
  timeSpentSeconds = 0;

  updateTimerDisplay();
  highlightActivePreset(initialTargetSeconds);
}

/**
 * Render the problem details card
 */
function renderProblemHeader(p) {
  const nameEl = document.getElementById('practiceProblemName');
  const idEl = document.getElementById('practiceProblemId');
  const ratingEl = document.getElementById('practiceProblemRating');
  const tagsEl = document.getElementById('practiceProblemTags');
  const cfLinkEl = document.getElementById('practiceCfLink');
  const targetLabel = document.getElementById('practiceTargetLabel');

  if (nameEl) nameEl.textContent = p.name || 'Untitled Problem';
  if (idEl) idEl.textContent = `Codeforces ${p.contestId}${p.index}`;
  if (cfLinkEl) cfLinkEl.href = p.cfUrl || `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;

  if (ratingEl) {
    const ratingDisplay = p.rating ? `${p.rating}` : 'Unrated';
    const ratingClass = CodeforcesAPI.getRatingBadgeClass(p.rating);
    const lvlName = p.level && p.level !== 'Unrated' ? `Level ${p.level}` : 'General';
    ratingEl.className = `badge ${ratingClass} px-3 py-2`;
    ratingEl.textContent = `${ratingDisplay} • ${lvlName}`;
  }

  if (tagsEl) {
    tagsEl.innerHTML = (p.tags || []).map(t => `<span class="badge-tag">${t}</span>`).join(' ');
  }

  if (targetLabel) {
    const mins = Math.round(initialTargetSeconds / 60);
    targetLabel.textContent = `${mins} mins`;
  }
}

/**
 * Setup buttons and listeners for timer operations
 */
function setupTimerControls() {
  const startBtn = document.getElementById('btnTimerStart');
  const pauseBtn = document.getElementById('btnTimerPause');
  const resumeBtn = document.getElementById('btnTimerResume');
  const resetBtn = document.getElementById('btnTimerReset');
  const solvedBtn = document.getElementById('btnMarkSolved');
  const notSolvedBtn = document.getElementById('btnMarkNotSolved');

  if (startBtn) startBtn.addEventListener('click', startTimer);
  if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
  if (resumeBtn) resumeBtn.addEventListener('click', resumeTimer);
  if (resetBtn) resetBtn.addEventListener('click', resetTimer);

  if (solvedBtn) solvedBtn.addEventListener('click', () => completeSession('solved'));
  if (notSolvedBtn) notSolvedBtn.addEventListener('click', () => completeSession('unsolved'));

  // Preset time buttons
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (isRunning && !isPaused) {
        if (!confirm('Timer is currently running. Change target duration anyway?')) {
          return;
        }
      }
      const minutes = parseInt(btn.dataset.minutes, 10);
      setCustomTarget(minutes * 60);
    });
  });

  // Custom input listener
  const btnCustomTime = document.getElementById('btnSetCustomTime');
  if (btnCustomTime) {
    btnCustomTime.addEventListener('click', () => {
      const input = document.getElementById('customMinutesInput');
      const val = parseInt(input.value, 10);
      if (val && val > 0 && val <= 180) {
        setCustomTarget(val * 60);
      } else {
        showToast('Please enter a valid duration between 1 and 180 minutes', 'error');
      }
    });
  }
}

/**
 * Set target seconds and reset timer state
 */
function setCustomTarget(seconds) {
  stopTimerInterval();
  isRunning = false;
  isPaused = false;
  initialTargetSeconds = seconds;
  remainingSeconds = seconds;
  timeSpentSeconds = 0;

  updateTimerDisplay();
  updateButtonStates();
  highlightActivePreset(seconds);

  const targetLabel = document.getElementById('practiceTargetLabel');
  if (targetLabel) {
    targetLabel.textContent = `${Math.round(seconds / 60)} mins`;
  }

  showToast(`Timer target set to ${Math.round(seconds / 60)} minutes`, 'info');
}

/**
 * Highlight the button corresponding to active target
 */
function highlightActivePreset(seconds) {
  const mins = Math.round(seconds / 60);
  document.querySelectorAll('.btn-preset').forEach(btn => {
    if (parseInt(btn.dataset.minutes, 10) === mins) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * Start the countdown timer
 */
function startTimer() {
  if (isRunning) return;

  isRunning = true;
  isPaused = false;
  sessionStartTime = Date.now();

  updateButtonStates();
  const displayEl = document.getElementById('timerDisplay');
  if (displayEl) {
    displayEl.classList.remove('expired', 'warning');
    displayEl.classList.add('running');
  }

  const timerCard = document.getElementById('timerCard');
  if (timerCard) timerCard.classList.remove('expired');

  clearInterval(timerInterval);
  timerInterval = setInterval(timerTick, 1000);
}

/**
 * Pause the timer
 */
function pauseTimer() {
  if (!isRunning || isPaused) return;

  isPaused = true;
  clearInterval(timerInterval);
  updateButtonStates();

  const displayEl = document.getElementById('timerDisplay');
  if (displayEl) displayEl.classList.remove('running');
}

/**
 * Resume the timer
 */
function resumeTimer() {
  if (!isRunning || !isPaused) return;

  isPaused = false;
  updateButtonStates();

  const displayEl = document.getElementById('timerDisplay');
  if (displayEl) displayEl.classList.add('running');

  clearInterval(timerInterval);
  timerInterval = setInterval(timerTick, 1000);
}

/**
 * Reset the timer back to current target
 */
function resetTimer() {
  stopTimerInterval();
  isRunning = false;
  isPaused = false;
  remainingSeconds = initialTargetSeconds;
  timeSpentSeconds = 0;

  updateTimerDisplay();
  updateButtonStates();

  const displayEl = document.getElementById('timerDisplay');
  if (displayEl) displayEl.classList.remove('running', 'expired', 'warning');

  const timerCard = document.getElementById('timerCard');
  if (timerCard) timerCard.classList.remove('expired');
}

/**
 * Each second interval tick
 */
function timerTick() {
  timeSpentSeconds++;

  if (remainingSeconds > 0) {
    remainingSeconds--;
    updateTimerDisplay();

    // Check warning threshold (< 2 mins)
    if (remainingSeconds <= 120 && remainingSeconds > 0) {
      const displayEl = document.getElementById('timerDisplay');
      if (displayEl) displayEl.classList.add('warning');
    }

    // Check expired
    if (remainingSeconds === 0) {
      handleTimerExpired();
    }
  } else {
    // Keep tracking overtime spent if problem is still in progress
    updateTimerDisplay();
  }
}

/**
 * Trigger expired state
 */
function handleTimerExpired() {
  const displayEl = document.getElementById('timerDisplay');
  const timerCard = document.getElementById('timerCard');

  if (displayEl) {
    displayEl.classList.remove('running', 'warning');
    displayEl.classList.add('expired');
  }
  if (timerCard) {
    timerCard.classList.add('expired');
  }

  showToast('⏰ Time is up! Beat the buzzer or finish up and record your solve.', 'error');
}

/**
 * Update UI digits and progress bar
 */
function updateTimerDisplay() {
  const displayEl = document.getElementById('timerDisplay');
  const spentEl = document.getElementById('timeSpentDisplay');
  const progressBar = document.getElementById('timerProgressBar');

  if (displayEl) {
    displayEl.textContent = CodeforcesAPI.formatTime(remainingSeconds);
  }

  if (spentEl) {
    spentEl.textContent = CodeforcesAPI.formatTime(timeSpentSeconds);
  }

  if (progressBar) {
    const fraction = initialTargetSeconds > 0 ? (remainingSeconds / initialTargetSeconds) * 100 : 0;
    progressBar.style.width = `${Math.max(0, Math.min(100, fraction))}%`;

    if (remainingSeconds <= 0) {
      progressBar.style.background = 'var(--danger)';
    } else if (remainingSeconds <= 120) {
      progressBar.style.background = 'var(--warning)';
    } else {
      progressBar.style.background = 'var(--accent-gradient)';
    }
  }
}

/**
 * Sync button visibilities based on timer state
 */
function updateButtonStates() {
  const startBtn = document.getElementById('btnTimerStart');
  const pauseBtn = document.getElementById('btnTimerPause');
  const resumeBtn = document.getElementById('btnTimerResume');
  const resetBtn = document.getElementById('btnTimerReset');

  if (!isRunning) {
    if (startBtn) startBtn.classList.remove('d-none');
    if (pauseBtn) pauseBtn.classList.add('d-none');
    if (resumeBtn) resumeBtn.classList.add('d-none');
  } else if (isPaused) {
    if (startBtn) startBtn.classList.add('d-none');
    if (pauseBtn) alertClass = 'd-none'; pauseBtn.classList.add('d-none');
    if (resumeBtn) resumeBtn.classList.remove('d-none');
  } else {
    if (startBtn) startBtn.classList.add('d-none');
    if (pauseBtn) pauseBtn.classList.remove('d-none');
    if (resumeBtn) resumeBtn.classList.add('d-none');
  }
}

function stopTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/**
 * Record session result to LocalStorage and open results dialog
 */
function completeSession(status) {
  stopTimerInterval();
  isRunning = false;
  isPaused = false;
  updateButtonStates();

  const finalTimeSpent = Math.max(1, timeSpentSeconds);

  const sessionData = {
    problemId: `${activeProblem.contestId}${activeProblem.index}`,
    contestId: activeProblem.contestId,
    index: activeProblem.index,
    name: activeProblem.name,
    rating: activeProblem.rating,
    level: activeProblem.level || CodeforcesAPI.mapRatingToLevel(activeProblem.rating),
    tags: activeProblem.tags || [],
    timeSpentSeconds: finalTimeSpent,
    targetTimeSeconds: initialTargetSeconds,
    status: status // 'solved' or 'unsolved'
  };

  const saved = CodeSprintStorage.addPracticeSession(sessionData);

  // Show summary modal
  showSessionSummaryModal(saved);
}

/**
 * Render Session Result Modal
 */
function showSessionSummaryModal(session) {
  const modalEl = document.getElementById('sessionSummaryModal');
  if (!modalEl) return;

  const titleEl = document.getElementById('summaryProblemTitle');
  const statusBadge = document.getElementById('summaryStatusBadge');
  const timeSpentEl = document.getElementById('summaryTimeSpent');
  const targetTimeEl = document.getElementById('summaryTargetTime');
  const speedDiffEl = document.getElementById('summarySpeedDiff');

  if (titleEl) titleEl.textContent = `${session.name} (${session.contestId}${session.index})`;

  if (statusBadge) {
    if (session.status === 'solved') {
      statusBadge.className = 'badge bg-success p-2 fs-6';
      statusBadge.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Solved';
    } else {
      statusBadge.className = 'badge bg-secondary p-2 fs-6';
      statusBadge.innerHTML = '<i class="bi bi-x-circle-fill me-1"></i> Not Solved';
    }
  }

  if (timeSpentEl) timeSpentEl.textContent = CodeforcesAPI.formatTime(session.timeSpentSeconds);
  if (targetTimeEl) targetTimeEl.textContent = CodeforcesAPI.formatTime(session.targetTimeSeconds);

  if (speedDiffEl) {
    const diff = session.targetTimeSeconds - session.timeSpentSeconds;
    if (session.status === 'solved') {
      if (diff >= 0) {
        speedDiffEl.innerHTML = `<span class="text-success"><i class="bi bi-lightning-fill"></i> ${CodeforcesAPI.formatTime(diff)} faster than target!</span>`;
      } else {
        speedDiffEl.innerHTML = `<span class="text-warning"><i class="bi bi-clock-history"></i> ${CodeforcesAPI.formatTime(Math.abs(diff))} overtime</span>`;
      }
    } else {
      speedDiffEl.innerHTML = `<span class="text-muted">Recorded for revision</span>`;
    }
  }

  if (window.bootstrap) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

/**
 * Quick jump to next random problem in current level
 */
window.practiceNextProblem = async function() {
  try {
    const currentLevel = activeProblem.level || 'A';
    const problems = await CodeforcesAPI.fetchProblems();
    const matching = problems.filter(p => p.level === currentLevel && p.id !== activeProblem.id);

    if (matching.length > 0) {
      const nextProblem = matching[Math.floor(Math.random() * matching.length)];
      CodeSprintStorage.setActivePractice(nextProblem);
      window.location.href = `practice.html?contestId=${nextProblem.contestId}&index=${nextProblem.index}`;
    } else {
      window.location.href = 'problems.html';
    }
  } catch (e) {
    window.location.href = 'problems.html';
  }
};
