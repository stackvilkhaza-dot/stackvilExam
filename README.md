# Stack Exam Portal

A full-stack online examination system built for job candidate assessments.

## Tech Stack

- **Frontend:** React.js, Vite, Tailwind CSS, React Router v6, Axios
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Authentication:** JWT (JSON Web Tokens) for Admin

## Features

**Candidate Side:**
- Beautiful Instructions Page
- Fullscreen Exam Interface
- Real-time Timer
- Auto-save Progress
- Anti-cheat (Tab switch detection, prevent copy/paste/right-click)
- Automatic submission when time expires

**Admin Panel:**
- Secure Login
- Dashboard Statistics
- Question Management (CRUD operations)
- Detailed Results View

## Installation & Setup

### Prerequisites
- Node.js installed
- MongoDB installed and running locally on `mongodb://127.0.0.1:27017`

### 1. Backend Setup

```bash
cd backend
npm install

# The .env file is already configured for local development.

# Seed the initial Admin user
node seeder.js

# Start the server
npm run dev
# or
npm start
```
*The initial admin credentials are `admin@example.com` / `password`.*

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Usage

- **Candidate Portal:** `http://localhost:5173`
- **Admin Portal:** `http://localhost:5173/admin/login`

## License
MIT
