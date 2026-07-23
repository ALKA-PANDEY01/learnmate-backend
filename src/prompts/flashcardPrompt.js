const generateFlashcardPrompt = (topic, domain, skillLevel) => {
  return `You are an expert AI study assistant.
Create a deck of exactly 5 educational flashcards for a learner studying "${topic}" in the domain "${domain}" at a "${skillLevel}" skill level.

You MUST respond strictly in valid JSON format matching the schema below. Do not wrap the JSON output in markdown tags (like \`\`\`json ... \`\`\`) or include any conversational prefaces or explanations.

JSON Schema Output Specification:
{
  "flashcards": [
    {
      "question": "[Clear, concise question, concept check, or fill-in-the-blank prompt]",
      "answer": "[Short, accurate, informative answer, maximum 2 sentences]"
    }
  ]
}`;
};

module.exports = { generateFlashcardPrompt };
