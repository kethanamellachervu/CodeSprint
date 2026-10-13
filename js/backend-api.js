/**
 * CodeSprint - Frontend Backend API Client Helper
 * Connects frontend pages to Express/MongoDB backend REST endpoints with JWT handling.
 */

const API_BASE_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? (window.location.port === '5050' ? '/api' : 'http://localhost:5050/api')
  : '/api';

const TOKEN_KEY = 'codesprint_jwt_token';
const USER_KEY = 'codesprint_user_data';

const CodeSprintAPI = {
  /**
   * Get stored JWT token
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  },

  /**
   * Check if user is currently logged in
   */
  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * Get cached user object
   */
  getUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Generic authenticated HTTP fetch wrapper
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && token) {
          // Token expired or invalid
          this.logout();
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.warn(`API call error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  // --- Auth APIs ---

  async register(username, email, password, cfHandle = '', preferredStage = 'Intermediate') {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, cfHandle, preferredStage })
    });

    if (data.token && data.user) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      window.dispatchEvent(new CustomEvent('codesprint:auth-changed', { detail: { user: data.user } }));
    }
    return data;
  },

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.token && data.user) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      window.dispatchEvent(new CustomEvent('codesprint:auth-changed', { detail: { user: data.user } }));
    }
    return data;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new CustomEvent('codesprint:auth-changed', { detail: { user: null } }));
  },

  async getMe() {
    if (!this.isAuthenticated()) return null;
    try {
      const data = await this.request('/auth/me');
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
      return data.user;
    } catch (e) {
      return null;
    }
  },

  // --- Profile APIs ---

  async getProfile() {
    return await this.request('/users/profile');
  },

  async updateProfile(profileData) {
    const data = await this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    if (data.user) {
      const current = this.getUser() || {};
      const updated = { ...current, ...data.user };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('codesprint:profile-updated', { detail: updated }));
    }
    return data;
  },

  // --- Problems APIs ---

  async fetchProblems(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/problems${query ? `?${query}` : ''}`;
    return await this.request(endpoint);
  },

  async getProblemById(id) {
    return await this.request(`/problems/${encodeURIComponent(id)}`);
  },

  // --- Progress & Solves APIs ---

  async solveProblem(problemData) {
    if (!this.isAuthenticated()) return null;
    return await this.request('/progress/solve', {
      method: 'POST',
      body: JSON.stringify(problemData)
    });
  },

  async unsolveProblem(problemId) {
    if (!this.isAuthenticated()) return null;
    return await this.request(`/progress/solve/${encodeURIComponent(problemId)}`, {
      method: 'DELETE'
    });
  },

  async getProgress() {
    if (!this.isAuthenticated()) return null;
    return await this.request('/progress');
  },

  async getProgressStats() {
    if (!this.isAuthenticated()) return null;
    return await this.request('/progress/stats');
  },

  // --- Sessions APIs ---

  async recordSession(sessionData) {
    if (!this.isAuthenticated()) return null;
    return await this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  },

  async getSessions(limit = 50, page = 1) {
    if (!this.isAuthenticated()) return [];
    return await this.request(`/sessions?limit=${limit}&page=${page}`);
  },

  // --- Guest Sync API ---

  async syncGuestSessions(sessions) {
    if (!this.isAuthenticated() || !Array.isArray(sessions) || sessions.length === 0) return null;
    return await this.request('/progress/sync', {
      method: 'POST',
      body: JSON.stringify({ sessions })
    });
  }
};

window.CodeSprintAPI = CodeSprintAPI;
