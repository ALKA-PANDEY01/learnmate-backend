const generateNudgePrompt = (reason, userContext) => {
  const { name, goalTitle, detail } = userContext;

  const reasonPrompts = {
    inactivity: `The learner "${name}" has not logged in for 3 days. Active Goal: "${goalTitle}".`,
    streak_broken: `The learner "${name}" broke their study streak. Active Goal: "${goalTitle}".`,
    missed_deadline: `The learner "${name}" missed a task or milestone deadline. Active Goal: "${goalTitle}". Overdue item: "${detail}".`,
    low_quiz_score: `The learner "${name}" scored poorly on their last quiz. Active Goal: "${goalTitle}". Weak topic: "${detail}".`,
    incomplete_milestone: `The learner "${name}" has an incomplete milestone for this week. Active Goal: "${goalTitle}". Milestone: "${detail}".`
  };

  const contextStr = reasonPrompts[reason] || `The learner "${name}" is pursuing "${goalTitle}".`;

  return `You are an AI study mentor.
Context: ${contextStr}
Goal: Craft a personalized, brief motivational nudge to encourage the learner to return and study.

You MUST respond strictly in valid JSON format matching the schema below. Do not wrap the JSON output in markdown tags (like \`\`\`json ... \`\`\`) or include any conversational prefaces.

JSON Schema Output Specification:
{
  "title": "[A short, catchy, action-oriented title, maximum 5 words, e.g. 'Jump Back In! 🚀', 'Protect Your Streak! 🔥']",
  "message": "[A supportive, encouraging, personalized motivational message, maximum 2 sentences, e.g. 'Hey ${name}, we missed you! Take a quick 10-minute focus session today to stay on track for your goal.']"
}

Keep the message friendly, empathetic, and highly actionable. Reference their goal "${goalTitle}" or the specific issue where relevant.`;
};

module.exports = {
  generateNudgePrompt
};
