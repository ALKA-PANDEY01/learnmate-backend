const generateQuizPrompt = (topic, domain, skillLevel) => {
  return `You are an expert AI study assistant.
Generate a structured quiz consisting of exactly 5 questions on the topic "${topic}" in the domain "${domain}" at a "${skillLevel}" skill level.

Provide a mix of question types: Multiple Choice (MCQ), True/False (TF), and Fill in the Blanks (FITB).

You MUST respond strictly in valid JSON format matching the schema below. Do not wrap the JSON output in markdown tags (like \`\`\`json ... \`\`\`) or include any conversational prefaces or explanations.

JSON Schema Output Specification:
{
  "quiz": [
    {
      "id": "q1",
      "type": "MCQ", 
      "question": "[Question text]",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option B",
      "explanation": "[Detailed concept explanation why this answer is correct]"
    },
    {
      "id": "q2",
      "type": "TF",
      "question": "[Question text stating a fact]",
      "options": ["True", "False"],
      "answer": "True",
      "explanation": "[Explanation]"
    },
    {
      "id": "q3",
      "type": "FITB",
      "question": "[Question text containing a blank, e.g. 'A ____ is a reference in React...']",
      "options": [],
      "answer": "Ref",
      "explanation": "[Explanation]"
    }
  ]
}`;
};

module.exports = { generateQuizPrompt };
