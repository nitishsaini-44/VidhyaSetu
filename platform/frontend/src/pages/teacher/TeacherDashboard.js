import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  FiUsers, FiCalendar, FiBook, FiTrendingUp, FiAward, 
  FiBarChart2, FiStar, FiMedal, FiTarget 
} from 'react-icons/fi';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalResources: 0,
    todayAttendance: 0,
    avgPerformance: 0
  });
  const [recentResources, setRecentResources] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, resourcesRes, leaderboardRes, performanceRes] = await Promise.all([
        api.get('/users?role=student'),
        api.get('/resources'),
        api.get('/performance/leaderboard').catch(() => ({ data: [] })),
        api.get('/performance/class-stats').catch(() => ({ data: [] }))
      ]);

      const students = usersRes.data || [];
      const avgPerf = leaderboardRes.data?.length > 0 
        ? Math.round(leaderboardRes.data.reduce((sum, s) => sum + (s.avgScore || 0), 0) / leaderboardRes.data.length)
        : 0;

      setStats({
        totalStudents: students.length,
        totalResources: resourcesRes.data?.length || 0,
        todayAttendance: 0,
        avgPerformance: avgPerf
      });
      setRecentResources(resourcesRes.data?.slice(0, 5) || []);
      setLeaderboard(leaderboardRes.data?.slice(0, 10) || []);
      setPerformanceData(performanceRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
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

  // Get teacher's subject from different possible locations
  const getTeacherSubject = () => {
    // Check teacherInfo.specialization (set during registration)
    if (user?.teacherInfo?.specialization) {
      return user.teacherInfo.specialization;
    }
    // Check teacherInfo.subjects array (populated)
    if (user?.teacherInfo?.subjects && user.teacherInfo.subjects.length > 0) {
      const subjects = user.teacherInfo.subjects;
      if (typeof subjects[0] === 'object' && subjects[0].name) {
        return subjects.map(s => s.name).join(', ');
      }
      return subjects.join(', ');
    }
    // Check direct subject field
    if (user?.subject) {
      return user.subject;
    }
    // Check teacherInfo.department
    if (user?.teacherInfo?.department) {
      return user.teacherInfo.department;
    }
    return 'Not assigned';
  };

  const teacherSubject = getTeacherSubject();

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Welcome, {user?.name}! 👋
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Subject: {teacherSubject} | Here's your class overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon primary">
              <FiUsers size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.totalStudents}</div>
          <div className="stat-label">Total Students</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon success">
              <FiBook size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.totalResources}</div>
          <div className="stat-label">Resources Uploaded</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon warning">
              <FiCalendar size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.todayAttendance}%</div>
          <div className="stat-label">Today's Attendance</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon danger">
              <FiTrendingUp size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.avgPerformance}%</div>
          <div className="stat-label">Avg. Class Performance</div>
        </div>
      </div>

      {/* Leaderboard & Performance Graph Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Student Leaderboard */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiAward color="#F59E0B" /> Top Performing Students
            </h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {leaderboard.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-icon">🏆</div>
                <p className="empty-state-text">No quiz data yet</p>
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {leaderboard.map((student, index) => (
                  <div 
                    key={student._id || index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      borderBottom: '1px solid var(--border-color)',
                      background: index < 3 ? `rgba(${index === 0 ? '245, 158, 11' : index === 1 ? '156, 163, 175' : '180, 83, 9'}, 0.05)` : 'transparent'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: index === 0 ? 'linear-gradient(135deg, #F59E0B, #D97706)' 
                                : index === 1 ? 'linear-gradient(135deg, #9CA3AF, #6B7280)' 
                                : index === 2 ? 'linear-gradient(135deg, #B45309, #92400E)'
                                : 'var(--background)',
                      color: index < 3 ? 'white' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: index < 3 ? '1rem' : '0.875rem'
                    }}>
                      {index < 3 ? (
                        index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{student.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {student.quizCount || 0} quizzes taken
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: student.avgScore >= 80 ? 'var(--success-color)' 
                             : student.avgScore >= 60 ? 'var(--warning-color)' 
                             : 'var(--danger-color)'
                      }}>
                        {Math.round(student.avgScore || 0)}%
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        avg score
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Performance Distribution Graph */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiBarChart2 color="var(--primary-color)" /> Performance Distribution
            </h3>
          </div>
          <div className="card-body">
            {performanceData.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <p className="empty-state-text">No performance data yet</p>
              </div>
            ) : (
              <div>
                {/* Simple Bar Chart */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { label: 'Excellent (80-100%)', color: '#10B981', key: 'excellent' },
                    { label: 'Good (60-79%)', color: '#F59E0B', key: 'good' },
                    { label: 'Average (40-59%)', color: '#6366F1', key: 'average' },
                    { label: 'Needs Work (<40%)', color: '#EF4444', key: 'poor' }
                  ].map((category) => {
                    const count = performanceData.filter(p => {
                      const score = p.avgScore || p.percentage || 0;
                      if (category.key === 'excellent') return score >= 80;
                      if (category.key === 'good') return score >= 60 && score < 80;
                      if (category.key === 'average') return score >= 40 && score < 60;
                      return score < 40;
                    }).length;
                    const total = performanceData.length || 1;
                    const percentage = Math.round((count / total) * 100);
                    
                    return (
                      <div key={category.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.875rem' }}>{category.label}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{count} students ({percentage}%)</span>
                        </div>
                        <div style={{ 
                          height: '24px', 
                          background: 'var(--background)', 
                          borderRadius: 'var(--radius)',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: category.color,
                            borderRadius: 'var(--radius)',
                            transition: 'width 0.5s ease-out',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: percentage > 10 ? '0.5rem' : 0
                          }}>
                            {percentage > 10 && (
                              <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                {percentage}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Stats */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '1rem',
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: 'var(--background)',
                  borderRadius: 'var(--radius)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                      {performanceData.length > 0 ? Math.max(...performanceData.map(p => p.avgScore || p.percentage || 0)).toFixed(0) : 0}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Highest Score</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                      {performanceData.length > 0 
                        ? (performanceData.reduce((sum, p) => sum + (p.avgScore || p.percentage || 0), 0) / performanceData.length).toFixed(0) 
                        : 0}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Class Average</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>
                      {performanceData.length > 0 ? Math.min(...performanceData.map(p => p.avgScore || p.percentage || 0)).toFixed(0) : 0}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Lowest Score</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Resources */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Resources</h3>
        </div>
        <div className="card-body">
          {recentResources.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <p className="empty-state-text">No resources uploaded yet</p>
              <p style={{ fontSize: '0.875rem' }}>Upload curriculum PDFs to create quizzes and lesson plans</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Type</th>
                    <th>Class</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResources.map((resource) => (
                    <tr key={resource._id}>
                      <td>{resource.title}</td>
                      <td>{resource.topics?.[0] || (typeof resource.subject === 'object' ? resource.subject?.name : resource.subject) || '-'}</td>
                      <td>
                        <span className="badge badge-primary">{resource.type}</span>
                      </td>
                      <td>{resource.chapter || (typeof resource.applicableClasses?.[0] === 'object' ? resource.applicableClasses[0]?.name : resource.applicableClasses?.[0]) || '-'}</td>
                      <td>{resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : '-'}</td>
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

export default TeacherDashboard;
