const CF_API_URL = 'https://codeforces.com/api/problemset.problems';

// Level configuration mapping
const LEVEL_CONFIG = {
  A: { min: 800, max: 1000 },
  B: { min: 1100, max: 1200 },
  C: { min: 1300, max: 1500 },
  D: { min: 1600, max: 1800 },
  E: { min: 1900, max: 2100 },
  F: { min: 2200, max: 2400 },
  G: { min: 2500, max: 2800 },
  H: { min: 2900, max: 3500 }
};

const mapRatingToLevel = (rating) => {
  if (!rating || typeof rating !== 'number') return 'Unrated';
  for (const [lvl, range] of Object.entries(LEVEL_CONFIG)) {
    if (rating >= range.min && rating <= range.max) {
      return lvl;
    }
  }
  return rating < 800 ? 'A' : 'H';
};

// Curated fallbacks in case Codeforces API times out or rate limits
const FALLBACK_PROBLEMS = [
  { contestId: 1941, index: 'A', name: 'Rudolf and the Ticket', rating: 800, tags: ['brute force', 'math'] },
  { contestId: 1927, index: 'B', name: 'Following the String', rating: 900, tags: ['strings', 'greedy'] },
  { contestId: 1915, index: 'C', name: 'Can I Square?', rating: 800, tags: ['binary search', 'math'] },
  { contestId: 1899, index: 'B', name: '250 Thousand Tons of TNT', rating: 1100, tags: ['brute force', 'number theory'] },
  { contestId: 1899, index: 'C', name: 'Yarik and Array', rating: 1100, tags: ['dp', 'greedy', 'two pointers'] },
  { contestId: 1883, index: 'C', name: 'Raspberries', rating: 1200, tags: ['math', 'number theory'] },
  { contestId: 1873, index: 'E', name: 'Building an Aquarium', rating: 1300, tags: ['binary search', 'greedy'] },
  { contestId: 1850, index: 'F', name: 'We Were Both Children', rating: 1400, tags: ['math', 'number theory'] },
  { contestId: 1846, index: 'E1', name: 'Rudolf and Snowflakes (simple)', rating: 1600, tags: ['brute force', 'math'] },
  { contestId: 1843, index: 'E', name: 'Tracking Segments', rating: 1700, tags: ['binary search', 'data structures'] },
  { contestId: 1805, index: 'D', name: 'A Wide, Wide Graph', rating: 1900, tags: ['dfs and similar', 'trees'] },
  { contestId: 1768, index: 'D', name: 'Lucky Permutation', rating: 2000, tags: ['graphs', 'math'] },
  { contestId: 1738, index: 'E', name: 'Balance Addicts', rating: 2200, tags: ['combinatorics', 'two pointers'] },
  { contestId: 1681, index: 'F', name: 'Unique Occurrences', rating: 2400, tags: ['data structures', 'divide and conquer', 'trees'] },
  { contestId: 1667, index: 'C', name: 'Half Queen Cover', rating: 2500, tags: ['constructive algorithms', 'math'] },
  { contestId: 1545, index: 'D', name: 'AquaMoon and Chess', rating: 2900, tags: ['combinatorics', 'math'] }
];

// In-memory problem cache
let cachedProblems = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch and enrich problems from Codeforces API with in-memory caching
 */
const getEnrichedProblems = async () => {
  const now = Date.now();
  if (cachedProblems && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedProblems;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(CF_API_URL, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Codeforces API responded with HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.status === 'OK' && data.result && Array.isArray(data.result.problems)) {
      const enriched = data.result.problems.map(p => {
        const rating = p.rating || null;
        const level = mapRatingToLevel(rating);
        return {
          id: `${p.contestId}${p.index}`,
          contestId: p.contestId,
          index: p.index,
          name: p.name,
          rating: rating,
          level: level,
          tags: p.tags || [],
          cfUrl: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`
        };
      });

      cachedProblems = enriched;
      lastCacheTime = Date.now();
      return enriched;
    } else {
      throw new Error(data.comment || 'Codeforces API did not return OK');
    }
  } catch (err) {
    console.warn('Backend Codeforces fetch failed, using fallback dataset:', err.message);
    if (cachedProblems && cachedProblems.length > 0) {
      return cachedProblems;
    }
    return FALLBACK_PROBLEMS.map(p => ({
      ...p,
      id: `${p.contestId}${p.index}`,
      level: mapRatingToLevel(p.rating),
      cfUrl: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`
    }));
  }
};

/**
 * @desc    Get all problems with search, filtering, and pagination
 * @route   GET /api/problems
 * @access  Public
 */
const getProblems = async (req, res) => {
  try {
    const {
      search,
      level,
      tag,
      minRating,
      maxRating,
      sort = 'rating-asc',
      page = 1,
      limit = 25
    } = req.query;

    const allProblems = await getEnrichedProblems();

    // 1. Filter problems
    let filtered = allProblems.filter(problem => {
      // Search
      if (search) {
        const q = search.trim().toLowerCase();
        const matchName = problem.name.toLowerCase().includes(q);
        const matchId = problem.id.toLowerCase().includes(q);
        if (!matchName && !matchId) return false;
      }

      // Level
      if (level && level.toUpperCase() !== 'ALL') {
        if (level.toUpperCase() === 'UNRATED') {
          if (problem.rating !== null && problem.rating !== undefined) return false;
        } else {
          if (problem.level !== level.toUpperCase()) return false;
        }
      }

      // Tag
      if (tag && tag.toUpperCase() !== 'ALL') {
        const targetTag = tag.trim().toLowerCase();
        if (!problem.tags.some(t => t.toLowerCase() === targetTag)) return false;
      }

      // Rating range
      if (minRating && problem.rating !== null && problem.rating < Number(minRating)) {
        return false;
      }
      if (maxRating && problem.rating !== null && problem.rating > Number(maxRating)) {
        return false;
      }

      return true;
    });

    // 2. Sort problems
    filtered.sort((a, b) => {
      const ratingA = a.rating !== null ? a.rating : -1;
      const ratingB = b.rating !== null ? b.rating : -1;

      switch (sort) {
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

    // 3. Paginate
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limitNum);

    const startIndex = (pageNum - 1) * limitNum;
    const paginatedProblems = filtered.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      totalCount,
      totalPages,
      currentPage: pageNum,
      pageSize: limitNum,
      problems: paginatedProblems
    });
  } catch (error) {
    console.error('GetProblems Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve problems'
    });
  }
};

/**
 * @desc    Get a single problem by ID (e.g. 1941A)
 * @route   GET /api/problems/:id
 * @access  Public
 */
const getProblemById = async (req, res) => {
  try {
    const rawId = req.params.id.trim().toUpperCase();
    const allProblems = await getEnrichedProblems();

    const problem = allProblems.find(p => p.id.toUpperCase() === rawId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: `Problem with ID '${rawId}' not found`
      });
    }

    return res.status(200).json({
      success: true,
      problem
    });
  } catch (error) {
    console.error('GetProblemById Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving problem'
    });
  }
};

module.exports = {
  getProblems,
  getProblemById,
  mapRatingToLevel,
  LEVEL_CONFIG
};
