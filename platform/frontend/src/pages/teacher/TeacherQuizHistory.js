import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiBookOpen, FiUsers, FiTrendingUp, FiClock, FiCalendar, FiEye, FiX, FiCheckCircle, FiXCircle, FiAward } from 'react-icons/fi';

const TeacherQuizHistory = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  useEffect(() => {
    fetchQuizHistory();
  }, []);

  const fetchQuizHistory = async () => {
    try {
      const response = await api.get('/resources/quizzes/teacher-history');
      setQuizzes(response.data);
    } catch (error) {
      toast.error('Failed to fetch quiz history');
    } finally {
      setLoading(false);
    }
  };

  const viewAttempts = async (quiz) => {
    setSelectedQuiz(quiz);
    setLoadingAttempts(true);
    try {
      const response = await api.get(`/resources/quizzes/${quiz._id}/attempts`);
      setAttempts(response.data.attempts);
    } catch (error) {
      toast.error('Failed to fetch attempts');
    } finally {
      setLoadingAttempts(false);
    }
  };

  const viewAttemptDetails = (attempt) => {
    setSelectedAttempt(attempt);
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'var(--secondary-color)';
    if (percentage >= 60) return 'var(--primary-color)';
    if (percentage >= 40) return 'var(--warning-color)';
    return 'var(--danger-color)';
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading quiz history...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Quiz History</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          View your published quizzes and student attempts
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius)', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiBookOpen size={24} color="var(--primary-color)" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{quizzes.length}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Quizzes</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius)', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiUsers size={24} color="var(--secondary-color)" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                {quizzes.reduce((sum, q) => sum + q.stats.totalAttempts, 0)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Attempts</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius)', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiTrendingUp size={24} color="var(--warning-color)" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                {quizzes.length > 0 ? Math.round(quizzes.reduce((sum, q) => sum + q.stats.avgScore, 0) / quizzes.length) : 0}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Avg Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz List */}
      {quizzes.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <p className="empty-state-text">No quizzes published yet</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Upload a resource and generate a quiz to get started
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{quiz.title}</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      <span className="badge badge-primary">{quiz.subject}</span>
                      <span className="badge badge-success">{quiz.questionCount} Questions</span>
                      <span className="badge badge-warning">{quiz.duration} mins</span>
                      <span className={`badge ${quiz.status === 'published' ? 'badge-primary' : 'badge-secondary'}`}>
                        {quiz.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiCalendar /> {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiUsers /> {quiz.stats.totalAttempts} attempts
                      </span>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: getScoreColor(quiz.stats.avgScore) }}>
                        {quiz.stats.avgScore}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Avg Score</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--secondary-color)' }}>
                        {quiz.stats.highestScore}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Highest</div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => viewAttempts(quiz)}
                    >
                      <FiEye /> View Attempts
                    </button>
                  </div>
                </div>

                {/* Recent Attempts Preview */}
                {quiz.recentAttempts.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Recent Attempts:</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {quiz.recentAttempts.map((attempt) => (
                        <div key={attempt._id} style={{
                          padding: '0.5rem 0.75rem',
                          background: 'var(--background)',
                          borderRadius: 'var(--radius)',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontWeight: '500' }}>{attempt.student?.name || 'Student'}</span>
                          <span style={{ color: getScoreColor(attempt.percentage), fontWeight: '600' }}>
                            {attempt.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attempts Modal */}
      {selectedQuiz && (
        <div className="modal-overlay" onClick={() => { setSelectedQuiz(null); setAttempts([]); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header" style={{ background: 'var(--primary-color)', color: 'white' }}>
              <div>
                <h3 style={{ margin: 0 }}>{selectedQuiz.title}</h3>
                <small>{selectedQuiz.stats.totalAttempts} student attempts</small>
              </div>
              <button onClick={() => { setSelectedQuiz(null); setAttempts([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', fontSize: '1.5rem' }}>
                <FiX />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              {loadingAttempts ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner"></div>
                  <p>Loading attempts...</p>
                </div>
              ) : attempts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>No attempts yet</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Student</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Score</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Percentage</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Grade</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Date</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt) => (
                      <tr key={attempt._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: '500' }}>{attempt.student?.name || 'Unknown'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{attempt.student?.email}</div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.75rem', fontWeight: '600' }}>
                          {attempt.score}/{attempt.totalMarks}
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                          <span style={{ 
                            padding: '0.25rem 0.75rem', 
                            borderRadius: '9999px', 
                            background: `${getScoreColor(attempt.percentage)}20`,
                            color: getScoreColor(attempt.percentage),
                            fontWeight: '600'
                          }}>
                            {attempt.percentage}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                          <span style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: `${getScoreColor(attempt.percentage)}20`,
                            color: getScoreColor(attempt.percentage),
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700'
                          }}>
                            {getGrade(attempt.percentage)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(attempt.date).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => viewAttemptDetails(attempt)}
                          >
                            <FiEye /> Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attempt Details Modal */}
      {selectedAttempt && (
        <div className="modal-overlay" onClick={() => setSelectedAttempt(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header" style={{ background: getScoreColor(selectedAttempt.percentage), color: 'white' }}>
              <div>
                <h3 style={{ margin: 0 }}>{selectedAttempt.student?.name}'s Attempt</h3>
                <small>Score: {selectedAttempt.score}/{selectedAttempt.totalMarks} ({selectedAttempt.percentage}%)</small>
              </div>
              <button onClick={() => setSelectedAttempt(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', fontSize: '1.5rem' }}>
                <FiX />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              {/* Score Summary */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '50%', 
                    background: `${getScoreColor(selectedAttempt.percentage)}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.5rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: getScoreColor(selectedAttempt.percentage) }}>
                        {getGrade(selectedAttempt.percentage)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{selectedAttempt.percentage}%</div>
                </div>
              </div>

              {/* AI Feedback */}
              {selectedAttempt.ai_feedback && (
                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--background)', 
                  borderRadius: 'var(--radius)',
                  marginBottom: '1.5rem'
                }}>
                  <h5 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiAward color="var(--warning-color)" /> AI Feedback
                  </h5>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{selectedAttempt.ai_feedback}</p>
                </div>
              )}

              {/* Answer Details */}
              <h5 style={{ marginBottom: '1rem' }}>Answer Details</h5>
              {selectedAttempt.answers?.map((answer, index) => (
                <div key={index} style={{
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${answer.is_correct ? 'var(--secondary-color)' : 'var(--danger-color)'}`,
                  background: answer.is_correct ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: answer.is_correct ? 'var(--secondary-color)' : 'var(--danger-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {answer.is_correct ? <FiCheckCircle color="white" size={14} /> : <FiXCircle color="white" size={14} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '500', marginBottom: '0.5rem' }}>Q{index + 1}. {answer.question}</p>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Student's Answer:</span>
                          <span style={{ fontWeight: '500' }}>{answer.student_answer}</span>
                        </div>
                        {!answer.is_correct && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Correct Answer:</span>
                            <span style={{ fontWeight: '500', color: 'var(--secondary-color)' }}>{answer.correct_answer}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherQuizHistory;
