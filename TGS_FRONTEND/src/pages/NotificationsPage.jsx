import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Info, AlertTriangle, ArrowLeft, Loader2, Calendar, MapPin, Search } from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

const NotificationItem = ({ n, onMarkAsRead, onClick, getIcon }) => {
    const [startX, setStartX] = useState(0);
    const [offsetX, setOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const itemRef = useRef(null);

    const handleStart = (e) => {
        if (!n.unread) return;
        // Don't start drag if clicking a button or specific element? 
        // For now keep it simple.
        const x = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        setStartX(x);
        setIsDragging(true);
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        const x = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const diff = x - startX;
        // Only allow swiping to the left (negative diff)
        if (diff < 0) {
            setOffsetX(diff);
        } else {
            setOffsetX(0);
        }
    };

    const handleEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        // Threshold to trigger mark as read
        if (offsetX < -120) {
            onMarkAsRead(n.id);
        }
        setOffsetX(0);
    };

    return (
        <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
            {/* Action Background */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                height: '100%',
                width: '100%',
                background: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '30px',
                color: 'white',
                zIndex: 1,
                opacity: Math.min(Math.abs(offsetX) / 100, 1),
                transition: 'opacity 0.2s'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Check size={24} strokeWidth={3} />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Mark as Read</span>
                </div>
            </div>

            <div
                ref={itemRef}
                className={`notif-page-item ${n.unread ? 'unread' : ''}`}
                onClick={(e) => {
                    // Only trigger click if we weren't dragging much
                    if (Math.abs(offsetX) < 5) {
                        onClick(n);
                    }
                }}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                style={{
                    padding: '1.5rem 2rem',
                    display: 'flex',
                    gap: '1.5rem',
                    cursor: 'pointer',
                    transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s',
                    transform: `translateX(${offsetX}px)`,
                    background: n.unread ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.7)',
                    position: 'relative',
                    zIndex: 2,
                    userSelect: 'none',
                    touchAction: 'none'
                }}
            >
                <div className="notif-icon-box" style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                    flexShrink: 0
                }}>
                    {getIcon(n.title)}
                </div>
                <div className="notif-details" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{n.title}</h4>
                            {n.unread && <div style={{ width: '8px', height: '8px', background: 'var(--burgundy)', borderRadius: '50%' }}></div>}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>{n.time_ago}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>{n.message}</p>
                </div>
            </div>
        </div>
    );
};

const NotificationsPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/notifications/');
            setNotifications(response.data);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
            showToast("Failed to load notifications", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAllRead = async () => {
        try {
            await api.post('/api/notifications/mark-all-read/');
            setNotifications(notifications.map(n => ({ ...n, unread: false })));
            showToast("All notifications marked as read", "success");
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.patch(`/api/notifications/${id}/`, { unread: false });
            setNotifications(notifications.map(n => n.id === id ? { ...n, unread: false } : n));
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

    const handleNotificationClick = (n) => {
        markAsRead(n.id);
        if (n.title.toLowerCase().includes('room') || n.message.toLowerCase().includes('room')) {
            navigate('/guesthouse?tab=requests');
        } else if (n.title.toLowerCase().includes('trip') || n.message.toLowerCase().includes('payout') || n.message.toLowerCase().includes('advance') || n.message.toLowerCase().includes('claim')) {
            navigate('/approvals');
        }
    };

    const filteredNotifs = filter === 'all'
        ? notifications
        : filter === 'unread'
            ? notifications.filter(n => n.unread)
            : notifications.filter(n => !n.unread);

    const getIcon = (title) => {
        const t = title.toLowerCase();
        if (t.includes('approved') || t.includes('success')) return <Check className="text-green-500" size={20} />;
        if (t.includes('reject') || t.includes('cancel')) return <AlertTriangle className="text-red-500" size={20} />;
        if (t.includes('pending') || t.includes('request')) return <Calendar className="text-blue-500" size={20} />;
        return <Info className="text-slate-500" size={20} />;
    };

    return (
        <div className="notifications-page" style={{ padding: '0', width: '100%', minHeight: '100vh', background: 'var(--bg-main)' }}>
            <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '90px 2rem 2rem 2rem' }}>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <button onClick={() => navigate(-1)} className="btn-secondary" style={{ width: '45px', height: '45px', borderRadius: '12px', padding: '0' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--burgundy)', letterSpacing: '-1px' }}>Notifications</h1>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                style={{ padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '14px', border: '1.5px solid var(--border)', fontWeight: 700, background: 'white', appearance: 'none', minWidth: '180px' }}
                            >
                                <option value="all">All Alerts</option>
                                <option value="unread">Unread Only</option>
                                <option value="read">History</option>
                            </select>
                        </div>
                        <button className="btn-primary" onClick={markAllRead} style={{ padding: '0.75rem 1.5rem', borderRadius: '14px', background: 'linear-gradient(135deg, var(--burgundy), var(--secondary))', border: 'none', boxShadow: '0 8px 20px rgba(187, 6, 51, 0.2)' }}>
                            Mark All Read
                        </button>
                    </div>
                </div>

                <div className="notifications-container premium-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.5)' }}>
                    {isLoading ? (
                        <div style={{ padding: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                            <div className="spinner-glow" style={{ position: 'relative' }}>
                                <Loader2 className="animate-spin text-burgundy" size={48} />
                                <div style={{ position: 'absolute', top: 0, left: 0, filter: 'blur(10px)', opacity: 0.5 }}>
                                    <Loader2 className="animate-spin text-burgundy" size={48} />
                                </div>
                            </div>
                            <p style={{ fontWeight: 700, color: 'var(--text-light)', letterSpacing: '1px' }}>SYNCHRONIZING SECURE ALERTS...</p>
                        </div>
                    ) : filteredNotifs.length === 0 ? (
                        <div style={{ padding: '8rem 2rem', textAlign: 'center' }}>
                            <div style={{ marginBottom: '2rem' }}>
                                <Bell size={80} style={{ opacity: 0.1, margin: '0 auto', color: 'var(--burgundy)' }} />
                            </div>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>System Clear</h3>
                            <p style={{ color: 'var(--text-light)', fontSize: '1.1rem' }}>No pending notifications in your current filter.</p>
                        </div>
                    ) : (
                        <div className="notif-list">
                            <div style={{ padding: '1rem 2rem', background: '#f8fafc', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Swipe left on unread alerts to mark them as read
                            </div>
                            {filteredNotifs.map(n => (
                                <NotificationItem
                                    key={n.id}
                                    n={n}
                                    onMarkAsRead={markAsRead}
                                    onClick={handleNotificationClick}
                                    getIcon={getIcon}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
