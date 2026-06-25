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
    </div>
  );
};

export default ResultDetails;
