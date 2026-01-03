import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiSearch, FiUser, FiMail, FiCalendar, FiTrendingUp } from 'react-icons/fi';

const TeacherStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentStats, setStudentStats] = useState(null);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes?all=true');
      if (res.data && res.data.length > 0) {
        setClasses(res.data);
      } else {
        // Fallback classes if none exist
        setClasses([
          { _id: '9-A', name: 'Class 9-A' },
          { _id: '9-B', name: 'Class 9-B' },
          { _id: '10-A', name: 'Class 10-A' },
          { _id: '10-B', name: 'Class 10-B' },
          { _id: '11-A', name: 'Class 11-A' },
          { _id: '11-B', name: 'Class 11-B' },
          { _id: '12-A', name: 'Class 12-A' },
          { _id: '12-B', name: 'Class 12-B' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      // Fallback classes if API fails
      setClasses([
        { _id: '9-A', name: 'Class 9-A' },
        { _id: '9-B', name: 'Class 9-B' },
        { _id: '10-A', name: 'Class 10-A' },
        { _id: '10-B', name: 'Class 10-B' },
        { _id: '11-A', name: 'Class 11-A' },
        { _id: '11-B', name: 'Class 11-B' },
        { _id: '12-A', name: 'Class 12-A' },
        { _id: '12-B', name: 'Class 12-B' }
      ]);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClass]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let url = '/users?role=student';
      if (selectedClass) url += `&class_id=${selectedClass}`;
      
      const response = await api.get(url);
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = async (student) => {
    setSelectedStudent(student);
    try {
      const [attendanceRes, performanceRes] = await Promise.all([
        api.get(`/attendance/stats?student_id=${student._id}`),
        api.get(`/performance/stats?student_id=${student._id}`)
      ]);

      setStudentStats({
        attendance: attendanceRes.data,
        performance: performanceRes.data
      });
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading students...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)'
                }}
              />
            </div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', minWidth: '150px' }}
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls._id} value={cls._id}>
                  {cls.name || `Class ${cls._id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedStudent ? '1fr 400px' : '1fr', gap: '1.5rem' }}>
        {/* Students List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Students ({filteredStudents.length})</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {filteredStudents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><FiUser size={48} /></div>
                <p className="empty-state-text">No students found</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Class</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr 
                        key={student._id}
                        style={{ 
                          cursor: 'pointer',
                          background: selectedStudent?._id === student._id ? 'var(--background)' : 'transparent'
                        }}
                        onClick={() => handleViewStudent(student)}
                      >
                        <td style={{ fontWeight: '500' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'var(--primary-color)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.875rem',
                              fontWeight: '600'
                            }}>
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            {student.name}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{student.email}</td>
                        <td><span className="badge badge-primary">{student.studentInfo?.class || student.class_id || '-'}</span></td>
                        <td>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => { e.stopPropagation(); handleViewStudent(student); }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Student Details Panel */}
        {selectedStudent && (
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-header">
              <h3 className="card-title">Student Details</h3>
              <button 
                onClick={() => { setSelectedStudent(null); setStudentStats(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                &times;
              </button>
            </div>
            <div className="card-body">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'var(--primary-color)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: '600',
                  margin: '0 auto 1rem'
                }}>
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <h4 style={{ fontWeight: '600' }}>{selectedStudent.name}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{selectedStudent.email}</p>
                <span className="badge badge-primary">{selectedStudent.studentInfo?.class || selectedStudent.class_id || 'No Class'}</span>
              </div>

              {studentStats && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiCalendar /> Attendance
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--secondary-color)' }}>
                          {studentStats.attendance.percentage || 0}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Attendance</div>
                      </div>
                      <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                          {studentStats.attendance.present || 0}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Days Present</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiTrendingUp /> Performance
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-color)' }}>
                          {Math.round(studentStats.performance.overall?.avgPercentage || 0)}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Avg Score</div>
                      </div>
                      <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                          {studentStats.performance.overall?.totalQuizzes || 0}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Quizzes</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherStudents;
