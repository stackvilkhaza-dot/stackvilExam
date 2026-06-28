import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const defaultChallenges = [
  { challengeType: 'ImageToCode', title: 'Recreate the Design', marks: 30, timeLimit: 30, description: 'Recreate the uploaded design as accurately as possible using HTML and CSS. Match layout, spacing, typography, and colors.', referenceImage: '' },
  { challengeType: 'DesignFromRequirements', title: 'Design a Responsive Component', marks: 30, timeLimit: 30, description: 'Design a responsive navigation bar.\nRequirements:\n- Company logo on the left.\n- Menu items: Home, About, Services, Contact.\n- Login button on the right.\n- Mobile responsive.\n- Add hover effects.', referenceImage: '' },
  { challengeType: 'UIUXRedesign', title: 'UI/UX Review & Redesign Challenge', marks: 40, timeLimit: 45, description: 'Review the uploaded webpage design. Identify the UI/UX problems. Then redesign the page using HTML and CSS.', referenceImage: '' }
];

const CodingChallengeManager = ({ candidateId, onStatusChange }) => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingIndex, setSavingIndex] = useState(null);

  const fetchChallenges = async () => {
    try {
      const res = await api.get(`/admin/candidates/${candidateId}/challenges`);
      
      // Merge fetched challenges with defaults based on challengeType
      const merged = defaultChallenges.map(def => {
        const existing = res.data.find(c => c.challengeType === def.challengeType);
        return existing || { ...def, isNew: true, candidateId };
      });
      setChallenges(merged);
    } catch (err) {
      toast.error('Failed to fetch coding challenges');
      setChallenges(defaultChallenges.map(def => ({ ...def, isNew: true, candidateId })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [candidateId]);

  useEffect(() => {
    if (onStatusChange && challenges.length > 0) {
      const allSaved = challenges.every(c => !c.isNew);
      onStatusChange(allSaved);
    }
  }, [challenges, onStatusChange]);

  const handleChange = (index, field, value) => {
    const updated = [...challenges];
    updated[index] = { ...updated[index], [field]: value };
    setChallenges(updated);
  };

  const handleImageUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.post('/admin/upload-image', formData);
      handleChange(index, 'referenceImage', res.data.url);
      toast.success('Image uploaded');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to upload image');
    }
  };

  const handleSave = async (index) => {
    const challenge = challenges[index];
    if (!challenge.title) {
      toast.error('Title is required');
      return;
    }
    
    setSavingIndex(index);
    try {
      if (challenge.isNew) {
        const res = await api.post('/admin/challenges', { ...challenge, order: index });
        toast.success(`${challenge.challengeType} created!`);
        const updated = [...challenges];
        updated[index] = res.data;
        setChallenges(updated);
      } else {
        const res = await api.put(`/admin/challenges/${challenge._id}`, challenge);
        toast.success(`${challenge.challengeType} updated!`);
        const updated = [...challenges];
        updated[index] = res.data;
        setChallenges(updated);
      }
    } catch (error) {
      toast.error('Failed to save challenge');
    } finally {
      setSavingIndex(null);
    }
  };

  if (loading) return <div>Loading Web Design Round setup...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800">Round 3: Web Designer Coding Round</h2>
        <p className="text-gray-500 text-sm mt-1">Manage the 3 fixed HTML/CSS tasks for this candidate.</p>
      </div>

      <div className="space-y-8">
        {challenges.map((c, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-5 bg-gray-50 shadow-sm relative">
            <div className="absolute top-4 right-4 flex space-x-2">
              <button 
                onClick={() => handleSave(i)} 
                disabled={savingIndex === i}
                className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 font-medium disabled:opacity-50"
              >
                {savingIndex === i ? 'Saving...' : (c.isNew ? 'Create Challenge' : 'Update Challenge')}
              </button>
            </div>
            
            <h3 className="font-bold text-lg mb-1 text-blue-700">
              Challenge {i + 1}: {
                c.challengeType === 'ImageToCode' ? 'Image to Code' : 
                c.challengeType === 'DesignFromRequirements' ? 'Design from Requirements' : 
                'UI/UX Review & Redesign'
              }
            </h3>
            <p className="text-xs text-gray-500 mb-4 uppercase tracking-wider">
              Status: {c.isNew ? <span className="text-red-500 font-bold">Unsaved</span> : <span className="text-green-600 font-bold">Saved</span>}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700">Question Title</label>
                <input type="text" className="w-full border p-2 rounded" value={c.title} onChange={e => handleChange(i, 'title', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Marks</label>
                <input type="number" className="w-full border p-2 rounded" value={c.marks} onChange={e => handleChange(i, 'marks', e.target.value)} />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Question Description / Requirements</label>
              <textarea className="w-full border p-2 rounded" rows={c.challengeType === 'DesignFromRequirements' ? 6 : 2} value={c.description} onChange={e => handleChange(i, 'description', e.target.value)} />
            </div>

            {(c.challengeType === 'ImageToCode' || c.challengeType === 'UIUXRedesign') && (
              <div className="mb-4 bg-white p-4 border rounded">
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Reference Image / Design</label>
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, i)} className="w-full border p-2 rounded mb-2" />
                {c.referenceImage ? (
                  <div className="mt-2">
                    <p className="text-xs text-green-600 mb-1">Image Uploaded Successfully</p>
                    <img src={`${import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:5000'}${c.referenceImage}`} alt="Reference" className="max-h-40 object-contain border rounded shadow-sm" />
                  </div>
                ) : (
                  <p className="text-sm text-red-500 italic">No image uploaded yet. Candidate will not see a reference image.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 border-t pt-4 text-center">
        <button 
          className="py-3 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow-md" 
          onClick={() => toast.success('All challenges assigned! (Ensure you saved each card)')}
        >
          Assign Web Design Round
        </button>
      </div>
    </div>
  );
};

export default CodingChallengeManager;
