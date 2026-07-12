'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getMockSessions, createMockSession, submitAnswer } from './actions'
import { Loader2, MessageSquare, Play, CheckCircle } from 'lucide-react'

export default function InterviewsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')
  const [type, setType] = useState('HR')
  const [creating, setCreating] = useState(false)
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [currentAnswer, setCurrentAnswer] = useState('')

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = () => {
    getMockSessions().then(data => {
      setSessions(data)
      setLoading(false)
    })
  }

  const handleCreate = async () => {
    if (!role) return
    setCreating(true)
    const fd = new FormData()
    fd.append('role', role)
    fd.append('type', type)
    const id = await createMockSession(fd)
    setActiveSession(id)
    setCreating(false)
    fetchSessions()
  }

  const handleSubmit = async (sessionId: string, index: number, question: string) => {
    await submitAnswer(sessionId, index, currentAnswer, question)
    setCurrentAnswer('')
    fetchSessions()
  }

  if (loading) return <div className="p-8"><Loader2 className="animate-spin w-6 h-6" /></div>

  const active = sessions.find(s => s.id === activeSession)

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Mock Interviews</h1>
        <p className="text-muted-foreground">Practice role-specific questions and get instant AI feedback.</p>
      </div>

      {!active ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Start New Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Role</label>
                <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Software Engineer" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Interview Type</label>
                <Select value={type} onValueChange={(val) => val && setType(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HR">HR / Behavioral</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreate} disabled={creating || !role} className="w-full">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Start Interview
              </Button>
            </CardFooter>
          </Card>

          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xl font-bold">Past Sessions</h3>
            {sessions.map((s: any) => (
              <Card key={s.id} className="cursor-pointer hover:border-primary/50" onClick={() => setActiveSession(s.id)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="font-semibold">{s.type} Interview</h4>
                      <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Review</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Button variant="outline" onClick={() => setActiveSession(null)}>Back to Sessions</Button>
          
          {JSON.parse(active.questions).map((q: string, i: number) => {
            const answers = JSON.parse(active.answers || '[]')
            const feedbackList = JSON.parse(active.feedback || '[]')
            const isAnswered = !!answers[i]
            const fb = feedbackList[i]

            return (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-lg">Q{i + 1}: {q}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isAnswered ? (
                    <div className="space-y-4">
                      <div className="bg-muted p-4 rounded-lg text-sm">{answers[i]}</div>
                      {fb && (
                        <div className={`p-4 rounded-lg border ${fb.score >= 70 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                          <div className="flex items-center gap-2 mb-2 font-bold text-gray-900">
                            <CheckCircle className={`w-4 h-4 ${fb.score >= 70 ? 'text-green-600' : 'text-amber-600'}`} />
                            AI Score: {fb.score}/100
                          </div>
                          <p className="text-sm text-gray-700">{fb.feedback}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Textarea 
                        placeholder="Type your answer here..." 
                        className="min-h-[150px]"
                        value={currentAnswer}
                        onChange={e => setCurrentAnswer(e.target.value)}
                      />
                      <Button onClick={() => handleSubmit(active.id, i, q)} disabled={!currentAnswer}>
                        Submit Answer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
