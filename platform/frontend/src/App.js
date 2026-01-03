import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import Layout from './layouts/Layout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentPerformance from './pages/student/StudentPerformance';
import StudentQuiz from './pages/student/StudentQuiz';
import StudentAIChatbot from './pages/student/StudentAIChatbot';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherResources from './pages/teacher/TeacherResources';
import TeacherStudents from './pages/teacher/TeacherStudents';
import TeacherAIAssistant from './pages/teacher/TeacherAIAssistant';
import TeacherQuizHistory from './pages/teacher/TeacherQuizHistory';

// Management Pages
import ManagementDashboard from './pages/management/ManagementDashboard';
import ManagementUsers from './pages/management/ManagementUsers';
import ManagementReports from './pages/management/ManagementReports';
import ManagementFaceRecognition from './pages/management/ManagementFaceRecognition';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const dashboardRoutes = {
      student: '/student/dashboard',
      teacher: '/teacher/dashboard',
      management: '/management/dashboard'
    };
    return <Navigate to={dashboardRoutes[user.role]} replace />;
  }

  return children;
};

// Public Route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (user) {
    const dashboardRoutes = {
      student: '/student/dashboard',
      teacher: '/teacher/dashboard',
      management: '/management/dashboard'
    };
    return <Navigate to={dashboardRoutes[user.role]} replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Student Routes */}
      <Route path="/student" element={
        <ProtectedRoute allowedRoles={['student']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="performance" element={<StudentPerformance />} />
        <Route path="quiz" element={<StudentQuiz />} />
        <Route path="quiz/:quizId" element={<StudentQuiz />} />
        <Route path="ai-assistant" element={<StudentAIChatbot />} />
      </Route>

      {/* Teacher Routes */}
      <Route path="/teacher" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="resources" element={<TeacherResources />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="ai-assistant" element={<TeacherAIAssistant />} />
        <Route path="quiz-history" element={<TeacherQuizHistory />} />
      </Route>

      {/* Management Routes */}
      <Route path="/management" element={
        <ProtectedRoute allowedRoles={['management']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<ManagementDashboard />} />
        <Route path="users" element={<ManagementUsers />} />
        <Route path="reports" element={<ManagementReports />} />
        <Route path="face-recognition" element={<ManagementFaceRecognition />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
