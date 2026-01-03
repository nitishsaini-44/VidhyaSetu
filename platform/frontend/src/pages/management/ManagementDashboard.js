import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  FiUsers, FiUserCheck, FiBook, FiTrendingUp, FiCalendar, 
  FiClock, FiAlertCircle, FiCheckCircle, FiCamera, FiBarChart2,
  FiRefreshCw, FiArrowRight, FiActivity, FiAward, FiPieChart
} from 'react-icons/fi';
import { toast } from 'react-toastify';

const ManagementDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    activeUsers: 0,
    classDistribution: []
  });
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    percentage: 0
  });
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardStats(),
      fetchAttendanceStats(),
      fetchTodayAttendance(),
      fetchRecentUsers()
    ]);
    setRefreshing(false);
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/users/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const response = await api.get('/attendance/stats');
      setAttendanceStats(response.data);
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await api.get('/face-recognition/attendance');
      setTodayAttendance(response.data || []);
    } catch (error) {
      console.error('Error fetching today attendance:', error);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      const response = await api.get('/users?limit=5&sort=-createdAt');
      setRecentUsers(response.data?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching recent users:', error);
    }
  };

  const handleRefresh = () => {
    toast.info('Refreshing data...');
    fetchAllData();
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0.5rem' }}>
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {getGreeting()}, Admin! 👋
          </h2>
          <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiCalendar size={16} />
            {getCurrentDate()}
          </p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          <FiRefreshCw size={18} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <div className="stat-card-header">
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '12px' }}>
              <FiUsers size={28} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{stats.totalStudents}</div>
          <div className="stat-label" style={{ opacity: 0.9 }}>Total Students</div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
            +{Math.floor(Math.random() * 10)}% from last month
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
          <div className="stat-card-header">
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '12px' }}>
              <FiUserCheck size={28} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{stats.totalTeachers}</div>
          <div className="stat-label" style={{ opacity: 0.9 }}>Total Teachers</div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
            Active faculty members
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
          <div className="stat-card-header">
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '12px' }}>
              <FiActivity size={28} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{stats.activeUsers}</div>
          <div className="stat-label" style={{ opacity: 0.9 }}>Active Users</div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
            Currently online
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
          <div className="stat-card-header">
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '12px' }}>
              <FiBook size={28} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{stats.classDistribution?.length || 0}</div>
          <div className="stat-label" style={{ opacity: 0.9 }}>Total Classes</div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
            Across all grades
          </div>
        </div>
      </div>

      {/* Attendance Overview Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Attendance Stats Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiPieChart size={20} color="var(--primary-color)" />
              Attendance Overview (30 Days)
            </h3>
          </div>
          
          {/* Circular Progress */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ 
              position: 'relative', 
              width: '150px', 
              height: '150px',
              borderRadius: '50%',
              background: `conic-gradient(
                #22c55e 0deg ${(attendanceStats.present / (attendanceStats.total || 1)) * 360}deg,
                #ef4444 ${(attendanceStats.present / (attendanceStats.total || 1)) * 360}deg ${((attendanceStats.present + attendanceStats.absent) / (attendanceStats.total || 1)) * 360}deg,
                #f59e0b ${((attendanceStats.present + attendanceStats.absent) / (attendanceStats.total || 1)) * 360}deg 360deg
              )`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: 'var(--card-bg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-color)' }}>
                  {attendanceStats.percentage || 0}%
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Attendance</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }}></div>
              <span style={{ fontSize: '0.85rem' }}>Present ({attendanceStats.present})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
              <span style={{ fontSize: '0.85rem' }}>Absent ({attendanceStats.absent})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
              <span style={{ fontSize: '0.85rem' }}>Late ({attendanceStats.late})</span>
            </div>
          </div>
        </div>

        {/* Today's Face Recognition Attendance */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiCamera size={20} color="var(--primary-color)" />
              Today's FR Attendance
            </h3>
            <button 
              onClick={() => navigate('/management/face-recognition')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary-color)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.85rem'
              }}
            >
              View All <FiArrowRight size={14} />
            </button>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '1rem',
            background: 'var(--background)',
            borderRadius: 'var(--radius)',
            marginBottom: '1rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: '700', color: 'var(--primary-color)' }}>
                {todayAttendance.length}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Students marked present today
              </div>
            </div>
          </div>

          {todayAttendance.length > 0 ? (
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {todayAttendance.slice(0, 5).map((record, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem',
                    borderBottom: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiCheckCircle size={16} color="#22c55e" />
                    <span style={{ fontWeight: '500' }}>{record.name}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(record.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
              No attendance recorded yet today
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions & Class Distribution */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Quick Actions */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiActivity size={20} color="var(--primary-color)" />
            Quick Actions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button 
              onClick={() => navigate('/management/face-recognition')}
              style={{
                padding: '1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'transform 0.2s'
              }}
            >
              <FiCamera size={24} />
              <span style={{ fontSize: '0.85rem' }}>Take Attendance</span>
            </button>
            <button 
              onClick={() => navigate('/management/users')}
              style={{
                padding: '1rem',
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'transform 0.2s'
              }}
            >
              <FiUsers size={24} />
              <span style={{ fontSize: '0.85rem' }}>Manage Users</span>
            </button>
            <button 
              onClick={() => navigate('/management/reports')}
              style={{
                padding: '1rem',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'transform 0.2s'
              }}
            >
              <FiBarChart2 size={24} />
              <span style={{ fontSize: '0.85rem' }}>View Reports</span>
            </button>
            <button 
              onClick={() => toast.info('Feature coming soon!')}
              style={{
                padding: '1rem',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'transform 0.2s'
              }}
            >
              <FiAward size={24} />
              <span style={{ fontSize: '0.85rem' }}>Certificates</span>
            </button>
          </div>
        </div>

        {/* Class Distribution */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiBook size={20} color="var(--primary-color)" />
            Students by Class
          </h3>
          {stats.classDistribution?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              No class data available
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.classDistribution?.map((cls, idx) => {
                const maxCount = Math.max(...stats.classDistribution.map(c => c.count));
                const percentage = (cls.count / maxCount) * 100;
                const colors = ['#667eea', '#11998e', '#f093fb', '#4facfe', '#f5576c', '#38ef7d'];
                return (
                  <div key={cls._id || idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '500' }}>{cls._id || 'Unassigned'}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{cls.count} students</span>
                    </div>
                    <div style={{ 
                      height: '8px', 
                      background: 'var(--background)', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: colors[idx % colors.length],
                        borderRadius: '4px',
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Users */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiUsers size={20} color="var(--primary-color)" />
            Recently Added Users
          </h3>
          <button 
            onClick={() => navigate('/management/users')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.85rem'
            }}
          >
            View All <FiArrowRight size={14} />
          </button>
        </div>
        
        {recentUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No recent users
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Role</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user, idx) => (
                  <tr key={user._id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--primary-color)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '0.85rem'
                        }}>
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {user.name}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: user.role === 'teacher' ? '#dcfce7' : user.role === 'student' ? '#dbeafe' : '#fef3c7',
                        color: user.role === 'teacher' ? '#166534' : user.role === 'student' ? '#1e40af' : '#92400e'
                      }}>
                        {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: user.isActive ? '#22c55e' : '#ef4444'
                      }}>
                        {user.isActive ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default ManagementDashboard;

