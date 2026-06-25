import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const QuestionManagement = () => {
  const [examSets, setExamSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  useEffect(() => {
    fetchExamSets();
  }, []);

  useEffect(() => {
    if (selectedSetId) {
      fetchQuestions(selectedSetId);
    } else {
      setQuestions([]);
    }
  }, [selectedSetId]);

  const fetchExamSets = async () => {
    try {
      setLoadingSets(true);
      const { data } = await api.get('/admin/exam-sets');
      setExamSets(data);
      if (data.length > 0 && !selectedSetId) {
        setSelectedSetId(data[0]._id);
      }
    } catch (error) {
      toast.error('Failed to load exam sets');
    } finally {
      setLoadingSets(false);
    }
  };

  const fetchQuestions = async (setId) => {
    try {
      setLoadingQuestions(true);
      const { data } = await api.get(`/admin/questions?examSetId=${setId}`);
      setQuestions(data);
    } catch (error) {
      toast.error('Failed to load questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await api.delete(`/admin/questions/${id}`);
        toast.success('Question deleted successfully');
        fetchQuestions(selectedSetId);
      } catch (error) {
        toast.error('Failed to delete question');
      }
    }
  };

  if (loadingSets) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Question Management</h1>
      </div>

      {/* Exam Set Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Candidate Exam Set to View</label>
          <select 
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border bg-white"
            value={selectedSetId}
            onChange={(e) => setSelectedSetId(e.target.value)}
          >
            {examSets.length === 0 && <option value="">No Exam Sets Uploaded</option>}
            {examSets.map(set => (
              <option key={set._id} value={set._id}>
                {set.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">
            Questions in Selected Exam ({questions.length})
          </h2>
        </div>
        
        {loadingQuestions ? (
           <div className="p-8 text-center text-gray-500">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No questions found. Select an Exam Set to view its questions.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {questions.map((q, index) => (
              <div key={q._id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex gap-2">
                    <span className="text-blue-600">{index + 1}.</span>
                    {q.question}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {q.marks} Mark{q.marks !== 1 ? 's' : ''}
                    </span>
                    <button 
                      onClick={() => handleDelete(q._id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete Question"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                  {q.options.map((option, i) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg border ${
                        option.label === q.correctAnswer 
                          ? 'bg-green-50 border-green-200 text-green-800 font-medium' 
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      <span className="inline-block w-6 font-semibold mr-2">
                        {option.label}.
                      </span>
                      {option.text}
                      {option.label === q.correctAnswer && (
                        <span className="float-right text-green-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionManagement;
