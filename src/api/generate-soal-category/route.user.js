const express = require('express');
const router = express.Router();
const controller = require('../parent-generate-soal-category/controller');

router.get('/get', controller.get);
router.get('/find/:id', controller.find);

module.exports = router;
