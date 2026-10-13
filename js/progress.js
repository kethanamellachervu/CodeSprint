/**
 * CodeSprint - Progress Dashboard & Analytics Controller
 * Renders statistical metrics, Chart.js graphs, recent sessions, and manages demo data loading.
 */

let weeklyChartInstance = null;
let difficultyChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  renderProgressDashboard();

  // Listen for storage events (saved sessions or resets)
  window.addEventListener('codesprint:practice-saved', renderProgressDashboard);
  window.addEventListener('codesprint:data-reset', renderProgressDashboard);

  const btnLoadDemo = document.getElementById('btnLoadDemoData');
  if (btnLoadDemo) {
    btnLoadDemo.addEventListener('click', () => {
      CodeSprintStorage.loadDemoData();
      showToast('Sample practice sessions loaded!', 'success');
      renderProgressDashboard();
    });
  }

  const btnReset = document.getElementById('btnResetFromDashboard');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all practice logs?')) {
        CodeSprintStorage.resetAllData();
        showToast('All practice history cleared', 'info');
        renderProgressDashboard();
      }
    });
  }
});

/**
 * Render the whole progress screen
 */
async function renderProgressDashboard() {
  let stats = CodeSprintStorage.getStats();

  // If authenticated with backend, pull live cloud stats
  if (window.CodeSprintAPI && window.CodeSprintAPI.isAuthenticated()) {
    try {
      const res = await window.CodeSprintAPI.getProgressStats();
      if (res && res.success && res.stats) {
        stats = {
          ...stats,
          ...res.stats
        };
      }
    } catch (e) {
      console.warn('Failed to load cloud stats, falling back to local:', e.message);
    }
  }

  const profile = CodeSprintStorage.getProfile();

  // Check if empty
  const emptyState = document.getElementById('progressEmptyState');
  const contentSection = document.getElementById('progressContentSection');

  if (stats.totalAttempted === 0 && (stats.totalContests === 0 || !stats.totalContests) && (stats.totalSolved === 0)) {
    if (emptyState) emptyState.classList.remove('d-none');
    if (contentSection) contentSection.classList.add('d-none');
    return;
  } else {
    if (emptyState) emptyState.classList.add('d-none');
    if (contentSection) contentSection.classList.remove('d-none');
  }

  // 1. Stat Metric Cards
  const elAttempted = document.getElementById('statTotalAttempted');
  const elSolved = document.getElementById('statTotalSolved');
  const elSuccessRate = document.getElementById('statSuccessRate');
  const elPracticeTime = document.getElementById('statTotalTime');

  if (elAttempted) elAttempted.textContent = stats.totalAttempted;
  if (elSolved) elSolved.textContent = stats.totalSolved;
  if (elSuccessRate) elSuccessRate.textContent = `${stats.successRate}%`;

  if (elPracticeTime) {
    const totalMinutes = Math.round(stats.totalPracticeSeconds / 60);
    if (totalMinutes >= 60) {
      const hrs = (totalMinutes / 60).toFixed(1);
      elPracticeTime.textContent = `${hrs} hrs`;
    } else {
      elPracticeTime.textContent = `${totalMinutes} mins`;
    }
  }

  // 2. Charts
  renderWeeklyPracticeChart(stats.daysMap);
  renderDifficultyChart(stats.levelCounts);

  // 3. Recent Sessions Table
  renderRecentSessionsTable(stats.recentSessions);
}

/**
 * Render Chart.js for Weekly Practice Activity
 */
