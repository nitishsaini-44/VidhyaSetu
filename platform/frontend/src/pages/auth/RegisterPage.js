import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiLock, FiUserPlus, FiBookOpen, FiBriefcase } from 'react-icons/fi';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    class_id: '',
    parent_email: '',
    subject: '',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...userData } = formData;
      const user = await register(userData);
      toast.success(`Welcome to VidyaSetu AI, ${user.name}!`);
      
      const dashboardRoutes = {
        student: '/student/dashboard',
        teacher: '/teacher/dashboard',
        management: '/management/dashboard'
      };
      navigate(dashboardRoutes[user.role]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-logo">
          <h1>🎓 VidyaSetu AI</h1>
          <p>Create your account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">
              <FiUser style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <FiMail style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">
                <FiLock style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                <FiLock style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">
              <FiBriefcase style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              I am a
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="management">Management</option>
            </select>
          </div>

          {/* Student-specific fields */}
          {formData.role === 'student' && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="class_id">
                  <FiBookOpen style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Class
                </label>
                <select
                  id="class_id"
                  name="class_id"
                  value={formData.class_id}
                  onChange={handleChange}
                >
                  <option value="">Select Class</option>
                  <option value="9-A">9-A</option>
                  <option value="9-B">9-B</option>
                  <option value="10-A">10-A</option>
                  <option value="10-B">10-B</option>
                  <option value="11-A">11-A</option>
                  <option value="11-B">11-B</option>
                  <option value="12-A">12-A</option>
                  <option value="12-B">12-B</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="parent_email">Parent Email</label>
                <input
                  type="email"
                  id="parent_email"
                  name="parent_email"
                  value={formData.parent_email}
                  onChange={handleChange}
                  placeholder="Parent's email (optional)"
                />
              </div>
            </div>
          )}

          {/* Teacher-specific fields */}
          {formData.role === 'teacher' && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                >
                  <option value="">Select Subject</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Social Science">Social Science</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="department">Department</label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g., Science"
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: 20, height: 20 }}></span>
                Creating Account...
              </>
            ) : (
              <>
                <FiUserPlus />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
