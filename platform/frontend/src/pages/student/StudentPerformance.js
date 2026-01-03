import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { 
  FiTrendingUp, FiAward, FiTarget, FiBookOpen, FiMap, 
  FiRefreshCw, FiCheckCircle, FiAlertTriangle, FiBarChart2,
  FiArrowUp, FiArrowDown, FiMinus
} from 'react-icons/fi';

const StudentPerformance = () => {
  const [stats, setStats] = useState({
    overall: { avgPercentage: 0, totalQuizzes: 0 },
    bySubject: [],
    recentTrend: []
  });
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const [statsRes, perfRes] = await Promise.all([
        api.get('/performance/stats'),
        api.get('/performance')
      ]);

      setStats(statsRes.data);
      setPerformance(perfRes.data);
    } catch (error) {
      console.error('Error fetching performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRoadmap = async () => {
    setGeneratingRoadmap(true);
    try {
      const response = await api.post('/ai/generate-roadmap');
      setRoadmap(response.data.roadmap);
      toast.success('Learning roadmap generated!');
    } catch (error) {
      console.error('Error generating roadmap:', error);
      toast.error('Failed to generate roadmap');
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  const generateAnalysis = async () => {
    setGeneratingAnalysis(true);
    try {
      const response = await api.post('/ai/analyze-performance');
      setAnalysis(response.data.analysis);
      toast.success('Performance analysis ready!');
    } catch (error) {
      console.error('Error analyzing performance:', error);
      toast.error('Failed to analyze performance');
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'badge-success';
    if (percentage >= 60) return 'badge-warning';
    return 'badge-danger';
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <FiArrowUp color="#10B981" />;
    if (trend < 0) return <FiArrowDown color="#EF4444" />;
    return <FiMinus color="#6B7280" />;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading performance...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Tabs */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiBarChart2 /> My Performance
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['overview', 'roadmap', 'analysis'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1rem',
                background: activeTab === tab 
                  ? 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))' 
                  : 'var(--card-background)',
                color: activeTab === tab ? 'white' : 'inherit',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? '600' : '400',
                textTransform: 'capitalize'
              }}
            >
              {tab === 'overview' && <FiTrendingUp style={{ marginRight: '0.5rem' }} />}
              {tab === 'roadmap' && <FiMap style={{ marginRight: '0.5rem' }} />}
              {tab === 'analysis' && <FiTarget style={{ marginRight: '0.5rem' }} />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
      <>
      {/* Stats Cards */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon primary">
              <FiTrendingUp size={24} />
            </div>
          </div>
          <div className="stat-value">{Math.round(stats.overall?.avgPercentage || 0)}%</div>
          <div className="stat-label">Average Score</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon success">
              <FiAward size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.overall?.totalQuizzes || 0}</div>
          <div className="stat-label">Total Quizzes</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon warning">
              <FiTarget size={24} />
            </div>
          </div>
          <div className="stat-value">
            {stats.bySubject?.[0]?._id || '-'}
          </div>
          <div className="stat-label">Best Subject</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon danger">
              <FiBookOpen size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.bySubject?.length || 0}</div>
          <div className="stat-label">Subjects Covered</div>
        </div>
      </div>

      {/* Subject-wise Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Subject-wise Performance</h3>
          </div>
          <div className="card-body">
            {stats.bySubject?.length === 0 ? (
              <div className="empty-state">
                <p>No subject data available</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stats.bySubject?.map((subject) => (
                  <div key={subject._id} style={{ 
                    padding: '1rem', 
                    background: 'var(--background)', 
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{subject._id || 'Unknown'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {subject.quizCount} quizzes
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${getScoreColor(subject.avgPercentage)}`}>
                        {Math.round(subject.avgPercentage)}% avg
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Best: {Math.round(subject.highestScore)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Trend */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Trend</h3>
          </div>
          <div className="card-body">
            {stats.recentTrend?.length === 0 ? (
              <div className="empty-state">
                <p>No recent quizzes</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats.recentTrend?.map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: 'var(--background)',
                    borderRadius: 'var(--radius)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                        {item.quiz_topic || item.subject}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`badge ${getScoreColor(item.percentage)}`}>
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* All Performance Records */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Quiz Records</h3>
        </div>
        <div className="card-body">
          {performance.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p className="empty-state-text">No performance records yet</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Topic</th>
                    <th>Score</th>
                    <th>AI Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((record) => (
                    <tr key={record._id}>
                      <td>{new Date(record.date).toLocaleDateString()}</td>
                      <td>{record.subject}</td>
                      <td>{record.quiz_topic || '-'}</td>
                      <td>
                        <span className={`badge ${getScoreColor(record.percentage)}`}>
                          {record.score}/{record.total_marks} ({record.percentage}%)
                        </span>
                      </td>
                      <td style={{ maxWidth: '250px' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {record.ai_feedback || 'No feedback'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* Roadmap Tab */}
      {activeTab === 'roadmap' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiMap /> Personalized Learning Roadmap
            </h3>
            <button 
              className="btn btn-primary"
              onClick={generateRoadmap}
              disabled={generatingRoadmap}
            >
              {generatingRoadmap ? (
                <><FiRefreshCw className="spin" /> Generating...</>
              ) : (
                <><FiMap /> Generate Roadmap</>
              )}
            </button>
          </div>
          <div className="card-body">
            {!roadmap ? (
              <div className="empty-state" style={{ padding: '3rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🗺️</div>
                <h3>Get Your Personalized Learning Roadmap</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '1rem auto' }}>
                  Based on your quiz performance and strengths, VidyaSetu AI will create a customized 
                  study plan to help you improve in weak areas and excel in your subjects.
                </p>
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={generateRoadmap}
                  disabled={generatingRoadmap}
                  style={{ marginTop: '1rem' }}
                >
                  {generatingRoadmap ? (
                    <><FiRefreshCw className="spin" /> Generating...</>
                  ) : (
                    <><FiMap /> Generate My Roadmap</>
                  )}
                </button>
              </div>
            ) : (
              <div>
                {/* Roadmap Overview */}
                <div style={{ 
                  background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  color: 'white',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{roadmap.title || 'Your Learning Journey'}</h3>
                  <p style={{ opacity: 0.9, margin: 0 }}>{roadmap.summary}</p>
                </div>

                {/* Phases */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {roadmap.phases?.map((phase, index) => (
                    <div 
                      key={index}
                      style={{
                        background: 'var(--background)',
                        borderRadius: 'var(--radius)',
                        padding: '1.5rem',
                        borderLeft: `4px solid ${
                          index === 0 ? 'var(--danger-color)' : 
                          index === 1 ? 'var(--warning-color)' : 'var(--success-color)'
                        }`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <span style={{
                          background: index === 0 ? 'var(--danger-color)' : 
                                     index === 1 ? 'var(--warning-color)' : 'var(--success-color)',
                          color: 'white',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}
                        </span>
                        <div>
                          <h4 style={{ margin: 0 }}>{phase.name}</h4>
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {phase.duration}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '2.5rem' }}>
                        {phase.tasks?.map((task, taskIndex) => (
                          <div 
                            key={taskIndex}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              background: 'var(--card-background)',
                              borderRadius: 'var(--radius)'
                            }}
                          >
                            <FiCheckCircle style={{ marginTop: '2px', color: 'var(--primary-color)' }} />
                            <span style={{ fontSize: '0.9rem' }}>{task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tips */}
                {roadmap.tips && (
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(var(--warning-rgb), 0.1)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--warning-color)'
                  }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiAlertTriangle color="var(--warning-color)" /> Pro Tips
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      {roadmap.tips.map((tip, i) => (
                        <li key={i} style={{ marginBottom: '0.5rem' }}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiTarget /> AI Performance Analysis
            </h3>
            <button 
              className="btn btn-primary"
              onClick={generateAnalysis}
              disabled={generatingAnalysis}
            >
              {generatingAnalysis ? (
                <><FiRefreshCw className="spin" /> Analyzing...</>
              ) : (
                <><FiTarget /> Analyze Performance</>
              )}
            </button>
          </div>
          <div className="card-body">
            {!analysis ? (
              <div className="empty-state" style={{ padding: '3rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
                <h3>Get AI-Powered Performance Insights</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '1rem auto' }}>
                  VidyaSetu AI will analyze your quiz results, identify patterns, and provide 
                  actionable insights to help you improve your academic performance.
                </p>
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={generateAnalysis}
                  disabled={generatingAnalysis}
                  style={{ marginTop: '1rem' }}
                >
                  {generatingAnalysis ? (
                    <><FiRefreshCw className="spin" /> Analyzing...</>
                  ) : (
                    <><FiTarget /> Analyze My Performance</>
                  )}
                </button>
              </div>
            ) : (
              <div>
                {/* Overall Assessment */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{analysis.overallGrade || 'B+'}</div>
                    <div style={{ opacity: 0.9 }}>Overall Grade</div>
                  </div>
                  <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
                    borderRadius: 'var(--radius-lg)',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{analysis.consistency || '78'}%</div>
                    <div style={{ opacity: 0.9 }}>Consistency Score</div>
                  </div>
                  <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      {getTrendIcon(analysis.trend)} {Math.abs(analysis.trend || 5)}%
                    </div>
                    <div style={{ opacity: 0.9 }}>Performance Trend</div>
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiAward /> Your Strengths
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                      {analysis.strengths?.map((strength, i) => (
                        <li key={i} style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiTarget /> Areas for Improvement
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                      {analysis.weaknesses?.map((weakness, i) => (
                        <li key={i} style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Detailed Analysis */}
                <div style={{
                  padding: '1.5rem',
                  background: 'var(--background)',
                  borderRadius: 'var(--radius)'
                }}>
                  <h4 style={{ margin: '0 0 1rem 0' }}>📝 Detailed Analysis</h4>
                  <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                    {analysis.detailedAnalysis}
                  </p>
                </div>

                {/* Recommendations */}
                {analysis.recommendations && (
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--primary-color)'
                  }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary-color)' }}>
                      🎯 Personalized Recommendations
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {analysis.recommendations.map((rec, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          background: 'var(--card-background)',
                          borderRadius: 'var(--radius)'
                        }}>
                          <span style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            flexShrink: 0
                          }}>
                            {i + 1}
                          </span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StudentPerformance;
