const validateEnv = () => {
  const required = ['MONGO_URI', 'JWT_SECRET'];
  const missing = [];

  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.error(`🛑 CRITICAL CONFIG ERROR: Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 12) {
    console.warn("⚠️ SECURITY WARNING: JWT_SECRET is weak. It should be at least 12 characters for production.");
  }

  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ CONFIG WARNING: GEMINI_API_KEY is missing. AI plan curation will fallback to local scheduling mode.");
  }
};

module.exports = { validateEnv };
