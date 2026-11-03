import express from 'express';
const router = express.Router();

// Health check endpoint - keeps server awake
// UptimeRobot pings this every 5 minutes
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'Studdy Buddy Backend',
  });
});

// Ping endpoint - simple keepalive
router.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

export default router;
