'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApplicationTracker() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('makdi_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/applications`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setApplications(data);
      setLoading(false);
    });
  }, [router]);

  const updateStatus = async (jobId: number, status: string) => {
    const token = localStorage.getItem('makdi_token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jobId, status })
    });
    // refresh locally
    setApplications((prev: any) => 
      prev.map((app: any) => app.job_id === jobId ? { ...app, status } : app)
    );
  };

  const columns = ['saved', 'applied', 'interview', 'rejected', 'offer'];

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading tracker...</div>;

  return (
    <div className="min-h-screen bg-makdi-bg-light p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Application Tracker</h1>
        <button onClick={() => router.push('/dashboard')} className="text-makdi-primary hover:underline font-medium">
          Back to Jobs
        </button>
      </header>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map(col => (
          <div key={col} className="w-80 flex-shrink-0 bg-gray-50 rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-700 capitalize mb-4 border-b pb-2">
              {col} ({applications.filter((a: any) => a.status === col).length})
            </h3>
            
            <div className="space-y-4">
              {applications.filter((a: any) => a.status === col).map((app: any) => (
                <div key={app.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-grab">
                  <h4 className="font-bold text-gray-900">{app.title}</h4>
                  <p className="text-sm text-makdi-primary mb-3">{app.company}</p>
                  
                  <select 
                    value={app.status}
                    onChange={(e) => updateStatus(app.job_id, e.target.value)}
                    className="w-full text-xs border rounded p-1"
                  >
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
