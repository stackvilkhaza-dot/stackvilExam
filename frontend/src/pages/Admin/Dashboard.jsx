import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalSubmissions: 0,
    averageScore: 0,
    totalQuestions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/admin/dashboard');
        setStats(data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load dashboard statistics');
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  const statCards = [
    { label: 'Total Candidates (Submissions)', value: stats.totalSubmissions, icon: '👥' },
    { label: 'Total Questions', value: stats.totalQuestions, icon: '📝' },
    { label: 'Average Score', value: `${stats.averageScore}`, icon: '📊' }
  ];

  const handleResetDatabase = async () => {
    if (window.confirm('⚠️ WARNING: This will permanently delete ALL candidates, results, exams, and questions! Are you absolutely sure?')) {
      if (window.confirm('Double checking... Are you REALLY sure? This cannot be undone.')) {
        try {
          await api.post('/admin/reset-db');
          toast.success('Database has been completely reset.');
          // Refresh stats
          const { data } = await api.get('/admin/dashboard');
          setStats(data);
        } catch (error) {
          toast.error('Failed to reset database.');
        }
      }
    }
  };

  const handleStartAllExams = async () => {
    if (window.confirm('Are you sure you want to START the exam for ALL candidates globally? Candidates will be able to log in and begin.')) {
      try {
        await api.put('/admin/start-all-exams');
        toast.success('All exams have been started globally!');
      } catch (error) {
        toast.error('Failed to start all exams.');
      }
    }
  };

  const handleStopAllExams = async () => {
    if (window.confirm('Are you sure you want to STOP the exam for ALL candidates globally?')) {
      try {
        await api.put('/admin/stop-all-exams');
        toast.success('All exams have been stopped globally!');
      } catch (error) {
        toast.error('Failed to stop all exams.');
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">High-level statistics and global controls.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleStartAllExams}
            className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg shadow hover:bg-green-700 transition-colors"
          >
            Start All Exams Globally
          </button>
          <button 
            onClick={handleStopAllExams}
            className="px-6 py-2 bg-yellow-600 text-white font-bold rounded-lg shadow hover:bg-yellow-700 transition-colors"
          >
            Stop All Exams
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
            <div className="text-4xl">{card.icon}</div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-red-50 border border-red-200 rounded-xl">
        <h2 className="text-lg font-bold text-red-800 mb-2">Danger Zone</h2>
        <p className="text-sm text-red-600 mb-4">
          Actions here are irreversible. Please be absolutely certain before proceeding.
        </p>
        <button 
          onClick={handleResetDatabase}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
        >
          Reset Entire Database
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
