/**
 * CodeSprint - Main Shared Application Logic
 * Manages navigation, authentication modal, profile menu, guest sync, and toast notifications.
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  injectAuthModal();
  initProfileDisplay();
  initNotificationButton();
  initProfileModalListeners();

  // If token exists, refresh user profile from backend
  if (window.CodeSprintAPI && window.CodeSprintAPI.isAuthenticated()) {
    window.CodeSprintAPI.getMe().catch(() => {});
  }
});

/**
 * Highlight active navigation link
 */
function initNavbar() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.cs-nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Display current user profile / auth button in navbar
 */
function initProfileDisplay() {
  const navActions = document.querySelector('.nav-actions');
  const existingProfileBtn = document.getElementById('navProfileBtn');

  const renderNavAuth = () => {
    const isAuth = window.CodeSprintAPI && window.CodeSprintAPI.isAuthenticated();
    const user = isAuth ? window.CodeSprintAPI.getUser() : null;

    if (!navActions) return;

    // Check if auth container already exists
    let authContainer = document.getElementById('navAuthContainer');
    if (!authContainer) {
      authContainer = document.createElement('div');
      authContainer.id = 'navAuthContainer';
      authContainer.className = 'd-inline-flex align-items-center gap-2';

      if (existingProfileBtn) {
        existingProfileBtn.replaceWith(authContainer);
      } else {
        navActions.appendChild(authContainer);
      }
    }

    if (isAuth && user) {
      const displayName = user.username || 'Coder';
      authContainer.innerHTML = `
        <div class="dropdown">
          <button class="btn-cs-secondary py-1 px-3 dropdown-toggle d-flex align-items-center gap-2" type="button" id="userMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-person-circle text-gradient fs-5"></i>
            <span class="fw-semibold">${displayName}</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end cs-modal p-2 shadow-lg" aria-labelledby="userMenuButton" style="background: #171A21; border: 1px solid var(--border-color); min-width: 220px;">
            <li>
              <div class="px-2 py-1">
                <div class="text-white small fw-bold">${user.username}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${user.email}</div>
              </div>
            </li>
            <li><hr class="dropdown-divider border-secondary my-1"></li>
            <li><a class="dropdown-item text-white py-1 px-2 rounded small" href="profile.html"><i class="bi bi-person-gear me-2"></i> Account Settings</a></li>
            <li><a class="dropdown-item text-white py-1 px-2 rounded small" href="progress.html"><i class="bi bi-graph-up me-2"></i> Cloud Analytics</a></li>
            <li>
              <button class="dropdown-item text-info py-1 px-2 rounded small" onclick="syncGuestProgressToAccount()">
                <i class="bi bi-cloud-arrow-up me-2"></i> Sync Local Practice
              </button>
            </li>
            <li><hr class="dropdown-divider border-secondary my-1"></li>
            <li>
              <button class="dropdown-item text-danger py-1 px-2 rounded small" onclick="handleLogout()">
                <i class="bi bi-box-arrow-right me-2"></i> Sign Out
              </button>
            </li>
          </ul>
        </div>
      `;
    } else {
      // Guest state
      authContainer.innerHTML = `
        <button class="btn-cs-primary py-1 px-3 small" onclick="openAuthModal('login')" title="Sign in or register for cloud sync">
          <i class="bi bi-box-arrow-in-right"></i> Sign In
        </button>
      `;
    }
  };

  renderNavAuth();

  // Listen for login/logout and profile updates
  window.addEventListener('codesprint:auth-changed', renderNavAuth);
  window.addEventListener('codesprint:profile-updated', renderNavAuth);
}

/**
 * Handle notification button clicks (Tips and speed drills)
 */
function initNotificationButton() {
  const notifBtn = document.getElementById('navNotificationBtn');
  if (!notifBtn) return;

  const tips = [
    "🔥 Practice Tip: Aim for sub-10 minutes on Level A/B problems to secure early Div. 2 rating surges.",
    "⏱️ Time Awareness: If stuck for over 15 minutes on an idea, step back and test smaller samples manually.",
    "🎯 Daily Sprint: Solving 3 problems at your target rating daily builds lasting pattern recognition.",
    "⚡ Contest Strategy: Scan all Div 2 A through C problems in the first 3 minutes before coding.",
    "☁️ Cloud Sync: Your practice sessions and solves automatically persist to MongoDB Atlas when signed in."
  ];

  notifBtn.addEventListener('click', () => {
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    showToast(randomTip, 'info');
  });
}

/**
 * Inject the Auth Modal (Login / Register) into document body
 */
