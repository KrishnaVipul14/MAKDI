'use server'

import prisma from '@/lib/db'
import { extractSkills } from '@/lib/ai-engine'
import { getOrCreateUser } from '@/app/actions'
import { revalidatePath } from 'next/cache'

export async function uploadResume(formData: FormData) {
  const text = formData.get('resumeText') as string
  if (!text) return { error: 'No text provided' }

  const skills = extractSkills(text)
  const user = await getOrCreateUser()

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resumeText: text,
      baseSkills: JSON.stringify(skills),
      readinessScore: 30,
    }
  })

  revalidatePath('/resume')
  revalidatePath('/')
  return { success: true }
}

export async function parseFileAction(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    let extractedText = ''

    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')

    if (isPDF) {
      // Use the internal module path to avoid serverless test-file access issue
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js')
      const data = await pdfParse(buffer)
      extractedText = data.text || ''
    } else if (isDocx) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth')
      const data = await mammoth.extractRawText({ buffer })
      extractedText = data.value || ''
    } else {
      return { error: 'Unsupported file type. Please upload a PDF or DOCX file.' }
    }

    // Clean extracted text - remove excessive whitespace/newlines from PDF extraction
    const cleaned = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!cleaned || cleaned.length < 20) {
      return { error: 'Could not extract meaningful text from the document. The PDF might be image-based or scanned. Try copy-pasting the text instead.' }
    }

    return { text: cleaned }
  } catch (error: any) {
    console.error('File parsing error:', error?.message || error)
    return { error: `Parse failed: ${error?.message || 'Unknown error'}. Try pasting your resume text directly instead.` }
  }
}

export async function getResumeData() {
  const user = await getOrCreateUser()
  return {
    resumeText: user.resumeText,
    skills: user.baseSkills ? JSON.parse(user.baseSkills) : []
  }
}
