const generateRoadmapPrompt = (goal, domain, skillLevel, hoursPerDay, learningStyle) => {
  return `You are an expert AI syllabus coordinator and personal tutor agent.
Generate a structured 12-week learning plan for:
- Learning Goal: "${goal}"
- Domain Field: "${domain}"
- Current Skill Level: "${skillLevel}"
- Daily Availability: ${hoursPerDay} hours/day
- Preferred Style: "${learningStyle}"

You MUST respond strictly in valid JSON format matching the schema below. Do not wrap the JSON output in markdown tags (like \`\`\`json ... \`\`\`) or include any conversational prefaces.

JSON Schema Output Specification:
{
  "weeks": [
    {
      "id": "w-[week_number]",
      "weekNumber": [integer from 1 to 12],
      "title": "Week [number]: [Visual milestone title tailored to the goal]",
      "description": "[1-2 sentence description of weekly syllabus goals]",
      "tasks": [
        {
          "id": "t-[week_number]-[task_index]",
          "title": "[Actionable, specific study task matching the goal parameters]",
          "duration": "[Estimated minutes or hours, e.g. '45 mins', '2 hrs']",
          "type": "[Choose exactly one: 'theory', 'practical', 'quiz']",
          "resources": [
            {
              "name": "[Valid learning source name, e.g., 'React hooks docs', 'Egghead tutorial video']",
              "url": "[A valid, realistic website link, e.g., 'https://react.dev', 'https://developer.mozilla.org']"
            }
          ]
        }
      ]
    }
  ]
}

Provide realistic and high-quality study tasks appropriate for the "${skillLevel}" level. Place practical tasks succeeding theory resources. Every week must have at least 2 tasks, and include a 'quiz' task at the end of every even week.`;
};

module.exports = {
  generateRoadmapPrompt
};
