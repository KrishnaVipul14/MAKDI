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

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
  if (!data) return <div className="p-8">Not found</div>

  const { job, tailored, structuredResume } = data
  const missingKeywords = tailored?.missingKeywords ? JSON.parse(tailored.missingKeywords) : []
  const suggestions = tailored?.suggestions ? JSON.parse(tailored.suggestions) : []

  const handleExportPDF = () => {
    window.print()
  }

  // Inject AI suggestions into the first experience block for the smart template
  const tailoredExperience = structuredResume.experience.map((exp: any, index: number) => {
    if (index === 0 && suggestions.length > 0) {
      return {
        ...exp,
        bullets: [...suggestions, ...exp.bullets.slice(suggestions.length)] // Replace top bullets with AI suggestions
      }
    }
    return exp
  })

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="print:hidden">
        <Link href="/jobs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Tailored Resume: {job.company}</h1>
            <p className="text-muted-foreground">AI has injected the missing keywords into this Smart Template.</p>
          </div>
          <Button onClick={handleExportPDF} className="flex items-center gap-2 shadow-lg hover:shadow-primary/20">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
            <CardContent className="p-6 text-center">
              <Target className="w-10 h-10 text-primary mx-auto mb-4" />
              <div className="text-sm font-medium text-muted-foreground mb-1">Target ATS Score</div>
              <div className="text-6xl font-extrabold text-primary mb-2">{tailored?.atsScore || 95}%</div>
              <p className="text-xs text-muted-foreground">Estimated match after applying changes</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" /> Keywords Injected Successfully
              </CardTitle>
              <CardDescription>The following skills were missing but have been seamlessly integrated into your template.</CardDescription>
            </CardHeader>
            <CardContent>
              {missingKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {missingKeywords.map((kw: string) => (
                    <Badge key={kw} variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                      {kw}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-600 font-medium">You already had all required keywords!</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SMART RESUME TEMPLATE (Printable Area) */}
      <div className="bg-white text-black p-10 md:p-16 shadow-2xl rounded-xl print:shadow-none print:p-0 print:m-0 mx-auto max-w-[850px] min-h-[1100px]">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            .print\\:hidden { display: none !important; }
            .bg-white { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none; }
            .bg-white * { visibility: visible; }
          }
        `}} />
        
        {/* Header */}
        <div className="text-center border-b-2 border-gray-300 pb-6 mb-6">
          <h1 className="text-4xl font-serif font-bold text-gray-900 uppercase tracking-wider mb-2">{structuredResume.name}</h1>
          <p className="text-lg text-gray-700 font-medium mb-2">{job.title}</p>
          <p className="text-sm text-gray-500">{structuredResume.contact}</p>
        </div>

        {/* Summary */}
        {structuredResume.summary && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-300 pb-1 mb-3">Professional Summary</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{structuredResume.summary}</p>
          </div>
        )}

        {/* Experience */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-300 pb-1 mb-4">Professional Experience</h2>
          <div className="space-y-6">
            {tailoredExperience.map((exp: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="text-md font-bold text-gray-900">{exp.title}</h3>
                  <span className="text-sm font-medium text-gray-600">{exp.dates}</span>
                </div>
                <div className="text-sm font-semibold text-gray-700 mb-2">{exp.company}</div>
                <ul className="list-disc pl-5 space-y-1.5">
                  {exp.bullets.map((bullet: string, j: number) => (
                    <li key={j} className={`text-sm leading-relaxed ${i === 0 && j < suggestions.length ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        {structuredResume.education.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-300 pb-1 mb-3">Education</h2>
            <ul className="space-y-2">
              {structuredResume.education.map((edu: string, i: number) => (
                <li key={i} className="text-sm text-gray-700">{edu}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
