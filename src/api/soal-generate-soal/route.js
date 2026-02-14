const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { upload } = require('#utils');

router.get('/get', controller.get);
router.get('/find/:id', controller.find);
router.post('/insert', controller.insert);
router.patch('/update/:id', controller.update);
router.delete('/remove/:id', controller.remove);
router.post('/import', upload('soal').single('file'), controller.importSoal);

module.exports = router;
