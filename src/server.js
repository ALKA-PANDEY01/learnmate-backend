// Load environment variables first
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const { initCron } = require('./services/cronService');

const connectDB = async () => {
  // We can require db connection from config
  const dbConnect = require('./config/db');
  await dbConnect();
};

const startServer = async () => {
  // Connect database
  await connectDB();
  
  // Initialize cron scheduler
  initCron();

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });

  // Handle unhandled promise rejections (crash server gracefully)
  process.on('unhandledRejection', (err, promise) => {
    console.error(`Unhandled Rejection Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
  });
};

startServer();
