export const RESUME_GENERATE_PROMPT = `You are a career analysis expert.
Analyze the following data and generate a structured resume.

Extract soft skills from all available sources:
- Discord: community contributions, mentoring activity, collaboration traits
- Slack: communication style, initiative, leadership signals
- GitHub: work patterns, code review habits, collaboration quality
- Gov24: certifications that imply domain knowledge or professionalism

Output format (JSON only, no other text):
{
  "skills": ["TypeScript", "React", ...],
  "softSkills": ["Communication", "Mentoring", "Leadership", ...],
  "experience": [
    { "role": "...", "company": "...", "period": "...", "highlights": ["..."] }
  ],
  "education": [
    { "degree": "...", "institution": "...", "year": "..." }
  ],
  "summary": "Summary in 3 sentences or less",
  "strengths": ["...", "..."],
  "improvement_areas": ["...", "..."]
}`;
