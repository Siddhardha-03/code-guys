# Campus Coding Platform

A responsive full-stack coding platform for students, similar to LeetCode, WorkAtTech, GeeksforGeeks, and Programiz.

## Features

1. **Coding Practice Module**
   - Students solve curated coding problems
   - Monaco Editor for code input
   - Judge0 API to execute code
   - Test case validation (against backend DB)
   - Results stored in MySQL

2. **Online Compiler Module**
   - Separate page where users can write/run any code
   - No test case validation, just Monaco + Judge0
   - For quick, personal coding practice

3. **MCQ Quiz Module**
   - Aptitude or theory-based quizzes (MCQ)
   - Admin can add quizzes and questions
   - Students can take quizzes with a timer
   - Auto score submission

4. **Admin Panel**
   - Upload coding problems, test cases, quizzes
   - View all student activity, submissions, and progress

5. **Student Dashboard**
   - See practice history
   - View quiz results
   - Track progress via charts
   - Show leaderboard by performance

## Tech Stack

**Frontend:**
- React.js
- Tailwind CSS
- React Router
- Monaco Editor (`@monaco-editor/react`)

**Backend:**
- Node.js
- Express.js
- JWT authentication
- bcrypt for hashing

**Database:**
- MySQL 8.0

**Code Execution:**
- Judge0 API: `https://ce.judge0.com`

## Project Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL 8.0
- npm or yarn

### Installation

1. Clone the repository

2. Install dependencies for both client and server:
   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

3. Set up the database:
   - Create a MySQL database named `campus_platform`
   - Run the SQL script in `/database/init.sql`

4. Configure environment variables:
   - Create a `.env` file in the server directory based on the provided configuration

5. Start the development servers:
   ```bash
   # Start the client (in the client directory)
   npm start

   # Start the server (in the server directory)
   npm run dev
   ```

## Folder Structure

```
/client (React)
├── src/
│ ├── pages/
│ │ ├── Home.jsx
│ │ ├── Practice.jsx
│ │ ├── Compiler.jsx
│ │ ├── Quiz.jsx
│ │ ├── Dashboard.jsx
│ │ └── AdminPanel.jsx
│ ├── components/
│ ├── services/
│ ├── hooks/
│ └── App.js

/server (Express)
├── controllers/
├── routes/
├── models/
├── middlewares/
├── utils/
│ └── judge0.js ← handles Judge0 code execution
└── index.js

/database
└── init.sql
```

## Responsive Design

The platform is built with a mobile-first approach using Tailwind CSS breakpoints. Features include:
- Hamburger menu on mobile
- Scrollable tables and dashboards
- Monaco Editor that resizes based on screen
- Smooth responsive layout for coding, quizzes, and dashboard