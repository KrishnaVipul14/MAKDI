import { getDashboardStats } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Target, Trophy, Briefcase, FileText } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const { user, activeJobs, dsaSolved, recentJobs } = await getDashboardStats()

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome back, {user.name}</h1>
        <p className="text-muted-foreground text-lg">Here is your AI placement readiness overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Overall Readiness Score
            </CardTitle>
            <CardDescription>Based on your resume, mock interviews, and DSA progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-end justify-between">
                <span className="text-5xl font-extrabold text-primary">{user.readinessScore}%</span>
                <span className="text-muted-foreground font-medium">{user.experienceLevel}</span>
              </div>
              <Progress value={user.readinessScore} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently in pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" /> DSA Solved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dsaSolved}</div>
            <p className="text-xs text-muted-foreground mt-1">Company-specific questions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Recent Jobs</h2>
            <Link href="/jobs">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          {recentJobs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Briefcase className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>No jobs added yet.</p>
                <Link href="/jobs">
                  <Button variant="outline" className="mt-4">Add your first job</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((job: any) => (
                <Card key={job.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <p className="text-muted-foreground">{job.company}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <Badge variant={job.status === 'Saved' ? 'secondary' : 'default'}>{job.status}</Badge>
                      <span className="text-sm font-medium text-green-600">{job.matchScore}% Match</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Resume & Profile</h2>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Base Resume
              </CardTitle>
              <CardDescription>
                {user.resumeText ? 'Your resume is uploaded and parsed.' : 'No resume uploaded yet.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.resumeText ? (
                <div className="flex flex-wrap gap-2">
                  {user.baseSkills ? JSON.parse(user.baseSkills).slice(0, 8).map((skill: string) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  )) : <span className="text-muted-foreground text-sm">Skills parsing...</span>}
                </div>
              ) : (
                <Link href="/resume">
                  <Button className="w-full">Upload Resume</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
