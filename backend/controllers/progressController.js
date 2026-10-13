const mongoose = require('mongoose');
const Progress = require('../models/Progress');
const PracticeSession = require('../models/PracticeSession');
const memoryStore = require('../utils/memoryStore');

/**
 * @desc    Mark a problem as solved
 * @route   POST /api/progress/solve
 * @access  Private
 */
const solveProblem = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      problemId,
      contestId,
      index,
      name,
      rating,
      level,
      tags = [],
      timeSpentSeconds = 0
    } = req.body;

    if (!problemId) {
      return res.status(400).json({
        success: false,
        message: 'problemId is required'
      });
    }

    const cleanId = String(problemId).trim().toUpperCase();

    if (mongoose.connection.readyState === 1) {
      let progress = await Progress.findOne({ user: userId });
      if (!progress) {
        progress = await Progress.create({ user: userId, solvedProblems: [] });
      }

      const alreadySolved = progress.solvedProblems.some(
        p => p.problemId.toUpperCase() === cleanId
      );

      if (!alreadySolved) {
        progress.solvedProblems.unshift({
          problemId: cleanId,
          contestId: contestId ? Number(contestId) : undefined,
          index: index ? String(index).toUpperCase() : undefined,
          name: name || `Problem ${cleanId}`,
          rating: rating !== undefined && rating !== null ? Number(rating) : null,
          level: level || 'Unrated',
          tags: Array.isArray(tags) ? tags : [],
          solvedAt: new Date(),
          timeSpentSeconds: Number(timeSpentSeconds) || 0
        });
        await progress.save();
      }

      return res.status(200).json({
        success: true,
        message: alreadySolved ? 'Problem already marked as solved' : 'Problem marked as solved',
        totalSolved: progress.solvedProblems.length,
        solvedProblem: progress.solvedProblems.find(p => p.problemId.toUpperCase() === cleanId)
      });
    } else {
      // Memory Store Fallback
      const record = await memoryStore.solveProblem(userId, {
        problemId: cleanId,
        contestId,
        index,
        name,
        rating,
        level,
        tags,
        timeSpentSeconds
      });

      return res.status(200).json({
        success: true,
        message: 'Problem marked as solved (local mode)',
        totalSolved: record.solvedProblems.length,
        solvedProblem: record.solvedProblems.find(p => p.problemId.toUpperCase() === cleanId)
      });
    }
  } catch (error) {
    console.error('SolveProblem Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error marking problem solved'
    });
  }
};

/**
 * @desc    Unmark a solved problem
 * @route   DELETE /api/progress/solve/:problemId
 * @access  Private
 */
const unsolveProblem = async (req, res) => {
  try {
    const userId = req.user._id;
    const problemId = req.params.problemId.trim().toUpperCase();

    if (mongoose.connection.readyState === 1) {
      const progress = await Progress.findOne({ user: userId });
      if (!progress) {
        return res.status(404).json({ success: false, message: 'Progress record not found' });
      }

      const initialLength = progress.solvedProblems.length;
      progress.solvedProblems = progress.solvedProblems.filter(
        p => p.problemId.toUpperCase() !== problemId
      );

      if (progress.solvedProblems.length === initialLength) {
        return res.status(404).json({
          success: false,
          message: `Problem ${problemId} was not in solved list`
        });
      }

      await progress.save();

      return res.status(200).json({
        success: true,
        message: `Problem ${problemId} unmarked`,
        totalSolved: progress.solvedProblems.length
      });
    } else {
      const record = await memoryStore.unsolveProblem(userId, problemId);
      return res.status(200).json({
        success: true,
        message: `Problem ${problemId} unmarked (local mode)`,
        totalSolved: record.solvedProblems.length
      });
    }
  } catch (error) {
    console.error('UnsolveProblem Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error unmarking problem'
    });
  }
};

/**
 * @desc    Get user's solved problems list
 * @route   GET /api/progress
 * @access  Private
 */
const getProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    let solvedProblems = [];
    let lastUpdated = new Date();

    if (mongoose.connection.readyState === 1) {
      let progress = await Progress.findOne({ user: userId });
      if (progress) {
        solvedProblems = progress.solvedProblems;
        lastUpdated = progress.lastUpdated;
      }
    } else {
      const progress = await memoryStore.getProgress(userId);
      solvedProblems = progress.solvedProblems;
      lastUpdated = progress.lastUpdated;
    }

    return res.status(200).json({
      success: true,
      totalSolved: solvedProblems.length,
      solvedProblems,
      lastUpdated
    });
  } catch (error) {
    console.error('GetProgress Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving progress'
    });
  }
};

/**
 * @desc    Get comprehensive user dashboard statistics
 * @route   GET /api/progress/stats
 * @access  Private
 */
