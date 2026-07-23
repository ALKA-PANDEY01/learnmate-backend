const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateRoadmapPrompt } = require('../prompts/roadmapPrompt');
const { generateRemedialPrompt } = require('../prompts/remedialPrompt');
const { generateNudgePrompt } = require('../prompts/nudgePrompt');
const { generateFlashcardPrompt } = require('../prompts/flashcardPrompt');
const { generateQuizPrompt } = require('../prompts/quizPrompt');
const { generateTutorPrompt } = require('../prompts/tutorPrompt');

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

// Fallback generator for flashcards
const getLocalFlashcardFallback = (topic) => {
  return {
    flashcards: [
      { question: `What is the core definition of ${topic}?`, answer: `It represents key principles governing ${topic} studies.` },
      { question: `Can you name a primary practical application of ${topic}?`, answer: `It is widely utilized in configuring scalable ${topic} pipelines.` },
      { question: `What is a common misconception about ${topic}?`, answer: `Many believe it operates synchronously, but it actually executes asynchronously.` },
      { question: `How does ${topic} improve developer efficiency?`, answer: `By automating structural boilerplate configurations.` },
      { question: `Name one key optimization strategy for ${topic}.`, answer: `Implement caching systems and utilize lazy loading modules.` }
    ]
  };
};

// Fallback generator for dynamic quizzes
const getLocalQuizFallback = (topic) => {
  return {
    quiz: [
      { id: "q-1", type: "MCQ", question: `Which of the following is true regarding ${topic}?`, options: ["It runs synchronously", "It is an industry standard", "It is deprecated", "It only executes on mobile devices"], answer: "It is an industry standard", explanation: `${topic} is widely adopted across industrial platforms.` },
      { id: "q-2", type: "TF", question: `Is ${topic} typically recommended for beginners?`, options: ["True", "False"], answer: "True", explanation: "Yes, learning this provides a solid foundation." },
      { id: "q-3", type: "FITB", question: `A critical component of ${topic} is state ____.`, options: [], answer: "management", explanation: "State management coordinates variables across elements." },
      { id: "q-4", type: "MCQ", question: `What is the primary benefit of testing ${topic}?`, options: ["Reduces build sizes", "Ensures run-time reliability", "Replaces styling modules", "Simplifies package downloads"], answer: "Ensures run-time reliability", explanation: "Unit and integration tests catch runtime exceptions before shipping." },
      { id: "q-5", type: "TF", question: `Does ${topic} run natively inside all modern browsers?`, options: ["True", "False"], answer: "True", explanation: "Modern browser engines support these standard operations natively." }
    ]
  };
};

// Fallback generator for learning plans
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
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const textResult = response.text();

    const parsedJson = JSON.parse(textResult);
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
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const textResult = response.text();

    const parsedJson = JSON.parse(textResult);
    console.log("Syllabus successfully modified for remediation using Google Gemini API.");
    return parsedJson;
  } catch (error) {
    console.error("Remedial Gemini API call failed. Falling back to local remediation insertion:", error.message);
    return generateLocalRemedialFallback(currentWeeks, topic, currentWeekNum);
  }
};

const generateSmartNudge = async (reason, userContext) => {
  const { name } = userContext;

  if (!genAI) {
    return generateLocalNudgeFallback(reason, name);
  }

  try {
    const promptText = generateNudgePrompt(reason, userContext);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const textResult = response.text();

    const parsedJson = JSON.parse(textResult);
    return parsedJson;
  } catch (error) {
    console.error("Nudge generation Gemini API call failed. Falling back to local nudge template:", error.message);
    return generateLocalNudgeFallback(reason, name);
  }
};

// Generates Flashcards using Gemini AI
const generateFlashcards = async (topic, domain, skillLevel) => {
  if (!genAI) {
    console.log("No Gemini API connection. Generating fallback local flashcard deck.");
    return getLocalFlashcardFallback(topic);
  }

  try {
    const promptText = generateFlashcardPrompt(topic, domain, skillLevel);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const textResult = response.text();

    const parsedJson = JSON.parse(textResult);
    return parsedJson;
  } catch (error) {
    console.error("Gemini Flashcards generation failed. Using local fallback deck:", error.message);
    return getLocalFlashcardFallback(topic);
  }
};

// Generates dynamic quizzes using Gemini AI
const generateQuiz = async (topic, domain, skillLevel) => {
  if (!genAI) {
    console.log("No Gemini API connection. Generating fallback local quiz.");
    return getLocalQuizFallback(topic);
  }

  try {
    const promptText = generateQuizPrompt(topic, domain, skillLevel);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const textResult = response.text();

    const parsedJson = JSON.parse(textResult);
    return parsedJson;
  } catch (error) {
    console.error("Gemini Quiz generation failed. Using local fallback quiz:", error.message);
    return getLocalQuizFallback(topic);
  }
};

// Generates context-aware Tutor responses
const generateTutorResponse = async (userMessage, conversationHistory, context) => {
  if (!genAI) {
    return "Tutor offline. The Gemini API key is missing or invalid. Please check your config parameters to activate your study mentor.";
  }

  try {
    const promptText = generateTutorPrompt(userMessage, conversationHistory, context);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash'
    });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini AI Tutor response failed:", error.message);
    return "I ran into a problem generating an AI response. Let's try rephrasing your question or exploring a different concept!";
  }
};

module.exports = {
  generateLearningPlan,
  modifyRoadmapForRemediation,
  generateSmartNudge,
  generateFlashcards,
  generateQuiz,
  generateTutorResponse
};
