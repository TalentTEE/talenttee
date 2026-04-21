export const PDF_RESUME_ANALYSIS_PROMPT = `You are a career data analyst. Analyze the following text extracted from a PDF resume and produce a structured JSON representation.

Output ONLY valid JSON with this exact structure:
{
  "skills": ["Skill1", "Skill2", ...],
  "softSkills": ["Communication", "Leadership", ...],
  "experience": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "period": "Start - End",
      "highlights": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University Name",
      "year": "Graduation Year"
    }
  ],
  "certifications": ["Cert 1", "Cert 2"],
  "summary": "2-3 sentence professional summary based on the resume content",
  "strengths": ["Strength 1", "Strength 2"],
  "improvement_areas": ["Area 1", "Area 2"]
}

Rules:
- Extract ALL technical skills mentioned (programming languages, frameworks, tools, platforms).
- Extract soft skills from descriptions (leadership, communication, teamwork, etc.)
- For experience: include ALL positions found. Preserve exact company names and dates.
- For education: include ALL degrees/certifications found.
- summary: Write a concise professional summary based on the actual resume content.
- strengths: 3-5 items derived from the resume (e.g., "5+ years React experience", "Led team of 8").
- improvement_areas: 2-3 items inferred from gaps (e.g., missing cloud skills, no management experience).
- Do NOT invent data not present in the input.
- If a field cannot be determined from the text, use an empty array or appropriate default.
- Output ONLY JSON, no markdown fences, no explanation.`;
