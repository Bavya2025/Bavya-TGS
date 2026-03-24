import React, { useState, useEffect } from 'react';
import { 
    BellRing, 
    RefreshCcw, 
    Search, 
    CheckCircle, 
    XCircle,
    Copy,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext.jsx';

const NotificationStatus = () => {
    const { showToast } = useToast();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [retryingIds, setRetryingIds] = useState(new Set());
    const [expandedLogId, setExpandedLogId] = useState(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/system-logs/notifications/');
            setLogs(response.data || []);
        } catch (err) {
            showToast("Failed to fetch notification logs.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async (logId) => {
        setRetryingIds(prev => new Set(prev).add(logId));
        try {
            await api.post(`/api/system-logs/notifications/${logId}/retry/`);
            showToast("Notification re-sent successfully", "success");
            fetchLogs(); // Refresh status
        } catch (err) {
            showToast("Failed to re-send notification", "error");
        } finally {
            setRetryingIds(prev => {
                const next = new Set(prev);
                next.delete(logId);
                return next;
            });
        }
    };

    const toggleExpand = (id) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    const filteredLogs = logs.filter(log => {
        const query = searchTerm.toLowerCase();
        return (log.recipient || '').toLowerCase().includes(query) || 
               (log.status || '').toLowerCase().includes(query) ||
               (log.user || '').toLowerCase().includes(query);
    });

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showToast("Copied trace to clipboard!", "success");
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-header-row">
                <div>
                    <h1 className="welcome-text">Notification Status</h1>
                    <p className="header-subtitle">Monitor Email/SMS audits and re-send account creation notifications.</p>
                </div>
                <button className="btn btn-primary" onClick={fetchLogs} disabled={loading}>
                    <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    <span>Refresh Logs</span>
                </button>
            </div>

            <div className="premium-card">
                <div className="content-toolbar">
                    <div className="search-box">
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="Search recipients, users or status..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-wrapper">
                    {loading ? (
                        <div className="um-loading-spinner text-center p-10">Loading logs...</div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Type/Time</th>
                                    <th>Recipient</th>
                                    <th>Link to User</th>
                                    <th>Status</th>
                                    <th>Retry Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr 
                                            onClick={() => log.error && toggleExpand(log.id)}
                                            style={{ cursor: log.error ? 'pointer' : 'default', backgroundColor: expandedLogId === log.id ? '#fdf2f8' : 'transparent' }}
                                        >
                                            <td>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleString()}</div>
                                                <span className={`badge ${log.type === 'EMAIL' ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: '10px' }}>
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: '500' }}>{log.recipient}</td>
                                            <td style={{ fontWeight: '500' }}>{log.user}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {log.status === 'SENT' ? (
                                                        <CheckCircle size={16} className="text-success" />
                                                    ) : (
                                                        <XCircle size={16} className="text-danger" />
                                                    )}
                                                    <span style={{ color: log.status === 'SENT' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                                                        {log.status}
                                                    </span>
                                                    {log.error && <ChevronDown size={14} className="text-danger" />}
                                                </div>
                                            </td>
                                            <td>
                                                <button 
                                                    className={`btn ${log.status === 'FAILED' ? 'btn-danger' : 'btn-secondary'} btn-xs-small`}
                                                    onClick={(e) => { e.stopPropagation(); handleRetry(log.id); }}
                                                    disabled={retryingIds.has(log.id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                                                >
                                                    <RefreshCcw size={12} className={retryingIds.has(log.id) ? 'animate-spin' : ''} />
                                                    <span>{retryingIds.has(log.id) ? 'Retrying...' : (log.status === 'FAILED' ? 'Try Again' : 'Notify Again')}</span>
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedLogId === log.id && log.error && (
                                            <tr>
                                                <td colSpan="5" className="p-0">
                                                    <div className="bg-slate-900 p-4 text-white font-mono text-xs relative" style={{ backgroundColor: '#0f172a', margin: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
                                                        <div className="flex justify-between items-center mb-2 text-slate-400">
                                                            <span>Provider Error Feedback:</span>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(log.error); }}
                                                                className="badge-btn hover:bg-slate-700"
                                                                style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                            >
                                                                <Copy size={14} /> Copy
                                                            </button>
                                                        </div>
                                                        <pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '400px', padding: '10px', color: '#cbd5e1', lineHeight: '1.6' }}>
                                                            {log.error}
                                                        </pre>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="um-empty-state">No notification logs found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationStatus;
