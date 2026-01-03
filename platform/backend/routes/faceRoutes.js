const express = require('express');
const router = express.Router();
const multer = require('multer');
const faceController = require('../controllers/faceController');
const path = require('path');

// Configure Multer for temp uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)) // Append extension
    }
});

const upload = multer({ storage: storage });

// POST /api/face/recognize
router.post('/recognize', upload.single('image'), faceController.recognize);

module.exports = router;
