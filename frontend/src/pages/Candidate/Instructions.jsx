import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Branding
import StackvilLogo from '../../Black Simple Eagle Logo (1).jpg';

const Instructions = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.removeItem('candidateInfo');
    localStorage.removeItem('examEndTime');
    localStorage.removeItem('examProgress');
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

      // Request full screen
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => console.log(err));
      }

      // Dynamic routing based on assigned rounds
      let hasMCQs = false;
      let hasCoding = false;

      try {
        const mcqRes = await api.get(`/exam/questions?email=${encodeURIComponent(data.email)}`);
        if (mcqRes.data && mcqRes.data.length > 0) {
          hasMCQs = true;
        }
      } catch (mcqErr) {}

      try {
        const codingRes = await api.get(`/exam/my-challenges?email=${encodeURIComponent(data.email)}`);
        if (codingRes.data && codingRes.data.length > 0) {
          hasCoding = true;
        }
      } catch (codingErr) {}

      if (hasCoding && !hasMCQs) {
        navigate('/coding-round');
      } else {
        navigate('/exam');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const guidelines = [
    "The total duration for all rounds is 1 Hour 30 Minutes. You must complete and submit the exam before this time expires.",
    "Complete all three assessment rounds in the given order.",
    "Do not refresh, close, or navigate away from the assessment page during the exam.",
    "Ensure you have a stable internet connection before starting.",
    "Your responses are automatically saved after each completed round.",
    "The coding round evaluates your HTML, CSS, JavaScript, React, and UI/UX design skills.",
    "Do not use unauthorized resources or communicate with others during the assessment.",
    "Once submitted, you cannot retake the assessment.",
    "Read every question carefully before answering.",
    "Keep your browser in full-screen mode throughout the assessment.",
    "Ensure your laptop is fully charged or connected to power."
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-8 font-sans text-gray-800">
      <div className="w-full max-w-6xl bg-white/70 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border border-white/50 flex flex-col lg:flex-row">
        
        {/* Left Side (60%) - Assessment Guidelines */}
        <div className="lg:w-3/5 p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-gray-200/50 flex flex-col bg-gradient-to-b from-white/40 to-transparent">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight">
              Assessment Guidelines
            </h2>
            <p className="mt-2 text-gray-500 text-sm">Please review the rules carefully before starting your session.</p>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {guidelines.map((text, idx) => (
              <div key={idx} className="flex items-start group">
                <div className="flex-shrink-0 mt-1 mr-4">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>


        </div>

        {/* Right Side (40%) - Candidate Login */}
        <div className="lg:w-2/5 p-8 lg:p-12 flex flex-col justify-center bg-white/90">
          <div className="mb-10 text-center">
            <img src={StackvilLogo} alt="Stackvil Logo" className="h-16 mx-auto mb-4 object-contain drop-shadow-sm rounded" />
            <h1 className="text-2xl font-bold text-gray-900">Stackvil Technologies</h1>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Online Assessment Portal</h2>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Welcome to the Stackvil Online Assessment Platform. Sign in to begin your recruitment assessment.
            </p>
          </div>

          <form onSubmit={handleStartExam} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-sm"
                placeholder="Enter your registered email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-sm"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                <span className="ml-2">Remember Me</span>
              </label>
              <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-6 py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white transition-all transform active:scale-[0.98]
                ${loading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Authenticating...
                </span>
              ) : 'Login & Start Assessment'}
            </button>
          </form>

          <p className="mt-6 text-center text-[10px] text-gray-400">
            By continuing, you agree to follow the Stackvil Online Assessment Guidelines.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Instructions;
