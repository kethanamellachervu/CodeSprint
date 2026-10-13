# ⚡ CodeSprint — Competitive Programming Platform

**Practice smarter. Solve faster.**

CodeSprint is a full-stack competitive programming practice platform designed to help students and developers improve their problem-solving speed through structured practice, timed sessions, virtual contests, and progress tracking.

## 🚀 Features

### 1. Timed Practice
- Practise solving coding problems with a countdown timer.
- Track the time spent on practice sessions.
- Build consistency through time-based practice.

### 2. Difficulty Levels
- Organizes Codeforces problems into eight progressive difficulty levels.
- Helps users move from easier problems to more challenging ones.
- Encourages structured learning.

### 3. Problem Explorer
- Browse real Codeforces problems.
- Search and filter problems by difficulty, rating, and topic.
- Access problem statements directly on Codeforces.

### 4. Virtual Contests
- Practise with simulated five-problem contests.
- Solve problems under time constraints.
- Improve contest readiness and time management.

### 5. Progress Dashboard
- Track solved problems and practice sessions.
- View topic-wise and difficulty-wise statistics.
- Analyse practice time and problem-solving progress through charts.

### 6. Guest Mode and Cloud Sync
- Start practising without creating an account.
- Store guest progress in browser local storage.
- Synchronize guest progress with a user account after registration or login.

## 🛠️ Tech Stack

| Component | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES6+), Bootstrap 5 |
| Charts | Chart.js |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JWT, bcryptjs |
| Problem Data | Codeforces API |
| Storage | Browser local storage and database persistence |

## 🏗️ How It Works

1. Users browse coding problems from the Codeforces problem catalog.
2. They select problems based on difficulty or topic.
3. They practise using the timer or participate in virtual contests.
4. Their practice sessions and solved problems can be recorded.
5. The dashboard displays progress and performance statistics.
6. Registered users can synchronize their progress with the backend.

## 📂 Project Structure

```text
CodeSprint/
├── assets/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── server.js
│   └── .env.example
├── css/
├── js/
├── contest.html
├── index.html
├── levels.html
├── practice.html
├── problems.html
├── profile.html
├── progress.html
├── package.json
└── README.md
```

## ⚙️ Installation and Setup

### Prerequisites
- Node.js 18 or later
- npm
- MongoDB Atlas account for persistent cloud storage

### 1. Clone the repository

```bash
git clone https://github.com/kethanamellachervu/CodeSprint.git
cd CodeSprint
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create your local environment file by copying the example.

**Windows PowerShell:**

```powershell
Copy-Item backend/.env.example backend/.env
```

Configure the values in `backend/.env`:

```env
PORT=5050
NODE_ENV=development
JWT_SECRET=replace_with_a_secure_secret
JWT_EXPIRES_IN=7d
MONGODB_URI=your_mongodb_connection_string
```

Use your actual MongoDB connection string and keep secrets private. Do not commit your `.env` file.

### 4. Start the application

```bash
npm start
```

Open the application at:

`http://localhost:5050`

## 🧪 Testing

The repository includes API and end-to-end test scripts.

Run the API tests:

```bash
node backend/test-api.js
```

Run the end-to-end tests:

```bash
node backend/test-e2e.js
```

Ensure the backend and its required configuration are available before running the tests.

## 🔐 Security

- Password hashing using bcryptjs.
- JWT-based authentication.
- Environment variables for sensitive configuration.
- Authentication middleware for protected endpoints.
- Rate limiting on authentication endpoints.

## 🎯 Project Goal

CodeSprint brings problem discovery, timed practice, virtual contests, and progress tracking into one platform. Its goal is to help competitive programmers practise consistently, identify areas for improvement, and develop better problem-solving habits.

## 👩‍💻 Author

**Kethana Mellachervu**

GitHub: [@kethanamellachervu](https://github.com/kethanamellachervu)

## 📄 License

This project is licensed under the MIT License, subject to the repository's license file.
