const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateRoadmapPrompt } = require('../prompts/roadmapPrompt');
const { generateRemedialPrompt } = require('../prompts/remedialPrompt');
const { generateNudgePrompt } = require('../prompts/nudgePrompt');

// Initialize Google Generative AI client
let genAI = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log("GoogleGenerativeAI client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize GoogleGenerativeAI SDK:", error.message);
  }
} else {
  console.warn("GEMINI_API_KEY not found in environment variables. Falling back to mock generator.");
}

// Reusable local roadmap builder in case API is missing or fails
const generateLocalFallbackPlan = (goal, domain, skillLevel, hoursPerDay, learningStyle) => {
  const weeks = [];
  const subject = goal || 'Software Engineering';
  
  for (let w = 1; w <= 12; w++) {
    const tasks = [
      {
        id: `t-${w}-1`,
        title: `Explore Week ${w} fundamental theories for ${subject}`,
        duration: '45 mins',
        type: 'theory',
        resources: [
          { name: 'Official MDN and reference docs', url: 'https://developer.mozilla.org' }
        ],
        status: 'pending'
      },
      {
        id: `t-${w}-2`,
        title: `Build hands-on sandbox lab exercise for Week ${w}`,
        duration: '90 mins',
        type: 'practical',
        resources: [
          { name: 'Github study sandbox templates', url: 'https://github.com' }
        ],
        status: 'pending'
      }
    ];

    if (w % 2 === 0) {
      tasks.push({
        id: `t-${w}-3`,
        title: `Take Week ${w} milestone validation quiz`,
        duration: '20 mins',
        type: 'quiz',
        resources: [
          { name: 'Interactive practice questionnaire', url: 'https://example.com' }
        ],
        status: 'pending'
      });
    }

    weeks.push({
      id: `w-${w}`,
      weekNumber: w,
      title: `Week ${w}: Curation of ${subject} (Part ${w})`,
      description: `Structured syllabus modules for ${subject} - core parameters for week ${w}.`,
      isExpanded: w === 1,
      tasks
    });
  }

  return { weeks };
};

// Reusable local remediation builder
const generateLocalRemedialFallback = (currentWeeks, topic, currentWeekNum) => {
  const updatedWeeks = JSON.parse(JSON.stringify(currentWeeks));
  const targetWeekNum = Math.min(Number(currentWeekNum) + 1, 12);
  const targetWeek = updatedWeeks.find(w => w.weekNumber === targetWeekNum) || updatedWeeks[updatedWeeks.length - 1];

  if (targetWeek && targetWeek.tasks) {
    const revisionTaskId = `t-rev-${targetWeekNum}-${Math.random().toString(36).substring(2, 5)}`;
    targetWeek.tasks.unshift({
      id: revisionTaskId,
      title: `🚨 Remedial Review: Master "${topic}" core principles`,
      duration: '60 mins',
      type: 'theory',
      resources: [
        { name: `Dedicated documentation search for ${topic}`, url: 'https://google.com/search?q=' + encodeURIComponent(topic) }
      ],
      status: 'pending',
      completed: false
    });
    
    targetWeek.title = `Revised Week ${targetWeekNum}: Focus on ${topic} & Review`;
    targetWeek.description = `Revision session added to master ${topic} following quiz results. ` + targetWeek.description;
  }

  return { weeks: updatedWeeks };
};

// Static nudge fallbacks dictionary
const generateLocalNudgeFallback = (reason, name) => {
  const nudges = {
    inactivity: {
      title: "We miss you! 👋",
      message: `Hey ${name}, it has been 3 days since your last study session. Log a quick 10-minute module today to keep your momentum going!`
    },
    streak_broken: {
      title: "Restart the Flame! 🔥",
      message: "Your streak reset, but that is completely fine! Today is a great opportunity to start a brand new, stronger study habit."
    },
    missed_deadline: {
      title: "Stay on Track! 📅",
      message: "You have a pending task that passed its target deadline date. Let's tackle it today to stay aligned with your goals."
    },
    low_quiz_score: {
      title: "Review & Reset 🧠",
      message: "No worries about the low score! We recommend reviewing the weak topic nodes and taking the practice quiz again."
    },
    incomplete_milestone: {
      title: "Milestone Alert 🏆",
      message: "You are close to completing your weekly milestone. Log a Pomodoro timer session to cross the finish line!"
    }
  };

  return nudges[reason] || {
    title: "Continue Studying! 🚀",
    message: `Keep pushing towards your active learning goals, ${name}!`
  };
};

