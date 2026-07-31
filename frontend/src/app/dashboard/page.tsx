'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, Search, MapPin, Briefcase, Filter, ChevronDown,
  CheckCircle2, XCircle, FileText, Loader2, Download, Zap,
  Star, X, RefreshCw
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Dashboard() {
  const router = useRouter();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const [parsedEducation, setParsedEducation] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);

  // Jobs state
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [tailoringId, setTailoringId] = useState<number | null>(null);
  const [tailorMode, setTailorMode] = useState<'creative' | 'conservative'>('creative');

  // Filters
  const [search, setSearch] = useState('');
  const [workType, setWorkType] = useState('All');
  const [experienceLevel, setExperienceLevel] = useState('All');
  const [companyTier, setCompanyTier] = useState('standard');
  const [postedDate, setPostedDate] = useState('Anytime');
  const [sortBy, setSortBy] = useState('match');

  // Extension detection
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [showExtModal, setShowExtModal] = useState(false);

  // On mount — restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('makdi_session');
    if (saved) {
      const { sessionId, parsedSkills, parsedEducation, resumeFileName } = JSON.parse(saved);
      setSessionId(sessionId);
      setParsedSkills(parsedSkills || []);
      setParsedEducation(parsedEducation || '');
      setResumeFileName(resumeFileName || '');
    }

    // Extension ping
    const timeout = setTimeout(() => {}, 500);
    window.postMessage({ type: 'MAKDI_EXTENSION_PING' }, '*');
    const handler = (e: any) => {
      if (e.data?.type === 'MAKDI_EXTENSION_PONG') {
        clearTimeout(timeout);
        setExtensionInstalled(true);
        window.removeEventListener('message', handler);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Fetch jobs whenever sessionId or filters change
  const fetchJobs = useCallback(async () => {
    if (!sessionId) return;
    setJobsLoading(true);
    try {
      const params = new URLSearchParams({ search, workType, experienceLevel, companyTier, postedDate, sortBy });
      const res = await fetch(`${API}/api/jobs?${params}`, {
        headers: { 'x-session-id': sessionId }
      });
      const data = await res.json();
      // Stale session (backend restarted) — clear and re-upload
      if (res.status === 404 || res.status === 400) {
        localStorage.removeItem('makdi_session');
        setSessionId(null);
        return;
      }
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setJobsLoading(false);
    }
  }, [sessionId, search, workType, experienceLevel, companyTier, postedDate, sortBy]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Upload resume
  const handleUpload = async (file: File) => {
    setUploadError('');
    setUploading(true);
    const form = new FormData();
    form.append('resume', file);
    try {
      const res = await fetch(`${API}/api/session/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const session = {
        sessionId: data.sessionId,
        parsedSkills: data.parsed_skills,
        parsedEducation: data.parsed_education,
        resumeFileName: file.name
      };
      localStorage.setItem('makdi_session', JSON.stringify(session));
      setSessionId(data.sessionId);
      setParsedSkills(data.parsed_skills || []);
      setParsedEducation(data.parsed_education || '');
      setResumeFileName(file.name);
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleTailor = async (jobId: number) => {
    setTailoringId(jobId);
    try {
      const res = await fetch(`${API}/api/tailor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId! },
        body: JSON.stringify({ jobId, mode: tailorMode })
      });
      const data = await res.json();
      if (res.ok) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, tailored_pdf_url: data.pdfUrl, tailored: true, ats_after: data.ats_score_after } : j));
      } else {
        alert('Tailoring failed: ' + data.error);
      }
    } catch (e) {
      alert('Error tailoring resume');
    } finally {
      setTailoringId(null);
    }
  };

  const handleApply = (job: any) => {
    if (!extensionInstalled) {
      sessionStorage.setItem('pending_apply_url', job.apply_url);
      setShowExtModal(true);
    } else {
      window.postMessage({ type: 'MAKDI_SET_CONTEXT', payload: { jobId: job.id, jobTitle: job.title, tailoredPdfUrl: job.tailored_pdf_url } }, '*');
      window.open(job.apply_url, '_blank');
    }
  };

  const clearSession = () => {
    localStorage.removeItem('makdi_session');
    setSessionId(null);
    setJobs([]);
    setParsedSkills([]);
    setResumeFileName('');
  };

  // ─── UPLOAD SCREEN ───────────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-makdi-bg-light flex flex-col">
        <header className="bg-white border-b px-8 py-4 flex items-center justify-between">
          <span className="text-2xl font-black text-makdi-primary">🕸️ MAKDI</span>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-gray-900 mb-3">
                Drop your resume. <br />
                <span className="text-makdi-primary">We'll find your jobs.</span>
              </h1>
              <p className="text-gray-500">No sign-up. No forms. Just upload and go.</p>
            </div>

            {/* Drop Zone */}
            <label
              htmlFor="resume-upload"
              className={`block border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                dragging
                  ? 'border-makdi-primary bg-green-50 scale-[1.02]'
                  : 'border-gray-300 hover:border-makdi-primary hover:bg-green-50/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 text-makdi-primary animate-spin" />
                  <p className="text-makdi-primary font-semibold text-lg">Parsing your resume...</p>
                  <p className="text-gray-400 text-sm">Extracting skills, experience & education</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                    <Upload className="w-8 h-8 text-makdi-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-800">Drag & drop your resume</p>
                    <p className="text-gray-500 mt-1">or click to browse</p>
                  </div>
                  <p className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">PDF or DOCX · Max 10MB</p>
                </div>
              )}
              <input
                id="resume-upload"
                type="file"
                className="hidden"
                accept=".pdf,.docx"
                onChange={handleFileInput}
                disabled={uploading}
              />
            </label>

            {uploadError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <XCircle size={16} /> {uploadError}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ─── JOB FEED SCREEN ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-makdi-bg-light">
      {/* Extension Modal */}
      {showExtModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl relative">
            <button onClick={() => setShowExtModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X /></button>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🕸️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Install MAKDI Autofill</h2>
            <p className="text-gray-500 mb-6">Auto-fill any job application with your resume data in one click.</p>
            <div className="flex flex-col gap-3">
              <a href="/extension.zip" download className="w-full bg-makdi-primary text-white py-3 rounded-xl font-bold hover:bg-makdi-primary-hover">
                Download Extension
              </a>
              <button onClick={() => { setShowExtModal(false); window.open(sessionStorage.getItem('pending_apply_url') || '', '_blank'); }} className="w-full text-gray-500 hover:bg-gray-100 py-3 rounded-xl">
                Continue without extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <span className="text-2xl font-black text-makdi-primary">🕸️ MAKDI</span>
        <div className="flex items-center gap-3">
          {/* Resume chip */}
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <FileText size={14} />
            <span className="max-w-[140px] truncate">{resumeFileName}</span>
            <button onClick={clearSession} className="ml-1 text-green-500 hover:text-red-500 transition-colors" title="Upload new resume">
              <RefreshCw size={14} />
            </button>
          </div>
          {parsedSkills.length > 0 && (
            <span className="text-xs text-gray-500 hidden md:block">{parsedSkills.length} skills detected</span>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8 flex-col md:flex-row">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm sticky top-24">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Filter size={16}/> Filters</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Search</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input type="text" placeholder="Role or company" className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-makdi-primary/20 focus:border-makdi-primary" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>

              {[
                { label: 'Company Quality', key: 'companyTier', value: companyTier, set: setCompanyTier, options: [['verified', 'Verified only'], ['standard', 'Verified + Standard'], ['all', 'All listings']] },
                { label: 'Work Type', key: 'workType', value: workType, set: setWorkType, options: [['All', 'All'], ['Remote', 'Remote'], ['Hybrid', 'Hybrid'], ['Onsite', 'Onsite']] },
                { label: 'Experience Level', key: 'experienceLevel', value: experienceLevel, set: setExperienceLevel, options: [['All', 'All levels'], ['Entry-level', 'Entry (0-2y)'], ['Mid-level', 'Mid (2-5y)'], ['Senior', 'Senior (5-10y)'], ['Lead', 'Lead (10y+)']] },
                { label: 'Date Posted', key: 'postedDate', value: postedDate, set: setPostedDate, options: [['Anytime', 'Anytime'], ['Last 24h', 'Last 24h'], ['Last week', 'Last week'], ['Last month', 'Last month']] }
              ].map(({ label, key, value, set, options }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{label}</label>
                  <select className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-makdi-primary/20 focus:border-makdi-primary bg-white" value={value} onChange={e => set(e.target.value)}>
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Job Feed */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-800">
              {jobsLoading ? 'Loading...' : `${jobs.length} Job Matches`}
            </h2>
            <div className="flex items-center gap-3">
              {/* Mode toggle */}
              <div className="flex items-center bg-white border rounded-lg p-1 text-sm shadow-sm">
                {(['conservative', 'creative'] as const).map(m => (
                  <button key={m} onClick={() => setTailorMode(m)}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors capitalize ${tailorMode === m ? 'bg-makdi-bg-light text-makdi-primary shadow-sm' : 'text-gray-500'}`}>
                    {m === 'creative' ? '✨ Creative' : 'Safe'}
                  </button>
                ))}
              </div>
              {/* Sort */}
              <select className="bg-white border rounded-lg px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-makdi-primary/20" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="match">Best Match</option>
                <option value="newest">Newest</option>
                <option value="salary">Highest Salary</option>
              </select>
            </div>
          </div>

          {/* Cards */}
          {jobsLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-makdi-primary w-10 h-10" /></div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
              <p className="text-gray-500 text-lg">No jobs match your current filters.</p>
              <button onClick={() => { setWorkType('All'); setExperienceLevel('All'); setPostedDate('Anytime'); setSearch(''); }} className="mt-4 text-makdi-primary underline text-sm">Reset filters</button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job: any) => (
                <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow relative">
                  {/* Badges */}
                  <div className="absolute top-5 right-5 flex flex-col items-end gap-2">
                    {job.score > 0 && (
                      <span className="bg-green-50 text-makdi-primary border border-green-200 px-3 py-1 rounded-full text-sm font-bold">
                        ✨ {job.score}% Match
                      </span>
                    )}
                    {job.is_new && (
                      <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Zap size={10} /> NEW
                      </span>
                    )}
                  </div>

                  <div className="flex gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://logo.clearbit.com/${job.company?.toLowerCase().replace(/\s+/g, '')}.com`}
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                      className="w-12 h-12 rounded-xl border object-contain bg-gray-50 flex-shrink-0"
                      alt=""
                    />
                    <div className="flex-1 min-w-0 pr-28">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                        {job.company_tier === 'verified' && <Star size={14} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />}
                      </div>
                      <p className="text-makdi-primary font-semibold text-sm mt-0.5">{job.company}</p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                        <span className="flex items-center gap-1"><MapPin size={13} /> {job.location || 'Anywhere'}</span>
                        <span className="flex items-center gap-1"><Briefcase size={13} /> {job.remote_type || 'Unknown'}</span>
                        {job.salary_range && <span className="font-semibold text-green-700">{job.salary_range}</span>}
                        <span>{new Date(job.posted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>

                      {/* Action Row */}
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                        {!job.tailored ? (
                          <button
                            onClick={() => handleTailor(job.id)}
                            disabled={tailoringId === job.id}
                            className="flex-1 bg-makdi-primary text-white py-2.5 rounded-lg font-bold hover:bg-makdi-primary-hover flex items-center justify-center gap-2 disabled:opacity-60 transition-colors text-sm"
                          >
                            {tailoringId === job.id
                              ? <><Loader2 size={15} className="animate-spin" /> Tailoring...</>
                              : <><FileText size={15} /> Tailor Resume</>}
                          </button>
                        ) : (
                          <div className="flex-1 flex gap-2">
                            <button disabled className="flex-1 bg-green-50 text-makdi-primary border border-green-200 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 text-sm">
                              <CheckCircle2 size={15} /> Tailored {job.ats_after ? `(ATS ${job.ats_after}%)` : ''}
                            </button>
                            <a
                              href={`${API}${job.tailored_pdf_url}`}
                              download
                              className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 flex items-center justify-center border"
                              title="Download PDF"
                            >
                              <Download size={16} />
                            </a>
                          </div>
                        )}
                        <button
                          onClick={() => handleApply(job)}
                          className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-lg font-medium hover:bg-gray-200 flex items-center justify-center border text-sm transition-colors"
                        >
                          {extensionInstalled ? '⚡ Autofill & Apply' : 'Apply →'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
