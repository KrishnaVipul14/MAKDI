'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Data State
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  
  // Preferences State
  const [preferredRoles, setPreferredRoles] = useState('');
  const [remotePreference, setRemotePreference] = useState('Remote');
  const [salaryMin, setSalaryMin] = useState('');
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('makdi_token') : null;

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setResumeFile(e.target.files[0]);
  };

  const parseResume = async () => {
    if (!resumeFile) return setError('Please select a resume file first');
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('resume', resumeFile);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/resume/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setParsedData(data.parsedData);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        phone,
        location,
        education_level: parsedData?.parsed_education || 'Unknown',
        years_experience: parsedData?.parsed_experience_years || 0,
        preferred_roles: preferredRoles.split(',').map(r => r.trim()),
        preferred_locations: [],
        remote_preference: remotePreference,
        salary_min: parseInt(salaryMin) || 0,
        skills: parsedData?.parsed_skills || []
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/profile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save profile');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-makdi-bg-light flex flex-col items-center py-12 px-4">
      <div className="max-w-2xl w-full bg-makdi-white rounded-xl shadow-lg border border-makdi-border p-8">
        
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`flex-1 h-2 mx-1 rounded-full ${s <= step ? 'bg-makdi-primary' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6">{error}</div>}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Basic Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="text" className="w-full border rounded p-2" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input type="text" className="w-full border rounded p-2" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-makdi-primary text-white py-2 rounded">Next</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Upload Resume</h2>
            <div className="border-2 border-dashed border-gray-300 p-8 text-center rounded-lg">
              <input type="file" accept=".pdf,.docx" onChange={handleResumeUpload} className="mb-4" />
              <p className="text-sm text-gray-500">Only PDF or DOCX files supported</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded">Back</button>
              <button onClick={parseResume} disabled={loading || !resumeFile} className="flex-1 bg-makdi-primary text-white py-2 rounded">
                {loading ? 'Parsing AI...' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Verify Parsed Data</h2>
            <div className="bg-gray-50 p-4 rounded-lg border text-sm space-y-4">
              <div>
                <strong>Experience:</strong> {parsedData?.parsed_experience_years} years
              </div>
              <div>
                <strong>Education:</strong> {parsedData?.parsed_education}
              </div>
              <div>
                <strong>Skills Found:</strong>
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedData?.parsed_skills?.map((skill: string) => (
                    <span key={skill} className="bg-makdi-bg-light text-makdi-primary px-2 py-1 rounded border border-makdi-primary/30">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded">Back</button>
              <button onClick={() => setStep(4)} className="flex-1 bg-makdi-primary text-white py-2 rounded">Looks Good, Next</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Job Preferences</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Roles (comma separated)</label>
              <input type="text" placeholder="Frontend Developer, React Developer" className="w-full border rounded p-2" value={preferredRoles} onChange={e => setPreferredRoles(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remote Preference</label>
              <select className="w-full border rounded p-2" value={remotePreference} onChange={e => setRemotePreference(e.target.value)}>
                <option>Remote</option>
                <option>Hybrid</option>
                <option>Onsite</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Salary Expectation (in Dollars $)</label>
              <input type="number" placeholder="80000" className="w-full border rounded p-2" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} />
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => setStep(3)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded">Back</button>
              <button onClick={saveProfile} disabled={loading} className="flex-1 bg-makdi-primary text-white py-2 rounded">
                {loading ? 'Saving...' : 'Finish Onboarding'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
