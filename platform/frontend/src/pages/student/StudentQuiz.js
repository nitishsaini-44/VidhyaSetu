import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiClock, FiCheckCircle, FiArrowRight, FiArrowLeft, FiPlay, FiBookOpen, FiUser, FiCalendar, FiList, FiRotateCcw, FiEye, FiX, FiXCircle, FiAward, FiTrendingUp } from 'react-icons/fi';

const StudentQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('available');
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [quizHistory, setQuizHistory] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  useEffect(() => {
    if (quizId) {
      fetchQuizForAttempt(quizId);
    } else {
      fetchAvailableQuizzes();
      fetchQuizHistory();
    }
  }, [quizId]);

  // Timer effect
  useEffect(() => {
    if (quizStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit(); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quizStarted, timeLeft]);

  const fetchAvailableQuizzes = async () => {
    try {
      const response = await api.get('/resources/quizzes/available');
      setAvailableQuizzes(response.data);
    } catch (error) {
      toast.error('Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizHistory = async () => {
    try {
      const response = await api.get('/resources/quizzes/student-history');
      setQuizHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch quiz history:', error);
    }
  };

  const fetchQuizForAttempt = async (id) => {
    try {
      const response = await api.get(`/resources/quizzes/${id}`);
      setQuiz(response.data);
      setSelectedQuiz({ _id: id, duration: response.data.duration });
    } catch (error) {
      toast.error('Failed to load quiz');
      navigate('/student/quiz');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (quizItem) => {
    setLoading(true);
    try {
      const response = await api.get(`/resources/quizzes/${quizItem._id}`);
      setQuiz(response.data);
      setSelectedQuiz(quizItem);
      setTimeLeft(quizItem.duration * 60); // Convert minutes to seconds
      setQuizStarted(true);
    } catch (error) {
      toast.error('Failed to start quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quiz.questions.length) {
      const confirmSubmit = window.confirm('You have unanswered questions. Are you sure you want to submit?');
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      const answerArray = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        student_answer: answer
      }));

      const response = await api.post('/performance/submit-quiz', {
        quiz_id: selectedQuiz._id,
        quiz_topic: quiz.quiz_title,
        subject: quiz.subject,
        answers: answerArray
      });

      setResult(response.data);
      toast.success('Quiz submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const viewAttemptDetails = (attempt) => {
    setSelectedAttempt(attempt);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>{quizId ? 'Loading quiz...' : 'Loading available quizzes...'}</p>
      </div>
    );
  }

  // Show result if quiz is completed
  if (result) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card">
          <div className="card-header" style={{ textAlign: 'center', background: 'var(--primary-color)', color: 'white' }}>
            <h3 className="card-title">Quiz Complete! 🎉</h3>
          </div>
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
              {result.percentage >= 80 ? '🏆' : result.percentage >= 60 ? '👍' : '💪'}
            </div>
            <div style={{ fontSize: '3rem', fontWeight: '700', color: 'var(--primary-color)' }}>
              {result.score}/{result.total_marks}
            </div>
            <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {result.percentage}% Score
            </div>
            
            <div style={{ 
              background: 'var(--background)', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius)',
              textAlign: 'left',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ marginBottom: '0.5rem' }}>AI Feedback:</h4>
              <p style={{ color: 'var(--text-secondary)' }}>{result.ai_feedback}</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setResult(null);
                  setQuiz(null);
                  setSelectedQuiz(null);
                  setQuizStarted(false);
                  setAnswers({});
                  setCurrentQuestion(0);
                  fetchAvailableQuizzes();
                  fetchQuizHistory();
                }}
              >
                Take Another Quiz
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/student/performance')}
              >
                View All Performance
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show available quizzes list if no quiz is being attempted
  if (!quizStarted && !quizId) {
    return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Quizzes</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Take quizzes and track your progress
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card">
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius)', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiBookOpen size={22} color="var(--primary-color)" />
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{availableQuizzes.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Available</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius)', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiCheckCircle size={22} color="var(--secondary-color)" />
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{quizHistory.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Completed</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius)', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiTrendingUp size={22} color="var(--warning-color)" />
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                  {quizHistory.length > 0 ? Math.round(quizHistory.reduce((sum, q) => sum + q.percentage, 0) / quizHistory.length) : 0}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Avg Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('available')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: '500',
              color: activeTab === 'available' ? 'var(--primary-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'available' ? '2px solid var(--primary-color)' : '2px solid transparent',
              marginBottom: '-1px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FiList /> Available Quizzes ({availableQuizzes.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: '500',
              color: activeTab === 'history' ? 'var(--primary-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'history' ? '2px solid var(--primary-color)' : '2px solid transparent',
              marginBottom: '-1px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FiRotateCcw /> My History ({quizHistory.length})
          </button>
        </div>

        {/* Available Quizzes Tab */}
        {activeTab === 'available' && (
          <>
            {availableQuizzes.length === 0 ? (
              <div className="card">
                <div className="card-body">
                  <div className="empty-state">
                    <div className="empty-state-icon">📝</div>
                    <p className="empty-state-text">No quizzes available yet</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Your teachers haven't published any quizzes. Check back later!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {availableQuizzes.map((quizItem) => (
                  <div key={quizItem._id} className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
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
                          <FiBookOpen size={24} color="var(--primary-color)" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{quizItem.title}</h4>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span className="badge badge-primary">{quizItem.subject}</span>
                            {quizItem.class && !/^[a-fA-F0-9]{24}$/.test(quizItem.class) && (
                              <span className="badge badge-warning">Class: {quizItem.class}</span>
                            )}
                            <span className="badge badge-success">{quizItem.questionCount} Questions</span>
                          </div>
                        </div>
                      </div>

                      {quizItem.description && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                          {quizItem.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FiClock /> {quizItem.duration} mins
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FiUser /> {quizItem.createdBy}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FiCalendar /> {new Date(quizItem.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => startQuiz(quizItem)}
                      >
                        <FiPlay /> Start Quiz
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <>
            {quizHistory.length === 0 ? (
              <div className="card">
                <div className="card-body">
                  <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <p className="empty-state-text">No quiz history yet</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Complete a quiz to see your results here!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {quizHistory.map((attempt) => (
                  <div key={attempt._id} className="card">
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: `${getScoreColor(attempt.percentage)}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <span style={{ 
                              fontSize: '1.25rem', 
                              fontWeight: '700', 
                              color: getScoreColor(attempt.percentage) 
                            }}>
                              {getGrade(attempt.percentage)}
                            </span>
                          </div>
                          <div>
                            <h4 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{attempt.quiz_topic}</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                              <span className="badge badge-primary">{attempt.subject}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                              <span><FiCalendar style={{ verticalAlign: 'middle' }} /> {new Date(attempt.date).toLocaleDateString()}</span>
                              {attempt.time_taken && <span><FiClock style={{ verticalAlign: 'middle' }} /> {Math.round(attempt.time_taken / 60)} mins</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: getScoreColor(attempt.percentage) }}>
                              {attempt.percentage}%
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              {attempt.score}/{attempt.total_marks}
                            </div>
                          </div>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => viewAttemptDetails(attempt)}
                          >
                            <FiEye /> Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Attempt Details Modal */}
        {selectedAttempt && (
          <div className="modal-overlay" onClick={() => setSelectedAttempt(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
              <div className="modal-header" style={{ background: getScoreColor(selectedAttempt.percentage), color: 'white' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{selectedAttempt.quiz_topic}</h3>
                  <small>Score: {selectedAttempt.score}/{selectedAttempt.total_marks} ({selectedAttempt.percentage}%)</small>
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
                {selectedAttempt.answers && selectedAttempt.answers.length > 0 && (
                  <>
                    <h5 style={{ marginBottom: '1rem' }}>Answer Details</h5>
                    {selectedAttempt.answers.map((answer, index) => (
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
                                <span style={{ color: 'var(--text-secondary)' }}>Your Answer:</span>
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
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Quiz attempt view
  const question = quiz?.questions?.[currentQuestion];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>{quiz?.quiz_title}</h3>
            <span className="badge badge-primary" style={{ marginTop: '0.5rem' }}>
              Question {currentQuestion + 1} of {quiz?.questions?.length}
            </span>
          </div>
          {/* Timer */}
          <div style={{
            padding: '0.5rem 1rem',
            background: timeLeft < 60 ? 'rgba(239, 68, 68, 0.1)' : 'var(--background)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: timeLeft < 60 ? 'var(--danger-color)' : 'var(--text-primary)',
            fontWeight: '600'
          }}>
            <FiClock />
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="card-body">
          {/* Progress Bar */}
          <div style={{ 
            height: '4px', 
            background: 'var(--border-color)', 
            borderRadius: '2px',
            marginBottom: '2rem',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${((currentQuestion + 1) / quiz?.questions?.length) * 100}%`,
              background: 'var(--primary-color)',
              transition: 'width 0.3s'
            }} />
          </div>

          {/* Question */}
          <h4 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
            {question?.question}
          </h4>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {question?.options?.map((option, index) => {
              const optionLetter = option.charAt(0);
              const isSelected = answers[question.id] === optionLetter;
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(question.id, optionLetter)}
                  style={{
                    padding: '1rem',
                    border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius)',
                    background: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isSelected ? 'var(--primary-color)' : 'var(--background)',
                    color: isSelected ? 'white' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}>
                    {optionLetter}
                  </span>
                  {option.substring(3)}
                </button>
              );
            })}
          </div>

          {/* Question Navigator */}
          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Quick Navigation:</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {quiz?.questions?.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestion(idx)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    background: answers[quiz.questions[idx].id] 
                      ? 'var(--secondary-color)' 
                      : idx === currentQuestion 
                        ? 'var(--primary-color)' 
                        : 'var(--background)',
                    color: answers[quiz.questions[idx].id] || idx === currentQuestion ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '0.8rem'
                  }}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-color)'
          }}>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentQuestion(prev => prev - 1)}
              disabled={currentQuestion === 0}
            >
              <FiArrowLeft /> Previous
            </button>

            {currentQuestion === quiz?.questions?.length - 1 ? (
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'} <FiCheckCircle />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setCurrentQuestion(prev => prev + 1)}
              >
                Next <FiArrowRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentQuiz;
