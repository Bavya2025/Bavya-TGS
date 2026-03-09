import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Search, Filter, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

const LoginHistory = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
    });

    useEffect(() => {
        fetchLogs();
    }, [filters]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (filters.search) params.search = filters.search;
            
            const response = await api.get('/api/login-history/', { params });
            setLogs(response.data.results || response.data);
        } catch (error) {
            console.error("Failed to fetch login history:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        setFilters(prev => ({ ...prev, search: e.target.value }));
    };

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1>Login History</h1>
                    <p>Track user login and logout activities.</p>
                </div>
            </header>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by user or IP..." 
                        value={filters.search}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            <div className="table-container premium-shadow">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th className="w-10"></th>
                            <th>User</th>
                            <th>IP Address</th>
                            <th>Login Time</th>
                            <th>Logout Time</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="6" className="text-center">Loading logs...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="6" className="text-center">No login history found.</td></tr>
                        ) : (
                            logs.map(log => (
                                <React.Fragment key={log.id}>
                                    <tr onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                        <td className="text-center text-muted">
                                            {expandedRow === log.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </td>
                                        <td className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="avatar small">{log.user_name?.charAt(0)}</div>
                                                <div>
                                                    <div>{log.user_name}</div>
                                                    <div className="text-xs text-muted">{log.user_email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{log.ip_address || 'N/A'}</td>
                                        <td>{format(new Date(log.login_time), 'PPpp')}</td>
                                        <td>{log.logout_time ? format(new Date(log.logout_time), 'PPpp') : <span className="text-green-600 font-bold">Active</span>}</td>
                                        <td>
                                            {log.logout_time ? (
                                                (() => {
                                                    const diff = new Date(log.logout_time) - new Date(log.login_time);
                                                    const minutes = Math.floor(diff / 60000);
                                                    const hours = Math.floor(minutes / 60);
                                                    return `${hours}h ${minutes % 60}m`;
                                                })()
                                            ) : '-'}
                                        </td>
                                    </tr>
                                    {expandedRow === log.id && (
                                        <tr>
                                            <td colSpan="6" className="bg-gray-50 p-4">
                                                <div className="pl-10">
                                                    <h4 className="font-bold text-sm mb-2">Session Activity</h4>
                                                    {log.activities && log.activities.length > 0 ? (
                                                        <div className="max-h-60 overflow-y-auto border rounded bg-white">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-gray-100 sticky top-0">
                                                                    <tr>
                                                                        <th className="p-2 text-left">Time</th>
                                                                        <th className="p-2 text-left">Action</th>
                                                                        <th className="p-2 text-left">Details</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {log.activities.map((act, idx) => (
                                                                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                                                            <td className="p-2 text-xs text-muted font-mono whitespace-nowrap">
                                                                                {format(new Date(act.timestamp), 'HH:mm:ss')}
                                                                            </td>
                                                                            <td className="p-2">
                                                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                                                    act.action === 'VIEW' ? 'bg-blue-100 text-blue-800' :
                                                                                    act.action === 'LOGIN' ? 'bg-green-100 text-green-800' :
                                                                                    act.action === 'LOGOUT' ? 'bg-gray-100 text-gray-800' :
                                                                                    'bg-yellow-100 text-yellow-800'
                                                                                }`}>
                                                                                    {act.action}
                                                                                </span>
                                                                            </td>
                                                                            <td className="p-2">
                                                                                <div className="font-medium text-gray-900">{act.model_name}</div>
                                                                                <div className="text-xs text-muted truncate max-w-lg" title={act.object_repr}>
                                                                                    {act.object_repr}
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <div className="text-muted text-sm italic">No activity recorded for this session.</div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LoginHistory;
