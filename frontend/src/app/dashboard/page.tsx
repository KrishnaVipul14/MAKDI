'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Briefcase, Filter, ChevronDown, CheckCircle2, XCircle, FileText } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [remoteFilter, setRemoteFilter] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('makdi_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/jobs`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setJobs(data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [router]);

  const filteredJobs = jobs.filter((job: any) => {
    if (remoteFilter !== 'All' && job.remote_type !== remoteFilter) return false;
    if (searchFilter && !job.title?.toLowerCase().includes(searchFilter.toLowerCase()) && !job.company?.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-makdi-bg-light">Loading matches...</div>;

  return (
    <div className="min-h-screen bg-makdi-bg-light">
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

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
        
        {/* Filters Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-6">
          <div className="bg-makdi-white p-5 rounded-xl border border-makdi-border shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Filter size={18}/> Filters</h3>
            
            <div className="space-y-4">
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
                <label className="text-sm font-medium text-gray-700 mb-2 block">Workplace Type</label>
                <select 
                  className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-makdi-primary outline-none"
                  value={remoteFilter}
                  onChange={(e) => setRemoteFilter(e.target.value)}
                >
                  <option>All</option>
                  <option>Remote</option>
                  <option>Onsite</option>
                  <option>Hybrid</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Job Feed */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Your Job Matches ({filteredJobs.length})</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1.5 border rounded-lg shadow-sm cursor-pointer hover:bg-gray-50">
              Sort by: Best Match <ChevronDown size={14} />
            </div>
          </div>

          {filteredJobs.map((job: any) => (
            <div key={job.id} className="bg-makdi-white rounded-xl border border-makdi-border p-6 shadow-sm hover:shadow-md transition-shadow relative">
              
              {/* Match Badge */}
              {job.score != null && (
                <div className="absolute top-6 right-6 flex flex-col items-end">
                  <div className="bg-makdi-bg-light text-makdi-primary border border-makdi-primary/30 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                    {job.score}% Match
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://logo.clearbit.com/${job.company?.toLowerCase().replace(/\s+/g, '')}.com`} onError={(e) => (e.currentTarget.style.display = 'none')} className="w-12 h-12 rounded-lg border object-contain bg-white" alt="logo"/>
                
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                  <div className="text-makdi-primary font-medium text-sm mb-2">{job.company}</div>
                  
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                    <span className="flex items-center gap-1"><MapPin size={14}/> {job.location || 'Anywhere'}</span>
                    <span className="flex items-center gap-1"><Briefcase size={14}/> {job.remote_type}</span>
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
                    <button className="flex-1 bg-makdi-primary text-white py-2 rounded-lg font-medium hover:bg-makdi-primary-hover flex items-center justify-center gap-2">
                      <FileText size={16}/> Tailor Resume
                    </button>
                    <a href={job.apply_url} target="_blank" rel="noreferrer" className="flex-1 bg-gray-100 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-200 flex items-center justify-center">
                      Original Apply
                    </a>
                  </div>

                </div>
              </div>
            </div>
          ))}

          {filteredJobs.length === 0 && (
            <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
              <p className="text-gray-500">Try adjusting your filters or wait for the aggregator to fetch more jobs.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
