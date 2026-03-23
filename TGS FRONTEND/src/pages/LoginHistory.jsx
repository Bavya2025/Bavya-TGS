import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { 
    Search, Filter, ShieldCheck, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, 
    ChevronsLeft, ChevronsRight, Download, Calendar, RefreshCcw, Loader2 
} from 'lucide-react';

const LoginHistory = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);
    const [rowActivities, setRowActivities] = useState({});
    const [loadingActivities, setLoadingActivities] = useState({});
    const [pagination, setPagination] = useState({
        count: 0,
        next: null,
        previous: null,
        currentPage: 1
    });
    const [filters, setFilters] = useState({
        search: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchLogs(1);
    }, [filters]);

    const fetchLogs = async (page = 1) => {
        setIsLoading(true);
        try {
            const params = { page };
            if (filters.search) params.search = filters.search;
            if (filters.startDate) params.start_date = filters.startDate;
            if (filters.endDate) params.end_date = filters.endDate;

            const response = await api.get('/api/login-history/', { params });
            const data = response.data;

            if (data.results) {
                setLogs(data.results);
                setPagination({
                    count: data.count,
                    next: data.next,
                    previous: data.previous,
                    currentPage: page,
                    totalPages: data.total_pages || Math.ceil(data.count / 20)
                });
            } else {
                setLogs(data);
                setPagination({
                    count: data.length,
                    next: null,
                    previous: null,
                    currentPage: 1,
                    totalPages: 1
                });
            }
        } catch (error) {
            console.error("Failed to fetch login history:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchActivities = async (historyId) => {
        if (rowActivities[historyId]) return;
        
        setLoadingActivities(prev => ({ ...prev, [historyId]: true }));
        try {
            const response = await api.get(`/api/login-history/${historyId}/activities/`);
            setRowActivities(prev => ({ ...prev, [historyId]: response.data }));
        } catch (error) {
            console.error("Failed to fetch activities:", error);
        } finally {
            setLoadingActivities(prev => ({ ...prev, [historyId]: false }));
        }
    };

    const toggleRow = (historyId) => {
        if (expandedRow === historyId) {
            setExpandedRow(null);
        } else {
            setExpandedRow(historyId);
            fetchActivities(historyId);
        }
    };

    const handleSearchChange = (e) => {
        setFilters(prev => ({ ...prev, search: e.target.value }));
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.startDate) params.append('start_date', filters.startDate);
            if (filters.endDate) params.append('end_date', filters.endDate);

            const response = await api.get(`/api/login-history/export-csv/?${params.toString()}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `login_history_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            showToast("Failed to export logs. Please try again.", "error");
        } finally {
            setIsExporting(false);
        }
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            startDate: '',
            endDate: ''
        });
    };

    const totalPages = pagination.totalPages || Math.ceil(pagination.count / 20);

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1>Login History</h1>
                    <p>Track user login and logout activities.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary flex items-center gap-2" onClick={handleExport} disabled={isExporting || isLoading}>
                        {isExporting ? <RefreshCcw size={18} className="animate-spin" /> : <Download size={18} />}
                        {isExporting ? 'Exporting...' : 'Export CSV'}
                    </button>
                    <button className="btn-outline flex items-center gap-2" onClick={() => fetchLogs(pagination.currentPage)}>
                        <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </header>

            <div className="filters-bar premium-shadow">
                <div className="flex items-center gap-4 px-6 py-4 overflow-x-auto no-scrollbar">
                    <div className="search-box search-box-premium">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by user or IP..."
                            value={filters.search}
                            onChange={handleSearchChange}
                            className="search-input-premium"
                        />
                    </div>

                    <div className="filter-group whitespace-nowrap">
                        <Calendar size={16} />
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            className="filter-date"
                        />
                        <span>to</span>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            className="filter-date"
                        />
                    </div>

                    <button className="text-btn text-xs font-bold uppercase text-slate-400 hover:text-burgundy whitespace-nowrap" onClick={clearFilters}>
                        Clear Filters
                    </button>
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
                                    <tr onClick={() => toggleRow(log.id)} className="cursor-pointer hover:bg-gray-50 transition-colors">
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
                                                    {loadingActivities[log.id] ? (
                                                        <div className="flex items-center gap-2 text-muted py-4">
                                                            <Loader2 size={16} className="animate-spin" />
                                                            <span>Loading activities...</span>
                                                        </div>
                                                    ) : rowActivities[log.id] && rowActivities[log.id].length > 0 ? (
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
                                                                    {rowActivities[log.id].map((act, idx) => (
                                                                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                                                            <td className="p-2 text-xs text-muted font-mono whitespace-nowrap">
                                                                                {format(new Date(act.timestamp), 'HH:mm:ss')}
                                                                            </td>
                                                                            <td className="p-2">
                                                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${act.action === 'VIEW' ? 'bg-blue-100 text-blue-800' :
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

            {pagination.count > 0 && (
                <div className="pagination-bar">
                    <div className="pagination-info">
                        Showing {logs.length} of {pagination.count} records (Page {pagination.currentPage} of {totalPages})
                    </div>
                    <div className="pagination-controls">
                        <button
                            className="pagination-btn"
                            onClick={() => fetchLogs(1)}
                            disabled={pagination.currentPage === 1 || isLoading}
                            title="First Page"
                        >
                            <ChevronsLeft size={18} />
                        </button>
                        <button
                            className="pagination-btn"
                            onClick={() => fetchLogs(pagination.currentPage - 1)}
                            disabled={!pagination.previous || isLoading}
                            title="Previous Page"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="page-number">{pagination.currentPage}</div>
                        <button
                            className="pagination-btn"
                            onClick={() => fetchLogs(pagination.currentPage + 1)}
                            disabled={!pagination.next || isLoading}
                            title="Next Page"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <button
                            className="pagination-btn"
                            onClick={() => fetchLogs(totalPages)}
                            disabled={pagination.currentPage === totalPages || isLoading}
                            title="Last Page"
                        >
                            <ChevronsRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginHistory;