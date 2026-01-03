const faceService = require('../services/faceService');
const fs = require('fs');

/**
 * Handle Face Recognition Request
 */
async function recognize(req, res) {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No image uploaded' });
    }

    try {
        const result = await faceService.recognizeFace(req.file.path);
        
        // Cleanup uploaded file after processing
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Failed to look cleanup upload:', err);
        });

        res.json(result);
    } catch (error) {
        console.error('Controller Error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
}

module.exports = {
    recognize
};
