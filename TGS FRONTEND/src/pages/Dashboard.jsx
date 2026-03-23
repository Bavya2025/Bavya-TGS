import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PlusCircle,
    MapPin,
    Clock,
    CheckCircle2,
    TrendingUp,
    AlertTriangle,
    IndianRupee,
    ArrowRight,
    Calendar,
    ChevronRight,
    Briefcase,
    CreditCard,
    Zap,
    BarChart3,
    Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const today = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/api/dashboard-stats/');
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    const getIcon = (iconName) => {
        const icons = {
            'Briefcase': <Briefcase size={20} />,
            'CreditCard': <CreditCard size={20} />,
            'TrendingUp': <TrendingUp size={20} />,
            'Clock': <Clock size={20} />,
        };
        return icons[iconName] || <Briefcase size={20} />;
    };

    if (isLoading) {
        return (
            <div className="dashboard-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    const rawRole = user?.role?.toLowerCase() || 'employee';
    const dept = user?.department?.toLowerCase() || '';
    const desig = user?.designation?.toLowerCase() || '';
    
    let userRole = rawRole;
    if (rawRole === 'admin') userRole = 'admin';
    else if (dept.includes('finance') || desig.includes('finance') || rawRole === 'finance') userRole = 'finance';
    else if (dept.includes('hr') || desig.includes('hr') || rawRole === 'hr') userRole = 'hr';
    else if (dept.includes('cfo') || desig.includes('cfo') || rawRole === 'cfo') userRole = 'cfo';
    else if (rawRole.includes('guesthouse') || rawRole === 'guesthousemanager') userRole = 'guesthousemanager';

    return (
        <div className="dashboard-page">
            <div className="dashboard-header-row">
                <div className="welcome-section">
                    <p className="current-date">{today}</p>
                    <h1 className="welcome-text">
                        Hello, {user?.name || 'User'}! 
                    </h1>
                </div>
                <div className="dashboard-actions">
                    {userRole === 'guesthousemanager' ? (
                        <>
                            <button className="dashboard-action-btn primary" onClick={() => navigate('/guesthouse')}>
                                <Building2 size={18} />
                                <span>Manage Guest Houses</span>
                            </button>
                            <button className="dashboard-action-btn primary" onClick={() => navigate('/fleet')}>
                                <Zap size={18} />
                                <span>Manage Fleet</span>
                            </button>
                        </>
                    ) : (
                        <>
                            {['finance', 'admin'].includes(userRole) && (
                                <button className="dashboard-action-btn success" onClick={() => navigate('/finance')}>
                                    <BarChart3 size={18} />
                                    <span>Finance Hub</span>
                                </button>
                            )}
                            {['reporting_authority', 'hr', 'finance', 'admin', 'cfo'].includes(userRole) && (
                                <button className="dashboard-action-btn warning" onClick={() => navigate('/approvals')}>
                                    <Zap size={18} />
                                    <span>Review Approvals</span>
                                </button>
                            )}
                            <button className="dashboard-action-btn primary" onClick={() => navigate('/create-trip')}>
                                <PlusCircle size={18} />
                                <span>New Trip Request</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="kpi-grid">
                {(stats?.kpis || []).map((kpi, index) => (
                    <div key={index} className={`kpi-card premium-card ${kpi.color}`}>
                        <div className="mesh-blob"></div>
                        <div className="mesh-blob-2"></div>
                        <div className="kpi-content-wrapper">
                            <div className="kpi-content">
                                <div className="kpi-info">
                                    <span className="kpi-title">{kpi.title}</span>
                                    <span className="kpi-value">{kpi.value}</span>
                                    <div className="kpi-meta">
                                        <span className="kpi-label">{kpi.label}</span>
                                    </div>
                                </div>
                                <div className="kpi-icon-container">
                                    {getIcon(kpi.icon)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-main-grid">
                <div className="activity-container card">
                    <div className="section-header">
                        <h2>Recent Trips</h2>
                        <button className="view-all-btn" onClick={() => navigate('/trips')}>View All</button>
                    </div>
                    <div className="activity-list">
                        {(stats?.recent_activity || []).length > 0 ? (
                            stats.recent_activity.map((item) => (
                                <div key={item.id} className="activity-item">
                                    <div className="activity-icon">
                                        <Briefcase size={20} />
                                    </div>
                                    <div className="activity-info">
                                        <p className="activity-title">{item.title}</p>
                                        <span className="activity-subtitle">{item.subtitle}</span>
                                    </div>
                                    <div className="activity-meta">
                                        <span className="activity-amount">{item.amount}</span>
                                        <span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state-vsmall">
                                <p>No recent trips found.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="spending-container card">
                    <div className="section-header">
                        <h2>Expenditure Mix</h2>
                        <TrendingUp size={18} className="text-muted" />
                    </div>
                    <div className="spending-list">
                        {(stats?.expenditure_mix || []).length > 0 ? (
                            stats.expenditure_mix.map((item, index) => (
                                <div key={index} className="spending-item">
                                    <span className="spending-type">{item.type} ({(item.percentage || 0).toFixed(0)}%)</span>
                                    <div className="spending-track">
                                        <div className="track-fill" style={{ width: `${item.percentage}%` }}></div>
                                    </div>
                                    <span className="spending-amount">₹{item.amount.toLocaleString()}</span>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state-vsmall">
                                <p>No expenses recorded yet.</p>
                            </div>
                        )}
                    </div>
                    <div className="total-budget-box">
                        <span className="budget-label">Total Recorded Spend</span>
                        <span className="budget-value">₹{(stats?.total_spend || 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
