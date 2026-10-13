/**
 * CodeSprint - Storage Management Module
 * Handles user profile, practice sessions, contest results, and analytics via LocalStorage.
 */

const STORAGE_KEYS = {
  PROFILE: 'codesprint_profile',
  PRACTICE_HISTORY: 'codesprint_practice_history',
  CONTEST_HISTORY: 'codesprint_contest_history',
  ACTIVE_PRACTICE: 'codesprint_active_practice'
};

const DEFAULT_PROFILE = {
  displayName: 'Sprint Master',
  cfHandle: '',
  targetPerDay: 3,
  preferredStage: 'Intermediate',
  joinedDate: new Date().toISOString()
};

const CodeSprintStorage = {
  /**
   * Get user profile
   */
  getProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      let local = data ? { ...DEFAULT_PROFILE, ...JSON.parse(data) } : DEFAULT_PROFILE;
      if (window.CodeSprintAPI && window.CodeSprintAPI.isAuthenticated()) {
        const cloudUser = window.CodeSprintAPI.getUser();
        if (cloudUser) {
          local = {
            ...local,
            displayName: cloudUser.username || local.displayName,
            cfHandle: cloudUser.cfHandle || local.cfHandle,
            preferredStage: cloudUser.preferredStage || local.preferredStage,
            targetPerDay: cloudUser.targetPerDay || local.targetPerDay
          };
        }
      }
      return local;
    } catch (e) {
      console.error('Error reading profile from localStorage', e);
      return DEFAULT_PROFILE;
    }
  },

  /**
   * Save user profile
   */
  saveProfile(profile) {
    try {
      const current = this.getProfile();
      const updated = { ...current, ...profile };
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('codesprint:profile-updated', { detail: updated }));

      // If logged in, sync with backend MongoDB
      if (window.CodeSprintAPI && window.CodeSprintAPI.isAuthenticated()) {
        window.CodeSprintAPI.updateProfile({
          displayName: updated.displayName,
          cfHandle: updated.cfHandle,
          preferredStage: updated.preferredStage,
          targetPerDay: updated.targetPerDay
        }).catch(err => console.warn('Cloud profile sync deferred:', err.message));
      }

      return updated;
    } catch (e) {
      console.error('Error saving profile to localStorage', e);
      return null;
    }
  },

  /**
   * Get all practice sessions
   */
  getPracticeSessions() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRACTICE_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading practice history', e);
      return [];
    }
  },

  /**
   * Save a completed practice session
   */
  addPracticeSession(session) {
    try {
      const history = this.getPracticeSessions();
      const newSession = {
        id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        ...session
      };
      history.unshift(newSession);
      localStorage.setItem(STORAGE_KEYS.PRACTICE_HISTORY, JSON.stringify(history));
      window.dispatchEvent(new CustomEvent('codesprint:practice-saved', { detail: newSession }));

      // If user is authenticated, also sync with MongoDB backend
      if (window.CodeSprintAPI && window.CodeSprintAPI.isAuthenticated()) {
        window.CodeSprintAPI.recordSession({
          problemId: newSession.problemId || `${newSession.contestId}${newSession.index}`,
          contestId: newSession.contestId,
          index: newSession.index,
          name: newSession.name,
          rating: newSession.rating,
          level: newSession.level,
          tags: newSession.tags,
          durationSeconds: newSession.timeSpentSeconds,
          targetTimeSeconds: newSession.targetTimeSeconds,
          status: newSession.status
        }).catch(err => console.warn('Cloud practice session sync deferred:', err.message));
      }

      return newSession;
    } catch (e) {
      console.error('Error saving practice session', e);
      return null;
    }
  },

  /**
   * Active practice problem cache (to pass between pages)
   */
  setActivePractice(problem) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PRACTICE, JSON.stringify(problem));
    } catch (e) {
      console.error('Error setting active practice problem', e);
    }
  },

  getActivePractice() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_PRACTICE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Get all contest records
   */
  getContestHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONTEST_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading contest history', e);
      return [];
    }
  },

  /**
   * Add a contest record
   */
  addContestResult(contest) {
    try {
      const history = this.getContestHistory();
      const newContest = {
        id: 'contest_' + Date.now(),
        date: new Date().toISOString(),
        ...contest
      };
      history.unshift(newContest);
      localStorage.setItem(STORAGE_KEYS.CONTEST_HISTORY, JSON.stringify(history));
      window.dispatchEvent(new CustomEvent('codesprint:contest-saved', { detail: newContest }));
      return newContest;
    } catch (e) {
      console.error('Error saving contest result', e);
      return null;
    }
  },

  /**
   * Aggregate statistics for dashboard & metrics
   */
  getStats() {
    const sessions = this.getPracticeSessions();
    const contests = this.getContestHistory();

    const totalAttempted = sessions.length;
    const solvedSessions = sessions.filter(s => s.status === 'solved');
    const totalSolved = solvedSessions.length;
    const successRate = totalAttempted > 0 ? Math.round((totalSolved / totalAttempted) * 100) : 0;

    let totalPracticeSeconds = sessions.reduce((acc, s) => acc + (Number(s.timeSpentSeconds) || 0), 0);
    // Add time from contests
    totalPracticeSeconds += contests.reduce((acc, c) => acc + (Number(c.elapsedTimeSeconds) || 0), 0);

    // Difficulty breakdown (Levels A through H)
    const levelCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, Unrated: 0 };
    solvedSessions.forEach(s => {
      const lvl = s.level || 'Unrated';
      if (levelCounts[lvl] !== undefined) {
        levelCounts[lvl]++;
      } else {
        levelCounts.Unrated++;
      }
    });

    // Last 7 days activity (Practice time in minutes per day)
    const daysMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      daysMap[key] = { label: dayLabel, minutes: 0, solvedCount: 0 };
    }

    sessions.forEach(s => {
      const dateKey = (s.timestamp || '').split('T')[0];
      if (daysMap[dateKey]) {
        daysMap[dateKey].minutes += Math.round((Number(s.timeSpentSeconds) || 0) / 60);
        if (s.status === 'solved') {
          daysMap[dateKey].solvedCount++;
        }
      }
    });

    return {
      totalAttempted,
      totalSolved,
      successRate,
      totalPracticeSeconds,
      levelCounts,
      daysMap,
      recentSessions: sessions.slice(0, 10),
      totalContests: contests.length
    };
  },

  /**
   * Reset all user data
   */
  resetAllData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem(STORAGE_KEYS.PRACTICE_HISTORY);
      localStorage.removeItem(STORAGE_KEYS.CONTEST_HISTORY);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_PRACTICE);
      window.dispatchEvent(new CustomEvent('codesprint:data-reset'));
      return true;
    } catch (e) {
      console.error('Error resetting data', e);
      return false;
    }
  },

  /**
   * Load demo practice sessions so the user can immediately preview charts and metrics
   */
  loadDemoData() {
    const demoSessions = [
      {
        id: 'sess_demo_1',
        problemId: '1941A',
        contestId: 1941,
        index: 'A',
        name: 'Rudolf and the Ticket',
        rating: 800,
        level: 'A',
        tags: ['brute force', 'math'],
        timeSpentSeconds: 345,
        targetTimeSeconds: 600,
        status: 'solved',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
      },
      {
        id: 'sess_demo_2',
        problemId: '1927B',
        contestId: 1927,
        index: 'B',
        name: 'Following the String',
        rating: 900,
        level: 'A',
        tags: ['strings', 'greedy'],
        timeSpentSeconds: 480,
        targetTimeSeconds: 600,
        status: 'solved',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString()
      },
      {
        id: 'sess_demo_3',
        problemId: '1899C',
        contestId: 1899,
        index: 'C',
        name: 'Yarik and Array',
        rating: 1100,
        level: 'B',
        tags: ['dp', 'greedy', 'two pointers'],
        timeSpentSeconds: 820,
        targetTimeSeconds: 900,
        status: 'solved',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
      },
      {
        id: 'sess_demo_4',
        problemId: '1883C',
        contestId: 1883,
        index: 'C',
        name: 'Raspberries',
        rating: 1200,
        level: 'B',
        tags: ['math', 'number theory'],
        timeSpentSeconds: 940,
        targetTimeSeconds: 900,
        status: 'solved',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString()
      },
      {
        id: 'sess_demo_5',
        problemId: '1873E',
        contestId: 1873,
        index: 'E',
        name: 'Building an Aquarium',
        rating: 1300,
        level: 'C',
        tags: ['binary search', 'greedy'],
        timeSpentSeconds: 1150,
        targetTimeSeconds: 1500,
        status: 'solved',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString()
      },
      {
        id: 'sess_demo_6',
        problemId: '1850F',
        contestId: 1850,
        index: 'F',
        name: 'We Were Both Children',
        rating: 1400,
        level: 'C',
        tags: ['math', 'number theory'],
        timeSpentSeconds: 1500,
        targetTimeSeconds: 1500,
        status: 'unsolved',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString()
      },
      {
        id: 'sess_demo_7',
        problemId: '1846E1',
        contestId: 1846,
        index: 'E1',
        name: 'Rudolf and Snowflakes (Simple)',
        rating: 1600,
        level: 'D',
        tags: ['brute force', 'math'],
        timeSpentSeconds: 1640,
        targetTimeSeconds: 2100,
        status: 'solved',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 140).toISOString()
      }
    ];

    localStorage.setItem(STORAGE_KEYS.PRACTICE_HISTORY, JSON.stringify(demoSessions));
    window.dispatchEvent(new CustomEvent('codesprint:practice-saved'));
    return demoSessions;
  }
};

window.CodeSprintStorage = CodeSprintStorage;
