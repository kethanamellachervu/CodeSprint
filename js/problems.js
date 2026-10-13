/**
 * CodeSprint - Problem Explorer Controller
 * Manages fetching, searching, multi-filter by difficulty and tags, sorting, and pagination.
 */

let allProblems = [];
let filteredProblems = [];
let currentPage = 1;
const PAGE_SIZE = 25;

document.addEventListener('DOMContentLoaded', async () => {
  setupFilterEventListeners();
  checkUrlParamsForFilters();
  await loadProblems();
});

/**
 * Check if a level was passed in the URL (e.g., problems.html?level=B)
 */
function checkUrlParamsForFilters() {
  const urlParams = new URLSearchParams(window.location.search);
  const levelParam = urlParams.get('level');
  const levelSelect = document.getElementById('filterLevel');
  if (levelParam && levelSelect) {
    levelSelect.value = levelParam.toUpperCase();
  }

  const tagParam = urlParams.get('tag');
  const tagSelect = document.getElementById('filterTag');
  if (tagParam && tagSelect) {
    tagSelect.value = tagParam.toLowerCase();
  }
}

/**
 * Attach listeners to search, filter selects, and sort
 */
function setupFilterEventListeners() {
  const searchInput = document.getElementById('searchProblemInput');
  const levelSelect = document.getElementById('filterLevel');
  const tagSelect = document.getElementById('filterTag');
  const sortSelect = document.getElementById('sortProblems');
  const loadMoreBtn = document.getElementById('btnLoadMore');
  const resetFiltersBtn = document.getElementById('btnResetFilters');

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        applyFiltersAndRender(true);
      }, 250);
    });
  }

  if (levelSelect) levelSelect.addEventListener('change', () => applyFiltersAndRender(true));
  if (tagSelect) tagSelect.addEventListener('change', () => applyFiltersAndRender(true));
  if (sortSelect) sortSelect.addEventListener('change', () => applyFiltersAndRender(true));

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentPage++;
      renderProblemPage(false);
    });
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (levelSelect) levelSelect.value = 'ALL';
      if (tagSelect) tagSelect.value = 'ALL';
      if (sortSelect) sortSelect.value = 'rating-asc';
      applyFiltersAndRender(true);
    });
  }
}

/**
 * Fetch problems using Codeforces API client
 */
async function loadProblems() {
  const loadingEl = document.getElementById('problemsLoading');
  const errorEl = document.getElementById('problemsError');
  const containerEl = document.getElementById('problemsListContainer');

  if (loadingEl) loadingEl.classList.remove('d-none');
  if (errorEl) errorEl.classList.add('d-none');

  try {
    allProblems = await CodeforcesAPI.fetchProblems();

    // Populate unique tags dropdown
    populateTagsDropdown(allProblems);

    if (loadingEl) loadingEl.classList.add('d-none');
    applyFiltersAndRender(true);
  } catch (err) {
    console.error('Failed to load problems', err);
    if (loadingEl) loadingEl.classList.add('d-none');
    if (errorEl) {
      errorEl.classList.remove('d-none');
      document.getElementById('errorMessageText').textContent = err.message || 'Error communicating with Codeforces.';
    }
  }
}

/**
 * Populate tags filter dropdown with top tags from problem dataset
 */
