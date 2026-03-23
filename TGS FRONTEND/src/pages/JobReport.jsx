import React, { useState, useEffect } from 'react';
import {
    Calendar,
    User,
    Search,
    FileText,
    Camera,
    MapPin,
    ArrowRight,
    Filter,
    Download,
    Eye,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    Info,
    LayoutDashboard,
    AlertTriangle,
    Upload,
    Clock
} from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatIndianCurrency } from '../utils/formatters';
import './JobReport.css';

const JobReport = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        employee: '',
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [expandedRow, setExpandedRow] = useState(null);
    const [batchesToApprove, setBatchesToApprove] = useState([]);
    const [myOwnBatches, setMyOwnBatches] = useState([]);
    const [teamBatchHistory, setTeamBatchHistory] = useState([]);
    const [expandedBatch, setExpandedBatch] = useState(null);

    useEffect(() => {
        fetchUsers();
        fetchReports();
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            const resp = await api.get('/api/bulk-activities/');
            const all = resp.data.results || resp.data || [];

            // 1. Batches pending current user's approval
            const pendingForMe = all.filter(b =>
                b.status === 'Submitted' &&
                String(b.current_approver) === String(user?.id)
            );
            setBatchesToApprove(pendingForMe);

            // 2. Batches submitted BY current user to others
            const submittedByMe = all.filter(b =>
                String(b.user) === String(user?.id)
            );
            setMyOwnBatches(submittedByMe);

            // 3. Team Activity History (Processed by current user OR visible to high roles)
            const role = (user?.role_name || '').toLowerCase();
            const isAdminOrExec = ['admin', 'it-admin', 'superuser', 'coo', 'cfo', 'finance'].some(kw => role.includes(kw));

            const history = all.filter(b => {
                const isProcessedStatus = b.status === 'Approved' || b.status === 'Rejected';
                const wasApprover = String(b.current_approver) === String(user?.id);
                const isNotOwnedByMe = String(b.user) !== String(user?.id);

                return isProcessedStatus && (wasApprover || (isAdminOrExec && isNotOwnedByMe));
            });
            setTeamBatchHistory(history);
        } catch (e) {
            console.error("Failed to fetch batches", e);
        }
    };




    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/users/?all_pages=true');
            setUsers(response.data || []);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/expenses/');
            let data = response.data || [];

            const filtered = data.filter(exp => {
                const matchesEmployee = filters.employee
                    ? (String(exp.trip_user_id) === String(filters.employee) || String(exp.user_id) === String(filters.employee))
                    : true;
                const expDate = (exp.date || '').slice(0, 10);
                const matchesDate = expDate >= filters.startDate && expDate <= filters.endDate;
                return matchesEmployee && matchesDate;
            });

            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            setReports(filtered);
        } catch (error) {
            console.error("Failed to fetch reports:", error);
            showToast("Error loading reports", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchReports();
    };

    const parseDescription = (descString) => {
        try {
            return typeof descString === 'string' ? JSON.parse(descString) : (descString || {});
        } catch (e) {
            return {};
        }
    };

    const parseImages = (imgString) => {
        try {
            return typeof imgString === 'string' ? JSON.parse(imgString) : (imgString || []);
        } catch (e) {
            return [];
        }
    };

    const previewImage = (url) => {
        if (!url) return;
        const win = window.open();
        win.document.write(`<img src="${url}" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);" />`);
    };


    const renderBatchData = (batch) => {
        const allowedKeys = ['date', 'time', 'origin_route', 'destination_route', 'visit_intent', 'mode', 'vehicle', '_status', '_remarks'];
        const rows = batch.data_json || [];
        const headerKeys = rows.length > 0
            ? Object.keys(rows[0]).filter(k => allowedKeys.includes(k.toLowerCase()))
            : [];

        if (!headerKeys.includes('_status') && rows.some(r => r._status)) headerKeys.push('_status');
        if (!headerKeys.includes('_remarks') && rows.some(r => r._remarks)) headerKeys.push('_remarks');

        return (
            <div className="bg-white p-3 rounded border mb-3 overflow-auto shadow-inner" style={{ maxHeight: '400px', background: '#f1f5f9' }}>
                <h6 className="fw-bold border-bottom pb-2 mb-3 text-slate-600">Excel Entries Preview</h6>
                <table className="table table-sm table-hover" style={{ fontSize: '0.75rem' }}>
                    <thead className="table-light">
                        <tr>
                            {headerKeys.map(k => {
                                let title = k.replace(/_/g, ' ').toUpperCase();
                                if (k === '_status') title = 'Row Status';
                                if (k === '_remarks') title = 'Reject Reason';
                                return <th key={k}>{title}</th>;
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rIdx) => (
                            <tr key={rIdx} className={row._status === 'Rejected' ? 'bg-danger text-white' : ''} style={{ backgroundColor: row._status === 'Rejected' ? '#fee2e2' : 'inherit', color: row._status === 'Rejected' ? '#991b1b' : 'inherit' }}>
                                {headerKeys.map(k => {
                                    let display = row[k];
                                    if (k.toLowerCase() === 'mode' && !display) display = 'Bike';
                                    if (k.toLowerCase() === 'vehicle' && !display) display = 'Own Bike';
                                    if (k === '_status' && !display) display = 'OK';
                                    return <td key={k}>{String(display || '-')}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {batch.status === 'Rejected' && (
                    <div className="mt-3 p-2 border rounded" style={{ backgroundColor: '#fef2f2', borderColor: '#ef4444', color: '#b91c1c' }}>
                        <strong>Overall Rejection Reason:</strong> {batch.remarks || 'No detailed reason provided'}
                    </div>
                )}
            </div>
        );
    };

    const handleBatchAction = async (batchId, action) => {
        try {
            await api.post(`/api/bulk-activities/${batchId}/${action}/`);
            showToast(`Batch ${action}d successfully.`, "success");
            fetchBatches();
            fetchReports(); // Refresh the grid to show new items
        } catch (error) {
            showToast(`Error: ${error.response?.data?.error || 'Action failed'}`, "error");
        }
    };

    return (
        <div className="job-report-page">
            <header className="jr-header d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div className="jr-title-group mb-0">
                    <h1>Activity Tracking</h1>
                    <p>Consolidated view of all local travel and site tasks</p>
                </div>
                <div className="d-flex gap-2">
                    <button 
                        className="jr-export-btn" 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            padding: '8px 20px', 
                            background: 'white', 
                            border: '1.5px solid #e2e8f0', 
                            borderRadius: '12px', 
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            transition: 'all 0.3s ease'
                        }}
                        onClick={() => window.print()}
                    >
                        <div style={{ padding: '8px', background: '#fff1f2', borderRadius: '8px' }}>
                            <FileText size={18} style={{ color: '#bb0633' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>Generate Summary</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Download Daily PDF</span>
                        </div>
                        <Download size={14} style={{ color: '#94a3b8', marginLeft: '4px' }} />
                    </button>
                </div>
            </header>

            {/* Pending Batches Section for Managers */}
            {batchesToApprove.length > 0 && (
                <div className="jr-filter-card mb-4" style={{ borderColor: '#3b82f6', backgroundColor: '#eff6ff' }}>
                    <h3 className="h5 text-primary fw-bold mb-3 d-flex align-items-center gap-2">
                        <Upload size={18} /> Review Pending Activity Batches (For Your Team)
                    </h3>
                    <div className="jr-batch-list">
                        {batchesToApprove.map(batch => (
                            <div key={batch.id} className="jr-batch-item">
                                <div className="jr-batch-header">
                                    <div className="jr-batch-info">
                                        <div className="jr-batch-file">
                                            <strong>{batch.user_name}</strong>
                                            <span className="text-muted">submitted</span>
                                            <strong>{batch.file_name}</strong>
                                        </div>
                                        <div className="jr-batch-meta">
                                            <span>Trip: {batch.trip_id_display}</span>
                                            <span className="dot"></span>
                                            <span>Date: {new Date(batch.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="jr-batch-actions">
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleBatchAction(batch.id, 'reject')}>Reject</button>
                                        <button className="btn btn-sm btn-success" onClick={() => handleBatchAction(batch.id, 'approve')}>Approve Batch</button>
                                        <button
                                            className="jr-view-batch-btn"
                                            onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                                        >
                                            {expandedBatch === batch.id ? 'Hide Data' : 'View Data'}
                                            <ChevronDown size={14} style={{ transform: expandedBatch === batch.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                        </button>
                                    </div>
                                </div>
                                {expandedBatch === batch.id && (
                                    <div className="jr-batch-data-expanded">
                                        {renderBatchData(batch)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Team Activity History (For Managers / COO) */}
            {teamBatchHistory.length > 0 && (
                <div className="jr-filter-card mb-4" style={{ borderColor: '#1e293b', backgroundColor: '#f8fafc' }}>
                    <h3 className="h5 fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: '#1e293b' }}>
                        <FileText size={18} /> Team Bulk Activity History
                    </h3>
                    <div className="jr-batch-list">
                        {teamBatchHistory.map(batch => (
                            <div key={batch.id} className="jr-batch-item">
                                <div className="jr-batch-header">
                                    <div className="jr-batch-info">
                                        <div className="jr-batch-file">
                                            <strong>{batch.user_name}</strong>
                                            <span className="text-muted">uploaded</span>
                                            <strong>{batch.file_name}</strong>
                                        </div>
                                        <div className="jr-batch-meta">
                                            <span>Trip: {batch.trip_id_display}</span>
                                            <span className="dot"></span>
                                            <span>Processed: {new Date(batch.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="jr-batch-actions">
                                        <span className={`jr-status-tag ${batch.status.toLowerCase()}`}>
                                            {batch.status}
                                        </span>
                                        <button
                                            className="jr-view-batch-btn"
                                            onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                                        >
                                            {expandedBatch === batch.id ? 'Hide Logs' : 'View Logs'}
                                            <ChevronDown size={14} style={{ transform: expandedBatch === batch.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                        </button>
                                    </div>
                                </div>
                                {expandedBatch === batch.id && (
                                    <div className="jr-batch-data-expanded">
                                        {renderBatchData(batch)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {myOwnBatches.length > 0 && (
                <div className="jr-filter-card mb-4" style={{ borderColor: '#8b0000', backgroundColor: '#fff5f5' }}>
                    <h3 className="h5 fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: '#8b0000' }}>
                        <Clock size={18} /> My Bulk Activity Upload Status
                    </h3>
                    <div className="d-flex flex-column gap-2">
                        <div className="jr-batch-list">
                            {myOwnBatches.map(batch => (
                                <div key={batch.id} className="jr-batch-item">
                                    <div className="jr-batch-header">
                                        <div className="jr-batch-info">
                                            <div className="jr-batch-file">
                                                <FileText size={16} className="text-muted" />
                                                <strong>{batch.file_name}</strong>
                                            </div>
                                            <div className="jr-batch-meta">
                                                <span>Trip: {batch.trip_id_display}</span>
                                                <span className="dot"></span>
                                                <span>Uploaded: {new Date(batch.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="jr-batch-actions">
                                            <span className={`jr-status-tag ${batch.status.toLowerCase()}`}>
                                                {batch.status}
                                            </span>
                                            <button
                                                className="jr-view-batch-btn"
                                                onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                                            >
                                                {expandedBatch === batch.id ? 'Hide Data' : 'View Entries'}
                                                <ChevronDown size={14} style={{ transform: expandedBatch === batch.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                            </button>
                                        </div>
                                    </div>
                                    {expandedBatch === batch.id && (
                                        <div className="jr-batch-data-expanded">
                                            {renderBatchData(batch)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Filter Section */}
            <div className="jr-filter-card">
                <div className="jr-filter-grid">
                    <div className="jr-filter-item">
                        <label><User size={14} /> Employee Name</label>
                        <select
                            className="jr-select"
                            value={filters.employee}
                            onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                        >
                            <option value="">All Employees</option>
                            {users.map(u => (
                                <option key={u.id} value={u.employee_id}>{u.name} ({u.employee_id})</option>
                            ))}
                        </select>
                    </div>
                    <div className="jr-filter-item">
                        <label><Calendar size={14} /> Start Period</label>
                        <input
                            type="date"
                            className="jr-date-input"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                    </div>
                    <div className="jr-filter-item">
                        <label><Calendar size={14} /> End Period</label>
                        <input
                            type="date"
                            className="jr-date-input"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                    </div>
                    <div className="jr-filter-item">
                        <button className="jr-search-btn" onClick={handleSearch} disabled={loading}>
                            <Search size={18} />
                            <span>{loading ? 'Crunching Data...' : 'Generate Report'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* High-End Report Table */}
            <div className="jr-report-container">
                <table className="jr-table">
                    <thead>
                        <tr>
                            <th>Activity Date</th>
                            <th>Employee Details</th>
                            <th>Job Description</th>
                            <th>Odometer / Log</th>
                            <th>Media Proofs</th>
                            <th style={{ width: '60px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="text-center py-5">
                                <div className="spinner-border text-primary" role="status"></div>
                                <p className="mt-2 font-bold text-muted">Securing records...</p>
                            </td></tr>
                        ) : reports.length === 0 ? (
                            <tr><td colSpan="6" className="jr-empty">
                                <LayoutDashboard size={48} opacity={0.2} />
                                <h3>No Records Found</h3>
                                <p>Try adjusting your search filters or date range.</p>
                            </td></tr>
                        ) : (
                            reports.map((report) => {
                                const details = parseDescription(report.description);
                                const selfiesArr = Array.isArray(details.selfies) ? details.selfies : [];
                                const isFuel = report.category === 'Fuel';

                                // Safety date format
                                const formatDate = (dateStr) => {
                                    try {
                                        const d = new Date(dateStr);
                                        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                    } catch (e) {
                                        return dateStr || 'N/A';
                                    }
                                };

                                // Safety string renderer to simplify complex data
                                const safeRender = (val, fallback = 'N/A') => {
                                    if (val === null || val === undefined) return fallback;
                                    if (typeof val === 'object') {
                                        // If it's a timestamp object, format nicely
                                        if (val.actualTime || val.boardingTime) {
                                            return `${val.actualTime || val.boardingTime} (${val.boardingDate || ''})`;
                                        }
                                        return JSON.stringify(val);
                                    }

                                    // Try to parse if it's a JSON string
                                    if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                                        try {
                                            const parsed = JSON.parse(val);
                                            return safeRender(parsed, fallback);
                                        } catch (e) { return val; }
                                    }
                                    return String(val);
                                };

                                // Constructing a rich job description
                                const rawJobDesc = details.natureOfVisit || details.description || "Field Visit / Activity";
                                const jobDesc = safeRender(rawJobDesc);
                                const statusPillClass = isFuel ? 'fuel' : 'other';

                                return (
                                    <React.Fragment key={report.id}>
                                        <tr className={`jr-row ${expandedRow === report.id ? 'expanded' : ''}`}>
                                            <td className="jr-date-cell">
                                                {formatDate(report.date)}
                                            </td>
                                            <td>
                                                <div className="jr-employee-cell">
                                                    <div className="jr-avatar-mini">{report.user_name?.charAt(0) || 'U'}</div>
                                                    <div className="jr-emp-info">
                                                        <strong>{report.user_name || 'Anonymous User'}</strong>
                                                        <span>{report.user_department || 'General'} • {report.user_designation || 'Staff'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex flex-column gap-1">
                                                    <span className={`jr-status-pill ${statusPillClass}`}>
                                                        {isFuel ? <MapPin size={12} /> : <FileText size={12} />}
                                                        {isFuel ? 'Local Travel' : report.category}
                                                    </span>
                                                    <strong style={{ fontSize: '0.85rem', color: '#334155' }}>{jobDesc}</strong>
                                                </div>
                                            </td>
                                            <td>
                                                {report.odo_start ? (
                                                    <div className="jr-odo-display">
                                                        <div className="jr-odo-flow">
                                                            <strong>{Math.round(report.odo_start)}</strong>
                                                            <ArrowRight size={12} />
                                                            <strong>{Math.round(report.odo_end)}</strong>
                                                        </div>
                                                        <span className="jr-distance-badge">{report.distance} KM Traveled</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted small italic">Logged without ODO</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="jr-proof-icons">
                                                    {details.odoStartImg && (
                                                        <button className="jr-media-btn" onClick={() => previewImage(details.odoStartImg)} title="Start ODO Image">
                                                            <Camera size={14} />
                                                        </button>
                                                    )}
                                                    {details.odoEndImg && (
                                                        <button className="jr-media-btn" onClick={() => previewImage(details.odoEndImg)} title="End ODO Image">
                                                            <Camera size={14} />
                                                        </button>
                                                    )}
                                                    {selfiesArr.length > 0 && (
                                                        <div className="jr-selfie-count d-flex align-items-center gap-1">
                                                            <User size={10} /> {selfiesArr.length} Photos
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    className="jr-media-btn"
                                                    onClick={() => setExpandedRow(expandedRow === report.id ? null : report.id)}
                                                    style={{ backgroundColor: expandedRow === report.id ? '#8b0000' : 'white', color: expandedRow === report.id ? 'white' : 'var(--text-muted)' }}
                                                >
                                                    {expandedRow === report.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedRow === report.id && (
                                            <tr>
                                                <td colSpan="6" style={{ padding: 0, border: 'none' }}>
                                                    <div className="jr-expanded-card">
                                                        <div className="jr-info-section">
                                                            <h4><Info size={16} /> Activity & Logistics Details</h4>
                                                            <div className="jr-detail-grid">
                                                                <div className="jr-detail-block">
                                                                    <span>Movement Mode</span>
                                                                    <p>{safeRender(report.travel_mode)}</p>
                                                                </div>
                                                                <div className="jr-detail-block">
                                                                    <span>Vehicle Type</span>
                                                                    <p>{safeRender(report.vehicle_type)}</p>
                                                                </div>
                                                                <div className="jr-detail-block" style={{ gridColumn: 'span 2' }}>
                                                                    <span>Route (Origin → Destination)</span>
                                                                    <p>
                                                                        {(details?.origin || details?.fromLocation || 'Unknown')}
                                                                        {' → '}
                                                                        {(details?.destination || details?.toLocation || 'Unknown')}
                                                                    </p>
                                                                </div>
                                                                <div className="jr-detail-block">
                                                                    <span>Visit Intent</span>
                                                                    <p>{safeRender(details.purpose, 'Official Task')}</p>
                                                                </div>
                                                                <div className="jr-detail-block">
                                                                    <span>Timestamp</span>
                                                                    <p>{safeRender(details.time, 'Logged during core hours')}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="jr-info-section">
                                                            <h4><Camera size={16} /> Visual Evidence (Live Captures)</h4>
                                                            <div className="jr-media-wall">
                                                                {details.odoStartImg && (
                                                                    <div className="jr-media-item" onClick={() => previewImage(details.odoStartImg)}>
                                                                        <img src={details.odoStartImg} alt="Start ODO" />
                                                                        <div className="jr-media-label">Start ODO Reading</div>
                                                                    </div>
                                                                )}
                                                                {details.odoEndImg && (
                                                                    <div className="jr-media-item" onClick={() => previewImage(details.odoEndImg)}>
                                                                        <img src={details.odoEndImg} alt="End ODO" />
                                                                        <div className="jr-media-label">End ODO Reading</div>
                                                                    </div>
                                                                )}
                                                                {selfiesArr.map((s, idx) => (
                                                                    <div key={idx} className="jr-media-item" onClick={() => previewImage(s)}>
                                                                        <img src={s} alt={`selfie-${idx}`} />
                                                                        <div className="jr-media-label">Task Selfie #{idx + 1}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="jr-remarks-box">
                                                            <h4 className="jr-info-section h4 m-0 mb-3"><FileText size={16} className="text-muted" /> Detailed Remarks / Activity Outcome</h4>
                                                            <div className="jr-remarks-text">
                                                                {safeRender(details.remarks, "The employee did not provide any specific text-based remarks for this activity.")}
                                                            </div>
                                                        </div>
                                                        <div className="jr-footer-strip">
                                                            <span>System Ref ID: #{report.id || 'N/A'} | Trip Cluster: {(report.trip && typeof report.trip === 'object') ? (report.trip.trip_id || 'ID') : (report.trip || 'N/A')}</span>
                                                            <div className="d-flex align-items-center gap-3">
                                                                <div className="jr-status-pill fuel" style={{ fontSize: '0.7rem' }}>
                                                                    <CheckCircle size={10} /> Verified Location Data
                                                                </div>
                                                                <span className="jr-total-cost font-bold">Internal Cost: ₹{safeRender(report.amount, '0')}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default JobReport;
