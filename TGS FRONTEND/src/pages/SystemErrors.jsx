import React, { useState, useEffect } from 'react';
import { 
    AlertTriangle, 
    RefreshCcw, 
    Search, 
    Copy,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext.jsx';

const SystemErrors = () => {
    const { showToast } = useToast();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedLogId, setExpandedLogId] = useState(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/system-logs/errors/');
            setLogs(response.data || []);
        } catch (err) {
            showToast("Failed to fetch system error logs.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showToast("Copied trace to clipboard!", "success");
    };

    const filteredLogs = logs.filter(log => {
        const query = searchTerm.toLowerCase();
        return (log.message || '').toLowerCase().includes(query) || 
               (log.source || '').toLowerCase().includes(query) ||
               (log.path || '').toLowerCase().includes(query);
    });

    return (
        <div className="dashboard-page">
            <div className="dashboard-header-row">
                <div>
                    <h1 className="welcome-text">System Errors</h1>
                    <p className="header-subtitle">Analyze and debug backend crashes and frontend exceptions.</p>
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
                            placeholder="Search messages, paths or sources..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-wrapper">
                    {loading ? (
                        <div className="um-loading-spinner text-center p-10">Loading error logs...</div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Level/Time</th>
                                    <th>Source</th>
                                    <th>Path</th>
                                    <th>Message</th>
                                    <th>Inspector</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr 
                                            onClick={() => toggleExpand(log.id)}
                                            style={{ cursor: 'pointer', backgroundColor: expandedLogId === log.id ? '#fdf2f8' : 'transparent' }}
                                        >
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
                                            <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                <code style={{ fontSize: '12px' }}>{log.path || '/'}</code>
                                            </td>
                                            <td style={{ fontWeight: '500' }}>{log.message}</td>
                                            <td className="text-center">
                                                {log.traceback ? (expandedLogId === log.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />) : '-'}
                                            </td>
                                        </tr>
                                        {expandedLogId === log.id && log.traceback && (
                                            <tr>
                                                <td colSpan="5" className="p-0">
                                                    <div className="bg-slate-900 p-4 text-white font-mono text-xs relative" style={{ backgroundColor: '#0f172a', margin: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
                                                        <div className="flex justify-between items-center mb-2 text-slate-400">
                                                            <span className="flex items-center gap-1"><AlertTriangle size={14} /> Full Debug StackTrace</span>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(log.traceback); }}
                                                                className="badge-btn hover:bg-slate-700"
                                                                style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                            >
                                                                <Copy size={14} /> Copy
                                                            </button>
                                                        </div>
                                                        <pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '400px', padding: '10px', color: '#cbd5e1', lineHeight: '1.6' }}>
                                                            {log.traceback}
                                                        </pre>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="um-empty-state">No error logs found.</td>
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

export default SystemErrors;
