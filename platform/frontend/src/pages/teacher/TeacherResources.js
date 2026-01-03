import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiUpload, FiFile, FiBook, FiFileText, FiTrash2, FiPlay, FiLoader, FiSend, FiX, FiCheck, FiClock, FiEye } from 'react-icons/fi';

const TeacherResources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQuizPreview, setShowQuizPreview] = useState(false);
  const [showLessonPlanPreview, setShowLessonPlanPreview] = useState(false);
  const [previewQuiz, setPreviewQuiz] = useState(null);
  const [previewLessonPlan, setPreviewLessonPlan] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [savingLessonPlan, setSavingLessonPlan] = useState(false);
  const [quizSettings, setQuizSettings] = useState({ duration: 30, class_id: '' });
  const [lessonPlanSettings, setLessonPlanSettings] = useState({ duration: '45 minutes', grade_level: '10th' });
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    type: 'curriculum',
    class_id: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Computer Science', 'Social Science'];

  useEffect(() => {
    fetchResources();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      // Fetch only classes that have enrolled students
      const res = await api.get('/classes/with-students');
      if (res.data && res.data.length > 0) {
        setClasses(res.data);
      } else {
        // Fallback - no classes with students
        setClasses([]);
        console.log('No classes with enrolled students found');
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses([]);
    }
  };

  const fetchResources = async () => {
    try {
      const response = await api.get('/resources');
      setResources(response.data);
    } catch (error) {
      toast.error('Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.append('file', selectedFile);
    data.append('title', formData.title);
    data.append('subject', formData.subject);
    data.append('description', formData.description);
    data.append('type', formData.type);
    data.append('class_id', formData.class_id);

    try {
      await api.post('/resources/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Resource uploaded successfully!');
      setShowUploadModal(false);
      setFormData({ title: '', subject: '', description: '', type: 'curriculum', class_id: '' });
      setSelectedFile(null);
      fetchResources();
    } catch (error) {
      toast.error('Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateQuiz = async (resourceId) => {
    setGenerating(resourceId);
    try {
      const response = await api.post(`/resources/${resourceId}/generate-quiz`, {
        numQuestions: 5,
        difficulty: 'medium'
      });
      // Show quiz preview modal
      setPreviewQuiz(response.data);
      setQuizSettings({ duration: 30, class_id: response.data.class_id || '' });
      setShowQuizPreview(true);
      toast.success('Quiz generated! Review and publish it.');
    } catch (error) {
      toast.error('Failed to generate quiz');
    } finally {
      setGenerating(null);
    }
  };

  const handlePublishQuiz = async () => {
    if (!previewQuiz) return;
    
    setPublishing(true);
    try {
      await api.post(`/resources/${previewQuiz.resource_id}/publish-quiz`, {
        quiz_title: previewQuiz.quiz_title,
        questions: previewQuiz.questions,
        class_id: quizSettings.class_id || 'General',
        duration: quizSettings.duration
      });
      toast.success('Quiz published! Students can now attempt it.');
      setShowQuizPreview(false);
      setPreviewQuiz(null);
    } catch (error) {
      toast.error('Failed to publish quiz');
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerateLessonPlan = async (resourceId) => {
    setGenerating(resourceId + '-lesson');
    try {
      const response = await api.post(`/resources/${resourceId}/generate-lesson-plan`, {
        duration: lessonPlanSettings.duration,
        grade_level: lessonPlanSettings.grade_level
      });
      // Show lesson plan preview modal
      setPreviewLessonPlan({ ...response.data, resource_id: resourceId });
      setShowLessonPlanPreview(true);
      toast.success('Lesson plan generated! Review and save it.');
    } catch (error) {
      toast.error('Failed to generate lesson plan');
    } finally {
      setGenerating(null);
    }
  };

  const handleSaveLessonPlan = async () => {
    if (!previewLessonPlan) return;
    
    setSavingLessonPlan(true);
    try {
      // The lesson plan is already saved in the backend when generated
      // Just show success and close the modal
      toast.success('Lesson plan saved successfully!');
      setShowLessonPlanPreview(false);
      setPreviewLessonPlan(null);
      fetchResources();
    } catch (error) {
      toast.error('Failed to save lesson plan');
    } finally {
      setSavingLessonPlan(false);
    }
  };

  const handleDelete = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;

    try {
      await api.delete(`/resources/${resourceId}`);
      toast.success('Resource deleted');
      fetchResources();
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading resources...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Teaching Resources</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Upload curriculum PDFs to generate quizzes and lesson plans using AI
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
          <FiUpload /> Upload Resource
        </button>
      </div>

      {/* Resources Grid */}
      {resources.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <p className="empty-state-text">No resources uploaded yet</p>
              <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                <FiUpload /> Upload Your First Resource
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {resources.map((resource) => (
            <div key={resource._id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius)',
                    background: 'rgba(79, 70, 229, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {resource.type === 'curriculum' ? <FiFile size={24} color="var(--primary-color)" /> :
                     resource.type === 'lesson_plan' ? <FiBook size={24} color="var(--secondary-color)" /> :
                     <FiFileText size={24} color="var(--warning-color)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{resource.title}</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-primary">
                        {resource.topics?.[0] || (typeof resource.subject === 'object' ? resource.subject?.name : resource.subject) || 'No Subject'}
                      </span>
                      <span className="badge badge-success">{resource.type}</span>
                      {(resource.chapter || resource.applicableClasses?.[0]) && (
                        <span className="badge badge-warning">
                          Class: {resource.chapter || (typeof resource.applicableClasses?.[0] === 'object' ? resource.applicableClasses[0]?.name : resource.applicableClasses?.[0])}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {resource.description && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    {resource.description}
                  </p>
                )}

                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Uploaded: {resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : 'N/A'}
                </div>

                {resource.type === 'curriculum' && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleGenerateQuiz(resource._id)}
                      disabled={generating === resource._id}
                    >
                      {generating === resource._id ? <FiLoader className="spinning" /> : <FiPlay />}
                      Generate Quiz
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleGenerateLessonPlan(resource._id)}
                      disabled={generating === resource._id + '-lesson'}
                    >
                      {generating === resource._id + '-lesson' ? <FiLoader className="spinning" /> : <FiBook />}
                      Lesson Plan
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}
                      onClick={() => handleDelete(resource._id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                )}

                {resource.type === 'lesson-plan' && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        try {
                          const lessonData = JSON.parse(resource.aiGeneratedContent?.summary || '{}');
                          setPreviewLessonPlan({ ...lessonData, resource_id: resource._id });
                          setShowLessonPlanPreview(true);
                        } catch (e) {
                          toast.error('Unable to view lesson plan');
                        }
                      }}
                    >
                      <FiEye /> View
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}
                      onClick={() => handleDelete(resource._id)}
                    >
                      <FiTrash2 /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Resource</h3>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>
                &times;
              </button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Chapter 5 - Thermodynamics"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Subject</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Class</label>
                    <select
                      value={formData.class_id}
                      onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls._id} value={cls._id}>
                          {cls.displayName || cls.name || cls._id} ({cls.studentCount || 0} students)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the content"
                  />
                </div>

                <div className="form-group">
                  <label>PDF File</label>
                  <div 
                    className="file-upload"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf"
                      onChange={handleFileSelect}
                    />
                    <div className="file-upload-icon">📄</div>
                    <p className="file-upload-text">
                      {selectedFile ? selectedFile.name : 'Click to select a PDF file'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Preview Modal */}
      {showQuizPreview && previewQuiz && (
        <div className="modal-overlay" onClick={() => setShowQuizPreview(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header" style={{ background: 'var(--primary-color)', color: 'white' }}>
              <div>
                <h3 style={{ margin: 0 }}><FiEye /> Quiz Preview</h3>
                <small>Review the generated quiz before sending to students</small>
              </div>
              <button onClick={() => setShowQuizPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'white' }}>
                <FiX />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              {/* Quiz Title */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>
                  {previewQuiz.quiz_title}
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-primary">{previewQuiz.subject}</span>
                  <span className="badge badge-success">{previewQuiz.questions?.length || 0} Questions</span>
                </div>
              </div>

              {/* Quiz Settings */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <h5 style={{ margin: '0 0 1rem 0' }}>Quiz Settings</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label><FiClock /> Duration (minutes)</label>
                    <input
                      type="number"
                      value={quizSettings.duration}
                      onChange={(e) => setQuizSettings({ ...quizSettings, duration: parseInt(e.target.value) || 30 })}
                      min="5"
                      max="180"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Assign to Class</label>
                    <select
                      value={quizSettings.class_id}
                      onChange={(e) => setQuizSettings({ ...quizSettings, class_id: e.target.value })}
                    >
                      <option value="">All Classes</option>
                      {classes.map(cls => (
                        <option key={cls._id} value={cls._id}>
                          {cls.displayName || cls.name || cls._id} ({cls.studentCount || 0} students)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Questions Preview */}
              <div>
                <h5 style={{ marginBottom: '1rem' }}>Questions</h5>
                {previewQuiz.questions?.map((q, index) => (
                  <div key={index} style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'var(--background)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.75rem' }}>
                      Q{index + 1}. {q.question}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {q.options?.map((opt, optIndex) => (
                        <div key={optIndex} style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius)',
                          background: opt.startsWith(q.correct_answer + ')') || q.correct_answer === String.fromCharCode(65 + optIndex) 
                            ? 'rgba(16, 185, 129, 0.15)' 
                            : 'white',
                          border: opt.startsWith(q.correct_answer + ')') || q.correct_answer === String.fromCharCode(65 + optIndex)
                            ? '1px solid var(--secondary-color)'
                            : '1px solid var(--border)',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          {(opt.startsWith(q.correct_answer + ')') || q.correct_answer === String.fromCharCode(65 + optIndex)) && (
                            <FiCheck color="var(--secondary-color)" />
                          )}
                          {opt}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        💡 {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowQuizPreview(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handlePublishQuiz}
                disabled={publishing}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {publishing ? <FiLoader className="spinning" /> : <FiSend />}
                {publishing ? 'Publishing...' : 'Publish to Students'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Plan Preview Modal */}
      {showLessonPlanPreview && previewLessonPlan && (
        <div className="modal-overlay" onClick={() => setShowLessonPlanPreview(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header" style={{ background: 'var(--secondary-color)', color: 'white' }}>
              <div>
                <h3 style={{ margin: 0 }}><FiBook /> Lesson Plan Preview</h3>
                <small>Review the generated lesson plan</small>
              </div>
              <button onClick={() => setShowLessonPlanPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'white' }}>
                <FiX />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              {/* Lesson Plan Title */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--secondary-color)' }}>
                  {previewLessonPlan.title}
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-primary">{previewLessonPlan.subject}</span>
                  <span className="badge badge-success">{previewLessonPlan.grade_level}</span>
                  <span className="badge badge-warning">{previewLessonPlan.duration}</span>
                </div>
              </div>

              {/* Learning Objectives */}
              {previewLessonPlan.learning_objectives && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🎯 Learning Objectives
                  </h5>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {previewLessonPlan.learning_objectives.map((obj, index) => (
                      <li key={index} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Materials Needed */}
              {previewLessonPlan.materials_needed && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📦 Materials Needed
                  </h5>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {previewLessonPlan.materials_needed.map((mat, index) => (
                      <span key={index} className="badge badge-secondary" style={{ padding: '0.5rem 0.75rem' }}>{mat}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lesson Outline */}
              {previewLessonPlan.lesson_outline && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📋 Lesson Outline
                  </h5>
                  {previewLessonPlan.lesson_outline.map((phase, index) => (
                    <div key={index} style={{
                      marginBottom: '1rem',
                      padding: '1rem',
                      background: 'var(--background)',
                      borderRadius: 'var(--radius)',
                      borderLeft: '4px solid var(--primary-color)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <strong style={{ color: 'var(--primary-color)' }}>{phase.phase}</strong>
                        <span className="badge badge-warning">{phase.duration}</span>
                      </div>
                      {phase.activities && (
                        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
                          {phase.activities.map((activity, actIndex) => (
                            <li key={actIndex} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{activity}</li>
                          ))}
                        </ul>
                      )}
                      {phase.teacher_notes && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(79, 70, 229, 0.05)', borderRadius: 'var(--radius)' }}>
                          💡 Teacher Notes: {phase.teacher_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Assessment Methods */}
              {previewLessonPlan.assessment_methods && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ✅ Assessment Methods
                  </h5>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {previewLessonPlan.assessment_methods.map((method, index) => (
                      <li key={index} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{method}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Homework */}
              {previewLessonPlan.homework && (
                <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius)', border: '1px solid var(--warning-color)' }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📝 Homework Assignment
                  </h5>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{previewLessonPlan.homework}</p>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowLessonPlanPreview(false)}
              >
                Discard
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveLessonPlan}
                disabled={savingLessonPlan}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--secondary-color)' }}
              >
                {savingLessonPlan ? <FiLoader className="spinning" /> : <FiCheck />}
                {savingLessonPlan ? 'Saving...' : 'Save Lesson Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherResources;
