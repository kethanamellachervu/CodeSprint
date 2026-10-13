# ⚡ CodeSprint — Full-Stack Competitive Programming Platform

> **Practice smarter. Solve faster.**  
> A high-performance, responsive competitive programming speed-training platform inspired by CFSpeed, complete with a Node.js/Express REST backend, MongoDB Atlas integration, JWT authentication, and Codeforces API problem caching.

---

## 🏗️ Project Architecture

CodeSprint is built with a decoupled yet unified full-stack architecture:

- **Frontend**: Clean Vanilla JavaScript (ES6+), HTML5, CSS3 with dark theme and `#FF647C` -> `#FF315A` energy gradient accents, Bootstrap 5 responsive layout, and Chart.js analytics.
- **Backend**: Node.js & Express.js REST API with modular controllers, routes, middleware, and Mongoose ODM models.
- **Database**: MongoDB Atlas cloud cluster with fallback in-memory handling for zero-setup local development.
- **Authentication**: Stateless JSON Web Token (JWT) with bcryptjs password hashing and rate-limited auth endpoints.
- **Problem Caching**: Smart backend Codeforces catalog caching (TTL 1h) with rating-to-level mapping (Levels A to H).
- **Hybrid Storage**: Full guest offline experience in `localStorage`, with one-click seamless cloud sync to MongoDB upon registration or login.

```text
CodeSprint/
├── assets/
│   └── logo.svg                 # Custom lightning vector logo
├── backend/
│   ├── config/
│   │   └── db.js                # MongoDB Atlas connection & fallback handling
│   ├── controllers/
│   │   ├── authController.js    # Register, login, me
│   │   ├── problemController.js # CF catalog fetching, caching, filtering
│   │   ├── progressController.js# Solve, unsolve, stats, sessions, sync
│   │   └── userController.js    # Profile retrieve and update
│   ├── middleware/
│   │   └── authMiddleware.js    # JWT verification & optional auth
│   ├── models/
│   │   ├── PracticeSession.js   # Timed practice session schema
│   │   ├── Progress.js          # Solved problems & topic history schema
│   │   └── User.js              # User account & bcrypt schema
│   ├── routes/
│   │   ├── auth.js              # /api/auth routes
│   │   ├── problems.js          # /api/problems routes
│   │   ├── progress.js          # /api/progress routes
│   │   ├── sessions.js          # /api/sessions routes
│   │   └── users.js             # /api/users routes
│   ├── utils/
│   │   └── memoryStore.js       # Fallback store when Atlas is offline
│   ├── .env.example             # Environment variable template
│   ├── server.js                # Express app entrypoint & static server
│   ├── test-api.js              # Automated 19-point API test suite
│   └── test-e2e.js              # End-to-end user journey simulation
├── css/
│   ├── components.css           # UI components, badges, timer display
│   ├── responsive.css           # Breakpoints for mobile, tablet, desktop
│   └── style.css                # Base theme & design tokens
├── js/
│   ├── api.js                   # Codeforces API client with backend fallback
│   ├── app.js                   # Global navigation, auth modal, toast alerts
│   ├── backend-api.js           # Reusable client API helper with JWT management
│   ├── contest.js               # 5-problem virtual contest simulation
│   ├── levels.js                # 8 difficulty tiers & live problem counts
│   ├── problems.js              # Problem explorer search, filter, pagination
│   ├── progress.js              # Progress analytics & Chart.js renderer
│   ├── storage.js               # Hybrid LocalStorage + cloud sync manager
│   └── timer.js                 # Countdown timer engine & session logger
├── contest.html                 # Virtual contest simulation page
├── index.html                   # Landing page with hero & statistics
├── levels.html                  # 8 difficulty levels overview
├── practice.html                # Dedicated sprint timer interface
├── problems.html                # Codeforces problem explorer
├── profile.html                 # Account preferences & data settings
├── progress.html                # Cloud analytics dashboard
├── package.json                 # Project dependencies & scripts
└── README.md                    # Project documentation
```

---

## ⚙️ Prerequisites & Node Version

- **Node.js**: `v18.0.0` or higher (tested on Node `v24.11.0`)
- **npm**: `v9.0.0` or higher
- **MongoDB Atlas** account (free cluster tier works great)

---

