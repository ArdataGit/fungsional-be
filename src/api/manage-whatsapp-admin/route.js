const express = require('express');
const router = express.Router();
const { 
  getWhatsappAdmins, 
  createWhatsappAdmin, 
  updateWhatsappAdmin, 
  deleteWhatsappAdmin 
} = require('./controller');

router.get('/get', getWhatsappAdmins);
router.post('/create', createWhatsappAdmin);
router.put('/update/:id', updateWhatsappAdmin);
router.delete('/delete/:id', deleteWhatsappAdmin);

module.exports = router;
