import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import api from '../../services/api';

const CodingRound = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('html');
  const [code, setCode] = useState({
    html: '<!-- Write your HTML here -->\n<div class="container">\n  <h1>Welcome to Round 2</h1>\n  <p>Start building your UI!</p>\n</div>',
    css: '/* Write your CSS here */\n.container {\n  font-family: sans-serif;\n  text-align: center;\n  padding: 2rem;\n}',
    js: '// Write your JavaScript here\nconsole.log("UI/UX Coding Round started");'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load candidate info
  const candidateInfo = JSON.parse(localStorage.getItem('candidateInfo'));

  useEffect(() => {
    if (!candidateInfo) {
      navigate('/');
      return;
    }

    // Try to load saved progress
    const savedCode = localStorage.getItem('codingProgress');
    if (savedCode) {
      setCode(JSON.parse(savedCode));
    }

    // Anti-cheat: prevent copy/paste/context menu (optional for coding, maybe allow paste?)
    // For coding, developers usually need copy/paste. So we might omit strict copy/paste blocking here.
  }, [navigate]);

  // Save progress automatically
  useEffect(() => {
    localStorage.setItem('codingProgress', JSON.stringify(code));
  }, [code]);

  const handleEditorChange = (value) => {
    setCode((prev) => ({
      ...prev,
      [activeTab]: value
    }));
  };

  const handleSubmit = async () => {
    if (!window.confirm("Are you sure you want to final submit your code? You cannot return after this.")) {
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/exam/submit-coding', {
        candidateEmail: candidateInfo.email,
        html: code.html,
        css: code.css,
        js: code.js
      });
      
      localStorage.removeItem('codingProgress');
      localStorage.removeItem('candidateInfo');
      
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.log(err));
      }
      
      navigate('/submitted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit coding round. Please try again.');
      setIsSubmitting(false);
    }
  };

  const srcDoc = `
    <html>
      <head>
        <style>${code.css}</style>
      </head>
      <body>
        ${code.html}
        <script>
          try {
            ${code.js}
          } catch (err) {
            console.error(err);
          }
        </script>
      </body>
    </html>
  `;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold tracking-wider">Round 2: UI/UX Coding Challenge</h1>
        <div className="flex items-center space-x-4">
          <span className="text-gray-300 text-sm">Candidate: {candidateInfo?.name}</span>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Final Code'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane: Editor */}
        <div className="w-1/2 flex flex-col border-r border-gray-700">
          <div className="flex bg-gray-800 border-b border-gray-700">
            {['html', 'css', 'js'].map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveTab(lang)}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === lang 
                    ? 'bg-gray-700 text-blue-400 border-b-2 border-blue-500' 
                    : 'text-gray-400 hover:bg-gray-750 hover:text-gray-200'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              theme="vs-dark"
              language={activeTab === 'js' ? 'javascript' : activeTab}
              value={code[activeTab]}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                formatOnPaste: true,
              }}
            />
          </div>
        </div>

        {/* Right Pane: Live Preview */}
        <div className="w-1/2 bg-white flex flex-col">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 text-sm font-medium text-gray-700 flex justify-between items-center">
            <span>Live Output Preview</span>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <iframe
              srcDoc={srcDoc}
              title="Live Preview"
              sandbox="allow-scripts"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default CodingRound;
