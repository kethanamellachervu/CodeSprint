const bcrypt = require('bcryptjs');

/**
 * In-memory data store used as a fallback when MongoDB Atlas is disconnected or not yet configured.
 * Automatically mirrors Mongoose schema operations.
 */
class MemoryStore {
  constructor() {
    this.users = new Map();
    this.progress = new Map();
    this.sessions = [];
  }

  // --- User Operations ---
  async findUserById(id) {
    const user = this.users.get(String(id));
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async findUserByIdWithPassword(id) {
    return this.users.get(String(id)) || null;
  }

  async findUserByEmailOrUsername(identifier) {
    const idLower = identifier.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === idLower || user.username.toLowerCase() === idLower) {
        return user;
      }
    }
    return null;
  }

  async createUser({ username, email, password, cfHandle = '', preferredStage = 'Intermediate', targetPerDay = 3 }) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    const newUser = {
      _id: id,
      id,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      cfHandle: cfHandle.trim(),
      preferredStage,
      targetPerDay: Number(targetPerDay) || 3,
      createdAt: new Date(),
      matchPassword: async function (enteredPassword) {
        return await bcrypt.compare(enteredPassword, this.password);
      }
    };

    this.users.set(id, newUser);

    // Initialize progress record
    this.progress.set(id, {
      user: id,
      solvedProblems: [],
      lastUpdated: new Date()
    });

    const { password: _, ...safeUser } = newUser;
    return safeUser;
  }

  async updateUser(id, updateData) {
    const user = this.users.get(String(id));
    if (!user) return null;

    Object.assign(user, updateData);
    this.users.set(String(id), user);

    const { password, ...safeUser } = user;
    return safeUser;
  }

  // --- Progress Operations ---
  async getProgress(userId) {
    const uid = String(userId);
    if (!this.progress.has(uid)) {
      this.progress.set(uid, {
        user: uid,
        solvedProblems: [],
        lastUpdated: new Date()
      });
    }
    return this.progress.get(uid);
  }

  async solveProblem(userId, problemData) {
    const record = await this.getProgress(userId);
    const cleanId = String(problemData.problemId).toUpperCase();

    const exists = record.solvedProblems.some(p => p.problemId.toUpperCase() === cleanId);
    if (!exists) {
      record.solvedProblems.unshift({
        problemId: cleanId,
        contestId: problemData.contestId,
        index: problemData.index,
        name: problemData.name,
        rating: problemData.rating,
        level: problemData.level || 'Unrated',
        tags: problemData.tags || [],
        solvedAt: new Date(),
        timeSpentSeconds: problemData.timeSpentSeconds || 0
      });
      record.lastUpdated = new Date();
    }

    return record;
  }

  async unsolveProblem(userId, problemId) {
    const record = await this.getProgress(userId);
    const cleanId = String(problemId).toUpperCase();
    record.solvedProblems = record.solvedProblems.filter(p => p.problemId.toUpperCase() !== cleanId);
    record.lastUpdated = new Date();
    return record;
  }

  // --- Practice Session Operations ---
  async createSession(userId, sessionData) {
    const session = {
      _id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      user: String(userId),
      problemId: String(sessionData.problemId).toUpperCase(),
      contestId: sessionData.contestId,
      index: sessionData.index,
      name: sessionData.name,
      rating: sessionData.rating,
      level: sessionData.level,
      tags: sessionData.tags || [],
      startTime: sessionData.startTime || null,
      endTime: sessionData.endTime || new Date(),
      durationSeconds: Number(sessionData.durationSeconds || sessionData.timeSpentSeconds) || 0,
      targetTimeSeconds: Number(sessionData.targetTimeSeconds) || 900,
      status: sessionData.status === 'solved' ? 'solved' : 'unsolved',
      createdAt: sessionData.createdAt ? new Date(sessionData.createdAt) : new Date()
    };

    this.sessions.unshift(session);

    if (session.status === 'solved') {
      await this.solveProblem(userId, session);
    }

    return session;
  }

  async getSessions(userId) {
    const uid = String(userId);
    return this.sessions.filter(s => s.user === uid);
  }
}

const memoryStore = new MemoryStore();
module.exports = memoryStore;
