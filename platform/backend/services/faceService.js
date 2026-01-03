const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5001';

/**
 * Send image to Python Face Recognition Service
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} - Recognition result
 */
async function recognizeFace(imagePath) {
    try {
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));

        const response = await axios.post(`${PYTHON_SERVICE_URL}/recognize`, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        return response.data;
    } catch (error) {
        console.error('Face Service Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            throw new Error(JSON.stringify(error.response.data));
        }
        throw error;
    }
}

module.exports = {
    recognizeFace
};
