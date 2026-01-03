# VidyaSetu AI - Educational Platform

A comprehensive MERN stack educational platform with role-based access control, integrating with a face recognition attendance system.

## 🎯 Features

### For Students
- View personal attendance records
- Track performance across quizzes
- Take AI-generated quizzes from curriculum
- View AI-powered feedback on performance

### For Teachers
- Mark student attendance
- Upload curriculum PDFs
- Generate quizzes using OpenAI from uploaded content
- Generate lesson plans using AI
- Voice-enabled AI assistant for querying student data
- View student performance and attendance reports

### For Management
- Complete user management (CRUD operations)
- Dashboard with platform statistics
- Attendance reports with export functionality
- Monitor all classes and students

## 🏗️ Project Structure

```
platform/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── attendanceController.js
│   │   ├── performanceController.js
│   │   ├── resourceController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── uploadMiddleware.js
│   ├── models/
│   │   ├── Attendance.js
│   │   ├── Performance.js
│   │   ├── Resource.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── performanceRoutes.js
│   │   ├── resourceRoutes.js
│   │   └── userRoutes.js
│   ├── .env
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── context/
        │   └── AuthContext.js
        ├── layouts/
        │   └── Layout.js
        ├── pages/
        │   ├── auth/
        │   │   ├── LoginPage.js
        │   │   └── RegisterPage.js
        │   ├── student/
        │   │   ├── StudentDashboard.js
        │   │   ├── StudentAttendance.js
        │   │   ├── StudentPerformance.js
        │   │   └── StudentQuiz.js
        │   ├── teacher/
        │   │   ├── TeacherDashboard.js
        │   │   ├── TeacherAttendance.js
        │   │   ├── TeacherResources.js
        │   │   ├── TeacherStudents.js
        │   │   └── TeacherAIAssistant.js
        │   └── management/
        │       ├── ManagementDashboard.js
        │       ├── ManagementUsers.js
        │       └── ManagementReports.js
        ├── services/
        │   └── api.js
        ├── styles/
        │   └── index.css
        ├── App.js
        └── index.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- OpenAI API Key

### Backend Setup

1. Navigate to backend directory:
```bash
cd platform/backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vidyasetu
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
```

4. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd platform/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000` and proxy API requests to `http://localhost:5000`.

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update profile

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark single attendance
- `POST /api/attendance/bulk` - Bulk mark attendance
- `GET /api/attendance/stats` - Get attendance statistics

### Resources
- `GET /api/resources` - Get all resources
- `POST /api/resources/upload` - Upload PDF curriculum
- `POST /api/resources/:id/generate-quiz` - Generate quiz from resource
- `POST /api/resources/:id/generate-lesson-plan` - Generate lesson plan

### Performance
- `GET /api/performance` - Get performance records
- `POST /api/performance/submit-quiz` - Submit quiz answers
- `GET /api/performance/stats` - Get performance statistics
- `POST /api/performance/ai-query` - AI-powered query for student data

### Users (Management)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/dashboard/stats` - Get dashboard statistics

## 🔐 Role-Based Access

| Feature | Student | Teacher | Management |
|---------|---------|---------|------------|
| View Own Attendance | ✅ | - | - |
| View Own Performance | ✅ | - | - |
| Take Quizzes | ✅ | - | - |
| Mark Attendance | ❌ | ✅ | ✅ |
| Upload Resources | ❌ | ✅ | ✅ |
| Generate Quiz/Plans | ❌ | ✅ | ✅ |
| AI Assistant | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| View All Reports | ❌ | ❌ | ✅ |

## 🛠️ Technologies Used

### Backend
- Node.js & Express.js
- MongoDB & Mongoose
- JWT Authentication
- OpenAI API
- Multer (File uploads)
- PDF-Parse (PDF text extraction)

### Frontend
- React 18
- React Router v6
- Axios
- React Toastify
- React Icons
- Web Speech API (Voice input)

## 🔗 Integration with Face Recognition System

This platform is designed to work alongside the existing Python-based face recognition attendance system. The `User` model includes a `face_encoding` field (128-d vector) that can be populated by the Python system for face-based attendance marking.