const generateLearningPlan = async (goalData) => {
  const { goal, domain, skillLevel, hoursPerDay, learningStyle } = goalData;
  
  if (!genAI) {
    console.log("No active Gemini API connection. Curating plan using Local fallback templates...");
    return generateLocalFallbackPlan(goal, domain, skillLevel, hoursPerDay, learningStyle);
  }

  try {
    const promptText = generateRoadmapPrompt(goal, domain, skillLevel, hoursPerDay, learningStyle);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const textResult = response.text();

    if (!textResult) {
      throw new Error("Received empty response string from Gemini API.");
    }

    const parsedJson = JSON.parse(textResult);
    if (!parsedJson.weeks || !Array.isArray(parsedJson.weeks)) {
      throw new Error("Invalid roadmap format received from Gemini AI.");
    }

    parsedJson.weeks.forEach(week => {
      if (!week.id) week.id = `w-${week.weekNumber}`;
      if (week.isExpanded === undefined) week.isExpanded = week.weekNumber === 1;

      if (week.tasks && Array.isArray(week.tasks)) {
        week.tasks = week.tasks.map(task => ({
          ...task,
          status: 'pending'
        }));
      }
    });

    console.log("Syllabus successfully generated using Google Gemini API.");
    return parsedJson;
  } catch (error) {
    console.error("Gemini API call encountered an error. Falling back to local plan generation:", error.message);
    return generateLocalFallbackPlan(goal, domain, skillLevel, hoursPerDay, learningStyle);
  }
};

const modifyRoadmapForRemediation = async (currentWeeks, topic, score, currentWeekNum) => {
  if (!genAI) {
    console.log("No Gemini API connection. Generating local fallback remedial additions...");
    return generateLocalRemedialFallback(currentWeeks, topic, currentWeekNum);
  }

  try {
    const promptText = generateRemedialPrompt(topic, score, currentWeeks, currentWeekNum);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const textResult = response.text();

    if (!textResult) {
      throw new Error("Received empty response string from Gemini API during remediation.");
    }

    const parsedJson = JSON.parse(textResult);
    if (!parsedJson.weeks || !Array.isArray(parsedJson.weeks)) {
      throw new Error("Invalid format received during remediation.");
    }

    console.log("Syllabus successfully modified for remediation using Google Gemini API.");
    return parsedJson;
  } catch (error) {
    console.error("Remedial Gemini API call failed. Falling back to local remediation insertion:", error.message);
    return generateLocalRemedialFallback(currentWeeks, topic, currentWeekNum);
  }
};

const generateSmartNudge = async (reason, userContext) => {
  const { name, goalTitle } = userContext;

  if (!genAI) {
    console.log("No active Gemini API connection. Generating local fallback nudge message...");
    return generateLocalNudgeFallback(reason, name);
  }

  try {
    const promptText = generateNudgePrompt(reason, userContext);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const textResult = response.text();

    if (!textResult) {
      throw new Error("Received empty response string from Gemini API during nudge generation.");
    }

    const parsedJson = JSON.parse(textResult);
    if (!parsedJson.title || !parsedJson.message) {
      throw new Error("Invalid format received during nudge generation.");
    }

    console.log("Smart nudge successfully generated using Google Gemini API.");
    return parsedJson;
  } catch (error) {
    console.error("Nudge generation Gemini API call failed. Falling back to local nudge template:", error.message);
    return generateLocalNudgeFallback(reason, name);
  }
};

module.exports = {
  generateLearningPlan,
  modifyRoadmapForRemediation,
  generateSmartNudge
};