function populateTagsDropdown(problems) {
  const tagSelect = document.getElementById('filterTag');
  if (!tagSelect) return;

  const tagCounts = {};
  problems.forEach(p => {
    (p.tags || []).forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  // Sort tags by frequency
  const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);

  // Keep first option ('All Tags') and append tags
  const currentVal = tagSelect.value;
  let optionsHtml = '<option value="ALL">All Tags</option>';
  sortedTags.forEach(tag => {
    optionsHtml += `<option value="${tag}">${tag} (${tagCounts[tag]})</option>`;
  });
  tagSelect.innerHTML = optionsHtml;
  if (currentVal) tagSelect.value = currentVal;
}

/**
 * Filter, sort, and render problems
 */
function applyFiltersAndRender(resetPage = true) {
  if (resetPage) currentPage = 1;

  const searchQuery = (document.getElementById('searchProblemInput')?.value || '').toLowerCase().trim();
  const selectedLevel = document.getElementById('filterLevel')?.value || 'ALL';
  const selectedTag = document.getElementById('filterTag')?.value || 'ALL';
  const sortMode = document.getElementById('sortProblems')?.value || 'rating-asc';

  filteredProblems = allProblems.filter(problem => {
    // 1. Search text (name or ID)
    if (searchQuery) {
      const matchName = problem.name.toLowerCase().includes(searchQuery);
      const matchId = String(problem.id).toLowerCase().includes(searchQuery);
      if (!matchName && !matchId) return false;
    }

    // 2. Level filter
    if (selectedLevel !== 'ALL') {
      if (selectedLevel === 'UNRATED') {
        if (problem.rating !== null && problem.rating !== undefined) return false;
      } else {
        if (problem.level !== selectedLevel) return false;
      }
    }

    // 3. Tag filter
    if (selectedTag !== 'ALL') {
      if (!problem.tags || !problem.tags.includes(selectedTag)) return false;
    }

    return true;
  });

  // Sort problems
  filteredProblems.sort((a, b) => {
    const ratingA = a.rating !== null ? a.rating : -1;
    const ratingB = b.rating !== null ? b.rating : -1;

    switch (sortMode) {
      case 'rating-asc':
        return ratingA - ratingB;
      case 'rating-desc':
        return ratingB - ratingA;
      case 'contest-desc':
        return b.contestId - a.contestId;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      default:
        return ratingA - ratingB;
    }
  });

  // Update counter badge
  const counterEl = document.getElementById('resultsCount');
  if (counterEl) {
    counterEl.textContent = `Showing ${filteredProblems.length.toLocaleString()} matching problems`;
  }

  renderProblemPage(resetPage);
}

/**
 * Render items for the current page chunk
 */
function renderProblemPage(reset) {
  const container = document.getElementById('problemsListContainer');
  const loadMoreBtn = document.getElementById('btnLoadMore');
  const emptyState = document.getElementById('problemsEmptyState');
  if (!container) return;

  if (reset) {
    container.innerHTML = '';
  }

  if (filteredProblems.length === 0) {
    if (emptyState) emptyState.classList.remove('d-none');
    if (loadMoreBtn) loadMoreBtn.classList.add('d-none');
    return;
  } else {
    if (emptyState) emptyState.classList.add('d-none');
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredProblems.length);
  const pageSlice = filteredProblems.slice(startIndex, endIndex);

  let fragment = document.createDocumentFragment();

  pageSlice.forEach(p => {
    const row = document.createElement('div');
    row.className = 'problem-row';

    const ratingDisplay = p.rating ? `${p.rating}` : 'Unrated';
    const ratingClass = CodeforcesAPI.getRatingBadgeClass(p.rating);
    const levelLabel = p.level && p.level !== 'Unrated' ? `Lvl ${p.level}` : 'Unrated';

    const tagsHtml = (p.tags || []).slice(0, 4).map(t => `<span class="badge-tag">${t}</span>`).join('');
    const extraTags = (p.tags || []).length > 4 ? `<span class="badge-tag">+${p.tags.length - 4}</span>` : '';

    row.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <div class="problem-id">${p.contestId}${p.index}</div>
        <div class="problem-info">
          <div class="problem-name">
            <span>${p.name}</span>
            <span class="badge ${ratingClass} problem-rating-pill">${ratingDisplay} (${levelLabel})</span>
          </div>
          <div class="problem-tags">
            ${tagsHtml} ${extraTags}
          </div>
        </div>
      </div>

      <div class="problem-actions">
        <a href="${p.cfUrl}" target="_blank" rel="noopener noreferrer" class="btn-cs-outline small py-1 px-2" title="Open original problem on Codeforces.com">
          <i class="bi bi-box-arrow-up-right"></i> CF
        </a>
        <button class="btn-cs-primary small py-1 px-3" onclick="launchPractice('${p.contestId}', '${p.index}')" title="Start timed sprint practice">
          <i class="bi bi-play-circle"></i> Practice
        </button>
      </div>
    `;

    fragment.appendChild(row);
  });

  container.appendChild(fragment);

  // Show or hide Load More button
  if (loadMoreBtn) {
    if (endIndex < filteredProblems.length) {
      loadMoreBtn.classList.remove('d-none');
      loadMoreBtn.textContent = `Load More (${filteredProblems.length - endIndex} remaining)`;
    } else {
      loadMoreBtn.classList.add('d-none');
    }
  }
}

/**
 * Launch practice mode with selected problem
 */
window.launchPractice = function(contestId, index) {
  const p = allProblems.find(item => item.contestId == contestId && item.index == index);
  if (p) {
    CodeSprintStorage.setActivePractice(p);
  }
  window.location.href = `practice.html?contestId=${contestId}&index=${index}`;
};
