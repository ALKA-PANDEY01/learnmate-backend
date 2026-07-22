const info = (...messages) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] \x1b[32mINFO:\x1b[0m`, ...messages);
};

const warn = (...messages) => {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] \x1b[33mWARN:\x1b[0m`, ...messages);
};

const error = (...messages) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] \x1b[31mERROR:\x1b[0m`, ...messages);
};

module.exports = {
  info,
  warn,
  error
};
