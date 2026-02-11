const redis = require('../utils/redis');
const ONLINE_TTL = 300; // 5 menit

module.exports = async function trackUserActivity(req, res, next) {
  try {
    // ⛔️ STOP TOTAL kalau tidak login
    if (!req.user || !req.user.id) {
      return next();
    }
    
    // ⛔️ skip admin
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const user = req.user;

    const data = {
      id: user.id,
      name: user.name,
      email: user.email,
      url: req.originalUrl,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
      last_activity: Date.now(),
      is_guest: false,
    };

    await redis.setex(
      `online_user:${user.id}`,
      ONLINE_TTL,
      JSON.stringify(data)
    );
  } catch (err) {
    console.error('TrackUserActivity error:', err);
  }

  next();
};