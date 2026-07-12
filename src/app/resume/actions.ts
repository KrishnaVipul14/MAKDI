'use server'

import prisma from '@/lib/db'
import { extractSkills } from '@/lib/ai-engine'
import { getOrCreateUser } from '@/app/actions'
import { revalidatePath } from 'next/cache'

const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')


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
      readinessScore: 30, // Base score for uploading resume
    }
  })

  revalidatePath('/resume')
  revalidatePath('/')
  return { success: true }
}

export async function parseFileAction(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    let extractedText = ''

    if (file.type === 'application/pdf') {
      const data = await pdfParse(buffer)
      extractedText = data.text
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      file.name.endsWith('.docx')
    ) {
      const data = await mammoth.extractRawText({ buffer })
      extractedText = data.value
    } else {
      return { error: 'Unsupported file type. Please upload a PDF or DOCX file.' }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return { error: 'Could not extract text from the document.' }
    }

    return { text: extractedText }
  } catch (error) {
    console.error('File parsing error:', error)
    return { error: 'Failed to parse document.' }
  }
}

export async function getResumeData() {
  const user = await getOrCreateUser()
  return {
    resumeText: user.resumeText,
    skills: user.baseSkills ? JSON.parse(user.baseSkills) : []
  }
}
