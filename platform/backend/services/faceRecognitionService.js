const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Face Recognition Service using API-based approach
 * This service provides face recognition functionality using cloud APIs
 * Supports: Azure Face API, AWS Rekognition, or custom implementation
 */

class FaceRecognitionService {
  constructor() {
    // API Configuration - supports multiple providers
    this.provider = process.env.FACE_API_PROVIDER || 'local'; // 'azure', 'aws', 'facepp', 'local'

    // Azure Face API Configuration
    this.azureEndpoint = process.env.AZURE_FACE_ENDPOINT;
    this.azureApiKey = process.env.AZURE_FACE_API_KEY;
    this.azurePersonGroupId = process.env.AZURE_PERSON_GROUP_ID || 'vidyasetu-ai-students';

    // Face++ API Configuration
    this.faceppApiKey = process.env.FACEPP_API_KEY;
    this.faceppApiSecret = process.env.FACEPP_API_SECRET;
    this.faceppFacesetToken = null;

    // AWS Rekognition Configuration
    this.awsRegion = process.env.AWS_REGION || 'us-east-1';
    this.awsCollectionId = process.env.AWS_COLLECTION_ID || 'vidyasetu-ai-students';

    // Local storage for face data (fallback/local mode)
    this.localDataPath = path.join(__dirname, '../data/faces');
    this.faceDatabase = new Map();
    this.attendanceRecords = new Map();

    // Ensure data directory exists
    this.ensureDataDirectory();

    // Load existing face data
    this.loadFaceDatabase();
  }

