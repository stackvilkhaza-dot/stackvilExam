import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Candidate Pages
import Instructions from './pages/Candidate/Instructions';
import Exam from './pages/Candidate/Exam';
import SubmissionCompleted from './pages/Candidate/SubmissionCompleted';

// Admin Pages
import AdminLogin from './pages/Admin/AdminLogin';
import Dashboard from './pages/Admin/Dashboard';
import Candidates from './pages/Admin/Candidates';
import CandidateProfile from './pages/Admin/CandidateProfile';
import QuestionManagement from './pages/Admin/QuestionManagement';
import Results from './pages/Admin/Results';
import ResultDetails from './pages/Admin/ResultDetails';
import LiveMonitoring from './pages/Admin/LiveMonitoring';

import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Candidate Routes */}
        <Route path="/" element={<Instructions />} />
        <Route path="/exam" element={<Exam />} />
        <Route path="/submitted" element={<SubmissionCompleted />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Protected Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="candidates/:id" element={<CandidateProfile />} />
          <Route path="questions" element={<QuestionManagement />} />
          <Route path="results" element={<Results />} />
          <Route path="results/:id" element={<ResultDetails />} />
          <Route path="monitoring" element={<LiveMonitoring />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
