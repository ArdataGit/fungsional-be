const express = require('express');
const router = express.Router();
const { getSidebarMenus, updateSidebarMenu, createSidebarMenu } = require('./controller');

router.get('/get', getSidebarMenus);
router.post('/create', createSidebarMenu);
router.put('/update/:id', updateSidebarMenu);

module.exports = router;