function injectAuthModal() {
  if (document.getElementById('authModal')) return;

  const modalHtml = `
    <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content cs-modal">
          <div class="modal-header cs-modal-header border-bottom border-secondary">
            <ul class="nav nav-pills w-100" id="authTab" role="tablist">
              <li class="nav-item flex-fill" role="presentation">
                <button class="nav-link active w-100 text-center fw-bold" id="tab-login" data-bs-toggle="pill" data-bs-target="#pane-login" type="button" role="tab">
                  Sign In
                </button>
              </li>
              <li class="nav-item flex-fill" role="presentation">
                <button class="nav-link w-100 text-center fw-bold" id="tab-register" data-bs-toggle="pill" data-bs-target="#pane-register" type="button" role="tab">
                  Create Account
                </button>
              </li>
            </ul>
            <button type="button" class="btn-close-cs ms-2" data-bs-dismiss="modal" aria-label="Close">&times;</button>
          </div>
          <div class="modal-body p-4">
            <div id="authAlertBox" class="alert alert-danger d-none p-2 small mb-3"></div>

            <div class="tab-content" id="authTabContent">
              <!-- Sign In Form -->
              <div class="tab-pane fade show active" id="pane-login" role="tabpanel">
                <form id="formSignIn" onsubmit="handleSignInSubmit(event)">
                  <div class="mb-3">
                    <label class="form-label text-secondary small fw-bold">Email or Username</label>
                    <input type="text" id="loginEmail" class="cs-input" placeholder="tourist or user@example.com" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label text-secondary small fw-bold">Password</label>
                    <input type="password" id="loginPassword" class="cs-input" placeholder="••••••••" required>
                  </div>
                  <button type="submit" id="btnSubmitLogin" class="btn-cs-primary w-100 py-2 mt-2">
                    <i class="bi bi-box-arrow-in-right me-1"></i> Sign In to CodeSprint
                  </button>
                </form>
              </div>

              <!-- Create Account Form -->
              <div class="tab-pane fade" id="pane-register" role="tabpanel">
                <form id="formRegister" onsubmit="handleRegisterSubmit(event)">
                  <div class="mb-3">
                    <label class="form-label text-secondary small fw-bold">Username</label>
                    <input type="text" id="regUsername" class="cs-input" placeholder="e.g. speedCoder" minlength="3" maxlength="30" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label text-secondary small fw-bold">Email</label>
                    <input type="email" id="regEmail" class="cs-input" placeholder="coder@example.com" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label text-secondary small fw-bold">Password (min 6 characters)</label>
                    <input type="password" id="regPassword" class="cs-input" placeholder="••••••••" minlength="6" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label text-secondary small fw-bold">Codeforces Handle (Optional)</label>
                    <input type="text" id="regCfHandle" class="cs-input" placeholder="e.g. tourist">
                  </div>
                  <button type="submit" id="btnSubmitRegister" class="btn-cs-primary w-100 py-2 mt-2">
                    <i class="bi bi-person-plus-fill me-1"></i> Create Free Account
                  </button>
                </form>
              </div>
            </div>
          </div>
          <div class="modal-footer cs-modal-footer justify-content-center text-center py-2">
            <span class="text-muted small" style="font-size: 0.78rem;">
              <i class="bi bi-shield-check text-success me-1"></i>
              Backed by Node.js, Express & MongoDB Atlas. Passwords hashed with bcrypt.
            </span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Open Auth Modal to specific tab
 */
window.openAuthModal = function(mode = 'login') {
  const modalEl = document.getElementById('authModal');
  if (!modalEl || !window.bootstrap) return;

  const alertBox = document.getElementById('authAlertBox');
  if (alertBox) alertBox.classList.add('d-none');

  if (mode === 'register') {
    const tabRegister = document.getElementById('tab-register');
    if (tabRegister) new bootstrap.Tab(tabRegister).show();
  } else {
    const tabLogin = document.getElementById('tab-login');
    if (tabLogin) new bootstrap.Tab(tabLogin).show();
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
};

/**
 * Handle Sign In Form submission
 */
window.handleSignInSubmit = async function(e) {
  e.preventDefault();
  const alertBox = document.getElementById('authAlertBox');
  const btn = document.getElementById('btnSubmitLogin');
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');

  if (alertBox) alertBox.classList.add('d-none');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
  }

  try {
    const data = await window.CodeSprintAPI.login(emailInput.value, passInput.value);
    showToast(`Welcome back, ${data.user.username}!`, 'success');

    const modalEl = document.getElementById('authModal');
    if (modalEl && window.bootstrap) {
      bootstrap.Modal.getInstance(modalEl)?.hide();
    }

    // Auto-prompt sync if guest has practice history
    const history = window.CodeSprintStorage.getPracticeSessions();
    if (history.length > 0) {
      setTimeout(() => {
        if (confirm(`You have ${history.length} local practice session(s). Sync them to your account now?`)) {
          window.syncGuestProgressToAccount();
        }
      }, 800);
    }
  } catch (err) {
    if (alertBox) {
      alertBox.textContent = err.message || 'Login failed. Please check your credentials.';
      alertBox.classList.remove('d-none');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Sign In to CodeSprint';
    }
  }
};

/**
 * Handle Register Form submission
 */
window.handleRegisterSubmit = async function(e) {
  e.preventDefault();
  const alertBox = document.getElementById('authAlertBox');
  const btn = document.getElementById('btnSubmitRegister');
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const cfHandle = document.getElementById('regCfHandle').value;

  if (alertBox) alertBox.classList.add('d-none');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';
  }

  try {
    const data = await window.CodeSprintAPI.register(username, email, password, cfHandle);
    showToast(`Account created! Welcome to CodeSprint, ${data.user.username}!`, 'success');

    const modalEl = document.getElementById('authModal');
    if (modalEl && window.bootstrap) {
      bootstrap.Modal.getInstance(modalEl)?.hide();
    }

    // Sync any existing local sessions
    const history = window.CodeSprintStorage.getPracticeSessions();
    if (history.length > 0) {
      window.syncGuestProgressToAccount();
    }
  } catch (err) {
    if (alertBox) {
      alertBox.textContent = err.message || 'Registration failed. Please try again.';
      alertBox.classList.remove('d-none');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-person-plus-fill me-1"></i> Create Free Account';
    }
  }
};

/**
 * Sign out user
 */
window.handleLogout = function() {
  if (confirm('Are you sure you want to sign out?')) {
    window.CodeSprintAPI.logout();
    showToast('Signed out successfully.', 'info');
  }
};

/**
 * Sync guest sessions to account
 */
window.syncGuestProgressToAccount = async function() {
  if (!window.CodeSprintAPI.isAuthenticated()) {
    window.openAuthModal('login');
    return;
  }

  const sessions = window.CodeSprintStorage.getPracticeSessions();
  if (sessions.length === 0) {
    showToast('No local practice sessions to sync.', 'info');
    return;
  }

  showToast('Syncing local practice sessions to your MongoDB account...', 'info');

  try {
    const res = await window.CodeSprintAPI.syncGuestSessions(sessions);
    showToast(res.message || 'Sync completed successfully!', 'success');
  } catch (err) {
    showToast(`Sync failed: ${err.message}`, 'error');
  }
};

/**
 * Listen for profile modal events
 */
function initProfileModalListeners() {
  const saveBtn = document.getElementById('btnSaveProfile');
  const resetBtn = document.getElementById('btnResetAllData');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('profileDisplayNameInput');
      const handleInput = document.getElementById('profileCfHandleInput');
      const stageSelect = document.getElementById('profileStageSelect');

      const updated = CodeSprintStorage.saveProfile({
        displayName: nameInput ? nameInput.value.trim() : 'Sprint Master',
        cfHandle: handleInput ? handleInput.value.trim() : '',
        preferredStage: stageSelect ? stageSelect.value : 'Intermediate'
      });

      showToast(`Profile updated: ${updated.displayName}`, 'success');

      const modalEl = document.getElementById('profileModal');
      if (modalEl && window.bootstrap) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const confirmed = window.confirm(
        '⚠️ Are you sure you want to reset all practice progress and local history? This cannot be undone.'
      );
      if (confirmed) {
        CodeSprintStorage.resetAllData();
        showToast('All practice history has been reset.', 'error');
        setTimeout(() => window.location.reload(), 800);
      }
    });
  }
}

/**
 * Toast notification utility
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('csToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'csToastContainer';
    container.className = 'cs-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `cs-toast ${type}`;

  let iconHtml = '<i class="bi bi-info-circle-fill text-info"></i>';
  if (type === 'success') {
    iconHtml = '<i class="bi bi-check-circle-fill text-success"></i>';
  } else if (type === 'error') {
    iconHtml = '<i class="bi bi-exclamation-triangle-fill text-danger"></i>';
  }

  toast.innerHTML = `
    <div>${iconHtml}</div>
    <div style="flex:1; font-size: 0.9rem;">${message}</div>
    <button type="button" class="btn-close-cs" aria-label="Close">&times;</button>
  `;

  const closeBtn = toast.querySelector('.btn-close-cs');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

window.showToast = showToast;
