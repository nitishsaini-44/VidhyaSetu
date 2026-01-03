import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { FiCalendar, FiTrendingUp, FiAward, FiBookOpen } from 'react-icons/fi';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    attendance: { percentage: 0, present: 0, absent: 0, total: 0 },
    performance: { avgPercentage: 0, totalQuizzes: 0 }
  });
  const [recentPerformance, setRecentPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [attendanceRes, quizHistoryRes] = await Promise.all([
        api.get('/attendance/stats'),
        api.get('/resources/quizzes/student-history')
      ]);

      const quizHistory = quizHistoryRes.data || [];
      const avgPercentage = quizHistory.length > 0 
        ? quizHistory.reduce((sum, q) => sum + q.percentage, 0) / quizHistory.length 
        : 0;

      setStats({
        attendance: attendanceRes.data,
        performance: { avgPercentage, totalQuizzes: quizHistory.length }
      });
      setRecentPerformance(quizHistory.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Get student's class from different possible locations
  const rawClass = user?.studentInfo?.class || user?.class_id || user?.class;
  // Handle different class formats - could be string, ObjectId, or object with name
  let studentClass = 'Not assigned';
  if (rawClass) {
    if (typeof rawClass === 'object' && rawClass.name) {
      // If class is populated object with name
      studentClass = rawClass.name;
    } else if (typeof rawClass === 'string') {
      // If it's a string, check if it's not just an ObjectId
      if (!/^[a-fA-F0-9]{24}$/.test(rawClass)) {
        studentClass = rawClass;
      }
    } else {
      // Could be an ObjectId object - try toString and check
      const classStr = String(rawClass);
      if (!/^[a-fA-F0-9]{24}$/.test(classStr) && classStr.length < 30) {
        studentClass = classStr;
      }
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Welcome back, {user?.name}! 👋
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
            borderRadius: 'var(--radius-lg)',
            color: 'white',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}>
            <FiBookOpen size={16} />
            Class: {studentClass}
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Here's your overview for today
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon primary">
              <FiCalendar size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.attendance.percentage}%</div>
          <div className="stat-label">Attendance Rate</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon success">
              <FiTrendingUp size={24} />
            </div>
          </div>
          <div className="stat-value">{Math.round(stats.performance.avgPercentage || 0)}%</div>
          <div className="stat-label">Average Score</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon warning">
              <FiAward size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.performance.totalQuizzes || 0}</div>
          <div className="stat-label">Quizzes Completed</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon danger">
              <FiBookOpen size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.attendance.present || 0}</div>
          <div className="stat-label">Days Present</div>
        </div>
      </div>

      {/* Recent Performance */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Quiz Performance</h3>
        </div>
        <div className="card-body">
          {recentPerformance.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <p className="empty-state-text">No quiz attempts yet</p>
              <p style={{ fontSize: '0.875rem' }}>Complete quizzes to see your performance here</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Quiz</th>
                    <th>Score</th>
                    <th>Date</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPerformance.map((perf) => (
                    <tr key={perf._id}>
                      <td>{perf.subject}</td>
                      <td>{perf.quiz_topic || '-'}</td>
                      <td>
                        <span className={`badge ${perf.percentage >= 70 ? 'badge-success' : perf.percentage >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                          {perf.score}/{perf.total_marks} ({perf.percentage}%)
                        </span>
                      </td>
                      <td>{new Date(perf.date).toLocaleDateString()}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          background: perf.percentage >= 80 ? 'rgba(16, 185, 129, 0.15)' : perf.percentage >= 60 ? 'rgba(79, 70, 229, 0.15)' : perf.percentage >= 40 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: perf.percentage >= 80 ? 'var(--secondary-color)' : perf.percentage >= 60 ? 'var(--primary-color)' : perf.percentage >= 40 ? 'var(--warning-color)' : 'var(--danger-color)'
                        }}>
                          {perf.percentage >= 90 ? 'A+' : perf.percentage >= 80 ? 'A' : perf.percentage >= 70 ? 'B+' : perf.percentage >= 60 ? 'B' : perf.percentage >= 50 ? 'C' : perf.percentage >= 40 ? 'D' : 'F'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
