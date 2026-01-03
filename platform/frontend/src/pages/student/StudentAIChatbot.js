import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { 
  FiSend, FiMessageCircle, FiUser, FiCpu, FiImage, 
  FiUpload, FiX, FiBookOpen, FiHelpCircle, FiZap
} from 'react-icons/fi';

const StudentAIChatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Load conversation history
    loadConversationHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationHistory = async () => {
    try {
      const response = await api.get('/ai/conversations');
      if (response.data.length > 0) {
        const latestConversation = response.data[0];
        setConversationId(latestConversation._id);
        setMessages(latestConversation.messages || []);
      } else {
        // Add welcome message
        setMessages([{
          role: 'assistant',
          content: `Hello ${user?.name}! 👋 I'm **VidyaSetu AI**, your personal learning assistant.\n\nI can help you with:\n- 📚 **Answering academic questions** in any subject\n- 📸 **Solving problems from images** - just upload a photo!\n- 📝 **Explaining concepts** in simple terms\n- 🎯 **Providing study tips** and strategies\n- 🔬 **Breaking down complex topics**\n\nHow can I help you today?`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      setMessages([{
        role: 'assistant',
        content: `Hello ${user?.name}! 👋 I'm VidyaSetu AI. How can I help you study today?`,
        timestamp: new Date()
      }]);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result);
        setImagePreview(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !uploadedImage) || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      image: imagePreview,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const currentImage = uploadedImage;
    removeImage();
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        message: input,
        image: currentImage,
        conversationId,
        context: {
          studentName: user?.name,
          class: user?.studentInfo?.class || user?.class_id,
          subjects: user?.subjects || []
        }
      });

      if (response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response. Please try again.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    { icon: <FiBookOpen />, text: 'Explain a concept', prompt: 'Can you explain ' },
    { icon: <FiHelpCircle />, text: 'Solve a problem', prompt: 'Help me solve this problem: ' },
    { icon: <FiZap />, text: 'Quick revision', prompt: 'Give me a quick revision of ' },
  ];

  const formatMessage = (content) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('###')) {
          return <h4 key={i} style={{ margin: '0.5rem 0', color: 'var(--primary-color)' }}>{line.replace('###', '').trim()}</h4>;
        }
        if (line.startsWith('##')) {
          return <h3 key={i} style={{ margin: '0.5rem 0', color: 'var(--primary-color)' }}>{line.replace('##', '').trim()}</h3>;
        }
        // Bold text
        let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
          return <li key={i} style={{ marginLeft: '1rem' }} dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-•]\s*/, '') }} />;
        }
        // Numbered lists
        if (/^\d+\./.test(line.trim())) {
          return <li key={i} style={{ marginLeft: '1rem' }} dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s*/, '') }} />;
        }
        return <p key={i} style={{ margin: '0.25rem 0' }} dangerouslySetInnerHTML={{ __html: formatted }} />;
      });
  };

  return (
    <div style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1rem',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FiCpu size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>VidyaSetu AI Assistant</h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem' }}>
              Ask questions, upload images, get instant help!
            </p>
          </div>
        </div>
      </div>

      {/* Quick Questions */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {quickQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => setInput(q.prompt)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'var(--card-background)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.borderColor = 'var(--primary-color)'}
            onMouseOut={(e) => e.target.style.borderColor = 'var(--border-color)'}
          >
            {q.icon} {q.text}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '0.75rem'
              }}
            >
              {message.role === 'assistant' && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0
                }}>
                  <FiCpu size={18} />
                </div>
              )}
              
              <div style={{
                maxWidth: '75%',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                background: message.role === 'user' 
                  ? 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))' 
                  : 'var(--background)',
                color: message.role === 'user' ? 'white' : 'inherit',
                border: message.role === 'assistant' ? '1px solid var(--border-color)' : 'none'
              }}>
                {message.image && (
                  <img 
                    src={message.image} 
                    alt="Uploaded" 
                    style={{ 
                      maxWidth: '200px', 
                      borderRadius: 'var(--radius)', 
                      marginBottom: '0.5rem' 
                    }} 
                  />
                )}
                <div style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                  {formatMessage(message.content)}
                </div>
                <div style={{ 
                  fontSize: '0.7rem', 
                  opacity: 0.7, 
                  marginTop: '0.5rem',
                  textAlign: 'right' 
                }}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {message.role === 'user' && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--card-background)',
                  border: '2px solid var(--primary-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-color)',
                  flexShrink: 0
                }}>
                  <FiUser size={18} />
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <FiCpu size={18} />
              </div>
              <div style={{
                padding: '1rem',
                background: 'var(--background)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)'
              }}>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div style={{
            padding: '0.5rem 1rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <img 
              src={imagePreview} 
              alt="Preview" 
              style={{ height: '60px', borderRadius: 'var(--radius)' }} 
            />
            <button
              onClick={removeImage}
              style={{
                background: 'var(--danger-color)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FiX size={14} />
            </button>
          </div>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit} style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-end'
        }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '0.75rem',
              background: 'var(--background)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Upload image"
          >
            <FiImage size={20} />
          </button>

          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask any question or upload an image..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
                resize: 'none',
                minHeight: '48px',
                maxHeight: '120px',
                fontFamily: 'inherit',
                fontSize: '0.95rem'
              }}
              rows={1}
            />
          </div>

          <button
            type="submit"
            disabled={loading || (!input.trim() && !uploadedImage)}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? (
              <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
            ) : (
              <>
                <FiSend /> Send
              </>
            )}
          </button>
        </form>
      </div>

      {/* Typing indicator styles */}
      <style>{`
        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 4px 0;
        }
        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary-color);
          animation: typing 1.4s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default StudentAIChatbot;