  /**
   * Ensure the data directory exists
   */
  ensureDataDirectory() {
    const directories = [
      path.join(__dirname, '../data'),
      this.localDataPath,
      path.join(__dirname, '../data/attendance')
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Load face database from disk
   */
  loadFaceDatabase() {
    try {
      const dbPath = path.join(__dirname, '../data/faceDatabase.json');
      if (fs.existsSync(dbPath)) {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        this.faceDatabase = new Map(Object.entries(data.faces || {}));
        console.log(`Loaded ${this.faceDatabase.size} face records from database`);
      }
    } catch (error) {
      console.error('Error loading face database:', error);
      this.faceDatabase = new Map();
    }
  }

  /**
   * Save face database to disk
   */
  saveFaceDatabase() {
    try {
      const dbPath = path.join(__dirname, '../data/faceDatabase.json');
      const data = {
        faces: Object.fromEntries(this.faceDatabase),
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving face database:', error);
    }
  }

  /**
   * Load today's attendance
   */
  loadTodayAttendance() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendancePath = path.join(__dirname, `../data/attendance/${today}.json`);
      if (fs.existsSync(attendancePath)) {
        const data = JSON.parse(fs.readFileSync(attendancePath, 'utf8'));
        this.attendanceRecords = new Map(Object.entries(data || {}));
      } else {
        this.attendanceRecords = new Map();
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      this.attendanceRecords = new Map();
    }
  }

  /**
   * Save today's attendance
   */
  saveTodayAttendance() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendancePath = path.join(__dirname, `../data/attendance/${today}.json`);
      const data = Object.fromEntries(this.attendanceRecords);
      fs.writeFileSync(attendancePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving attendance:', error);
    }
  }

  /**
   * Extract base64 image data from data URL and clean it
   */
  extractBase64(imageData) {
    if (!imageData || typeof imageData !== 'string') {
      throw new Error('Invalid image data provided');
    }

    let base64 = imageData;

    // Remove data URL prefix if present (handles jpeg, png, gif, webp, etc.)
    if (imageData.includes('base64,')) {
      base64 = imageData.split('base64,')[1];
    } else if (imageData.startsWith('data:')) {
      // Handle malformed data URLs
      const commaIndex = imageData.indexOf(',');
      if (commaIndex !== -1) {
        base64 = imageData.substring(commaIndex + 1);
      }
    }

    // Remove any whitespace, newlines, or invalid characters
    base64 = base64.replace(/[\s\r\n]/g, '');

    // Remove any non-base64 characters (keep only A-Z, a-z, 0-9, +, /, =)
    base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');

    // Ensure proper padding
    const paddingNeeded = (4 - (base64.length % 4)) % 4;
    base64 = base64 + '='.repeat(paddingNeeded);

    // Validate base64 string
    if (base64.length < 100) {
      console.error('Base64 string too short:', base64.length);
      throw new Error('Invalid image data - too short');
    }

    console.log('Extracted base64 length:', base64.length, 'First 50 chars:', base64.substring(0, 50));

    return base64;
  }

  /**
   * Generate unique face ID
   */
  generateFaceId() {
    return crypto.randomUUID();
  }

  // ==================== AZURE FACE API METHODS ====================

  /**
   * Create person group in Azure (one-time setup)
   */
  async azureCreatePersonGroup() {
    try {
      await axios.put(
        `${this.azureEndpoint}/face/v1.0/persongroups/${this.azurePersonGroupId}`,
        {
          name: 'VidyaSetu AI Students',
          userData: 'Students registered for face attendance'
        },
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureApiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      return { success: true, message: 'Person group created' };
    } catch (error) {
      if (error.response?.status === 409) {
        return { success: true, message: 'Person group already exists' };
      }
      throw error;
    }
  }

  /**
   * Register face using Azure Face API
   */
  async azureRegisterFace(studentId, name, imageBase64) {
    try {
      // Ensure person group exists
      await this.azureCreatePersonGroup();

      // Create person
      const createPersonResponse = await axios.post(
        `${this.azureEndpoint}/face/v1.0/persongroups/${this.azurePersonGroupId}/persons`,
        {
          name: name,
          userData: JSON.stringify({ studentId, registeredAt: new Date().toISOString() })
        },
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const personId = createPersonResponse.data.personId;

      // Add face to person
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      await axios.post(
        `${this.azureEndpoint}/face/v1.0/persongroups/${this.azurePersonGroupId}/persons/${personId}/persistedFaces`,
        imageBuffer,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureApiKey,
            'Content-Type': 'application/octet-stream'
          }
        }
      );

      // Train person group
      await axios.post(
        `${this.azureEndpoint}/face/v1.0/persongroups/${this.azurePersonGroupId}/train`,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureApiKey
          }
        }
      );

      return {
        success: true,
        personId,
        studentId,
        name,
        message: 'Face registered successfully with Azure'
      };
    } catch (error) {
      console.error('Azure registration error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Azure face registration failed');
    }
  }

  /**
   * Recognize face using Azure Face API
   */
  async azureRecognizeFace(imageBase64) {
    try {
      const imageBuffer = Buffer.from(imageBase64, 'base64');

      // Detect face
      const detectResponse = await axios.post(
        `${this.azureEndpoint}/face/v1.0/detect?returnFaceId=true`,
        imageBuffer,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureApiKey,
            'Content-Type': 'application/octet-stream'
          }
        }
      );

      if (!detectResponse.data || detectResponse.data.length === 0) {
        return { success: false, message: 'No face detected in image' };
      }

      const faceId = detectResponse.data[0].faceId;

      // Identify face
      const identifyResponse = await axios.post(
        `${this.azureEndpoint}/face/v1.0/identify`,
        {
          personGroupId: this.azurePersonGroupId,
          faceIds: [faceId],
          maxNumOfCandidatesReturned: 1,
          confidenceThreshold: 0.5
        },
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = identifyResponse.data[0];
      if (result.candidates && result.candidates.length > 0) {
        const personId = result.candidates[0].personId;
        const confidence = result.candidates[0].confidence;

        // Get person details
        const personResponse = await axios.get(
          `${this.azureEndpoint}/face/v1.0/persongroups/${this.azurePersonGroupId}/persons/${personId}`,
          {
            headers: {
              'Ocp-Apim-Subscription-Key': this.azureApiKey
            }
          }
        );

        const userData = JSON.parse(personResponse.data.userData || '{}');
        return {
          success: true,
          recognized: true,
          studentId: userData.studentId,
          name: personResponse.data.name,
          confidence: Math.round(confidence * 100),
          personId
        };
      }

      return { success: true, recognized: false, message: 'Face not recognized' };
    } catch (error) {
      console.error('Azure recognition error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Azure face recognition failed');
    }
  }

  // ==================== FACE++ API METHODS ====================

  /**
   * Helper function to delay execution (for rate limiting)
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper function to make Face++ API call with retry logic for rate limiting
   */
  async faceppApiCallWithRetry(url, params, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Add a small base delay before each request to respect rate limits
        if (attempt > 1) {
          const waitTime = 2000 * attempt; // Exponential backoff
          console.log(`Face++ retry ${attempt}/${maxRetries}, waiting ${waitTime}ms...`);
          await this.delay(waitTime);
        }

        const response = await axios.post(
          url,
          params.toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          }
        );
        return response;
      } catch (error) {
        const errorMsg = error.response?.data?.error_message;
        console.log(`Face++ API attempt ${attempt} error:`, errorMsg);

        if (errorMsg === 'CONCURRENCY_LIMIT_EXCEEDED' && attempt < maxRetries) {
          continue; // Will retry with delay
        }
        throw error;
      }
    }
    throw new Error('Face++ API max retries exceeded');
  }

  /**
   * Create FaceSet in Face++ (one-time setup)
   */
  async faceppCreateFaceSet() {
    // If we already have a token, skip creation
    if (this.faceppFacesetToken) {
      return { success: true, facesetToken: this.faceppFacesetToken, cached: true };
    }

    try {
      const createParams = new URLSearchParams();
      createParams.append('api_key', this.faceppApiKey);
      createParams.append('api_secret', this.faceppApiSecret);
      createParams.append('display_name', 'VidyaSetu AI Students');
      createParams.append('outer_id', 'vidyasetu_ai_students');

      const response = await this.faceppApiCallWithRetry(
        'https://api-us.faceplusplus.com/facepp/v3/faceset/create',
        createParams
      );
      this.faceppFacesetToken = response.data.faceset_token;
      return { success: true, facesetToken: this.faceppFacesetToken };
    } catch (error) {
      if (error.response?.data?.error_message?.includes('FACESET_EXIST')) {
        // Wait before getting existing faceset
        await this.delay(1500);

        // Get existing faceset with retry
        const getParams = new URLSearchParams();
        getParams.append('api_key', this.faceppApiKey);
        getParams.append('api_secret', this.faceppApiSecret);
        getParams.append('outer_id', 'vidyasetu_ai_students');

        const getResponse = await this.faceppApiCallWithRetry(
          'https://api-us.faceplusplus.com/facepp/v3/faceset/getdetail',
          getParams
        );
        this.faceppFacesetToken = getResponse.data.faceset_token;
        return { success: true, facesetToken: this.faceppFacesetToken, existing: true };
      }
      throw error;
    }
  }

  /**
   * Register face using Face++ API
   */
  async faceppRegisterFace(studentId, name, imageBase64) {
    try {
      // Ensure faceset exists
      await this.faceppCreateFaceSet();

      // Add delay after faceset creation to avoid rate limit
      await this.delay(1500);

      // Clean the base64 string
      const cleanBase64 = imageBase64.replace(/\s/g, '');

      console.log('Face++ registration - Image base64 length:', cleanBase64.length);

      // Create form data for detect request
      const detectParams = new URLSearchParams();
      detectParams.append('api_key', this.faceppApiKey);
      detectParams.append('api_secret', this.faceppApiSecret);
      detectParams.append('image_base64', cleanBase64);

      // Detect face and get face_token with retry
      const detectResponse = await this.faceppApiCallWithRetry(
        'https://api-us.faceplusplus.com/facepp/v3/detect',
        detectParams
      );

      if (!detectResponse.data.faces || detectResponse.data.faces.length === 0) {
        throw new Error('No face detected in the image');
      }

      const faceToken = detectResponse.data.faces[0].face_token;
      console.log('Face++ - Face detected, token:', faceToken);

      // Wait before next API call to avoid rate limit
      await this.delay(2000);

      // Set user_id for the face with retry
      const setUserIdParams = new URLSearchParams();
      setUserIdParams.append('api_key', this.faceppApiKey);
      setUserIdParams.append('api_secret', this.faceppApiSecret);
      setUserIdParams.append('face_token', faceToken);
      setUserIdParams.append('user_id', studentId);

      await this.faceppApiCallWithRetry(
        'https://api-us.faceplusplus.com/facepp/v3/face/setuserid',
        setUserIdParams
      );

      // Wait before next API call
      await this.delay(2000);

      // Add face to faceset with retry
      const addFaceParams = new URLSearchParams();
      addFaceParams.append('api_key', this.faceppApiKey);
      addFaceParams.append('api_secret', this.faceppApiSecret);
      addFaceParams.append('faceset_token', this.faceppFacesetToken);
      addFaceParams.append('face_tokens', faceToken);

      await this.faceppApiCallWithRetry(
        'https://api-us.faceplusplus.com/facepp/v3/faceset/addface',
        addFaceParams
      );

      // Store name mapping locally
      this.faceDatabase.set(studentId, {
        studentId,
        name,
        faceToken,
        registeredAt: new Date().toISOString(),
        provider: 'facepp'
      });
      this.saveFaceDatabase();

      return {
        success: true,
        faceToken,
        studentId,
        name,
        message: 'Face registered successfully with Face++'
      };
    } catch (error) {
      console.error('Face++ registration error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_message || 'Face++ registration failed');
    }
  }

  /**
   * Recognize face using Face++ API
   */
  async faceppRecognizeFace(imageBase64) {
    try {
      if (!this.faceppFacesetToken) {
        await this.faceppCreateFaceSet();
        await this.delay(1500);
      }

      // Clean the base64 string
      const cleanBase64 = imageBase64.replace(/\s/g, '');

      const searchParams = new URLSearchParams();
      searchParams.append('api_key', this.faceppApiKey);
      searchParams.append('api_secret', this.faceppApiSecret);
      searchParams.append('image_base64', cleanBase64);
      searchParams.append('faceset_token', this.faceppFacesetToken);

      // Use retry logic for search
      const response = await this.faceppApiCallWithRetry(
        'https://api-us.faceplusplus.com/facepp/v3/search',
        searchParams
      );

      if (response.data.results && response.data.results.length > 0) {
        const bestMatch = response.data.results[0];
        const studentId = bestMatch.user_id;
        const studentData = this.faceDatabase.get(studentId);

        return {
          success: true,
          recognized: true,
          studentId,
          name: studentData?.name || studentId,
          confidence: Math.round(bestMatch.confidence),
          faceToken: bestMatch.face_token
        };
      }

      return { success: true, recognized: false, message: 'Face not recognized' };
    } catch (error) {
      console.error('Face++ recognition error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_message || 'Face++ recognition failed');
    }
  }

  // ==================== LOCAL/SIMPLE METHODS ====================

  /**
   * Register face locally (stores image hash and metadata)
   * This is a simplified approach - for production, use cloud APIs
   */
  async localRegisterFace(studentId, name, imageBase64) {
    try {
      // Generate a unique identifier for this face
      const faceId = this.generateFaceId();

      // Create hash of image for basic deduplication
      const imageHash = crypto.createHash('sha256').update(imageBase64).digest('hex');

      // Store face image
      const imagePath = path.join(this.localDataPath, `${studentId}.jpg`);
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      fs.writeFileSync(imagePath, imageBuffer);

      // Store face data
      const faceData = {
        studentId,
        name,
        faceId,
        imageHash,
        imagePath,
        registeredAt: new Date().toISOString(),
        provider: 'local'
      };

      this.faceDatabase.set(studentId, faceData);
      this.saveFaceDatabase();

      return {
        success: true,
        studentId,
        name,
        faceId,
        message: 'Face registered successfully (local storage)'
      };
    } catch (error) {
      console.error('Local registration error:', error);
      throw new Error('Local face registration failed: ' + error.message);
    }
  }

  /**
   * Simple face recognition using stored images
   * Note: This is a basic implementation. For production, use cloud APIs
   */
  async localRecognizeFace(imageBase64) {
    // In local mode, we can't do actual face matching without ML
    // This would need to be connected to a face comparison API
    return {
      success: false,
      recognized: false,
      message: 'Local recognition requires API configuration. Please set up Azure, Face++, or AWS Rekognition API keys.'
    };
  }

  // ==================== MAIN API METHODS ====================

  /**
   * Register a new face
   */
  async registerFace(studentId, name, imageData) {
    const imageBase64 = this.extractBase64(imageData);

    switch (this.provider) {
      case 'azure':
        if (!this.azureApiKey || !this.azureEndpoint) {
          throw new Error('Azure Face API credentials not configured');
        }
        return await this.azureRegisterFace(studentId, name, imageBase64);

      case 'facepp':
        if (!this.faceppApiKey || !this.faceppApiSecret) {
          throw new Error('Face++ API credentials not configured');
        }
        return await this.faceppRegisterFace(studentId, name, imageBase64);

      case 'local':
      default:
        return await this.localRegisterFace(studentId, name, imageBase64);
    }
  }

  /**
   * Recognize a face from image
   */
  async recognizeFace(imageData) {
    const imageBase64 = this.extractBase64(imageData);

    switch (this.provider) {
      case 'azure':
        if (!this.azureApiKey || !this.azureEndpoint) {
          throw new Error('Azure Face API credentials not configured');
        }
        return await this.azureRecognizeFace(imageBase64);

      case 'facepp':
        if (!this.faceppApiKey || !this.faceppApiSecret) {
          throw new Error('Face++ API credentials not configured');
        }
        return await this.faceppRecognizeFace(imageBase64);

      case 'local':
      default:
        return await this.localRecognizeFace(imageBase64);
    }
  }

  /**
   * Remove a registered face
   */
  async removeFace(studentId) {
    try {
      // Remove from local database
      const faceData = this.faceDatabase.get(studentId);
      if (!faceData) {
        return { success: false, message: 'Student not found in face database' };
      }

      // Remove image file if exists
      if (faceData.imagePath && fs.existsSync(faceData.imagePath)) {
        fs.unlinkSync(faceData.imagePath);
      }

      // Remove from cloud provider if applicable
      if (this.provider === 'azure' && faceData.personId) {
        try {
          await axios.delete(
            `${this.azureEndpoint}/face/v1.0/persongroups/${this.azurePersonGroupId}/persons/${faceData.personId}`,
            {
              headers: { 'Ocp-Apim-Subscription-Key': this.azureApiKey }
            }
          );
        } catch (error) {
          console.error('Error removing from Azure:', error.message);
        }
      }

      if (this.provider === 'facepp' && faceData.faceToken) {
        try {
          await axios.post(
            'https://api-us.faceplusplus.com/facepp/v3/faceset/removeface',
            new URLSearchParams({
              api_key: this.faceppApiKey,
              api_secret: this.faceppApiSecret,
              faceset_token: this.faceppFacesetToken,
              face_tokens: faceData.faceToken
            }),
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
          );
        } catch (error) {
          console.error('Error removing from Face++:', error.message);
        }
      }

      // Remove from local database
      this.faceDatabase.delete(studentId);
      this.saveFaceDatabase();

      return {
        success: true,
        studentId,
        message: 'Face removed successfully'
      };
    } catch (error) {
      console.error('Remove face error:', error);
      throw new Error('Failed to remove face: ' + error.message);
    }
  }

  /**
   * Get all registered students
   */
  getAllStudents() {
    const students = [];
    this.faceDatabase.forEach((data, studentId) => {
      students.push({
        student_id: studentId,
        name: data.name,
        registered_at: data.registeredAt,
        provider: data.provider
      });
    });
    return students;
  }

  /**
   * Get system statistics
   */
  getStats() {
    this.loadTodayAttendance();
    return {
      total_students: this.faceDatabase.size,
      total_attendance: this.attendanceRecords.size,
      provider: this.provider,
      api_configured: this.isApiConfigured()
    };
  }

  /**
   * Check if API is properly configured
   */
  isApiConfigured() {
    switch (this.provider) {
      case 'azure':
        return !!(this.azureApiKey && this.azureEndpoint);
      case 'facepp':
        return !!(this.faceppApiKey && this.faceppApiSecret);
      case 'aws':
        return !!process.env.AWS_ACCESS_KEY_ID;
      case 'local':
        return true;
      default:
        return false;
    }
  }

  /**
   * Mark attendance for a student
   */
  markAttendance(studentId, name, confidence) {
    this.loadTodayAttendance();

    const now = new Date();
    const attendanceKey = studentId;

    // Check if already marked
    if (this.attendanceRecords.has(attendanceKey)) {
      return {
        success: true,
        already_marked: true,
        studentId,
        name,
        message: 'Attendance already marked for today'
      };
    }

    // Mark attendance
    this.attendanceRecords.set(attendanceKey, {
      student_id: studentId,
      name: name,
      time: now.toISOString(),
      confidence: confidence,
      date: now.toISOString().split('T')[0]
    });

    this.saveTodayAttendance();

    return {
      success: true,
      already_marked: false,
      studentId,
      name,
      time: now.toISOString(),
      message: 'Attendance marked successfully'
    };
  }

  /**
   * Get today's attendance records
   */
  getTodayAttendance() {
    this.loadTodayAttendance();
    const records = [];
    this.attendanceRecords.forEach((data) => {
      records.push(data);
    });
    return records;
  }

  /**
   * Clear today's attendance
   */
  clearTodayAttendance() {
    this.attendanceRecords = new Map();
    this.saveTodayAttendance();
    return { success: true, message: "Today's attendance cleared" };
  }

  /**
   * Get attendance for a specific date
   */
  getAttendanceByDate(date) {
    try {
      const attendancePath = path.join(__dirname, `../data/attendance/${date}.json`);
      if (fs.existsSync(attendancePath)) {
        const data = JSON.parse(fs.readFileSync(attendancePath, 'utf8'));
        return Object.values(data);
      }
      return [];
    } catch (error) {
      console.error('Error loading attendance for date:', error);
      return [];
    }
  }

  /**
   * Get server/service status
   */
  getStatus() {
    return {
      online: true,
      provider: this.provider,
      api_configured: this.isApiConfigured(),
      total_registered: this.faceDatabase.size,
      message: this.isApiConfigured()
        ? `Face Recognition service running with ${this.provider} provider`
        : 'Service running in local mode. Configure API keys for cloud recognition.'
    };
  }
}

// Export singleton instance
module.exports = new FaceRecognitionService();
