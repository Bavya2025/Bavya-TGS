import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';
import {
    BarChart3,
    TrendingDown,
    TrendingUp,
    PieChart,
    Users,
    AlertCircle,
    Building2,
    IndianRupee,
    Loader2
} from 'lucide-react';

const IconMap = {
    'IndianRupee': IndianRupee,
    'TrendingUp': TrendingUp,
    'Building2': Building2,
    'AlertCircle': AlertCircle
};

const CFOWarRoom = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const { showToast } = useToast();

    const fetchWarRoomData = async () => {
        try {
            setLoading(true);
            const resp = await api.get('/api/war-room/');
            setData(resp.data);
        } catch (e) {
            console.error("Failed to fetch CFO insights:", e);
            showToast("Failed to load war-room data", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWarRoomData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
                <Loader2 className="animate-spin text-burgundy" size={48} />
                <p className="text-muted font-bold">Assembling Financial Intelligence...</p>
            </div>
        );
    }

    if (!data) return <div className="p-8 text-center text-red-500">Critical Error: Intelligence Node Unreachable</div>;

    const { stats, spend_by_dept, aging, anomalies, report_month } = data;

    // Helper for Bar heights
    const maxDeptSpend = Math.max(...spend_by_dept.map(d => d.value), 1);

    return (
        <div className="war-room-page">
            <div className="war-room-header">
                <div>
                    <h1>CFO War-Room</h1>
                    <p>Real-time financial oversight and expense analytics.</p>
                </div>
                <div className="date-picker-mock">
                    <span>{report_month}</span>
                </div>
            </div>

            <div className="stats-grid">
                {stats.map((stat, idx) => {
                    const IconComp = IconMap[stat.icon] || IndianRupee;
                    return (
                        <div key={idx} className="stat-card premium-card">
                            <div className={`stat-icon ${stat.trend}`}>
                                <IconComp size={24} />
                            </div>
                            <div className="stat-details">
                                <span className="stat-title">{stat.title}</span>
                                <div className="stat-value-group">
                                    <span className="stat-value">{stat.value}</span>
                                    <span className={`stat-trend ${stat.trend}`}>
                                        {stat.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {stat.change}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="charts-area">
                <div className="chart-container premium-card">
                    <div className="chart-header">
                        <div className="flex items-center gap-2">
                             <BarChart3 size={20} className="text-burgundy" />
                             <h3>Spend by Department</h3>
                        </div>
                        <span className="text-xs font-bold text-muted">LIVE LEDGER</span>
                    </div>
                    <div className="bar-chart-real">
                        {spend_by_dept.length > 0 ? spend_by_dept.map((dept, i) => (
                            <div key={i} className="bar-column">
                                <div className="bar-value">₹{(dept.value / 1000).toFixed(0)}k</div>
                                <div className="bar-wrapper">
                                    <div 
                                        className="bar-fill" 
                                        style={{ height: `${(dept.value / maxDeptSpend) * 100}%` }}
                                        title={dept.name}
                                    ></div>
                                </div>
                                <span className="dept-label" title={dept.name}>{dept.name.substring(0, 6)}</span>
                            </div>
                        )) : (
                            <div className="flex items-center justify-center w-full h-full text-muted">No spend recorded</div>
                        )}
                    </div>
                </div>

                <div className="chart-container premium-card">
                    <div className="chart-header">
                         <div className="flex items-center gap-2">
                            <PieChart size={20} className="text-burgundy" />
                            <h3>Advance Aging (Liability)</h3>
                        </div>
                        <span className="text-xs font-bold text-muted">UNSETTLED</span>
                    </div>
                    <div className="aging-list-real">
                        {aging.map((item, idx) => (
                            <div key={idx} className="aging-item-premium">
                                <div className="aging-info">
                                    <span className="range">{item.range}</span>
                                    <span className="amount">₹{(item.amount / 100000).toFixed(1)}L</span>
                                </div>
                                <div className="aging-progress-bg">
                                    <div 
                                        className={`progress-fill ${item.color}`} 
                                        style={{ width: `${Math.min(100, (item.amount / 5000000) * 100)}%` }} // Relative to 50L pool
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="critical-alerts premium-card">
                <div className="section-header-br">
                    <h3>Critical Anomalies Detected</h3>
                    <AlertCircle size={20} className="text-red-500 animate-pulse" />
                </div>
                <div className="anomaly-table">
                    <div className="table-row th-row">
                        <span>Entity</span>
                        <span>Reason</span>
                        <span>Impact</span>
                        <span>Action</span>
                    </div>
                    {anomalies.map((anno, idx) => (
                        <div key={idx} className="table-row">
                            <span className="user-ref">{anno.entity}</span>
                            <span className="reason">{anno.reason}</span>
                            <span className={`impact-badge ${anno.impact.toLowerCase()}`}>{anno.impact}</span>
                            <button className="btn-minimal-action">Investigate</button>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default CFOWarRoom;
