import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import api from '../services/api';

const defaultChallenges = [
  { challengeType: 'ImageToCode', title: 'Recreate the Design', marks: 30, timeLimit: 30, description: 'Recreate the uploaded design as accurately as possible using HTML and CSS. Match layout, spacing, typography, and colors.', referenceImage: '', referenceHtml: '', referenceCss: '' },
  { challengeType: 'DesignFromRequirements', title: 'Design a Responsive Component', marks: 30, timeLimit: 30, description: 'Design a responsive navigation bar.\nRequirements:\n- Company logo on the left.\n- Menu items: Home, About, Services, Contact.\n- Login button on the right.\n- Mobile responsive.\n- Add hover effects.', referenceImage: '', referenceHtml: '', referenceCss: '' },
  { challengeType: 'UIUXRedesign', title: 'UI/UX Review & Redesign Challenge', marks: 40, timeLimit: 45, description: 'Review the uploaded webpage design. Identify the UI/UX problems. Then redesign the page using HTML and CSS.', referenceImage: '', referenceHtml: '', referenceCss: '' }
];

const CodingChallengeManager = ({ candidateId, onStatusChange }) => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingIndex, setSavingIndex] = useState(null);
  const [activeRefTabs, setActiveRefTabs] = useState({});

  const handleRefTabChange = (index, tab) => {
    setActiveRefTabs(prev => ({ ...prev, [index]: tab }));
  };

  const [previewOutputs, setPreviewOutputs] = useState({});
  const [fullscreenRefIndex, setFullscreenRefIndex] = useState(null);
  const isInitialLoad = useRef(true);

  const handleRunRefPreview = (index) => {
    const challenge = challenges[index];
    const srcDoc = getRefPreviewDoc(challenge.referenceHtml, challenge.referenceCss);
    setPreviewOutputs(prev => ({ ...prev, [index]: srcDoc }));
    toast.success('Preview updated!');
  };

  const getRefPreviewDoc = (html, css) => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 15px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          ${css || ''}
        </style>
      </head>
      <body>
        ${html || ''}
      </body>
      </html>
    `;
  };

  const fetchChallenges = async () => {
    try {
      const res = await api.get(`/admin/candidates/${candidateId}/challenges`);
      
      // Merge fetched challenges with defaults based on challengeType
      const merged = defaultChallenges.map(def => {
        const existing = res.data.find(c => c.challengeType === def.challengeType);
        return existing || { ...def, isNew: true, candidateId };
      });
      setChallenges(merged);
      // Wait for state to settle, then disable isInitialLoad flag
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 300);
    } catch (err) {
      toast.error('Failed to fetch coding challenges');
      setChallenges(defaultChallenges.map(def => ({ ...def, isNew: true, candidateId })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    isInitialLoad.current = true;
    fetchChallenges();
  }, [candidateId]);

  // Auto-save debounced logic for existing challenges
  useEffect(() => {
    if (challenges.length === 0 || isInitialLoad.current) return;

    // Create a list of timeouts for each modified challenge
    const timers = challenges.map((challenge, index) => {
      if (challenge.isNew) return null; // Don't auto-save unsaved/new challenges

      const timer = setTimeout(() => {
        if (challenge.title) {
          api.put(`/admin/challenges/${challenge._id}`, challenge)
            .catch(err => console.error("Auto-save failed", err));
        }
      }, 1500); // 1.5 seconds debounce

      return timer;
    });

    return () => timers.forEach(t => t && clearTimeout(t));
  }, [challenges]);

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

            {/* Live Code Reference Editors */}
            <div className="mb-4 bg-white p-4 border rounded">
              <label className="block text-sm font-medium text-gray-700 mb-1 font-semibold">Live Design Reference (HTML/CSS) - Optional</label>
              <p className="text-xs text-gray-400 mb-3">Provide a live reference output design. If provided, the candidate can view a live interactive rendering of this code.</p>
              
              <div className="flex justify-between items-center border-b border-gray-200 mb-3">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => handleRefTabChange(i, 'html')}
                    className={`px-4 py-2 text-xs font-bold transition-colors ${
                      (activeRefTabs[i] || 'html') === 'html' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    HTML Code
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRefTabChange(i, 'css')}
                    className={`px-4 py-2 text-xs font-bold transition-colors ${
                      (activeRefTabs[i] || 'html') === 'css' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    CSS Code
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRefTabChange(i, 'preview')}
                    className={`px-4 py-2 text-xs font-bold transition-colors ${
                      (activeRefTabs[i] || 'html') === 'preview' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Live Preview
                  </button>
                </div>
                {(activeRefTabs[i] || 'html') === 'preview' && (
                  <div className="flex items-center space-x-2 mr-1 mb-1">
                    {previewOutputs[i] && (
                      <button
                        type="button"
                        onClick={() => setFullscreenRefIndex(i)}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-bold shadow-sm transition-colors"
                      >
                        🔍 Fullscreen
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRunRefPreview(i)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold shadow-sm transition-colors"
                    >
                      Run / Update Preview
                    </button>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded overflow-hidden bg-gray-50" style={{ height: '400px' }}>
                <div style={{ display: (activeRefTabs[i] || 'html') === 'html' ? 'block' : 'none', height: '100%' }}>
                  <Editor
                    height="100%"
                    theme="vs-light"
                    language="html"
                    value={c.referenceHtml || ''}
                    onChange={val => {
                      if (val !== undefined) handleChange(i, 'referenceHtml', val);
                    }}
                    options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                  />
                </div>
                <div style={{ display: (activeRefTabs[i] || 'html') === 'css' ? 'block' : 'none', height: '100%' }}>
                  <Editor
                    height="100%"
                    theme="vs-light"
                    language="css"
                    value={c.referenceCss || ''}
                    onChange={val => {
                      if (val !== undefined) handleChange(i, 'referenceCss', val);
                    }}
                    options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                  />
                </div>
                {(activeRefTabs[i] || 'html') === 'preview' && (
                  previewOutputs[i] ? (
                    <iframe
                      key={previewOutputs[i]}
                      srcDoc={previewOutputs[i]}
                      title={`Reference Live Preview ${i}`}
                      sandbox="allow-scripts"
                      className="w-full h-full border-none bg-white"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 p-4">
                      <svg className="w-10 h-10 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <p className="text-xs">Click "Run / Update Preview" to render the reference design</p>
                    </div>
                  )
                )}
              </div>
            </div>
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

      {fullscreenRefIndex !== null && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-95 flex flex-col p-4">
          <div className="flex justify-between items-center mb-3 px-2">
            <h3 className="text-white font-bold">Fullscreen Reference Preview</h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setFullscreenRefIndex(null);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-sm transition-colors shadow-lg"
            >
              Close
            </button>
          </div>
          <div className="flex-1 bg-white rounded-lg overflow-hidden shadow-2xl">
            <iframe
              srcDoc={fullscreenRefIndex !== null ? getRefPreviewDoc(challenges[fullscreenRefIndex]?.referenceHtml, challenges[fullscreenRefIndex]?.referenceCss) : ''}
              title="Fullscreen Reference Preview"
              sandbox="allow-scripts"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CodingChallengeManager;