function renderWeeklyPracticeChart(daysMap) {
  const canvas = document.getElementById('weeklyPracticeChart');
  if (!canvas || !window.Chart) return;

  const labels = [];
  const minutesData = [];

  for (const [date, info] of Object.entries(daysMap)) {
    labels.push(info.label);
    minutesData.push(info.minutes);
  }

  if (weeklyChartInstance) {
    weeklyChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, 'rgba(255, 100, 124, 0.45)');
  gradient.addColorStop(1, 'rgba(255, 49, 90, 0.02)');

  weeklyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Practice Time (Minutes)',
        data: minutesData,
        backgroundColor: 'rgba(255, 75, 108, 0.75)',
        hoverBackgroundColor: '#FF315A',
        borderRadius: 6,
        borderWidth: 0,
        maxBarThickness: 36
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#171A21',
          titleColor: '#FFFFFF',
          bodyColor: '#A1A1AA',
          borderColor: '#292D36',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: (context) => `${context.parsed.y} minutes practiced`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { color: '#71717A', font: { family: 'Inter', size: 12 } }
        },
        y: {
          grid: { color: 'rgba(41, 45, 54, 0.6)', drawBorder: false },
          ticks: { color: '#71717A', font: { family: 'Inter', size: 12 }, precision: 0 },
          beginAtZero: true
        }
      }
    }
  });
}

/**
 * Render Chart.js for Difficulty-Wise Solved Distribution
 */
function renderDifficultyChart(levelCounts) {
  const canvas = document.getElementById('difficultyBreakdownChart');
  if (!canvas || !window.Chart) return;

  const levels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const counts = levels.map(lvl => levelCounts[lvl] || 0);

  const barColors = [
    '#10B981', // A
    '#34D399', // B
    '#38BDF8', // C
    '#60A5FA', // D
    '#A855F7', // E
    '#C084FC', // F
    '#F59E0B', // G
    '#EF4444'  // H
  ];

  if (difficultyChartInstance) {
    difficultyChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  difficultyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: levels.map(l => `Level ${l}`),
      datasets: [{
        label: 'Problems Solved',
        data: counts,
        backgroundColor: barColors,
        borderRadius: 6,
        borderWidth: 0,
        maxBarThickness: 32
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#171A21',
          titleColor: '#FFFFFF',
          bodyColor: '#A1A1AA',
          borderColor: '#292D36',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: (context) => `${context.parsed.y} problems solved`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { color: '#71717A', font: { family: 'Inter', size: 12 } }
        },
        y: {
          grid: { color: 'rgba(41, 45, 54, 0.6)', drawBorder: false },
          ticks: { color: '#71717A', font: { family: 'Inter', size: 12 }, precision: 0 },
          beginAtZero: true
        }
      }
    }
  });
}

/**
 * Render Recent Sessions Table
 */
function renderRecentSessionsTable(sessions) {
  const container = document.getElementById('recentSessionsTableBody');
  if (!container) return;

  if (!sessions || sessions.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No recent practice records.</td></tr>`;
    return;
  }

  let html = '';
  sessions.forEach(s => {
    const isSolved = s.status === 'solved';
    const statusBadge = isSolved
      ? '<span class="badge bg-success small"><i class="bi bi-check-lg"></i> Solved</span>'
      : '<span class="badge bg-secondary small"><i class="bi bi-x-lg"></i> Unsolved</span>';

    const lvlBadge = s.level && s.level !== 'Unrated'
      ? `<span class="badge bg-dark border border-secondary text-white small">Level ${s.level}</span>`
      : '<span class="badge bg-dark border border-secondary text-muted small">General</span>';

    const timeSpent = CodeforcesAPI.formatTime(s.timeSpentSeconds);
    const dateFormatted = new Date(s.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    html += `
      <tr>
        <td class="text-white fw-semibold">
          <div class="d-flex align-items-center gap-2">
            <span class="text-muted small">${s.problemId || ''}</span>
            <span>${s.name}</span>
          </div>
        </td>
        <td>${lvlBadge}</td>
        <td>${statusBadge}</td>
        <td style="font-family: var(--font-mono); color: var(--text-primary);">${timeSpent}</td>
        <td class="text-muted small">${dateFormatted}</td>
      </tr>
    `;
  });

  container.innerHTML = html;
}
