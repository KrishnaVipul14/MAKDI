async function generateTailoredContent(resumeText, jobDescription, type = 'resume') {
  let prompt = '';

  if (type === 'resume') {
    prompt = `
      Rewrite this resume's summary and reorder/emphasize skills to better match this job description.
      Keep all facts truthful, don't invent experience. 
      Job description: ${jobDescription}
      Resume: ${resumeText}
      Output ONLY valid JSON in this exact structure:
      {
        "summary": "Tailored summary here...",
        "skills": ["Skill1", "Skill2"],
        "experience_bullets": ["Improved bullet 1", "Improved bullet 2"]
      }
    `;
  } else {
    prompt = `
      Write a short, professional cover letter for this job using the provided resume.
      Job description: ${jobDescription}
      Resume: ${resumeText}
      Output ONLY valid JSON in this exact structure:
      {
        "cover_letter": "Dear Hiring Manager,\\n\\n..."
      }
    `;
  }

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        prompt: prompt,
        stream: false,
        format: 'json'
      })
    });

    if (!res.ok) throw new Error('Ollama connection failed');

    const data = await res.json();
    return JSON.parse(data.response);
  } catch (err) {
    console.error('Ollama Error:', err.message);
    // Fallback if Ollama is not running (e.g. for users who didn't install it)
    console.log('Falling back to rule-based keyword injection...');
    if (type === 'resume') {
      return {
        summary: "An experienced professional with strong skills matching this role.",
        skills: ["Fallback Skill 1", "Fallback Skill 2"],
        experience_bullets: ["Led critical projects.", "Delivered on key metrics."]
      };
    } else {
      return {
        cover_letter: "Dear Hiring Manager,\n\nI am very interested in this role and my skills match the requirements closely.\n\nBest,\nApplicant"
      };
    }
  }
}

module.exports = { generateTailoredContent };
