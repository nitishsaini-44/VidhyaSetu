import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FiHome,
  FiCalendar,
  FiBarChart2,
  FiBook,
  FiUsers,
  FiMessageSquare,
  FiFileText,
  FiLogOut,
  FiSettings,
  FiCamera,
  FiClipboard,
  FiEdit
} from 'react-icons/fi';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info('Logged out successfully');
    navigate('/login');
  };

  // Navigation items based on role
  const getNavItems = () => {
    switch (user?.role) {
      case 'student':
        return [
          { path: '/student/dashboard', label: 'Dashboard', icon: FiHome },
          { path: '/student/attendance', label: 'My Attendance', icon: FiCalendar },
          { path: '/student/performance', label: 'Performance', icon: FiBarChart2 },
          { path: '/student/quiz', label: 'Quizzes', icon: FiEdit },
          { path: '/student/ai-assistant', label: 'AI Assistant', icon: FiMessageSquare },
        ];
      case 'teacher':
        return [
          { path: '/teacher/dashboard', label: 'Dashboard', icon: FiHome },
          { path: '/teacher/attendance', label: 'Attendance', icon: FiCalendar },
          { path: '/teacher/resources', label: 'Resources', icon: FiBook },
          { path: '/teacher/quiz-history', label: 'Quiz History', icon: FiClipboard },
          { path: '/teacher/students', label: 'Students', icon: FiUsers },
          { path: '/teacher/ai-assistant', label: 'AI Assistant', icon: FiMessageSquare },
        ];
      case 'management':
        return [
          { path: '/management/dashboard', label: 'Dashboard', icon: FiHome },
          { path: '/management/users', label: 'Manage Users', icon: FiUsers },
          { path: '/management/face-recognition', label: 'Face Recognition', icon: FiCamera },
          { path: '/management/reports', label: 'Reports', icon: FiFileText },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getRoleLabel = () => {
    const labels = {
      student: 'Student Portal',
      teacher: 'Teacher Portal',
      management: 'Admin Portal'
    };
    return labels[user?.role] || 'Portal';
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🎓 VidyaSetu AI</h2>
          <span>{getRoleLabel()}</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', marginTop: '0.75rem' }}
            onClick={handleLogout}
          >
            <FiLogOut />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <h1 className="header-title">
            {navItems.find(item => window.location.pathname.includes(item.path))?.label || 'Dashboard'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {user?.email}
            </span>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
