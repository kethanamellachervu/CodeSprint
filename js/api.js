/**
 * CodeSprint - Codeforces API Client & Difficulty Mapping
 * Handles fetching, caching, mapping, and fallbacks for Codeforces problems.
 */

const CF_API_URL = 'https://codeforces.com/api/problemset.problems';
const CACHE_STORAGE_KEY = 'codesprint_cf_problems_cache';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Difficulty Level Mapping based on Codeforces Ratings
const LEVEL_CONFIG = {
  A: {
    name: 'Level A',
    subtitle: 'Div. 2 A / Warmup',
    minRating: 800,
    maxRating: 1000,
    targetMinutes: 10,
    color: '#10B981',
    description: 'Beginner fundamentals, simple simulations, greediness, and ad-hoc logic to get your fingers warm.'
  },
  B: {
    name: 'Level B',
    subtitle: 'Div. 2 B / Easy',
    minRating: 1100,
    maxRating: 1200,
    targetMinutes: 15,
    color: '#34D399',
    description: 'Elementary math, sorting, two pointers, prefix sums, and basic algorithmic reasoning.'
  },
  C: {
    name: 'Level C',
    subtitle: 'Div. 2 C / Medium-Easy',
    minRating: 1300,
    maxRating: 1500,
    targetMinutes: 25,
    color: '#38BDF8',
    description: 'Constructive algorithms, binary search over answer, number theory, and recursion.'
  },
  D: {
    name: 'Level D',
    subtitle: 'Div. 2 D / Div. 1 A',
    minRating: 1600,
    maxRating: 1800,
    targetMinutes: 35,
    color: '#60A5FA',
    description: 'Dynamic programming fundamentals, tree traversal, BFS/DFS, and greedy priority queues.'
  },
  E: {
    name: 'Level E',
    subtitle: 'Div. 2 E / Div. 1 B',
    minRating: 1900,
    maxRating: 2100,
    targetMinutes: 45,
    color: '#A855F7',
    description: 'Segment trees, Fenwick trees, bitmask DP, combinatorics, and shortest path variants.'
  },
  F: {
    name: 'Level F',
    subtitle: 'Div. 1 C / Hard',
    minRating: 2200,
    maxRating: 2400,
    targetMinutes: 60,
    color: '#C084FC',
    description: 'Advanced data structures, centroid decomposition, game theory, and flows.'
  },
  G: {
    name: 'Level G',
    subtitle: 'Div. 1 D / Expert',
    minRating: 2500,
    maxRating: 2800,
    targetMinutes: 75,
    color: '#F59E0B',
    description: 'Grandmaster-tier challenges, complex mathematical insights, heavy optimizations, and geometry.'
  },
  H: {
    name: 'Level H',
    subtitle: 'Div. 1 E+ / Master',
    minRating: 2900,
    maxRating: 3500,
    targetMinutes: 90,
    color: '#EF4444',
    description: 'Elite competitive programming problems demanding world-class algorithmic invention.'
  }
};

