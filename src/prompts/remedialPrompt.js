const generateRemedialPrompt = (topic, score, currentWeeks, currentWeek) => {
  return `You are an adaptive personal learning supervisor.
The learner scored poorly (${score}%) on a quiz about the topic: "${topic}".
They are currently on Week ${currentWeek} of their 12-week learning roadmap.

You MUST modify their current learning plan to help them review and master "${topic}".

Input Current Learning Plan (JSON Weeks):
${JSON.stringify(currentWeeks, null, 2)}

Instructions for modifications:
1. Identify Week ${currentWeek + 1} (or Week ${currentWeek} if tasks are not finished yet).
2. Insert 1-2 new, focused revision tasks into that week targeting "${topic}" review.
   - For example: "Review core concepts of ${topic} and build a debug sandbox"
   - Type should be 'theory' or 'practical'.
   - Include high-quality learning resources with realistic URL links (e.g., official docs, guides) specifically for "${topic}".
3. Delay difficult milestones or tasks in subsequent weeks if needed to make room for this revision.
4. Return the entire modified 12-week layout.

You MUST respond strictly in valid JSON format matching the original schema structure (an object containing a "weeks" array). Do not wrap the JSON output in markdown tags (like \`\`\`json ... \`\`\`) or include any conversational prefaces.`;
};

module.exports = {
  generateRemedialPrompt
};
