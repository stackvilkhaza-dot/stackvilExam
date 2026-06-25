import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CandidateProfile = () => {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [candRes, assignRes] = await Promise.all([
        api.get(`/admin/candidates/${id}`),
        api.get('/admin/assignments')
      ]);
      
      setCandidate(candRes.data);
      const candAssignment = assignRes.data.find(a => a.candidateEmail === candRes.data.email);
      setAssignment(candAssignment || null);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('candidateId', candidate._id);

    setUploading(true);
    try {
      await api.post('/admin/upload-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Exam successfully created and assigned!');
      setFile(null);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error uploading PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleExam = async () => {
    if (!assignment?.examSetId) return;
    try {
      await api.put(`/admin/exam-sets/${assignment.examSetId._id}/activate`);
      toast.success('Exam status updated');
      fetchProfile();
    } catch (error) {
      toast.error('Failed to update exam status');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!candidate) return <div>Candidate not found</div>;

  const hasExam = assignment && assignment.examSetId;
  const isLive = hasExam && assignment.examSetId.isActive;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <Link to="/admin/candidates" className="text-blue-600 hover:underline mb-2 inline-block">
            &larr; Back to Candidates
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{candidate.name}'s Profile</h1>
          <p className="text-gray-500">{candidate.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Exam Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Current Exam Status</h2>
          
          {hasExam ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="font-medium text-gray-900">{assignment.examSetId.name}</p>
                <p className="text-sm text-gray-500">Source: {assignment.examSetId.fileName}</p>
              </div>

              <div className="flex items-center gap-4">
                {isLive ? (
                  <>
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-md font-semibold flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Exam is Live
                    </span>
                    <button 
                      onClick={handleToggleExam}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                    >
                      Stop Exam
                    </button>
                  </>
                ) : (
                  <>
                    <span className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md font-semibold">
                      Exam is Locked
                    </span>
                    <button 
                      onClick={handleToggleExam}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                    >
                      Start Exam
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 font-medium">No exam assigned yet.</p>
              <p className="text-sm text-yellow-600 mt-1">Upload a PDF below to assign an exam to this candidate.</p>
            </div>
          )}
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Upload Unique Exam PDF</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <button
              type="submit"
              disabled={uploading || !file}
              className={`w-full py-2 px-4 rounded-md font-medium text-white ${
                uploading || !file ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {uploading ? 'Processing & Extracting...' : 'Upload & Assign'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfile;
