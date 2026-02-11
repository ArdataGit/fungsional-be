const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get('/get', controller.get);
router.post('/insert', controller.insert);
router.patch('/update/:id', controller.update);
router.delete('/remove/:id', controller.remove);
router.get('/:id', controller.find);

module.exports = router;