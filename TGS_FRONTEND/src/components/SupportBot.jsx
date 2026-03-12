import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, AlertCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api';

const SupportBot = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    // Use a persistent session ID for the user
    const sessionId = sessionStorage.getItem('tgs_chat_session') || `session_${Math.random().toString(36).substr(2, 9)}`;
    
    useEffect(() => {
        const handleOpenEvent = () => setIsOpen(true);
        window.addEventListener('open-tgs-chat', handleOpenEvent);
        
        if (!sessionStorage.getItem('tgs_chat_session')) {
            sessionStorage.setItem('tgs_chat_session', sessionId);
        }
        
        // Initial greeting if no messages
        if (messages.length === 0) {
            setMessages([{ sender: 'bot', text: 'Hi! I am your TGS Assistant. How can I help you today?', time: new Date() }]);
        }

        return () => window.removeEventListener('open-tgs-chat', handleOpenEvent);
    }, [sessionId, messages.length]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { sender: 'user', text: userMsg, time: new Date() }]);
        setIsLoading(true);

        try {
            const response = await api.post('/api/bot/chat/message/', {
                message: userMsg,
                session_id: sessionId
            });
            
            setMessages(prev => [...prev, { sender: 'bot', text: response.data.reply, time: new Date() }]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { 
                sender: 'bot', 
                text: "I'm having trouble connecting to my brain right now. Please try again later or email support.", 
                time: new Date() 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Unified handleSend to ensure it's always stable
    const onSend = async () => {
        await handleSend();
    };

    // Parse markdown-style links [Label](/path) into clickable elements
    const renderMessage = (text, sender) => {
        if (!text) return null;
        
        const parts = text.split(/(\[.*?\]\(.*?\))/g);
        
        return parts.map((part, i) => {
            const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
            if (linkMatch) {
                const [_, label, path] = linkMatch;
                return (
                    <span 
                        key={i} 
                        onClick={() => {
                            if (path.startsWith('http')) {
                                window.open(path, '_blank');
                            } else {
                                navigate(path);
                                // Bot no longer closes automatically on navigation
                            }
                        }}
                        style={{ 
                            color: sender === 'user' ? '#fff' : '#0056b3',
                            backgroundColor: sender === 'user' ? 'rgba(255,255,255,0.2)' : '#e0e7ff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'inline-block',
                            margin: '1px 2px',
                            transition: 'all 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                    >
                        {label}
                    </span>
                );
            }
            
            const boldParts = part.split(/(\*\*.*?\*\*)/g);
            return boldParts.map((bPart, j) => {
                const boldMatch = bPart.match(/\*\*(.*?)\*\*/);
                if (boldMatch) {
                    return <strong key={`${i}-${j}`}>{boldMatch[1]}</strong>;
                }
                return bPart;
            });
        });
    };


    return (
        <div className="support-bot-container" style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
            {!isOpen ? (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="chat-toggle-btn"
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        boxShadow: '0 8px 32px rgba(187, 6, 51, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.3s ease'
                    }}
                >
                    <MessageCircle size={28} />
                </button>
            ) : (
                <div className="chat-window" style={{
                    width: '380px',
                    height: '500px',
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.1)'
                }}>
                    <div className="chat-header" style={{
                        padding: '1.25rem',
                        backgroundColor: 'var(--bg-navbar)',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MessageCircle size={18} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>TGS Assistant</h4>
                                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Online for help</span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="chat-body" ref={scrollRef} style={{
                        flex: 1,
                        padding: '1.25rem',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        backgroundColor: '#f8fafc'
                    }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                padding: '10px 14px',
                                borderRadius: msg.sender === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                                backgroundColor: msg.sender === 'user' ? 'var(--primary)' : 'white',
                                color: msg.sender === 'user' ? 'white' : 'var(--text-main)',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                fontSize: '0.9rem',
                                lineHeight: '1.4',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {renderMessage(msg.text, msg.sender)}
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{ alignSelf: 'flex-start', padding: '10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                Assistant is typing...
                            </div>
                        )}
                    </div>

                    <div className="chat-footer" style={{ padding: '1rem', borderTop: '1px solid #eee' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input 
                                type="text"
                                placeholder="Type your question..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && onSend()}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 3rem 0.75rem 1rem',
                                    borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0',
                                    outline: 'none',
                                    fontSize: '0.9rem'
                                }}
                            />
                            <button 
                                onClick={onSend}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    backgroundColor: 'var(--primary)',
                                    color: 'white',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportBot;
