const express = require('express');
const router = express.Router();
const {
  getMessages,
  sendMessage,
  removeMessage,
} = require('./controller');
const { authenticateUser } = require('#middlewares');

// Chat Ticket routes
router.get('/:ticketId', getMessages);
router.post('/', sendMessage);
router.delete('/:id', removeMessage);

module.exports = router;
