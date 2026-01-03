import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { 
  FiCamera, 
  FiUserPlus, 
  FiUserMinus, 
  FiRefreshCw, 
  FiServer, 
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiPlay,
  FiStopCircle,
  FiTrash2,
  FiSettings,
  FiWifi,
  FiWifiOff
} from 'react-icons/fi';

const ManagementFaceRecognition = () => {
  // Server status
  const [serverStatus, setServerStatus] = useState({ online: false, serverUrl: '' });
  const [serverLoading, setServerLoading] = useState(true);
  
  // Students data
  const [frStudents, setFrStudents] = useState([]);
  const [platformStudents, setPlatformStudents] = useState([]);
  const [frStats, setFrStats] = useState({ total_students: 0, total_attendance: 0 });
  const [frAttendance, setFrAttendance] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Camera state for registration
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Live camera recognition state
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [autoRecognize, setAutoRecognize] = useState(false);
  const liveVideoRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const liveStreamRef = useRef(null);
  const recognitionIntervalRef = useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    platform_user_id: ''
  });

  // Generate next student ID in format KUCP1, KUCP2, etc.
  const generateNextStudentId = () => {
    const prefix = 'KUCP';
    if (frStudents.length === 0) {
      return `${prefix}1`;
    }
    
    // Extract numbers from existing IDs and find the max
    const existingNumbers = frStudents
      .map(s => {
        const match = s.student_id?.match(/KUCP(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `${prefix}${maxNumber + 1}`;
  };

  // Open add modal with auto-generated ID
  const openAddModal = () => {
    const nextId = generateNextStudentId();
    setFormData({ student_id: nextId, name: '', platform_user_id: '' });
    setShowAddModal(true);
  };

  // FR Server URL configuration
  const [frServerUrl, setFrServerUrl] = useState(
    localStorage.getItem('frServerUrl') || 'http://localhost:5001'
  );
  const [showSettings, setShowSettings] = useState(false);

  // Check server status
  const checkServerStatus = useCallback(async () => {
    setServerLoading(true);
    try {
      const response = await api.get('/face-recognition/status');
      setServerStatus(response.data);
    } catch (error) {
      setServerStatus({ online: false, serverUrl: frServerUrl, message: 'Connection failed' });
    } finally {
      setServerLoading(false);
    }
  }, [frServerUrl]);

  // Fetch FR students
  const fetchFRStudents = async () => {
    try {
      const response = await api.get('/face-recognition/students');
      setFrStudents(response.data);
    } catch (error) {
      console.error('Error fetching FR students:', error);
      if (error.response?.status !== 503) {
        toast.error('Failed to fetch registered students');
      }
    }
  };

  // Fetch FR stats
  const fetchFRStats = async () => {
    try {
      const response = await api.get('/face-recognition/stats');
      setFrStats(response.data);
    } catch (error) {
      console.error('Error fetching FR stats:', error);
    }
  };

  // Fetch FR attendance
  const fetchFRAttendance = async () => {
    try {
      const response = await api.get('/face-recognition/attendance');
      setFrAttendance(response.data);
    } catch (error) {
      console.error('Error fetching FR attendance:', error);
    }
  };

  // Fetch platform students (for linking)
  const fetchPlatformStudents = async () => {
    try {
      const response = await api.get('/users?role=student');
      setPlatformStudents(response.data);
    } catch (error) {
      console.error('Error fetching platform students:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await checkServerStatus();
      await Promise.all([
        fetchFRStudents(),
        fetchFRStats(),
        fetchFRAttendance(),
        fetchPlatformStudents()
      ]);
      setLoading(false);
    };
    fetchData();
  }, [checkServerStatus]);

  // Camera functions
  const startCamera = async () => {
    try {
      // Set camera open state first so video element is visible
      setIsCameraOpen(true);
      setCapturedImage(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user'
        } 
      });
      streamRef.current = stream;
      
      // Small delay to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
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

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Set canvas size to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      
      // Clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image as JPEG with good quality
      const imageData = canvas.toDataURL('image/jpeg', 0.92);
      
      console.log('Captured image data length:', imageData.length);
      console.log('Image data prefix:', imageData.substring(0, 50));
      
      setCapturedImage(imageData);
      stopCamera();
    } else {
      toast.error('Camera not ready. Please try again.');
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  // Register student
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!formData.student_id || !formData.name) {
      toast.error('Student ID and Name are required');
      return;
    }
    
    if (!capturedImage) {
      toast.error('Please capture a photo');
      return;
    }

    try {
      const response = await api.post('/face-recognition/register', {
        student_id: formData.student_id,
        name: formData.name,
        image_data: capturedImage,
        platform_user_id: formData.platform_user_id || undefined
      });

      if (response.data.success) {
        toast.success('Student registered successfully!');
        setShowAddModal(false);
        setFormData({ student_id: '', name: '', platform_user_id: '' });
        setCapturedImage(null);
        fetchFRStudents();
        fetchFRStats();
      } else {
        toast.error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register student');
    }
  };

  // Remove student
  const handleRemove = async () => {
    if (!selectedStudent) return;

    try {
      const response = await api.delete(`/face-recognition/remove/${selectedStudent.student_id}`);
      
      if (response.data.success) {
        toast.success('Student removed from face recognition system');
        setShowRemoveModal(false);
        setSelectedStudent(null);
        fetchFRStudents();
        fetchFRStats();
      } else {
        toast.error(response.data.message || 'Removal failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove student');
    }
  };

  // Start recognition
  const handleStartRecognition = async () => {
    try {
      const response = await api.post('/face-recognition/start');
      if (response.data.success) {
        toast.success('Face recognition started!');
        checkServerStatus();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start recognition');
    }
  };

  // Stop recognition
  const handleStopRecognition = async () => {
    try {
      const response = await api.post('/face-recognition/stop');
      if (response.data.success) {
        toast.success('Face recognition stopped');
        checkServerStatus();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to stop recognition');
    }
  };

  // Clear attendance
  const handleClearAttendance = async () => {
    if (!window.confirm('Are you sure you want to clear today\'s attendance?')) return;
    
    try {
      const response = await api.post('/face-recognition/clear-attendance');
      if (response.data.success) {
        toast.success('Attendance cleared');
        fetchFRAttendance();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to clear attendance');
    }
  };

  // Live Camera Functions
  const startLiveCamera = async () => {
    try {
      // Set state first so video element is visible
      setIsLiveCameraActive(true);
      setRecognitionResult(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      liveStreamRef.current = stream;
      
      // Small delay to ensure video element is rendered
      setTimeout(() => {
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.onloadedmetadata = () => {
            liveVideoRef.current.play().catch(err => console.log('Play error:', err));
          };
        }
      }, 100);
    } catch (error) {
      setIsLiveCameraActive(false);
      toast.error('Failed to access camera: ' + error.message);
    }
  };

  const stopLiveCamera = () => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach(track => track.stop());
      liveStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setIsLiveCameraActive(false);
    setAutoRecognize(false);
    setRecognitionResult(null);
  };

  const captureLiveImage = () => {
    if (liveVideoRef.current && liveCanvasRef.current) {
      const canvas = liveCanvasRef.current;
      const video = liveVideoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    }
    return null;
  };

  const handleRecognizeFace = async () => {
    const imageData = captureLiveImage();
    if (!imageData) {
      toast.error('Failed to capture image');
      return;
    }

    setIsRecognizing(true);
    try {
      const response = await api.post('/face-recognition/recognize', {
        image_data: imageData
      });
      
      setRecognitionResult(response.data);
      
      if (response.data.success && response.data.recognized) {
        if (response.data.attendance?.already_marked) {
          toast.info(`${response.data.name} - Already marked present today`);
        } else {
          toast.success(`✓ ${response.data.name} - Attendance marked!`);
          fetchFRAttendance();
        }
      } else {
        toast.warning('Face not recognized');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Recognition failed');
      setRecognitionResult({ success: false, message: error.response?.data?.message || 'Error' });
    } finally {
      setIsRecognizing(false);
    }
  };

  const toggleAutoRecognize = () => {
    if (autoRecognize) {
      // Stop auto recognition
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
        recognitionIntervalRef.current = null;
      }
      setAutoRecognize(false);
    } else {
      // Start auto recognition every 3 seconds
      setAutoRecognize(true);
      recognitionIntervalRef.current = setInterval(() => {
        if (!isRecognizing) {
          handleRecognizeFace();
        }
      }, 3000);
    }
  };

  // Cleanup live camera on tab change or unmount
  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'camera') {
      stopLiveCamera();
    }
  }, [activeTab]);

  // Save FR Server URL
  const handleSaveSettings = () => {
    localStorage.setItem('frServerUrl', frServerUrl);
    setShowSettings(false);
    toast.success('Settings saved. Please restart the backend server for changes to take effect.');
    checkServerStatus();
  };

  // Prefill form from platform student
  const handleSelectPlatformStudent = (studentId) => {
    const student = platformStudents.find(s => s._id === studentId);
    if (student) {
      setFormData({
        student_id: student.studentInfo?.rollNumber || student._id,
        name: student.name,
        platform_user_id: student._id
      });
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Face Recognition System...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Face Recognition Attendance 📷
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage student registration and attendance tracking
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <FiSettings />
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              checkServerStatus();
              fetchFRStudents();
              fetchFRStats();
              fetchFRAttendance();
            }}
            title="Refresh"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* Server Status Banner */}
      <div 
        className="card" 
        style={{ 
          marginBottom: '1.5rem',
          background: serverStatus.online ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${serverStatus.online ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}
      >
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {serverLoading ? (
                <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
              ) : serverStatus.online ? (
                <FiWifi size={24} color="var(--success-color)" />
              ) : (
                <FiWifiOff size={24} color="var(--danger-color)" />
              )}
              <div>
                <div style={{ fontWeight: '600' }}>
                  Face Recognition API: {serverStatus.online ? 'Active' : 'Inactive'}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Provider: {serverStatus.provider || 'local'} {serverStatus.api_configured ? '✓ Configured' : '⚠ Not configured'}
                </div>
              </div>
            </div>
            {serverStatus.online && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-success" onClick={handleStartRecognition}>
                  <FiPlay /> Take Attendance
                </button>
              </div>
            )}
          </div>
          {serverStatus.online && !serverStatus.api_configured && serverStatus.provider !== 'local' && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius)' }}>
              <strong>⚠️ API Keys Required</strong> - Configure {serverStatus.provider} API keys in environment variables for face recognition
            </div>
          )}
          {serverStatus.online && serverStatus.api_configured && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.2)', borderRadius: 'var(--radius)' }}>
              <strong>🟢 API Ready</strong> - {serverStatus.total_registered || 0} students registered
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {['overview', 'camera', 'students', 'attendance'].map(tab => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(tab)}
            style={{ textTransform: 'capitalize' }}
          >
            {tab === 'camera' ? '📷 Live Camera' : tab}
          </button>
        ))}
      </div>

      {/* Live Camera Tab */}
      {activeTab === 'camera' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">📷 Live Face Recognition</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!isLiveCameraActive ? (
                <button className="btn btn-primary" onClick={startLiveCamera}>
                  <FiCamera /> Start Camera
                </button>
              ) : (
                <>
                  <button 
                    className={`btn ${autoRecognize ? 'btn-danger' : 'btn-success'}`}
                    onClick={toggleAutoRecognize}
                  >
                    {autoRecognize ? <><FiStopCircle /> Stop Auto</> : <><FiPlay /> Auto Recognize</>}
                  </button>
                  <button className="btn btn-secondary" onClick={stopLiveCamera}>
                    <FiStopCircle /> Stop Camera
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              {/* Camera Feed */}
              <div>
                <div style={{ 
                  background: '#000', 
                  borderRadius: 'var(--radius)', 
                  overflow: 'hidden',
                  position: 'relative',
                  minHeight: '400px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {!isLiveCameraActive && (
                    <div style={{ textAlign: 'center', color: '#fff' }}>
                      <FiCamera size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                      <p>Click "Start Camera" to begin</p>
                    </div>
                  )}
                  <video 
                    ref={liveVideoRef}
                    autoPlay 
                    playsInline
                    muted
                    style={{ 
                      width: '100%', 
                      height: 'auto',
                      transform: 'scaleX(-1)',
                      display: isLiveCameraActive ? 'block' : 'none'
                    }}
                  />
                  {isLiveCameraActive && isRecognizing && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div className="spinner" style={{ width: '48px', height: '48px' }}></div>
                    </div>
                  )}
                  {isLiveCameraActive && autoRecognize && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(239, 68, 68, 0.9)',
                      color: '#fff',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      🔴 AUTO RECOGNIZING
                    </div>
                  )}
                </div>
                <canvas ref={liveCanvasRef} style={{ display: 'none' }} />
                
                {isLiveCameraActive && !autoRecognize && (
                  <button 
                    className="btn btn-primary" 
                    onClick={handleRecognizeFace}
                    disabled={isRecognizing}
                    style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}
                  >
                    {isRecognizing ? 'Recognizing...' : '📸 Capture & Recognize'}
                  </button>
                )}
              </div>

              {/* Recognition Results */}
              <div>
                <h4 style={{ marginBottom: '1rem' }}>Recognition Result</h4>
                {recognitionResult ? (
                  <div style={{ 
                    padding: '1.5rem', 
                    borderRadius: 'var(--radius)',
                    background: recognitionResult.recognized 
                      ? 'rgba(34, 197, 94, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)',
                    border: `2px solid ${recognitionResult.recognized 
                      ? 'rgba(34, 197, 94, 0.3)' 
                      : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    {recognitionResult.recognized ? (
                      <>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                          <FiCheckCircle size={48} color="var(--success-color)" />
                        </div>
                        <h3 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                          {recognitionResult.name}
                        </h3>
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                          ID: {recognitionResult.studentId}
                        </p>
                        <div style={{ 
                          background: 'var(--background)', 
                          padding: '0.75rem', 
                          borderRadius: 'var(--radius)',
                          marginBottom: '0.5rem'
                        }}>
                          <strong>Confidence:</strong> {recognitionResult.confidence}%
                        </div>
                        {recognitionResult.attendance && (
                          <div style={{ 
                            background: recognitionResult.attendance.already_marked 
                              ? 'rgba(245, 158, 11, 0.2)' 
                              : 'rgba(34, 197, 94, 0.2)', 
                            padding: '0.75rem', 
                            borderRadius: 'var(--radius)',
                            textAlign: 'center'
                          }}>
                            {recognitionResult.attendance.already_marked 
                              ? '⚠️ Already marked today' 
                              : '✅ Attendance marked!'}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                          <FiXCircle size={48} color="var(--danger-color)" />
                        </div>
                        <h3 style={{ textAlign: 'center', color: 'var(--danger-color)' }}>
                          Not Recognized
                        </h3>
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                          {recognitionResult.message || 'Face not found in database'}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: 'var(--text-secondary)',
                    background: 'var(--background)',
                    borderRadius: 'var(--radius)'
                  }}>
                    <FiCamera size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                    <p>Capture a face to see results</p>
                  </div>
                )}

                {/* Recent Attendance */}
                <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                  Today's Attendance ({frAttendance.length})
                </h4>
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  background: 'var(--background)',
                  borderRadius: 'var(--radius)',
                  padding: '0.5rem'
                }}>
                  {frAttendance.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                      No attendance yet
                    </p>
                  ) : (
                    frAttendance.slice(0, 10).map((record, idx) => (
                      <div key={idx} style={{ 
                        padding: '0.5rem', 
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span>{record.name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {record.time ? new Date(record.time).toLocaleTimeString() : '-'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon primary">
                  <FiUsers size={24} />
                </div>
              </div>
              <div className="stat-value">{frStats.total_students}</div>
              <div className="stat-label">Registered Students</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon success">
                  <FiCheckCircle size={24} />
                </div>
              </div>
              <div className="stat-value">{frAttendance.length}</div>
              <div className="stat-label">Today's Attendance</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon warning">
                  <FiServer size={24} />
                </div>
              </div>
              <div className="stat-value">{serverStatus.online ? 'Active' : 'Inactive'}</div>
              <div className="stat-label">API Status</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon danger">
                  <FiCamera size={24} />
                </div>
              </div>
              <div className="stat-value">{serverStatus.provider || 'local'}</div>
              <div className="stat-label">API Provider</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-primary"
                  onClick={openAddModal}
                >
                  <FiUserPlus /> Add Student to FR
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={handleClearAttendance}
                >
                  <FiTrash2 /> Clear Today's Attendance
                </button>
              </div>
              {!serverStatus.api_configured && serverStatus.provider !== 'local' && (
                <p style={{ marginTop: '1rem', color: 'var(--warning-color)', fontSize: '0.875rem' }}>
                  ⚠️ Configure API keys for {serverStatus.provider} in the backend .env file to enable full face recognition features.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Registered Students ({frStudents.length})</h3>
            <button 
              className="btn btn-primary"
              onClick={openAddModal}
              disabled={!serverStatus.online}
            >
              <FiUserPlus /> Add Student
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {frStudents.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                <FiUsers size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                <p>No students registered in face recognition system</p>
                <button 
                  className="btn btn-primary" 
                  style={{ marginTop: '1rem' }}
                  onClick={openAddModal}
                  disabled={!serverStatus.online}
                >
                  <FiUserPlus /> Register First Student
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frStudents.map((student) => (
                      <tr key={student.student_id}>
                        <td style={{ fontWeight: '500' }}>{student.student_id}</td>
                        <td>{student.name}</td>
                        <td>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowRemoveModal(true);
                            }}
                            disabled={!serverStatus.online}
                            title="Remove from FR"
                          >
                            <FiUserMinus />
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
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Today's Attendance ({frAttendance.length})</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary"
                onClick={fetchFRAttendance}
              >
                <FiRefreshCw /> Refresh
              </button>
              <button 
                className="btn btn-secondary"
                onClick={handleClearAttendance}
                disabled={!serverStatus.online}
              >
                <FiTrash2 /> Clear
              </button>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {frAttendance.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                <FiCheckCircle size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                <p>No attendance recorded today</p>
                {serverStatus.online && !serverStatus.recognition_active && (
                  <button 
                    className="btn btn-success" 
                    style={{ marginTop: '1rem' }}
                    onClick={handleStartRecognition}
                  >
                    <FiPlay /> Start Recognition
                  </button>
                )}
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frAttendance.map((record, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: '500' }}>{record.id}</td>
                        <td>{record.name}</td>
                        <td>
                          <span className="badge badge-success">{record.time}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); stopCamera(); setCapturedImage(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Register Student for Face Recognition</h3>
              <button onClick={() => { setShowAddModal(false); stopCamera(); setCapturedImage(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>
                &times;
              </button>
            </div>
            <form onSubmit={handleRegister}>
              <div className="modal-body">
                {/* Link from Platform */}
                <div className="form-group">
                  <label>Link from Platform (Optional)</label>
                  <select
                    onChange={(e) => handleSelectPlatformStudent(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Select Student from Platform --</option>
                    {platformStudents.map(student => (
                      <option key={student._id} value={student._id}>
                        {student.name} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Student ID * (Auto-generated)</label>
                    <input
                      type="text"
                      value={formData.student_id}
                      readOnly
                      style={{ background: 'var(--background)', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g., John Doe"
                    />
                  </div>
                </div>

                {/* Camera Section */}
                <div className="form-group">
                  <label>Student Photo *</label>
                  <div style={{ 
                    border: '2px dashed var(--border-color)', 
                    borderRadius: 'var(--radius)',
                    padding: '1rem',
                    textAlign: 'center',
                    background: 'var(--background)'
                  }}>
                    {!isCameraOpen && !capturedImage && (
                      <div>
                        <FiCamera size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                          Capture a clear photo of the student's face
                        </p>
                        <button type="button" className="btn btn-primary" onClick={startCamera}>
                          <FiCamera /> Open Camera
                        </button>
                      </div>
                    )}

                    {/* Video element always rendered but hidden when not active */}
                    <div style={{ display: isCameraOpen ? 'block' : 'none' }}>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline
                        muted
                        style={{ 
                          width: '100%', 
                          maxWidth: '400px', 
                          borderRadius: 'var(--radius)',
                          marginBottom: '1rem',
                          transform: 'scaleX(-1)'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button type="button" className="btn btn-primary" onClick={captureImage}>
                          <FiCamera /> Capture Photo
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={stopCamera}>
                          Cancel
                        </button>
                      </div>
                    </div>

                    {capturedImage && (
                      <div>
                        <img 
                          src={capturedImage} 
                          alt="Captured" 
                          style={{ 
                            width: '100%', 
                            maxWidth: '400px', 
                            borderRadius: 'var(--radius)',
                            marginBottom: '1rem'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button type="button" className="btn btn-success">
                            <FiCheckCircle /> Photo Captured
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={retakePhoto}>
                            <FiRefreshCw /> Retake
                          </button>
                        </div>
                      </div>
                    )}

                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddModal(false); stopCamera(); setCapturedImage(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!capturedImage}>
                  <FiUserPlus /> Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Student Modal */}
      {showRemoveModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowRemoveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Remove Student from Face Recognition</h3>
              <button onClick={() => setShowRemoveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <FiXCircle size={64} style={{ color: 'var(--danger-color)', marginBottom: '1rem' }} />
                <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                  Are you sure you want to remove <strong>{selectedStudent.name}</strong>?
                </p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Student ID: {selectedStudent.student_id}
                </p>
                <p style={{ color: 'var(--danger-color)', marginTop: '1rem', fontSize: '0.875rem' }}>
                  This will remove the student's face data from the recognition system.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRemoveModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleRemove}>
                <FiUserMinus /> Remove Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Face Recognition Settings</h3>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>ML Server URL</label>
                <input
                  type="text"
                  value={frServerUrl}
                  onChange={(e) => setFrServerUrl(e.target.value)}
                  placeholder="http://192.168.1.100:5001"
                />
                <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.5rem' }}>
                  Enter the IP address and port of the device running the ML server.
                  <br />
                  Example: http://192.168.1.100:5001
                </small>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(59, 130, 246, 0.1)', 
                borderRadius: 'var(--radius)',
                marginTop: '1rem' 
              }}>
                <strong>Note:</strong> After changing the server URL, you need to update the <code>FR_SERVER_URL</code> environment variable in the backend server and restart it.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveSettings}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementFaceRecognition;
