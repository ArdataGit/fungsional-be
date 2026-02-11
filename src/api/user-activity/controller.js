
const redis = require('../../utils/redis');
async function getOnlineUsers(page = 1, perPage = 10) {
  const keys = await redis.keys('online_user:*');
  const raw = await Promise.all(keys.map(k => redis.get(k)));

  const users = raw
    .map(JSON.parse)
    .sort((a, b) => b.last_activity - a.last_activity);

  const total = users.length;
  const start = (page - 1) * perPage;

  return {
    data: users.slice(start, start + perPage),
    meta: {
      total,
      per_page: perPage,
      current_page: page,
      last_page: Math.ceil(total / perPage),
    },
  };
}

async function getStats() {
  const keys = await redis.keys('online_user:*');
  const raw = await Promise.all(keys.map(k => redis.get(k)));
  const users = raw.map(JSON.parse);

  return {
    data: {
      total_online: users.length,
      guests: users.filter(u => u.is_guest).length,
      logged_in: users.filter(u => !u.is_guest).length,
    },
  };
}

module.exports = {
  getOnlineUsers,
  getStats,
};