'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Briefcase, Filter, ChevronDown, CheckCircle2, XCircle, FileText, Loader2, Download, Zap, Star } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tailoringId, setTailoringId] = useState<number | null>(null);
  
  // Extension State
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  
  // Mode State
  const [tailorMode, setTailorMode] = useState<'creative' | 'conservative'>('creative');
  
  // Advanced Filters
  const [searchFilter, setSearchFilter] = useState('');
  const [remoteFilter, setRemoteFilter] = useState('All');
  const [experienceFilter, setExperienceFilter] = useState('All');
  const [educationFilter, setEducationFilter] = useState('Any');
  const [companyTierFilter, setCompanyTierFilter] = useState('standard');
  const [postedDateFilter, setPostedDateFilter] = useState('Anytime');
  const [sortBy, setSortBy] = useState('match'); // match, newest, salary

  // Detect Extension
  useEffect(() => {
    const checkExtensionInstalled = () => {
      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 500);
        window.postMessage({ type: "MAKDI_EXTENSION_PING" }, "*");
        const handler = (event: any) => {
          if (event.data?.type === "MAKDI_EXTENSION_PONG") {
            clearTimeout(timeout);
            window.removeEventListener("message", handler);
            resolve(true);
          }
        };
        window.addEventListener("message", handler);
      });
    };
    
    checkExtensionInstalled().then(installed => {
      setExtensionInstalled(installed);
    });
  }, []);

  // Fetch Jobs
  useEffect(() => {
    const fetchJobs = async () => {
      const token = localStorage.getItem('makdi_token');
      if (!token) {
        router.push('/login');
        return;
      }
      setLoading(true);
      
      const query = new URLSearchParams({
        workType: remoteFilter,
        experienceLevel: experienceFilter,
        educationRequired: educationFilter,
        companyTier: companyTierFilter,
        postedDate: postedDateFilter,
        sortBy
      }).toString();

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/jobs?${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        // Quick frontend filter for Search input
        let final = data;
        if (searchFilter) {
          final = data.filter((j: any) => 
            j.title?.toLowerCase().includes(searchFilter.toLowerCase()) || 
            j.company?.toLowerCase().includes(searchFilter.toLowerCase())
          );
        }
        setJobs(final);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobs();
  }, [router, searchFilter, remoteFilter, experienceFilter, educationFilter, companyTierFilter, postedDateFilter, sortBy]);

  const handleTailorResume = async (jobId: number) => {
    setTailoringId(jobId);
    try {
      const token = localStorage.getItem('makdi_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/tailor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ jobId, mode: tailorMode })
      });
      const data = await res.json();
      if (res.ok) {
        setJobs(jobs.map(j => j.id === jobId ? { ...j, tailored_pdf_url: data.pdfUrl, tailored: true } : j));
      } else {
        alert('Failed to tailor resume: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error tailoring resume.');
    } finally {
      setTailoringId(null);
    }
  };

  const handleApplyClick = (job: any) => {
    if (!extensionInstalled) {
      setShowExtensionModal(true);
      // Give them a chance to proceed without it from the modal
      window.sessionStorage.setItem('pending_apply_url', job.apply_url);
    } else {
      // Send message via postMessage to background/content script for storage sync
      window.postMessage({ 
        type: "MAKDI_SET_CONTEXT", 
        payload: { 
          jobId: job.id, 
          jobTitle: job.title,
          tailoredPdfUrl: job.tailored_pdf_url 
        } 
      }, "*");
      
      window.open(job.apply_url, '_blank');
    }
  };

  const proceedWithoutExtension = () => {
    const url = window.sessionStorage.getItem('pending_apply_url');
    setShowExtensionModal(false);
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-makdi-bg-light">
      {/* Extension Modal */}
      {showExtensionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl relative">
            <button onClick={() => setShowExtensionModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">&times;</button>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🕸️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Install MAKDI Autofill</h2>
            <p className="text-gray-600 mb-8">
              Never type your name into Workday again. Install our free Chrome Extension to auto-apply using your tailored AI resumes in one click!
            </p>
            <div className="flex flex-col gap-3">
              <a href="/extension.zip" download className="w-full bg-makdi-primary text-white px-4 py-3 rounded-xl font-bold hover:bg-makdi-primary-hover transition-colors shadow-lg shadow-green-200">
                Download Extension
              </a>
              <button onClick={proceedWithoutExtension} className="w-full px-4 py-3 text-gray-500 font-medium hover:bg-gray-100 rounded-xl transition-colors">
                Continue without extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-makdi-white border-b border-makdi-border px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-makdi-primary">🕸️ MAKDI</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => router.push('/tracker')} className="text-gray-600 hover:text-makdi-primary font-medium">Application Tracker</button>
          <button className="bg-makdi-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-makdi-primary-hover">Profile</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8 flex-col md:flex-row">
        
        {/* Filters Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-6">
          <div className="bg-makdi-white p-5 rounded-xl border border-makdi-border shadow-sm sticky top-24">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Filter size={18}/> Filters</h3>
            
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Role or Company"
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-makdi-primary outline-none"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Company Tier</label>
                <select 
                  className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-makdi-primary outline-none bg-white"
                  value={companyTierFilter}
                  onChange={(e) => setCompanyTierFilter(e.target.value)}
                >
                  <option value="verified">Verified Only (Top)</option>
                  <option value="standard">Verified + Standard (Default)</option>
                  <option value="all">All (Include Unverified)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Workplace Type</label>
                <select 
                  className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-makdi-primary outline-none bg-white"
                  value={remoteFilter}
                  onChange={(e) => setRemoteFilter(e.target.value)}
                >
                  <option>All</option>
                  <option>Remote</option>
                  <option>Onsite</option>
                  <option>Hybrid</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Experience Level</label>
                <select 
                  className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-makdi-primary outline-none bg-white"
                  value={experienceFilter}
                  onChange={(e) => setExperienceFilter(e.target.value)}
                >
                  <option>All</option>
                  <option>Entry-level</option>
                  <option>Mid-level</option>
                  <option>Senior</option>
                  <option>Lead</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Education Required</label>
                <select 
                  className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-makdi-primary outline-none bg-white"
                  value={educationFilter}
                  onChange={(e) => setEducationFilter(e.target.value)}
                >
                  <option>Any</option>
                  <option>Undergrad</option>
                  <option>Masters</option>
                  <option>PhD</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date Posted</label>
                <select 
                  className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-makdi-primary outline-none bg-white"
                  value={postedDateFilter}
                  onChange={(e) => setPostedDateFilter(e.target.value)}
                >
                  <option>Anytime</option>
                  <option>Last 24h</option>
                  <option>Last week</option>
                  <option>Last month</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Job Feed */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Your Job Matches ({jobs.length})</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white border rounded-lg p-1 text-sm shadow-sm">
                <button 
                  onClick={() => setTailorMode('conservative')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${tailorMode === 'conservative' ? 'bg-makdi-bg-light text-makdi-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Safe (Fast)
                </button>
                <button 
                  onClick={() => setTailorMode('creative')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 ${tailorMode === 'creative' ? 'bg-makdi-bg-light text-makdi-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Creative ✨
                </button>
              </div>
              
              <div className="flex items-center bg-white border rounded-lg p-1 text-sm shadow-sm">
                <select 
                  className="bg-transparent outline-none pl-2 pr-1 py-1 text-gray-700 cursor-pointer"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="match">Sort by: Best Match</option>
                  <option value="newest">Sort by: Newest</option>
                  <option value="salary">Sort by: Salary</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-makdi-primary w-12 h-12"/></div>
          ) : jobs.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
              <p className="text-gray-500">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            jobs.map((job: any) => (
              <div key={job.id} className="bg-makdi-white rounded-xl border border-makdi-border p-6 shadow-sm hover:shadow-md transition-shadow relative">
                
                {/* Badges */}
                <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                  {job.score != null && (
                    <div className="bg-makdi-bg-light text-makdi-primary border border-makdi-primary/30 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-sm">
                      ✨ {job.score}% Match
                    </div>
                  )}
                  {job.is_new && (
                    <div className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Zap size={12}/> NEW
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://logo.clearbit.com/${job.company?.toLowerCase().replace(/\s+/g, '')}.com`} onError={(e) => (e.currentTarget.style.display = 'none')} className="w-12 h-12 rounded-lg border object-contain bg-white" alt="logo"/>
                  
                  <div className="flex-1 pr-28">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                      {job.company_tier === 'verified' && <Star size={14} className="fill-yellow-400 text-yellow-400" title="Verified Company"/>}
                    </div>
                    <div className="text-makdi-primary font-medium text-sm mb-2 flex items-center gap-1">
                      {job.company} 
                    </div>
                    
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                      <span className="flex items-center gap-1"><MapPin size={14}/> {job.location || 'Anywhere'}</span>
                      <span className="flex items-center gap-1"><Briefcase size={14}/> {job.remote_type}</span>
                      {job.salary_range && <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">${job.salary_range}</span>}
                      <span className="text-gray-400">•</span>
                      <span>{new Date(job.posted_date).toLocaleDateString()}</span>
                    </div>

                    {job.missing_skills && JSON.parse(job.missing_skills).length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><XCircle size={12} className="text-red-400"/> Missing skills:</div>
                        <div className="flex flex-wrap gap-1">
                          {JSON.parse(job.missing_skills).slice(0, 5).map((s: string) => (
                            <span key={s} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border">{s}</span>
                          ))}
                          {JSON.parse(job.missing_skills).length > 5 && <span className="text-[11px] text-gray-400">+{JSON.parse(job.missing_skills).length - 5} more</span>}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-5 border-t pt-4">
                      {!job.tailored ? (
                        <button 
                          onClick={() => handleTailorResume(job.id)}
                          disabled={tailoringId === job.id}
                          className="flex-1 bg-makdi-primary text-white py-2.5 rounded-lg font-bold hover:bg-makdi-primary-hover flex items-center justify-center gap-2 disabled:opacity-70 transition-colors shadow-sm"
                        >
                          {tailoringId === job.id ? (
                            <><Loader2 size={16} className="animate-spin" /> Tailoring AI Resume...</>
                          ) : (
                            <><FileText size={18}/> Tailor Resume</>
                          )}
                        </button>
                      ) : (
                        <div className="flex-1 flex gap-2">
                          <button disabled className="flex-1 bg-green-50 text-makdi-primary border border-makdi-primary/30 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2">
                            <CheckCircle2 size={18}/> Tailored
                          </button>
                          <a 
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${job.tailored_pdf_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-200 flex items-center justify-center border"
                            title="View PDF"
                          >
                            <Download size={18} />
                          </a>
                        </div>
                      )}
                      
                      <button 
                        onClick={() => handleApplyClick(job)}
                        className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-lg font-medium hover:bg-gray-200 flex items-center justify-center border transition-colors"
                      >
                        {extensionInstalled ? '⚡ Autofill Application' : 'Original Apply'}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}
