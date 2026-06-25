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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <button 
          onClick={handleResetDatabase}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Reset Entire Database
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm p-6 flex items-center border border-gray-100">
            <div className="text-4xl mr-4">{stat.icon}</div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
