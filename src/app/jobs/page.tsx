'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { getJobs, addJob } from './actions'
import { Loader2, Briefcase, Plus, Target, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  // form state
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    getJobs().then(data => {
      setJobs(data)
      setLoading(false)
    })
  }, [])

  const handleAddJob = async () => {
    if (!title || !company || !description) return
    setAdding(true)
    const formData = new FormData()
    formData.append('title', title)
    formData.append('company', company)
    formData.append('description', description)
    await addJob(formData)
    
    setTitle('')
    setCompany('')
    setDescription('')
    
    getJobs().then(setJobs)
    setAdding(false)
  }

  if (loading) return <div className="p-8"><Loader2 className="animate-spin w-6 h-6" /></div>

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Job Matches</h1>
          <p className="text-muted-foreground">Add target jobs to see your match score and tailor your resume.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Plus className="w-5 h-5" /> Add New Target Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Title</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Frontend Developer" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Company</label>
                <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Description</label>
                <Textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Paste the full job description here..."
                  className="min-h-[200px]"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAddJob} disabled={adding || !title || !description} className="w-full">
                {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Analyze Match
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          {jobs.length === 0 ? (
            <Card className="border-dashed h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No jobs added yet.</p>
              </div>
            </Card>
          ) : (
            jobs.map((job: any) => (
              <Card key={job.id} className="transition-all hover:border-primary/50">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold">{job.title}</h3>
                      <p className="text-muted-foreground font-medium">{job.company}</p>
                    </div>
                    <Badge variant={job.status === 'Saved' ? 'secondary' : 'default'}>{job.status}</Badge>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">Match Score</span>
                      </div>
                      <div className="text-3xl font-extrabold text-primary">{job.matchScore}%</div>
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">Salary Insights</span>
                      </div>
                      <div className="text-sm font-medium">{job.salaryInsights}</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t flex justify-end gap-3">
                    <Link href={`/jobs/${job.id}/tailor`}>
                      <Button variant="default" className="flex items-center gap-2">
                        Tailor Resume <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
