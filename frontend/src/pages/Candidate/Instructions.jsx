import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Instructions = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in and assigned
    const candidateInfo = localStorage.getItem('candidateInfo');
    if (candidateInfo) {
      // Just clear it for safety so they have to login again
      localStorage.removeItem('candidateInfo');
    }
  }, []);

  const handleStartExam = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/exam/login', formData);
      // data contains id, name, email
      localStorage.setItem('candidateInfo', JSON.stringify({
        id: data.id,
        name: data.name,
        email: data.email
      }));

      navigate('/exam');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">AI-Powered Stack Exam Portal</h1>
          <p className="mt-4 text-lg text-gray-500">Log in to begin your assessment.</p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
          <div className="md:flex">
            <div className="p-8 md:p-10 md:w-1/2 bg-blue-50 border-r border-blue-100">
              <h2 className="text-xl font-bold text-blue-900 mb-6">Exam Instructions</h2>
              
              <ul className="space-y-4 text-sm text-blue-800">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-blue-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>This is a timed assessment. Once started, the timer cannot be paused.</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-blue-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Proctoring is active. Do not switch tabs or exit full-screen mode.</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-blue-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>All questions are multiple-choice. Select the best answer for each.</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-blue-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>You must click "Submit Exam" at the bottom to finalize your score.</span>
                </li>
              </ul>
              
              <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border border-blue-100">
                <p className="text-xs text-blue-600 text-center font-medium">
                  If you encounter any technical issues, please contact your administrator.
                </p>
              </div>
            </div>

            <div className="p-8 md:p-10 md:w-1/2 flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Candidate Login</h2>
              
              <form onSubmit={handleStartExam} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-3 border"
                    placeholder="Enter your registered email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-3 border"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white transition-colors
                    ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}
                  `}
                >
                  {loading ? 'Authenticating...' : 'Login & Start Exam'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Instructions;