// Curated fallback problems in case of network outages or Codeforces API rate limiting
const FALLBACK_PROBLEMS = [
  { contestId: 1941, index: 'A', name: 'Rudolf and the Ticket', rating: 800, tags: ['brute force', 'math'] },
  { contestId: 1927, index: 'B', name: 'Following the String', rating: 900, tags: ['strings', 'greedy'] },
  { contestId: 1915, index: 'C', name: 'Can I Square?', rating: 800, tags: ['binary search', 'math'] },
  { contestId: 1899, index: 'B', name: '250 Thousand Tons of TNT', rating: 1100, tags: ['brute force', 'number theory'] },
  { contestId: 1899, index: 'C', name: 'Yarik and Array', rating: 1100, tags: ['dp', 'greedy', 'two pointers'] },
  { contestId: 1883, index: 'C', name: 'Raspberries', rating: 1200, tags: ['math', 'number theory'] },
  { contestId: 1873, index: 'E', name: 'Building an Aquarium', rating: 1300, tags: ['binary search', 'greedy'] },
  { contestId: 1850, index: 'F', name: 'We Were Both Children', rating: 1400, tags: ['math', 'number theory'] },
  { contestId: 1846, index: 'D', name: 'Rudolph and Christmas Tree', rating: 1300, tags: ['geometry', 'math'] },
  { contestId: 1846, index: 'E1', name: 'Rudolf and Snowflakes (simple)', rating: 1600, tags: ['brute force', 'math'] },
  { contestId: 1843, index: 'E', name: 'Tracking Segments', rating: 1700, tags: ['binary search', 'data structures'] },
  { contestId: 1833, index: 'E', name: 'Round Dance', rating: 1600, tags: ['dsu', 'graphs'] },
  { contestId: 1826, index: 'D', name: 'Running Miles', rating: 1700, tags: ['dp', 'greedy'] },
  { contestId: 1805, index: 'D', name: 'A Wide, Wide Graph', rating: 1900, tags: ['dfs and similar', 'trees'] },
  { contestId: 1792, index: 'D', name: 'Fixed Prefix Permutations', rating: 1900, tags: ['data structures', 'hashing'] },
  { contestId: 1768, index: 'D', name: 'Lucky Permutation', rating: 2000, tags: ['graphs', 'math'] },
  { contestId: 1748, index: 'D', name: 'ConstructOR', rating: 2100, tags: ['bitmasks', 'constructive algorithms', 'math'] },
  { contestId: 1738, index: 'E', name: 'Balance Addicts', rating: 2200, tags: ['combinatorics', 'two pointers'] },
  { contestId: 1707, index: 'C', name: 'DFS Trees', rating: 2300, tags: ['data structures', 'dfs and similar', 'trees'] },
  { contestId: 1681, index: 'F', name: 'Unique Occurrences', rating: 2400, tags: ['data structures', 'divide and conquer', 'trees'] },
  { contestId: 1667, index: 'C', name: 'Half Queen Cover', rating: 2500, tags: ['constructive algorithms', 'math'] },
  { contestId: 1637, index: 'F', name: 'Tower Defense', rating: 2600, tags: ['dp', 'greedy', 'trees'] },
  { contestId: 1545, index: 'D', name: 'AquaMoon and Chess', rating: 2900, tags: ['combinatorics', 'math'] },
  { contestId: 1479, index: 'D', name: 'Odd Mineral Resource', rating: 3000, tags: ['data structures', 'probabilities', 'trees'] }
];

// In-memory cache for fast session access
let memoryCache = null;

