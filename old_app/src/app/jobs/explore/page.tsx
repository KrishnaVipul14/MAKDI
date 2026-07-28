'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchLiveJobs, saveJobToDashboard } from './actions'
import { Loader2, Briefcase, ExternalLink, ShieldCheck, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ExploreJobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchLiveJobs().then(data => {
      setJobs(data)
      setLoading(false)
    })
  }, [])

  const handleSaveJob = async (job: any) => {
    setSaving(job.id)
    await saveJobToDashboard(job)
    setSaving(null)
    router.push('/jobs') // Redirect to dashboard to tailor it
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Scanning live premium APIs for YC & Top Tech jobs...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            Live Premium Jobs <ShieldCheck className="w-6 h-6 text-green-500" />
          </h1>
          <p className="text-muted-foreground">Real-time verified jobs from top startups and tech giants. Pre-matched with your resume.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/jobs')}>Back to My Jobs</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map(job => (
          <Card key={job.id} className="flex flex-col hover:border-primary/50 transition-all">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <Badge variant={job.matchScore >= 70 ? 'default' : 'secondary'} className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                  {job.matchScore}% Match
                </Badge>
                <Badge variant="outline">{job.type || 'Full Time'}</Badge>
              </div>
              <CardTitle className="line-clamp-2 text-xl">{job.title}</CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <Briefcase className="w-4 h-4" />
                <span className="font-medium text-foreground">{job.company}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mt-1 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {job.description}
              </p>
              
              {job.missingSkills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Missing Skills to Learn:</p>
                  <div className="flex flex-wrap gap-1">
                    {job.missingSkills.slice(0, 3).map((s: string) => (
                      <Badge key={s} variant="destructive" className="text-[10px] px-1 py-0">{s}</Badge>
                    ))}
                    {job.missingSkills.length > 3 && <Badge variant="outline" className="text-[10px]">+{job.missingSkills.length - 3}</Badge>}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-3 border-t pt-4">
              <Button 
                variant="default" 
                className="w-full"
                onClick={() => handleSaveJob(job)}
                disabled={saving === job.id}
              >
                {saving === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add & Tailor Resume'}
              </Button>
              <a href={job.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon" type="button">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </CardFooter>
          </Card>
        ))}
        {jobs.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No premium jobs found at the moment. Please try again later.
          </div>
        )}
      </div>
    </div>
  )
}
