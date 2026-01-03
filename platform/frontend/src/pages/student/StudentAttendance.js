import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { 
  FiCalendar, FiCheck, FiX, FiClock, FiCamera, 
  FiCheckCircle, FiAlertCircle, FiRefreshCw 
} from 'react-icons/fi';

const StudentAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Face Recognition State
  const [frStatus, setFrStatus] = useState({
    faceRegistered: false,
    attendanceToday: null,
    canMarkAttendance: false
  });
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    fetchAttendance();
    fetchFRStatus();
  }, [filter]);

  const fetchAttendance = async () => {
    try {
      const startDate = `${filter.year}-${String(filter.month).padStart(2, '0')}-01`;
      const endDate = `${filter.year}-${String(filter.month).padStart(2, '0')}-31`;

      const [attendanceRes, statsRes] = await Promise.all([
        api.get(`/attendance?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/attendance/stats?month=${filter.month}&year=${filter.year}`)
      ]);

      setAttendance(attendanceRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFRStatus = async () => {
    try {
      const response = await api.get('/face-recognition/my-status');
      setFrStatus(response.data);
    } catch (error) {
      console.error('Error fetching FR status:', error);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user'
        } 
      });
      streamRef.current = stream;
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(err => console.log('Play error:', err));
          };
        }
      }, 100);
    } catch (error) {
      setIsCameraOpen(false);
      toast.error('Failed to access camera: ' + error.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const captureAndMarkAttendance = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready');
      return;
    }

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.92);

      // Send to API
      const response = await api.post('/face-recognition/mark-my-attendance', {
        image_data: imageData
      });

      if (response.data.success) {
        if (response.data.alreadyMarked) {
          toast.info('Your attendance was already marked for today!');
        } else {
          toast.success(`Attendance marked as ${response.data.status}! 🎉`);
        }
        stopCamera();
        fetchFRStatus();
        fetchAttendance();
      } else {
        toast.error(response.data.message || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Mark attendance error:', error);
      toast.error(error.response?.data?.message || 'Failed to mark attendance. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return <FiCheck color="#059669" />;
      case 'absent':
        return <FiX color="#DC2626" />;
      case 'late':
        return <FiClock color="#D97706" />;
      default:
        return null;
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading attendance...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Face Recognition Attendance Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiCamera /> Mark Attendance (Face Recognition)
          </h3>
        </div>
        <div className="card-body">
          {!frStatus.faceRegistered ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <FiAlertCircle size={48} style={{ color: 'var(--danger-color)', marginBottom: '1rem' }} />
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--danger-color)' }}>Face Not Registered</h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                Your face is not registered in the system. Please contact your class teacher or management to register your face for attendance.
              </p>
            </div>
          ) : frStatus.attendanceToday ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem',
              background: 'rgba(34, 197, 94, 0.1)',
              borderRadius: 'var(--radius)',
              border: '1px solid rgba(34, 197, 94, 0.2)'
            }}>
              <FiCheckCircle size={48} style={{ color: 'var(--success-color)', marginBottom: '1rem' }} />
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--success-color)' }}>
                Attendance Already Marked!
              </h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                Status: <strong style={{ textTransform: 'capitalize' }}>{frStatus.attendanceToday.status}</strong>
                <br />
                Marked at: {new Date(frStatus.attendanceToday.markedAt).toLocaleTimeString()}
                <br />
                Method: {frStatus.attendanceToday.method === 'face-recognition' ? '📷 Face Recognition' : '✍️ Manual'}
              </p>
            </div>
          ) : (
            <div>
              {!isCameraOpen ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <FiCamera size={64} style={{ color: 'var(--primary-color)', marginBottom: '1rem', opacity: 0.7 }} />
                  <h4 style={{ marginBottom: '0.5rem' }}>Ready to Mark Attendance</h4>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Click the button below to open your camera and mark your attendance using face recognition.
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={startCamera}>
                    <FiCamera /> Open Camera & Mark Attendance
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ 
                    background: '#000', 
                    borderRadius: 'var(--radius)', 
                    overflow: 'hidden',
                    position: 'relative',
                    maxWidth: '500px',
                    margin: '0 auto'
                  }}>
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline
                      muted
                      style={{ 
                        width: '100%', 
                        height: 'auto',
                        transform: 'scaleX(-1)',
                        display: 'block'
                      }}
                    />
                    {isProcessing && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff'
                      }}>
                        <div className="spinner" style={{ marginBottom: '1rem' }}></div>
                        <p>Recognizing face...</p>
                      </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                    <button 
                      className="btn btn-primary btn-lg"
                      onClick={captureAndMarkAttendance}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <><FiRefreshCw className="spin" /> Processing...</>
                      ) : (
                        <><FiCheckCircle /> Capture & Mark Attendance</>
                      )}
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={stopCamera}
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    💡 Tip: Ensure good lighting and look directly at the camera
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon primary">
              <FiCalendar size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.percentage || 0}%</div>
          <div className="stat-label">Attendance Rate</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon success">
              <FiCheck size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.present || 0}</div>
          <div className="stat-label">Days Present</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon danger">
              <FiX size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.absent || 0}</div>
          <div className="stat-label">Days Absent</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon warning">
              <FiClock size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.late || 0}</div>
          <div className="stat-label">Days Late</div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Attendance History</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              value={filter.month}
              onChange={(e) => setFilter({ ...filter, month: parseInt(e.target.value) })}
              style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}
            >
              {months.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
            <select
              value={filter.year}
              onChange={(e) => setFilter({ ...filter, year: parseInt(e.target.value) })}
              style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="card-body">
          {attendance.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <p className="empty-state-text">No attendance records for this period</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => {
                    const date = new Date(record.date);
                    return (
                      <tr key={record._id}>
                        <td>{new Date(record.date).toLocaleDateString()}</td>
                        <td>{date.toLocaleDateString('en-US', { weekday: 'long' })}</td>
                        <td>
                          <span className={`badge ${
                            record.status?.toLowerCase() === 'present' ? 'badge-success' :
                            record.status?.toLowerCase() === 'late' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {getStatusIcon(record.status)}
                            <span style={{ marginLeft: '0.25rem', textTransform: 'capitalize' }}>{record.status}</span>
                          </span>
                        </td>
                        <td>
                          {record.markedMethod === 'face-recognition' ? (
                            <span style={{ color: 'var(--primary-color)' }}>📷 Face Recognition</span>
                          ) : (
                            <span>✍️ Manual</span>
                          )}
                        </td>
                        <td>{record.markedAt ? new Date(record.markedAt).toLocaleTimeString() : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default StudentAttendance;
