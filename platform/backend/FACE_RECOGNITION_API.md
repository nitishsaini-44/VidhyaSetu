# Face Recognition API System

## Overview

This face recognition system uses cloud-based APIs for face detection, registration, and recognition. It supports multiple providers and can be configured through environment variables.

## Supported Providers

1. **Azure Face API** - Microsoft's face recognition service
2. **Face++** - Face++ API service
3. **AWS Rekognition** - Amazon's face recognition service
4. **Local** - Basic local storage (limited functionality)

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Provider Selection (azure, facepp, aws, or local)
FACE_API_PROVIDER=local

# Azure Face API
AZURE_FACE_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_FACE_API_KEY=your_azure_face_api_key
AZURE_PERSON_GROUP_ID=vidyasetu-ai-students

# Face++ API
FACEPP_API_KEY=your_facepp_api_key
FACEPP_API_SECRET=your_facepp_api_secret

# AWS Rekognition
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_COLLECTION_ID=vidyasetu-ai-students
```

## API Endpoints

### Status & Configuration

- `GET /api/face-recognition/status` - Get service status
- `GET /api/face-recognition/config` - Get API configuration details
- `GET /api/face-recognition/stats` - Get system statistics

### Student Management

- `GET /api/face-recognition/students` - List all registered students
- `POST /api/face-recognition/register` - Register a new student
- `POST /api/face-recognition/bulk-register` - Bulk register students
- `DELETE /api/face-recognition/remove/:studentId` - Remove a student

### Attendance

- `GET /api/face-recognition/attendance` - Get today's attendance
- `POST /api/face-recognition/recognize` - Recognize face and mark attendance
- `POST /api/face-recognition/sync-attendance` - Sync to platform database
- `POST /api/face-recognition/clear-attendance` - Clear today's records

### Recognition Control

- `POST /api/face-recognition/start` - Initialize recognition service
- `POST /api/face-recognition/stop` - Stop recognition service

## Usage Examples

### Register a Student

```javascript
POST /api/face-recognition/register
Content-Type: application/json

{
  "student_id": "STU001",
  "name": "John Doe",
  "image_data": "data:image/jpeg;base64,/9j/4AAQ...",
  "platform_user_id": "optional_mongodb_user_id"
}
```

### Recognize Face

```javascript
POST /api/face-recognition/recognize
Content-Type: application/json

{
  "image_data": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

### Response

```json
{
  "success": true,
  "recognized": true,
  "studentId": "STU001",
  "name": "John Doe",
  "confidence": 95,
  "attendance": {
    "success": true,
    "already_marked": false,
    "time": "2024-01-15T09:30:00.000Z"
  }
}
```

## Setting Up Cloud Providers

### Azure Face API

1. Create an Azure account at https://azure.microsoft.com
2. Create a Face API resource in Azure Portal
3. Copy the endpoint URL and API key
4. Set `FACE_API_PROVIDER=azure` in your .env file

### Face++

1. Sign up at https://www.faceplusplus.com
2. Create an application to get API key and secret
3. Set `FACE_API_PROVIDER=facepp` in your .env file

### AWS Rekognition

1. Create an AWS account
2. Create IAM user with Rekognition permissions
3. Get access key and secret key
4. Set `FACE_API_PROVIDER=aws` in your .env file

## Local Mode

When running in local mode (`FACE_API_PROVIDER=local`):
- Student photos are stored locally in `data/faces/`
- Face metadata is stored in `data/faceDatabase.json`
- Attendance records are stored in `data/attendance/`
- **Note**: Local mode only stores faces but cannot perform actual face matching without a cloud API

## Security Considerations

1. Never commit API keys to version control
2. Use environment variables for all sensitive data
3. Implement rate limiting for production use
4. Secure image data in transit (HTTPS)
5. Regular cleanup of unused face data

## Data Storage

```
platform/backend/data/
├── faces/           # Stored face images
├── attendance/      # Daily attendance JSON files
└── faceDatabase.json # Face registration metadata
```

## Troubleshooting

### "API not configured" error
- Ensure the correct environment variables are set
- Restart the server after changing .env

### Recognition not working
- Verify API keys are valid
- Check if students are properly registered
- Ensure image quality is good (clear, well-lit face)

### Attendance not syncing
- Check MongoDB connection
- Verify student has `faceRegistrationId` in platform
