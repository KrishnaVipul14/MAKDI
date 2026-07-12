'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTailoredResume } from './actions'
import { Loader2, Download, CheckCircle, Target, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TailorPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTailoredResume(params.id).then(res => {
      setData(res)
      setLoading(false)
    })
  }, [params.id])

  if (loading) return <div className="p-8"><Loader2 className="animate-spin w-6 h-6" /></div>
  if (!data) return <div className="p-8">Not found</div>

  const { job, tailored } = data
  const missingKeywords = tailored?.missingKeywords ? JSON.parse(tailored.missingKeywords) : []
  const suggestions = tailored?.suggestions ? JSON.parse(tailored.suggestions) : []

  const handleExportPDF = () => {
    // In a real app we'd use react-to-pdf, for now trigger standard print
    window.print()
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/jobs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Link>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Tailored Resume: {job.company}</h1>
          <p className="text-muted-foreground">AI suggestions to boost your ATS match score for {job.title}.</p>
        </div>
        <Button onClick={handleExportPDF} className="flex items-center gap-2">
          <Download className="w-4 h-4" /> Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
            <CardContent className="p-6 text-center">
              <Target className="w-10 h-10 text-primary mx-auto mb-4" />
              <div className="text-sm font-medium text-muted-foreground mb-1">Target ATS Score</div>
              <div className="text-6xl font-extrabold text-primary mb-2">{tailored?.atsScore || 0}%</div>
              <p className="text-xs text-muted-foreground">Estimated match after applying changes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Missing Keywords</CardTitle>
              <CardDescription>Add these to your skills section.</CardDescription>
            </CardHeader>
            <CardContent>
              {missingKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {missingKeywords.map((kw: string) => (
                    <Badge key={kw} variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">
                      {kw}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-600 font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> You have all required keywords!
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Bullet Point Suggestions</CardTitle>
              <CardDescription>Copy and paste these optimized points into your resume.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {suggestions.map((sug: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">{sug}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
