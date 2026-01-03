import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiCheck, FiX, FiClock, FiSave, FiUsers } from 'react-icons/fi';

const TeacherAttendance = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      // Fetch only classes that have enrolled students
      const res = await api.get('/classes/with-students');
      if (res.data && res.data.length > 0) {
        setClasses(res.data);
      } else {
        setClasses([]);
        console.log('No classes with enrolled students found');
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses([]);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass, selectedDate]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Get class ID - could be ObjectId or grade-section string
      const classId = selectedClass;
      
      const [studentsRes, attendanceRes] = await Promise.all([
        api.get(`/classes/${classId}/students`).catch(() => ({ data: [] })),
        api.get(`/attendance?class_id=${classId}&date=${selectedDate}`).catch(() => ({ data: [] }))
      ]);

      setStudents(studentsRes.data);

      // Initialize attendance state from existing records
      const attendanceMap = {};
      if (attendanceRes.data && attendanceRes.data.length > 0) {
        // New schema: attendance has records array
        attendanceRes.data.forEach(att => {
          if (att.records) {
            att.records.forEach(record => {
              const studentId = record.student?._id || record.student;
              if (studentId) {
                attendanceMap[studentId] = record.status;
              }
            });
          }
        });
      }
      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleBulkMark = (status) => {
    const newAttendance = {};
    students.forEach(student => {
      newAttendance[student._id] = status;
    });
    setAttendance(newAttendance);
  };

  const handleSave = async () => {
    if (Object.keys(attendance).length === 0) {
      toast.warning('Please mark attendance first');
      return;
    }

    setSaving(true);
    try {
      const studentRecords = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        status: status.toLowerCase() // Schema expects lowercase: 'present', 'absent', 'late'
      }));

      await api.post('/attendance/bulk', {
        class_id: selectedClass,
        students: studentRecords,
        date: selectedDate,
        method: 'manual'
      });

      toast.success('Attendance saved successfully!');
    } catch (error) {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Select Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', minWidth: '200px' }}
              >
                <option value="">Choose a class</option>
                {classes.map(cls => (
                  <option key={cls._id} value={cls._id}>
                    {cls.displayName || cls.name || `Class ${cls._id}`} ({cls.studentCount || 0} students)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}
              />
            </div>

            {selectedClass && students.length > 0 && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => handleBulkMark('Present')}>
                  <FiCheck /> Mark All Present
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleBulkMark('Absent')}>
                  <FiX /> Mark All Absent
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  <FiSave /> {saving ? 'Saving...' : 'Save Attendance'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Student List */}
      {!selectedClass ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p className="empty-state-text">Select a class to mark attendance</p>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="loading-screen" style={{ height: '300px' }}>
          <div className="spinner"></div>
          <p>Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon"><FiUsers size={48} /></div>
              <p className="empty-state-text">No students found in {classes.find(c => c._id === selectedClass)?.displayName || classes.find(c => c._id === selectedClass)?.name || selectedClass}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{classes.find(c => c._id === selectedClass)?.displayName || classes.find(c => c._id === selectedClass)?.name || `Class ${selectedClass}`} - {students.length} Students</h3>
            <span className="badge badge-primary">{selectedDate}</span>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={student._id}>
                      <td>{index + 1}</td>
                      <td style={{ fontWeight: '500' }}>{student.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{student.email}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {['Present', 'Absent', 'Late'].map(status => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(student._id, status)}
                              className={`btn btn-sm ${
                                attendance[student._id] === status
                                  ? status === 'Present' ? 'btn-primary' : status === 'Absent' ? 'btn-danger' : 'btn-secondary'
                                  : 'btn-secondary'
                              }`}
                              style={{ 
                                padding: '0.375rem 0.75rem',
                                opacity: attendance[student._id] === status ? 1 : 0.6
                              }}
                            >
                              {status === 'Present' && <FiCheck />}
                              {status === 'Absent' && <FiX />}
                              {status === 'Late' && <FiClock />}
                              <span style={{ marginLeft: '0.25rem' }}>{status}</span>
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;