## 🚀 Quick Start & Installation

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd CodeSprint
npm install
```

### 2. Configure Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```bash
# On Windows PowerShell
Copy-Item backend/.env.example backend/.env

# On macOS/Linux
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your settings:

```env
PORT=5050
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# MongoDB Atlas Connection String
# Replace with your real MongoDB Atlas cluster connection string:
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/codesprint?retryWrites=true&w=majority
```

> **Note**: If `MONGODB_URI` is left blank, CodeSprint automatically starts in **local fallback mode** with an in-memory database so all APIs, user registrations, logins, solves, and charts work immediately for testing without blocking you!

### 3. Run the Application

Start the Express backend (which also serves the frontend):

```bash
npm start
```

Or for development:

```bash
npm run dev
```

Visit **`http://localhost:5050`** in your browser.

---

## 🍃 MongoDB Atlas Setup Guide

1. Log in to [MongoDB Cloud](https://cloud.mongodb.com/).
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a database user (e.g. `codesprint_user`) with read/write privileges.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) or your current IP.
5. In your cluster dashboard, click **Connect** -> **Drivers** -> Select **Node.js**.
6. Copy the connection string into `backend/.env` as `MONGODB_URI`. Example:
   ```text
   MONGODB_URI=mongodb+srv://codesprint_user:YourSecurePassword@cluster0.abcde.mongodb.net/codesprint?retryWrites=true&w=majority
   ```

---

## 📡 REST API Documentation

### Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new account (`username`, `email`, `password`, `cfHandle`) |
| `POST` | `/api/auth/login` | Public | Login with email/username and password, returns JWT |
| `GET` | `/api/auth/me` | Private | Retrieve logged-in user profile and solve counts |

### User Profile (`/api/users`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users/profile` | Private | Get user profile preferences |
| `PUT` | `/api/users/profile` | Private | Update display name, CF handle, stage, and daily target |

### Problemset (`/api/problems`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/problems` | Public | Paginated problem list with filters: `level`, `tag`, `search`, `sort`, `page`, `limit` |
| `GET` | `/api/problems/:id` | Public | Get single problem details by ID (e.g. `1941A`) |

### Progress & Solves (`/api/progress`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/progress/solve` | Private | Mark problem as solved (prevents duplicate solves) |
| `DELETE` | `/api/progress/solve/:problemId` | Private | Unmark a solved problem |
| `GET` | `/api/progress` | Private | Get list of user's solved problems |
| `GET` | `/api/progress/stats` | Private | Dashboard analytics: level-wise, topic-wise, daily minutes, success rate |
| `POST` | `/api/progress/sync` | Private | Safely sync guest localStorage sessions into user's cloud account |

### Practice Sessions (`/api/sessions`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/sessions` | Private | Save timed session duration; auto-updates Progress on solve |
| `GET` | `/api/sessions` | Private | Get session history (paginated, sorted by date) |

### Health Check

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Returns service status, uptime, and database connection state |

---

## 🧪 Testing Instructions

CodeSprint includes automated test suites:

### Run API Verification Suite (19 Tests)
```bash
node backend/test-api.js
```
Validates:
- Health check
- User registration & duplicate rejection
- User login & invalid password rejection
- Protected routes & token verification
- User profile retrieval & update
- Codeforces problem retrieval, level filtering, and single problem retrieval
- Progress marking, unmarking, and statistics calculation
- Practice session duration recording and retrieval
- Guest session synchronization

### Run End-to-End Simulation
```bash
node backend/test-e2e.js
```
Simulates full registration, solving problems, cloud stats verification, and profile preference updates.

---

## 🛡️ Security Best Practices Implemented

- **Password Hashing**: Passwords hashed with `bcryptjs` (salt rounds: 10). Plain-text passwords are never stored.
- **JWT Protection**: Cryptographically signed tokens with configurable expiration (`7d`).
- **Rate Limiting**: `express-rate-limit` prevents brute-force login attempts (100 requests per 15 minutes).
- **Sensitive Data Exclusion**: Mongoose schema sanitization automatically strips password fields from JSON responses.
- **CORS Protection**: Secure cross-origin resource sharing configured.
- **Environment Isolation**: `.env` is ignored by git to protect credentials.

---

## 📄 License
MIT © 2026 CodeSprint. Built for competitive programmers who want to solve faster.