const getProgressStats = async (req, res) => {
  try {
    const userId = req.user._id;
    let solvedProblems = [];
    let sessions = [];

    if (mongoose.connection.readyState === 1) {
      const progress = await Progress.findOne({ user: userId });
      if (progress) solvedProblems = progress.solvedProblems;
      sessions = await PracticeSession.find({ user: userId }).sort({ createdAt: -1 });
    } else {
      const progress = await memoryStore.getProgress(userId);
      solvedProblems = progress.solvedProblems;
      sessions = await memoryStore.getSessions(userId);
    }

    const totalAttempted = sessions.length;
    const totalSolved = solvedProblems.length;
    const successRate = totalAttempted > 0 ? Math.round((totalSolved / totalAttempted) * 100) : (totalSolved > 0 ? 100 : 0);
    const totalPracticeSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || s.timeSpentSeconds || 0), 0);

    const levelCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, Unrated: 0 };
    solvedProblems.forEach(p => {
      const lvl = p.level || 'Unrated';
      if (levelCounts[lvl] !== undefined) {
        levelCounts[lvl]++;
      } else {
        levelCounts.Unrated++;
      }
    });

    const topicMap = {};
    solvedProblems.forEach(p => {
      (p.tags || []).forEach(t => {
        topicMap[t] = (topicMap[t] || 0) + 1;
      });
    });

    const daysMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      daysMap[key] = { label: dayLabel, minutes: 0, solvedCount: 0 };
    }

    sessions.forEach(s => {
      const dateKey = (s.createdAt ? new Date(s.createdAt) : new Date()).toISOString().split('T')[0];
      if (daysMap[dateKey]) {
        daysMap[dateKey].minutes += Math.round((s.durationSeconds || s.timeSpentSeconds || 0) / 60);
        if (s.status === 'solved') {
          daysMap[dateKey].solvedCount++;
        }
      }
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalAttempted,
        totalSolved,
        successRate,
        totalPracticeSeconds,
        levelCounts,
        topicMap,
        daysMap,
        recentSessions: sessions.slice(0, 10).map(s => ({
          id: s._id || s.id,
          problemId: s.problemId,
          contestId: s.contestId,
          index: s.index,
          name: s.name,
          rating: s.rating,
          level: s.level,
          tags: s.tags,
          timeSpentSeconds: s.durationSeconds || s.timeSpentSeconds,
          targetTimeSeconds: s.targetTimeSeconds,
          status: s.status,
          timestamp: s.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('GetProgressStats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error calculating progress statistics'
    });
  }
};

/**
 * @desc    Record a completed practice session
 * @route   POST /api/sessions
 * @access  Private
 */
const createSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      problemId,
      contestId,
      index,
      name,
      rating,
      level,
      tags = [],
      startTime,
      endTime,
      durationSeconds,
      timeSpentSeconds,
      targetTimeSeconds,
      status
    } = req.body;

    if (!problemId) {
      return res.status(400).json({
        success: false,
        message: 'problemId is required'
      });
    }

    const actualDuration = Number(durationSeconds !== undefined ? durationSeconds : timeSpentSeconds) || 0;

    if (mongoose.connection.readyState === 1) {
      const session = await PracticeSession.create({
        user: userId,
        problemId: String(problemId).trim().toUpperCase(),
        contestId: contestId ? Number(contestId) : undefined,
        index: index ? String(index).toUpperCase() : undefined,
        name: name || `Problem ${problemId}`,
        rating: rating !== undefined && rating !== null ? Number(rating) : null,
        level: level || 'Unrated',
        tags: Array.isArray(tags) ? tags : [],
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : new Date(),
        durationSeconds: actualDuration,
        targetTimeSeconds: Number(targetTimeSeconds) || 900,
        status: status === 'solved' ? 'solved' : 'unsolved'
      });

      if (status === 'solved') {
        let progress = await Progress.findOne({ user: userId });
        if (!progress) {
          progress = await Progress.create({ user: userId, solvedProblems: [] });
        }

        const cleanId = String(problemId).trim().toUpperCase();
        const alreadySolved = progress.solvedProblems.some(
          p => p.problemId.toUpperCase() === cleanId
        );

        if (!alreadySolved) {
          progress.solvedProblems.unshift({
            problemId: cleanId,
            contestId: contestId ? Number(contestId) : undefined,
            index: index ? String(index).toUpperCase() : undefined,
            name: name || `Problem ${cleanId}`,
            rating: rating !== undefined && rating !== null ? Number(rating) : null,
            level: level || 'Unrated',
            tags: Array.isArray(tags) ? tags : [],
            solvedAt: new Date(),
            timeSpentSeconds: actualDuration
          });
          await progress.save();
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Practice session recorded',
        session
      });
    } else {
      const session = await memoryStore.createSession(userId, {
        problemId,
        contestId,
        index,
        name,
        rating,
        level,
        tags,
        startTime,
        endTime,
        durationSeconds: actualDuration,
        targetTimeSeconds,
        status
      });

      return res.status(201).json({
        success: true,
        message: 'Practice session recorded (local mode)',
        session
      });
    }
  } catch (error) {
    console.error('CreateSession Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error recording practice session'
    });
  }
};

