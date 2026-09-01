// frontend/src/ChatBot.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { API_URL } from './config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I'm ChemLab Bot, your chemistry assistant. Ask me anything about chemistry or ChemLab Kenya!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          session_id: sessionId
        })
      });

      const data = await response.json();

      if (data.success) {
        const botMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: `❌ Error: ${data.error || 'Something went wrong. Please try again.'}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Network error. Please check your connection and try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const clearChat = async () => {
    try {
      await fetch(`${API_URL}/api/chat/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }

    setMessages([
      {
        role: 'assistant',
        content: "🧪 Chat cleared! Ask me anything about chemistry or ChemLab Kenya.",
        timestamp: new Date()
      }
    ]);
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#00897b',
          color: 'white',
          border: 'none',
          fontSize: '28px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          transition: 'transform 0.3s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '380px',
            maxWidth: '90vw',
            height: '500px',
            maxHeight: '70vh',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 999,
            border: '1px solid #e0e0e0'
          }}
        >
          {/* Header */}
          <div
            style={{
              background: '#00695c',
              color: 'white',
              padding: '15px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}
          >
            <div>
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>🧪 ChemLab Bot</span>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>AI Chemistry Assistant</div>
            </div>
            <button
              onClick={clearChat}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: '15px',
              overflowY: 'auto',
              background: '#f5f5f5'
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: msg.role === 'user' ? '#00897b' : 'white',
                    color: msg.role === 'user' ? 'white' : '#333',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    wordWrap: 'break-word',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {msg.role === 'assistant' ? (
                    <div className="chatbot-markdown">
                      <ReactMarkdown
                        components={{
                          // Keep headers visually small so they don't look
                          // out of place inside a compact chat bubble
                          h1: ({ node, ...props }) => <p style={{ fontWeight: 700, fontSize: '15px', margin: '4px 0' }} {...props} />,
                          h2: ({ node, ...props }) => <p style={{ fontWeight: 700, fontSize: '14px', margin: '4px 0' }} {...props} />,
                          h3: ({ node, ...props }) => <p style={{ fontWeight: 700, fontSize: '14px', margin: '4px 0' }} {...props} />,
                          p: ({ node, ...props }) => <p style={{ margin: '0 0 8px 0' }} {...props} />,
                          ul: ({ node, ...props }) => <ul style={{ margin: '4px 0', paddingLeft: '18px' }} {...props} />,
                          ol: ({ node, ...props }) => <ol style={{ margin: '4px 0', paddingLeft: '18px' }} {...props} />,
                          li: ({ node, ...props }) => <li style={{ marginBottom: '2px' }} {...props} />,
                          strong: ({ node, ...props }) => <strong style={{ fontWeight: 700 }} {...props} />,
                          hr: () => null, // suppress the "---" dividers entirely inside a small bubble
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                  <div
                    style={{
                      fontSize: '9px',
                      opacity: 0.6,
                      marginTop: '4px',
                      color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#999'
                    }}
                  >
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  marginBottom: '10px'
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'white',
                    color: '#999',
                    fontSize: '14px'
                  }}
                >
                  <span>⏳ Typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '12px 15px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              gap: '10px',
              background: 'white',
              flexShrink: 0
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a chemistry question..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid #ddd',
                borderRadius: '24px',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                padding: '10px 20px',
                background: loading || !input.trim() ? '#ccc' : '#00897b',
                color: 'white',
                border: 'none',
                borderRadius: '24px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
