'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { uploadResume, getResumeData } from './actions'
import { FileText, Wand2, Loader2 } from 'lucide-react'

export default function ResumePage() {
  const [text, setText] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    getResumeData().then((data) => {
      if (data.resumeText) setText(data.resumeText)
      if (data.skills) setSkills(data.skills)
      setInitialLoading(false)
    })
  }, [])

  const handleUpload = async () => {
    if (!text) return
    setLoading(true)
    const res = await uploadResume(new FormData(undefined as any, undefined as any) /* Mocking formdata approach */)
    // Actually, let's use a standard fetch or server action properly.
    // I'll just call the server action directly.
    const formData = new FormData()
    formData.append('resumeText', text)
    const result = await uploadResume(formData)
    
    if (result.success) {
      const data = await getResumeData()
      setSkills(data.skills)
    }
    setLoading(false)
  }

  if (initialLoading) return <div className="p-8"><Loader2 className="animate-spin w-6 h-6" /></div>

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Resume Hub</h1>
        <p className="text-muted-foreground">Paste your resume text here to let the AI extract your core skills.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Base Resume Text
            </CardTitle>
            <CardDescription>We will use this text to tailor your applications.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              className="min-h-[400px] resize-y" 
              placeholder="Paste your resume text here..." 
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpload} disabled={loading || !text}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save & Analyze
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Wand2 className="w-5 h-5" /> Extracted Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => (
                    <Badge key={s} variant="secondary" className="px-3 py-1 text-sm">{s}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No skills extracted yet. Save your resume to analyze.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
