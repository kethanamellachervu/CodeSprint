# ⚡ CodeSprint — Competitive Programming Practice Platform

CodeSprint is a college project designed to help students improve their coding and problem-solving skills through structured practice, timed coding sessions, virtual contests, and progress tracking.

## Features

- **Timed Practice:** Practise solving coding problems using a countdown timer.
- **Difficulty Levels:** Solve Codeforces problems arranged into eight difficulty levels.
- **Problem Explorer:** Search and filter problems by difficulty, rating, and topic.
- **Virtual Contests:** Practise with five-problem simulated contests.
- **Progress Tracking:** Track solved problems and practice time through a dashboard.
- **Guest Mode:** Start practising without creating an account and synchronize progress after logging in.

## Technologies Used

- **Frontend:** HTML, CSS, JavaScript, Bootstrap
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Authentication:** JWT, bcryptjs
- **API Integration:** Codeforces API
- **Charts:** Chart.js

## Installation and Setup

### Prerequisites

- Node.js 18 or later
- npm
- MongoDB Atlas account (for database connectivity)

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

Create a `.env` file inside the `backend` folder by copying the example file.

**Windows PowerShell:**

```powershell
Copy-Item backend/.env.example backend/.env
```

Configure the required environment variables in `backend/.env`, including your MongoDB connection string and JWT secret.

Keep your credentials private and do not upload your `.env` file to GitHub.

### 4. Run the application

```bash
npm start
```

Open `http://localhost:5050` in your browser.

## Project Objective

The objective of CodeSprint is to provide a structured coding practice environment where students can solve problems, practise under time constraints, participate in virtual contests, and monitor their progress.

