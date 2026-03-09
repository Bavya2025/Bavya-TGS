import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api';
import {
    Bell,
    LogOut,
    LayoutDashboard,
    Plane,
    IndianRupee,
    MapPin,
    Wallet,
    BookOpen,
    Users,
    Settings,
    ChevronDown,
    Building2,
    BarChart3,
    AlertCircle,
    MoreHorizontal,
    ShieldCheck,
    FolderOpen,
    HelpCircle,
    Car,
    ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [showManagement, setShowManagement] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
    const fetchInProgress = React.useRef(false);

    const fetchNotifications = async (signal) => {
        if (!user || fetchInProgress.current) return;
        fetchInProgress.current = true;
        setIsLoadingNotifs(true);
        try {
            const response = await api.get('/api/notifications/', { signal });
            setNotifications(response.data);
        } catch (error) {
            if (error.name !== 'CanceledError') console.error("Failed to fetch notifications:", error);
        } finally {
            setIsLoadingNotifs(false);
            fetchInProgress.current = false;
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        if (user) {
            fetchNotifications(controller.signal);
            const interval = setInterval(() => fetchNotifications(controller.signal), 60000);
            return () => {
                clearInterval(interval);
                controller.abort();
            };
        }
    }, [user]);

    const rawRole = user?.role?.toLowerCase() || 'employee';
    const dept = user?.department?.toLowerCase() || '';
    const desig = user?.designation?.toLowerCase() || '';
    
    // Comprehensive role detection matching backend logic
    let userRole = rawRole;
    if (rawRole === 'admin') userRole = 'admin';
    else if (dept.includes('finance') || desig.includes('finance') || rawRole === 'finance') userRole = 'finance';
    else if (dept.includes('hr') || desig.includes('hr') || rawRole === 'hr') userRole = 'hr';
    else if (dept.includes('cfo') || desig.includes('cfo') || rawRole === 'cfo') userRole = 'cfo';
    else if (rawRole.includes('guesthouse') || rawRole === 'guesthousemanager') userRole = 'guesthousemanager';
    
    const unreadCount = notifications.filter(n => n.unread).length;

    useEffect(() => {
        setShowManagement(false);
        setShowProfileDropdown(false);
        setShowNotifications(false);
    }, [location]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.management-dropdown-wrapper') &&
                !event.target.closest('.profile-wrapper') &&
                !event.target.closest('.notification-wrapper')) {
                setShowManagement(false);
                setShowProfileDropdown(false);
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllRead = async () => {
        try {
            await api.post('/api/notifications/mark-all-read/');
            setNotifications(notifications.map(n => ({ ...n, unread: false })));
        } catch (error) {
            console.error("Failed to mark notifications as read:", error);
        }
    };

    const mainNav = [
        { title: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/', roles: ['employee', 'reporting_authority', 'finance', 'admin', 'cfo', 'guesthousemanager'] },
        { title: 'Trips', icon: <Plane size={18} />, path: '/trips', roles: ['employee', 'reporting_authority', 'finance', 'admin'] },
        { title: 'My Requests', icon: <ClipboardList size={18} />, path: '/my-requests', roles: ['employee', 'reporting_authority', 'finance', 'admin', 'cfo'] },
    ];

    const managementNav = [
        { title: 'Finance Hub', icon: <IndianRupee size={18} />, path: '/finance', roles: ['finance', 'admin'] },
        { title: 'Approvals', icon: <BarChart3 size={18} />, path: '/approvals', roles: ['employee', 'reporting_authority', 'hr', 'finance', 'cfo', 'admin'] },
        { title: 'Settlements', icon: <Wallet size={18} />, path: '/settlement', roles: ['finance', 'admin'] },
        { title: 'Documents', icon: <FolderOpen size={18} />, path: '/documents', roles: ['employee', 'reporting_authority', 'finance', 'admin', 'cfo'] },
        { title: 'System Policy', icon: <BookOpen size={18} />, path: '/policy', roles: ['employee', 'reporting_authority', 'finance', 'admin', 'cfo'] },
        { title: 'CFO Room', icon: <BarChart3 size={18} />, path: '/cfo-war-room', roles: ['cfo', 'admin'] },
        { title: 'User Management', icon: <Users size={18} />, path: '/employees', roles: ['admin'] },
        { title: 'Guest Houses', icon: <Building2 size={18} />, path: '/guesthouse', roles: ['admin', 'guesthousemanager'] },
        { title: 'Fleet Management', icon: <Car size={18} />, path: '/fleet', roles: ['admin', 'guesthousemanager'] },
        { title: 'API Management', icon: <Settings size={18} />, path: '/api-management', roles: ['admin'] },
        { title: 'Route Masters', icon: <MapPin size={18} />, path: '/route-management', roles: ['admin'] },
        { title: 'Help & Support', icon: <HelpCircle size={18} />, path: '/help', roles: ['employee', 'reporting_authority', 'finance', 'admin', 'cfo', 'guesthousemanager'] },
        { title: 'Login History', icon: <Settings size={18} />, path: '/login-history', roles: ['admin'] },
        { title: 'Audit Logs', icon: <ShieldCheck size={18} />, path: '/audit-logs', roles: ['admin'] },
    ];

    const filteredMain = mainNav.filter(item => item.roles.includes(userRole));
    const filteredManagement = managementNav.filter(item => item.roles.includes(userRole));

    return (
        <header className="header">
            <div className="header-container">
                <div className="header-left">
                    <div className="logo-section">
                        <div className="logo-box">
                            <img src="/logo.png" alt="TGS Logo" className="logo-img" />
                        </div>
                    </div>
                    <div className="app-title-section">
                        <h1 className="app-main-title">Bavya Travel Governance System</h1>
                    </div>
                </div>

                <div className="header-right">
                    <nav className="top-nav">
                        {filteredMain.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                {item.icon}
                                <span>{item.title}</span>
                            </NavLink>
                        ))}

                        {filteredManagement.length > 0 && (
                            <div className="management-dropdown-wrapper">
                                <button
                                    className={`nav-link dropdown-trigger ${showManagement ? 'active-dropdown' : ''}`}
                                    onClick={() => setShowManagement(!showManagement)}
                                >
                                    <MoreHorizontal size={18} />
                                    <span>More</span>
                                    <ChevronDown size={14} className={`chevron ${showManagement ? 'open' : ''}`} />
                                </button>

                                {showManagement && (
                                    <div className="management-dropdown glass">
                                        {filteredManagement.map((item) => (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                className="dropdown-item"
                                                onClick={() => setShowManagement(false)}
                                            >
                                                {item.icon}
                                                <span>{item.title}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </nav>

                    <div className="header-actions">
                        <div className="notification-wrapper">

                            <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)} title="Notifications">
                                <Bell size={24} />
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            </button>

                            {showNotifications && (
                                <div className="notifications-dropdown glass">
                                    <div className="notifications-header">
                                        <h3>Recent Notifications</h3>
                                        <button className="btn-text-only" onClick={markAllRead}>Mark all as read</button>
                                    </div>
                                    <div className="notifications-list">
                                        {notifications.length > 0 ? (
                                            notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    className={`notification-item ${n.unread ? 'unread' : ''}`}
                                                    onClick={() => {
                                                        if (n.title.toLowerCase().includes('room') || n.message.toLowerCase().includes('room')) {
                                                            navigate('/guesthouse?tab=requests');
                                                        } else if (n.title.toLowerCase().includes('trip') || n.message.toLowerCase().includes('payout') || n.message.toLowerCase().includes('advance') || n.message.toLowerCase().includes('claim')) {
                                                            navigate('/approvals');
                                                        }
                                                        setShowNotifications(false);
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <div className="notif-content">
                                                        <div className="notif-header">
                                                            <strong>{n.title}</strong>
                                                            <span className="notif-time">{n.time_ago}</span>
                                                        </div>
                                                        <p>{n.message}</p>
                                                    </div>
                                                    {n.unread && <div className="unread-dot"></div>}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="empty-notifications">
                                                <Bell size={32} opacity={0.3} />
                                                <p>All caught up!</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="notifications-footer">
                                        <button className="view-all-notif">View All Notifications</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="profile-wrapper">
                            <button
                                className="profile-trigger"
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                title="Account Settings"
                            >
                                <div className="user-avatar-outer">
                                    <div className="user-avatar">
                                        {user?.name?.charAt(0) || 'S'}
                                    </div>
                                    <div className="status-dot"></div>
                                </div>
                            </button>

                            {showProfileDropdown && (
                                <div className="profile-dropdown glass">
                                    <div className="dropdown-user-info">
                                        <strong>{user?.name || 'System Admin'}</strong>
                                        <span>{userRole.toUpperCase()}</span>
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    <NavLink to="/profile" className="dropdown-item" onClick={() => setShowProfileDropdown(false)}>
                                        <Users size={18} />
                                        <span>My Profile</span>
                                    </NavLink>
                                    <button className="dropdown-item logout-item" onClick={logout}>
                                        <LogOut size={18} />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
