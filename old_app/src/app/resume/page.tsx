'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { uploadResume, getResumeData, parseFileAction } from './actions'
import { FileText, Wand2, Loader2, UploadCloud } from 'lucide-react'

export default function ResumePage() {
  const [text, setText] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getResumeData().then((data) => {
      if (data.resumeText) setText(data.resumeText)
      if (data.skills) setSkills(data.skills)
      setInitialLoading(false)
    }).catch(err => {
      console.error("Failed to load resume data:", err)
      setInitialLoading(false)
    })
  }, [])

  const handleUpload = async () => {
    if (!text) return
    setLoading(true)
    const formData = new FormData()
    formData.append('resumeText', text)
    const result = await uploadResume(formData)
    
    if (result.success) {
      const data = await getResumeData()
      setSkills(data.skills)
    }
    setLoading(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', file)

    const result = await parseFileAction(formData)
    if (result.text) {
      setText(result.text)
    } else if (result.error) {
      alert(result.error)
    }
    setUploadingFile(false)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (initialLoading) return <div className="p-8"><Loader2 className="animate-spin w-6 h-6" /></div>

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Resume Hub</h1>
        <p className="text-muted-foreground">Upload your PDF/DOCX or paste your resume text here.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Base Resume Data
            </CardTitle>
            <CardDescription>Upload a document or paste raw text below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div 
              className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
              />
              <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload PDF or DOCX</p>
              <p className="text-xs text-muted-foreground mt-1">We will extract the text automatically</p>
              {uploadingFile && <Loader2 className="w-4 h-4 mt-3 animate-spin text-primary" />}
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-muted-foreground uppercase">or paste text</span>
              <div className="h-px bg-border flex-1" />
            </div>

            <Textarea 
              className="min-h-[300px] resize-y" 
              placeholder="Paste your resume text here..." 
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpload} disabled={loading || !text || uploadingFile}>
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
