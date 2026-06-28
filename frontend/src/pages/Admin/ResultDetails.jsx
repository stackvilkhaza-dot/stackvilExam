import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ResultDetails = () => {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data } = await api.get(`/admin/results/${id}`);
        setResult(data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load result details');
        setLoading(false);
      }
    };

    fetchResult();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!result) return <div>Result not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Result Details</h1>
        <Link to="/admin/results" className="text-sm font-medium text-primary-600 hover:text-primary-500">
          &larr; Back to Results
        </Link>
      </div>

      {/* Candidate Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Candidate Name</p>
            <p className="font-semibold text-gray-900">{result.candidateName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Email</p>
            <p className="font-semibold text-gray-900">{result.candidateEmail}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Score</p>
            <p className="font-bold text-xl text-primary-600">{result.score}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Submission Time</p>
            <p className="font-medium text-gray-900">{new Date(result.submittedAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Detailed Answers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-semibold text-gray-800">Answers Overview</h2>
          <div className="mt-2 text-sm text-gray-600 flex space-x-4">
            <span>Correct: <strong className="text-green-600">{result.correctCount}</strong></span>
            <span>Wrong: <strong className="text-red-600">{result.wrongCount}</strong></span>
          </div>
        </div>
        <ul className="divide-y divide-gray-200 max-h-[800px] overflow-y-auto">
          {result.answers.map((ans, idx) => (
            <li key={idx} className="p-6">
              <div className="flex items-start">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-3">
                    Q{idx + 1}. {ans.questionId ? ans.questionId.question : 'Question Deleted'}
                  </p>
                  
                  {ans.questionId && (
                    <div className="space-y-2 text-sm pl-4">
                      {ans.questionId.options.map((opt, i) => {
                        let bgColor = 'bg-gray-50 text-gray-700';
                        let borderColor = 'border-gray-200';
                        let icon = null;

                        if (opt.label === ans.questionId.correctAnswer) {
                          bgColor = 'bg-green-50 text-green-800';
                          borderColor = 'border-green-200';
                          icon = '✓';
                        }
                        
                        if (opt.label === ans.selectedAnswer && !ans.isCorrect) {
                          bgColor = 'bg-red-50 text-red-800';
                          borderColor = 'border-red-200';
                          icon = '✗';
                        }

                        return (
                          <div key={i} className={`p-2 rounded border ${bgColor} ${borderColor} flex items-center`}>
                            <span className="w-6 inline-block font-bold">{icon}</span>
                            <span>{opt.label}. {opt.text}</span>
                            {opt.label === ans.selectedAnswer && <span className="ml-auto text-xs italic text-gray-500">Candidate selected</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!ans.questionId && (
                    <div className="text-sm text-gray-500 mt-2">
                      Selected Answer: {ans.selectedAnswer} <br/>
                      <span className={ans.isCorrect ? "text-green-600" : "text-red-600"}>
                        {ans.isCorrect ? "Correct" : "Wrong"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Coding Challenges Submissions */}
      {result.codingSubmissions && result.codingSubmissions.length > 0 && (
        <div className="space-y-6 mt-8">
          <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Web Design Challenges</h2>
          {result.codingSubmissions.map((sub, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">
                  Challenge {idx + 1}: {sub.challengeId?.title || 'Unknown Challenge'}
                </h3>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  {sub.challengeId?.marks || 0} Marks
                </span>
              </div>
              
              {sub.uiuxAnalysis && (
                <div className="p-6 border-b border-gray-200 bg-pink-50">
                  <h4 className="font-bold text-sm text-pink-800 mb-2 uppercase tracking-wider">UI/UX Analysis</h4>
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{sub.uiuxAnalysis}</p>
                </div>
              )}

              <div className="flex flex-col md:flex-row h-[500px]">
                {/* Code Tabs */}
                <div className="w-full md:w-1/2 flex flex-col border-r border-gray-200 bg-gray-50">
                  <div className="flex-1 p-4 overflow-y-auto">
                    <h4 className="font-bold text-sm text-gray-700 mb-2">HTML</h4>
                    <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs mb-4 overflow-x-auto">
                      <code>{sub.submittedHtml || 'No HTML provided.'}</code>
                    </pre>
                    
                    <h4 className="font-bold text-sm text-gray-700 mb-2">CSS</h4>
                    <pre className="bg-gray-800 text-blue-300 p-3 rounded text-xs mb-4 overflow-x-auto">
                      <code>{sub.submittedCss || 'No CSS provided.'}</code>
                    </pre>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="w-full md:w-1/2 flex flex-col bg-white">
                  <div className="p-2 bg-gray-100 border-b text-center font-medium text-xs text-gray-500 uppercase tracking-wider">
                    Live Preview Output
                  </div>
                  <iframe
                    title={`Live Preview ${idx}`}
                    sandbox="allow-scripts"
                    className="w-full flex-1 border-none"
                    srcDoc={`
                      <html>
                        <head>
                          <style>${sub.submittedCss}</style>
                        </head>
                        <body>
                          ${sub.submittedHtml}
                        </body>
                      </html>
                    `}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultDetails;
