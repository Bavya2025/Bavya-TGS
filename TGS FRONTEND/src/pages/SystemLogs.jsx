import React, { useState, useEffect } from 'react';
import { 
    AlertTriangle, 
    BellRing, 
    RefreshCcw, 
    Search, 
    Terminal, 
    LayoutList, 
    WifiOff, 
    CheckCircle, 
    XCircle,
    Copy,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext.jsx';

const SystemLogs = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('errors'); // 'errors' or 'notifications'
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [retryingIds, setRetryingIds] = useState(new Set());

    useEffect(() => {
        fetchLogs();
    }, [activeTab]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'errors' 
                ? '/api/system-logs/errors/' 
                : '/api/system-logs/notifications/';
            
            const response = await api.get(endpoint);
            setLogs(response.data || []);
        } catch (err) {
            showToast(`Failed to fetch ${activeTab} logs.`, 'error');
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

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showToast("Copied to clipboard!", "success");
    };

    const filteredLogs = logs.filter(log => {
        const query = searchTerm.toLowerCase();
        if (activeTab === 'errors') {
            return (log.message || '').toLowerCase().includes(query) || 
                   (log.source || '').toLowerCase().includes(query) ||
                   (log.path || '').toLowerCase().includes(query);
        } else {
            return (log.recipient || '').toLowerCase().includes(query) || 
                   (log.status || '').toLowerCase().includes(query) ||
                   (log.user || '').toLowerCase().includes(query);
        }
    });

    return (
        <div className="dashboard-page overflow-hidden">
            <div className="dashboard-header-row">
                <div>
                    <h1 className="welcome-text">System Logs & Diagnostics</h1>
                    <p className="header-subtitle">Monitor system health, error reports, and notification delivery status.</p>
                </div>
                <button className="btn btn-primary" onClick={fetchLogs} disabled={loading}>
                    <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    <span>Refresh Logs</span>
                </button>
            </div>

            <div className="premium-card lg:p-0 overflow-hidden" style={{ minHeight: '70vh', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <button 
                        onClick={() => setActiveTab('errors')}
                        style={{ 
                            padding: '15px 25px', 
                            border: 'none', 
                            background: activeTab === 'errors' ? '#fff' : 'transparent',
                            color: activeTab === 'errors' ? '#d81b60' : '#64748b',
                            borderBottom: activeTab === 'errors' ? '3px solid #d81b60' : 'none',
                            fontWeight: activeTab === 'errors' ? 'bold' : 'normal',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <AlertTriangle size={18} />
                        System Errors
                    </button>
                    <button 
                        onClick={() => setActiveTab('notifications')}
                        style={{ 
                            padding: '15px 25px', 
                            border: 'none', 
                            background: activeTab === 'notifications' ? '#fff' : 'transparent',
                            color: activeTab === 'notifications' ? '#d81b60' : '#64748b',
                            borderBottom: activeTab === 'notifications' ? '3px solid #d81b60' : 'none',
                            fontWeight: activeTab === 'notifications' ? 'bold' : 'normal',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <BellRing size={18} />
                        Notification Status
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4" style={{ backgroundColor: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="search-box">
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder={`Search ${activeTab === 'errors' ? 'messages, paths or sources' : 'recipients, users or status'}...`} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div className="p-10 text-center text-slate-400">Loading diagnostic data...</div>
                    ) : (
                        <table className="admin-table sticky-header">
                            <thead>
                                {activeTab === 'errors' ? (
                                    <tr>
                                        <th>Level/Time</th>
                                        <th>Source</th>
                                        <th>Endpoint/Path</th>
                                        <th>Message</th>
                                        <th>Trace</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th>Type/Time</th>
                                        <th>Recipient</th>
                                        <th>User</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr 
                                            onClick={() => toggleExpand(log.id)}
                                            style={{ cursor: 'pointer', backgroundColor: expandedLogId === log.id ? '#fdf2f8' : 'transparent' }}
                                        >
                                            {activeTab === 'errors' ? (
                                                <>
                                                    <td>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleString()}</div>
                                                        <span className={`badge ${log.level === 'ERROR' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                                                            {log.level}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${log.source === 'BACKEND' ? 'badge-primary' : 'badge-secondary'}`}>
                                                            {log.source}
                                                        </span>
                                                    </td>
                                                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        <code style={{ fontSize: '12px' }}>{log.path || '/'}</code>
                                                    </td>
                                                    <td style={{ fontWeight: '500' }}>{log.message}</td>
                                                    <td>
                                                        {log.traceback ? (expandedLogId === log.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />) : '-'}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
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
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <button 
                                                            className={`btn ${log.status === 'FAILED' ? 'btn-danger' : 'btn-secondary'} btn-xs`}
                                                            onClick={(e) => { e.stopPropagation(); handleRetry(log.id); }}
                                                            disabled={retryingIds.has(log.id)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', fontSize: '11px' }}
                                                        >
                                                            <RefreshCcw size={12} className={retryingIds.has(log.id) ? 'animate-spin' : ''} />
                                                            {retryingIds.has(log.id) ? 'Retrying...' : (log.status === 'FAILED' ? 'Try Again' : 'Notify Again')}
                                                        </button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                        {expandedLogId === log.id && (log.traceback || log.error) && (
                                            <tr>
                                                <td colSpan="5" className="p-0">
                                                    <div className="bg-slate-900 p-4 text-white font-mono text-xs relative" style={{ backgroundColor: '#0f172a', margin: '10px', borderRadius: '8px', borderLeft: '4px solid #d81b60' }}>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(log.traceback || log.error); }}
                                                            className="absolute top-2 right-2 p-1 hover:bg-slate-700 rounded"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                        <pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '300px' }}>
                                                            {log.traceback || log.error}
                                                        </pre>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="um-empty-state">No logs found.</td>
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

export default SystemLogs;