/**
 * @desc    Get user practice session history
 * @route   GET /api/sessions
 * @access  Private
 */
const getSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, page = 1 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    if (mongoose.connection.readyState === 1) {
      const total = await PracticeSession.countDocuments({ user: userId });
      const sessions = await PracticeSession.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      return res.status(200).json({
        success: true,
        total,
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        sessions
      });
    } else {
      const allSessions = await memoryStore.getSessions(userId);
      const total = allSessions.length;
      const startIndex = (pageNum - 1) * limitNum;
      const sessions = allSessions.slice(startIndex, startIndex + limitNum);

      return res.status(200).json({
        success: true,
        total,
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        sessions
      });
    }
  } catch (error) {
    console.error('GetSessions Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving sessions'
    });
  }
};

/**
 * @desc    Sync guest progress sessions from localStorage to user's account
 * @route   POST /api/progress/sync
 * @access  Private
 */
const syncGuestProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessions = [] } = req.body;

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No guest sessions to sync',
        syncedCount: 0
      });
    }

    let addedSessions = 0;
    let addedSolves = 0;

    if (mongoose.connection.readyState === 1) {
      let progress = await Progress.findOne({ user: userId });
      if (!progress) {
        progress = await Progress.create({ user: userId, solvedProblems: [] });
      }

      for (const s of sessions) {
        const cleanId = String(s.problemId || `${s.contestId}${s.index}`).trim().toUpperCase();
        if (!cleanId) continue;

        const existingSession = await PracticeSession.findOne({
          user: userId,
          problemId: cleanId,
          createdAt: s.timestamp ? new Date(s.timestamp) : undefined
        });

        if (!existingSession) {
          await PracticeSession.create({
            user: userId,
            problemId: cleanId,
            contestId: s.contestId ? Number(s.contestId) : undefined,
            index: s.index ? String(s.index).toUpperCase() : undefined,
            name: s.name || `Problem ${cleanId}`,
            rating: s.rating !== undefined && s.rating !== null ? Number(s.rating) : null,
            level: s.level || 'Unrated',
            tags: Array.isArray(s.tags) ? s.tags : [],
            durationSeconds: Number(s.timeSpentSeconds) || 0,
            targetTimeSeconds: Number(s.targetTimeSeconds) || 900,
            status: s.status === 'solved' ? 'solved' : 'unsolved',
            createdAt: s.timestamp ? new Date(s.timestamp) : new Date()
          });
          addedSessions++;
        }

        if (s.status === 'solved') {
          const alreadyInSolves = progress.solvedProblems.some(
            p => p.problemId.toUpperCase() === cleanId
          );
          if (!alreadyInSolves) {
            progress.solvedProblems.push({
              problemId: cleanId,
              contestId: s.contestId ? Number(s.contestId) : undefined,
              index: s.index ? String(s.index).toUpperCase() : undefined,
              name: s.name || `Problem ${cleanId}`,
              rating: s.rating !== undefined && s.rating !== null ? Number(s.rating) : null,
              level: s.level || 'Unrated',
              tags: Array.isArray(s.tags) ? s.tags : [],
              solvedAt: s.timestamp ? new Date(s.timestamp) : new Date(),
              timeSpentSeconds: Number(s.timeSpentSeconds) || 0
            });
            addedSolves++;
          }
        }
      }

      if (addedSolves > 0) {
        await progress.save();
      }

      return res.status(200).json({
        success: true,
        message: `Successfully synced ${addedSessions} session(s) and ${addedSolves} solve(s) to your account`,
        syncedSessions: addedSessions,
        syncedSolves: addedSolves,
        totalSolved: progress.solvedProblems.length
      });
    } else {
      // Memory Store fallback sync
      for (const s of sessions) {
        await memoryStore.createSession(userId, {
          problemId: s.problemId || `${s.contestId}${s.index}`,
          contestId: s.contestId,
          index: s.index,
          name: s.name,
          rating: s.rating,
          level: s.level,
          tags: s.tags,
          durationSeconds: s.timeSpentSeconds,
          targetTimeSeconds: s.targetTimeSeconds,
          status: s.status,
          createdAt: s.timestamp
        });
        addedSessions++;
        if (s.status === 'solved') addedSolves++;
      }

      const progress = await memoryStore.getProgress(userId);
      return res.status(200).json({
        success: true,
        message: `Synced ${addedSessions} session(s) in local mode`,
        syncedSessions: addedSessions,
        syncedSolves: addedSolves,
        totalSolved: progress.solvedProblems.length
      });
    }
  } catch (error) {
    console.error('SyncGuestProgress Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error syncing guest progress'
    });
  }
};

module.exports = {
  solveProblem,
  unsolveProblem,
  getProgress,
  getProgressStats,
  createSession,
  getSessions,
  syncGuestProgress
};