const CodeforcesAPI = {
  /**
   * Determine the Level letter (A-H) from problem rating
   */
  mapRatingToLevel(rating) {
    if (!rating || typeof rating !== 'number') return 'Unrated';
    for (const [lvl, conf] of Object.entries(LEVEL_CONFIG)) {
      if (rating >= conf.minRating && rating <= conf.maxRating) {
        return lvl;
      }
    }
    return rating < 800 ? 'A' : 'H';
  },

  /**
   * Return target time in seconds for a given rating or level
   */
  getTargetSeconds(levelOrRating) {
    let lvl = levelOrRating;
    if (typeof levelOrRating === 'number') {
      lvl = this.mapRatingToLevel(levelOrRating);
    }
    const conf = LEVEL_CONFIG[lvl];
    return conf ? conf.targetMinutes * 60 : 20 * 60; // 20 min fallback
  },

  /**
   * Get level configuration object
   */
  getLevelConfig(levelKey) {
    return LEVEL_CONFIG[levelKey] || null;
  },

  getAllLevels() {
    return LEVEL_CONFIG;
  },

  /**
   * Fetch all Codeforces problems with session caching and fallbacks
   */
  async fetchProblems(forceRefresh = false) {
    // 1. Check in-memory cache
    if (memoryCache && !forceRefresh) {
      return memoryCache;
    }

    // 2. Check sessionStorage
    if (!forceRefresh) {
      try {
        const cachedStr = sessionStorage.getItem(CACHE_STORAGE_KEY);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (Date.now() - cached.timestamp < CACHE_EXPIRY_MS && cached.problems?.length) {
            memoryCache = cached.problems;
            return memoryCache;
          }
        }
      } catch (e) {
        console.warn('Session storage read failed, proceeding to network fetch', e);
      }
    }

    // 3. Try fetching from Backend problem cache API first
    const backendUrl = window.location.origin.includes('5050') ? '/api/problems?limit=1000' : 'http://localhost:5050/api/problems?limit=1000';
    try {
      const bRes = await fetch(backendUrl);
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData.success && Array.isArray(bData.problems) && bData.problems.length > 0) {
          memoryCache = bData.problems;
          return memoryCache;
        }
      }
    } catch (bErr) {
      // Backend not running on 5050, fall through to direct Codeforces API
    }

    // 4. Direct Network fetch from Codeforces public API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000); // 9 sec timeout

      const response = await fetch(CF_API_URL, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Codeforces API responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'OK' && data.result && Array.isArray(data.result.problems)) {
        // Enrich problems with computed Level, direct problem link, and ID
        const enriched = data.result.problems.map(p => {
          const rating = p.rating || null;
          const level = this.mapRatingToLevel(rating);
          return {
            contestId: p.contestId,
            index: p.index,
            id: `${p.contestId}${p.index}`,
            name: p.name,
            rating: rating,
            level: level,
            tags: p.tags || [],
            cfUrl: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`
          };
        });

        // Store in memory and sessionStorage
        memoryCache = enriched;
        try {
          // Store first 5000 problems in sessionStorage to avoid quota overflow
          const cacheSubset = enriched.slice(0, 4500);
          sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify({
            timestamp: Date.now(),
            problems: cacheSubset
          }));
        } catch (e) {
          console.warn('Could not store full list in sessionStorage (quota exceeded), kept in memory', e);
        }

        return enriched;
      } else {
        throw new Error(data.comment || 'Codeforces API did not return OK status');
      }
    } catch (networkError) {
      console.warn('Could not fetch from Codeforces API. Using curated offline problem dataset:', networkError.message);
      
      // Fallback to offline curated dataset
      const enrichedFallback = FALLBACK_PROBLEMS.map(p => ({
        ...p,
        id: `${p.contestId}${p.index}`,
        level: this.mapRatingToLevel(p.rating),
        cfUrl: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
        isFallback: true
      }));

      memoryCache = enrichedFallback;
      return enrichedFallback;
    }
  },

  /**
   * Find a problem by contestId and index
   */
  async getProblem(contestId, index) {
    const problems = await this.fetchProblems();
    const cleanContest = parseInt(contestId, 10);
    const cleanIndex = String(index).toUpperCase();

    const found = problems.find(p => p.contestId === cleanContest && p.index.toUpperCase() === cleanIndex);
    if (found) return found;

    // Fallback constructed problem if not in cache
    return {
      contestId: cleanContest,
      index: cleanIndex,
      id: `${cleanContest}${cleanIndex}`,
      name: `Problem ${cleanContest}${cleanIndex}`,
      rating: 1200,
      level: 'B',
      tags: ['ad-hoc'],
      cfUrl: `https://codeforces.com/problemset/problem/${cleanContest}/${cleanIndex}`
    };
  },

  /**
   * Get CSS class for rating pill
   */
  getRatingBadgeClass(rating) {
    if (!rating) return 'badge-rating-newbie';
    if (rating < 1200) return 'badge-rating-pupil';
    if (rating < 1400) return 'badge-rating-pupil';
    if (rating < 1600) return 'badge-rating-specialist';
    if (rating < 1900) return 'badge-rating-expert';
    if (rating < 2100) return 'badge-rating-cm';
    if (rating < 2400) return 'badge-rating-master';
    return 'badge-rating-gm';
  },

  /**
   * Format seconds to mm:ss or hh:mm:ss
   */
  formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    const pad = n => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }
};

window.CodeforcesAPI = CodeforcesAPI;
window.LEVEL_CONFIG = LEVEL_CONFIG;
