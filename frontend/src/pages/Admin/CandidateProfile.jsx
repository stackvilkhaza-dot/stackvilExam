import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import CodingChallengeManager from '../../components/CodingChallengeManager';

const CandidateProfile = () => {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileR1, setFileR1] = useState(null);
  const [fileR2, setFileR2] = useState(null);
  const [uploadingR1, setUploadingR1] = useState(false);
  const [uploadingR2, setUploadingR2] = useState(false);
  const [isCodingReady, setIsCodingReady] = useState(false);

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

  const handleUpload = async (e, round) => {
    e.preventDefault();
    const currentFile = round === 1 ? fileR1 : fileR2;
    if (!currentFile) {
      toast.error(`Please select a PDF file for Round ${round}`);
      return;
    }

    const formData = new FormData();
    formData.append('pdf', currentFile);
    formData.append('candidateId', candidate._id);
    formData.append('round', round);

    if (round === 1) setUploadingR1(true);
    else setUploadingR2(true);

    try {
      await api.post('/admin/upload-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Round ${round} questions successfully assigned!`);
      if (round === 1) setFileR1(null);
      else setFileR2(null);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error uploading PDF');
    } finally {
      if (round === 1) setUploadingR1(false);
      else setUploadingR2(false);
    }
  };





  if (loading) return <div>Loading...</div>;
  if (!candidate) return <div>Candidate not found</div>;

  const hasExam = assignment && assignment.examSetId;
  const isLive = hasExam && assignment.examSetId.isActive;

  const isRound1Ready = !!assignment?.examSetId?.fileNameRound1;
  const isRound2Ready = !!assignment?.examSetId?.fileNameRound2;
  const isExamReady = isRound1Ready && isRound2Ready && isCodingReady;

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
          
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium">Setup Checklist</p>
            <p className="text-sm text-yellow-600 mt-1 mb-3">
              You must upload both PDFs and Save all 3 Web Design Challenges before you can start the exam.
            </p>
            <div className="flex justify-between text-xs font-semibold">
              <span className={`px-2 py-1 rounded ${isRound1Ready ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>Round 1: {isRound1Ready ? 'Ready' : 'Missing'}</span>
              <span className={`px-2 py-1 rounded ${isRound2Ready ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>Round 2: {isRound2Ready ? 'Ready' : 'Missing'}</span>
              <span className={`px-2 py-1 rounded ${isCodingReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>Coding: {isCodingReady ? 'Ready' : 'Unsaved'}</span>
            </div>
          </div>

          {hasExam && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="font-medium text-gray-900">{assignment.examSetId.name}</p>
                {isRound1Ready && <p className="text-sm text-gray-500">R1: {assignment.examSetId.fileNameRound1}</p>}
                {isRound2Ready && <p className="text-sm text-gray-500">R2: {assignment.examSetId.fileNameRound2}</p>}
              </div>

              <div className="flex items-center gap-4">
                {isLive ? (
                  <span className="px-4 py-2 bg-green-100 text-green-800 rounded-md font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Exam is Live Globally
                  </span>
                ) : (
                  <span className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md font-semibold">
                    Exam is Locked Globally
                  </span>
                )}
                <span className="text-sm text-gray-500 italic">
                  (Control exams globally from the Dashboard)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Upload & Assignment Tasks */}
        <div className="space-y-6">
          {/* Round 1 Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Round 1: Aptitude & Reasoning</h2>
            <form onSubmit={(e) => handleUpload(e, 1)} className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFileR1(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <button
                type="submit"
                disabled={uploadingR1 || !fileR1}
                className={`w-full py-2 px-4 rounded-md font-medium text-white ${
                  uploadingR1 || !fileR1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {uploadingR1 ? 'Processing & Extracting...' : 'Upload Round 1 PDF'}
              </button>
            </form>
          </div>

          {/* Round 2 Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Round 2: Technical Questions</h2>
            <form onSubmit={(e) => handleUpload(e, 2)} className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFileR2(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <button
                type="submit"
                disabled={uploadingR2 || !fileR2}
                className={`w-full py-2 px-4 rounded-md font-medium text-white ${
                  uploadingR2 || !fileR2 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {uploadingR2 ? 'Processing & Extracting...' : 'Upload Round 2 PDF'}
              </button>
            </form>
          </div>

          {/* Round 3 Card */}
          <CodingChallengeManager candidateId={candidate._id} onStatusChange={(isReady) => setIsCodingReady(isReady)} />
        </div>
      </div>
    </div>
  );
};

export default CandidateProfile;
