# Face Recognition Attendance System - Integration Guide

## Architecture Overview

The face recognition system operates across two devices:
1. **Registration Device** (Your PC) - Where students are registered via the platform
2. **ML Device** - Where the face recognition model runs to mark attendance

```
┌─────────────────────────────┐      ┌─────────────────────────────┐
│    Registration Device      │      │       ML Device             │
│  (Platform Frontend/Backend)│      │  (Flask + InsightFace)      │
├─────────────────────────────┤      ├─────────────────────────────┤
│  - React Frontend           │      │  - Flask Server (port 5001) │
│  - Node.js Backend          │──────│  - InsightFace Model        │
│  - MongoDB Database         │      │  - Camera for Recognition   │
│                             │      │  - Embeddings Database      │
└─────────────────────────────┘      └─────────────────────────────┘
```

## Setup Instructions

### 1. ML Device Setup (Device running face recognition)

```bash
# Navigate to the SmartFaceAttendanceSystem folder
cd SmartFaceAttendanceSystem

# Install Python dependencies
pip install -r requirements.txt
pip install -r web/requirements.txt

# Start the Flask server
cd web
python app.py
```

The Flask server will start on `http://0.0.0.0:5001`

**Important:** Note down the IP address of this device (e.g., `192.168.1.100`)

### 2. Platform Backend Setup (Registration Device)

```bash
# Navigate to platform backend
cd SmartFaceAttendanceSystem/platform/backend

# Install dependencies
npm install

# Create/Update .env file with FR Server URL
echo "FR_SERVER_URL=http://<ML_DEVICE_IP>:5001" >> .env

# Example:
# FR_SERVER_URL=http://192.168.1.100:5001

# Start the backend
npm run dev
```

### 3. Platform Frontend Setup

```bash
# Navigate to platform frontend
cd SmartFaceAttendanceSystem/platform/frontend

# Install dependencies
npm install

# Start the frontend
npm start
```

## Configuration

### Environment Variables (Backend .env)

```env
# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/vidyasetu

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Face Recognition Server URL (ML Device)
FR_SERVER_URL=http://192.168.1.100:5001
```

### Finding ML Device IP

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

**Linux/Mac:**
```bash
ifconfig
# or
ip addr
```

## Usage Guide

### Accessing Face Recognition in Platform

1. Login to the platform as **Management** user
2. Navigate to **Face Recognition** in the sidebar
3. You'll see:
   - Server status (Online/Offline)
   - Registered students count
   - Today's attendance

### Adding a Student to Face Recognition

1. Click **Add Student** button
2. Optionally select a student from the platform dropdown to auto-fill
3. Enter Student ID and Name
4. Click **Open Camera** to capture the student's photo
5. Position the face clearly in the frame
6. Click **Capture Photo**
7. Click **Register Student**

### Removing a Student

1. Go to the **Students** tab
2. Click the remove icon next to the student
3. Confirm removal

### Starting Attendance Recognition

1. Ensure ML Server shows **Online**
2. Click **Start Recognition** button
3. The camera on the ML device will start recognizing faces
4. Attendance is automatically marked when a registered face is detected

### Viewing Attendance

1. Go to the **Attendance** tab
2. View all students who have been marked present today
3. Click **Refresh** to update the list

## API Endpoints

### Platform Backend (Node.js)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/face-recognition/status` | GET | Get ML server status |
| `/api/face-recognition/students` | GET | Get registered students |
| `/api/face-recognition/stats` | GET | Get FR statistics |
| `/api/face-recognition/attendance` | GET | Get today's attendance |
| `/api/face-recognition/register` | POST | Register student |
| `/api/face-recognition/remove/:id` | DELETE | Remove student |
| `/api/face-recognition/start` | POST | Start recognition |
| `/api/face-recognition/stop` | POST | Stop recognition |
| `/api/face-recognition/clear-attendance` | POST | Clear today's attendance |

### Flask ML Server

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/students` | GET | Get registered students |
| `/api/stats` | GET | Get statistics |
| `/api/attendance` | GET | Get attendance records |
| `/api/register` | POST | Register student with face |
| `/api/remove` | POST | Remove student |
| `/api/camera-status` | GET | Get camera/recognition status |
| `/api/start-recognition` | POST | Start face recognition |
| `/api/stop-recognition` | POST | Stop face recognition |
| `/api/clear-attendance` | POST | Clear attendance |
| `/api/video-feed` | GET | Video stream for web UI |

## Troubleshooting

### ML Server shows Offline

1. Ensure Flask server is running on ML device
2. Check network connectivity between devices
3. Verify firewall allows connections on port 5001
4. Check the FR_SERVER_URL in backend .env matches ML device IP

### No Face Detected during Registration

1. Ensure good lighting
2. Face should be clearly visible and centered
3. Remove glasses/masks if possible
4. Try moving closer/further from camera

### Face Not Recognized during Attendance

1. Ensure student is registered in the system
2. Check lighting conditions
3. Face should be at similar angle as registration photo
4. Threshold may need adjustment (default 0.5)

### CORS Errors

The Flask server has CORS enabled for all origins. If issues persist:
1. Check browser console for specific errors
2. Ensure both servers are accessible
3. Try clearing browser cache

## Database Files

The ML system stores data in:
- `database/embeddings.pkl` - Face embeddings
- `database/students.csv` - Student info
- `attendance/attendance.csv` - Attendance records
- `captured_images/` - Captured registration photos
