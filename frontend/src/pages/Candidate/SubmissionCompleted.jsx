import { Link } from 'react-router-dom';

const SubmissionCompleted = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center space-y-6">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className="text-3xl font-extrabold text-gray-900">
          Exam Submitted Successfully
        </h2>
        
        <p className="text-lg text-gray-600">
          Thank you for completing the assessment. Your responses have been recorded.
        </p>
        
        <div className="pt-6 border-t border-gray-200">
          <Link
            to="/"
            className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubmissionCompleted;
