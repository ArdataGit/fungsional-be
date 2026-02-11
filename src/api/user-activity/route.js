const express = require('express');
const router = express.Router();

const controller = require('./controller');

// GET /api/user-activity/stats
router.get('/stats', async (req, res) => {
  try {
    const data = await controller.getStats();
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load stats' });
  }
});

// GET /api/user-activity/online?page=1
router.get('/online', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.per_page || '10', 10);

    const result = await controller.getOnlineUsers(page, perPage);

    // ⬇️ PENTING: SESUAI AXIOS
    res.json({
      data: result,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to load online users' });
  }
});


module.exports = router;