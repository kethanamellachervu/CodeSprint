/**
 * CodeSprint - Levels Page Controller
 * Dynamically renders the 8 difficulty levels and updates real problem counts from Codeforces API.
 */

document.addEventListener('DOMContentLoaded', async () => {
  renderLevelCards();
  await updateProblemCounts();
});

/**
 * Render the 8 Level cards with placeholders for problem counts
 */
function renderLevelCards() {
  const container = document.getElementById('levelsGrid');
  if (!container) return;

  const levels = CodeforcesAPI.getAllLevels();
  let html = '';

  for (const [key, lvl] of Object.entries(levels)) {
    html += `
      <div class="col-md-6 col-lg-3">
        <div class="level-card cs-card">
          <div class="d-flex justify-content-between align-items-start">
            <div class="level-badge-letter">${key}</div>
            <span class="level-rating-tag">${lvl.minRating}-${lvl.maxRating} Rating</span>
          </div>

          <h3 class="h5 text-white mb-1">${lvl.name}</h3>
          <div class="text-muted small mb-3">${lvl.subtitle}</div>

          <p class="text-secondary small mb-4" style="line-height: 1.5; min-height: 58px;">
            ${lvl.description}
          </p>

          <div class="mb-3 d-flex align-items-center justify-content-between pt-2 border-top border-secondary">
            <span class="text-muted small">Target Time:</span>
            <span class="badge rounded-pill" style="background: rgba(255, 100, 124, 0.12); color: var(--accent-pink); font-family: var(--font-mono); font-weight:600;">
              <i class="bi bi-stopwatch"></i> ${lvl.targetMinutes} mins
            </span>
          </div>

          <div class="level-problem-count">
            <i class="bi bi-collection"></i>
            <span id="levelCount-${key}">Loading count...</span>
          </div>

          <div class="d-flex gap-2 mt-3">
            <a href="problems.html?level=${key}" class="btn-cs-secondary flex-fill text-center py-2 px-1 small" title="Browse all Level ${key} problems">
              <i class="bi bi-list-ul"></i> Browse
            </a>
            <button class="btn-cs-primary flex-fill text-center py-2 px-1 small" onclick="startRandomPractice('${key}')" title="Start instant practice with a random Level ${key} problem">
              <i class="bi bi-play-fill"></i> Practice
            </button>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

/**
 * Update problem counts after fetching Codeforces data
 */
async function updateProblemCounts() {
  try {
    const problems = await CodeforcesAPI.fetchProblems();
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 };

    problems.forEach(p => {
      if (p.level && counts[p.level] !== undefined) {
        counts[p.level]++;
      }
    });

    for (const [key, count] of Object.entries(counts)) {
      const el = document.getElementById(`levelCount-${key}`);
      if (el) {
        el.textContent = `${count.toLocaleString()} problems available`;
      }
    }

    const totalEl = document.getElementById('totalProblemsLoaded');
    if (totalEl) {
      totalEl.textContent = `${problems.length.toLocaleString()} total problems loaded`;
    }
  } catch (e) {
    console.error('Failed to update level problem counts', e);
  }
}

/**
 * Start instant practice for a random problem in the specified level
 */
window.startRandomPractice = async function(levelKey) {
  try {
    showToast(`Selecting a Level ${levelKey} problem...`, 'info');
    const problems = await CodeforcesAPI.fetchProblems();
    const filtered = problems.filter(p => p.level === levelKey);

    if (filtered.length === 0) {
      showToast(`No problems found for Level ${levelKey}`, 'error');
      return;
    }

    const randomProblem = filtered[Math.floor(Math.random() * filtered.length)];
    CodeSprintStorage.setActivePractice(randomProblem);
    window.location.href = `practice.html?contestId=${randomProblem.contestId}&index=${randomProblem.index}`;
  } catch (err) {
    showToast('Failed to select random problem', 'error');
  }
};
