'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDSAQuestions, toggleDSAStatus } from './actions'
import { Loader2, Code2, CheckCircle2, Circle } from 'lucide-react'

export default function DSAPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDSA()
  }, [])

  const fetchDSA = () => {
    getDSAQuestions().then(data => {
      setQuestions(data)
      setLoading(false)
    })
  }

  const handleToggle = async (id: string, status: string) => {
    await toggleDSAStatus(id, status)
    fetchDSA()
  }

  if (loading) return <div className="p-8"><Loader2 className="animate-spin w-6 h-6" /></div>

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">DSA Practice</h1>
        <p className="text-muted-foreground">Company-specific questions recommended based on your target roles.</p>
      </div>

      <div className="grid gap-4">
        {questions.map((q: any) => (
          <Card key={q.id} className="transition-all hover:border-primary/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-start gap-4">
                <button onClick={() => handleToggle(q.id, q.status)} className="mt-1 text-muted-foreground hover:text-primary transition-colors">
                  {q.status === 'Solved' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
                </button>
                <div>
                  <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                    {q.title}
                    <Badge variant="outline">{q.difficulty}</Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">{q.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{q.company}</Badge>
                    <Badge variant="secondary" className="text-xs">{q.role}</Badge>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Code2 className="w-4 h-4" /> Practice Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
