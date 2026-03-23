import React, { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    Search,
    Filter,
    MoreVertical,
    UserCheck,
    AlertCircle,
    Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import { useToast } from '../context/ToastContext.jsx';

const UserManagement = () => {
    const { showToast } = useToast();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [apiKeyMissing, setApiKeyMissing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncProgress, setSyncProgress] = useState(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchEmployeesAndUsers(currentPage);
    }, [currentPage]);

    const fetchEmployeesAndUsers = async (page = 1) => {
        setLoading(true);
        setApiKeyMissing(false);
        setError(null);

        try {
            const [empResponse, usersResponse] = await Promise.allSettled([
                api.get(`/api/employees/?page=${page}&page_size=20`),
                api.get('/api/users/?all_pages=true')
            ]);

            let employeeList = [];
            let userList = [];

            if (empResponse.status === 'fulfilled') {
                employeeList = empResponse.value.data.results || [];
                const count = empResponse.value.data.count || 0;
                const pageSize = employeeList.length || 10;
                setTotalPages(Math.ceil(count / pageSize));
                setApiKeyMissing(false);
            } else {
                const status = empResponse.reason?.response?.status;
                if (status === 400 || status === 404) {
                    setApiKeyMissing(true);
                } else {
                    console.error("Error fetching employees:", empResponse.reason);
                    setError('External API Connection Failed. You can still manage existing users.');
                }
            }

            if (usersResponse.status === 'fulfilled') {
                userList = usersResponse.value.data || [];
            } else {
                const status = usersResponse.reason?.response?.status;
                if (status === 403) {
                    console.warn("User is not authorized to fetch users list. Proceeding with empty list.");
                    userList = [];
                } else {
                    console.warn("Could not fetch existing users list:", usersResponse.reason);
                }
            }

            const processedEmployees = employeeList.map(emp => {
                const code = String(emp.employee_code || emp.employee?.employee_code || '').toLowerCase();
                const isAlreadyUser = userList.some(u => {
                    const uCode = String(u.employee_id || u.username || '').toLowerCase();
                    return uCode && uCode === code;
                });
                return { ...emp, isUser: isAlreadyUser };
            });

            const sortedEmployees = processedEmployees.sort((a, b) => {
                const nameA = (a.name || a.employee?.name || '').toLowerCase();
                const nameB = (b.name || b.employee?.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });

            setEmployees(sortedEmployees);

        } catch (err) {
            console.error("Unexpected error:", err);
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleMakeUser = async (employee) => {
        const empCode = employee.employee_code || employee.employee?.employee_code;
        const empName = employee.name || employee.employee?.name;

        if (!empCode) {
            showToast('Employee Code is missing for this record.', 'warning');
            return;
        }

        setProcessingId(empCode);

        try {
            const payload = {
                employee_id: empCode,
                password: 'user123',
                name: empName,
                role: 'Employee'
            };

            const response = await api.post('/api/signup/', payload);

            if (response.status === 200 || response.status === 201) {
                showToast(`User created successfully for ${empName} (${empCode}). Default password: user123`, 'success');

                setEmployees(prevEmployees => prevEmployees.map(e => {
                    const code = e.employee_code || e.employee?.employee_code;
                    if (code === empCode) {
                        return { ...e, isUser: true };
                    }
                    return e;
                }));
            }
        } catch (err) {
            console.error("Error creating user:", err);
            const errMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to create user. It might already exist.';
            showToast(`Error: ${errMsg}`, 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleSyncAllUsers = async () => {
        setIsSyncingAll(true);
        setSyncProgress({ current: 0, total: 0, step: 'Initializing...' });
        
        try {
            // Step 1: Get total count and pages
            const initResponse = await api.get('/api/employees/?page=1');
            const totalEmployees = initResponse.data.count || 0;
            const pageSize = initResponse.data.results?.length || 10;
            const totalPages = Math.ceil(totalEmployees / pageSize);

            if (totalEmployees === 0) {
                showToast("No employees found to sync.", "warning");
                return;
            }

            setSyncProgress({ current: 0, total: totalEmployees, step: `Starting sync for ${totalEmployees} records...` });

            let processedCount = 0;

            // Step 2: Sync page by page to show progress
            for (let page = 1; page <= totalPages; page++) {
                try {
                    setSyncProgress(prev => ({ ...prev, step: `Syncing batch ${page} of ${totalPages}...` }));
                    
                    const syncResp = await api.post('/api/sync-users-page/', { page });
                    processedCount += (syncResp.data.batch_processed || 0);

                    setSyncProgress(prev => ({
                        ...prev,
                        current: Math.min(processedCount, totalEmployees)
                    }));
                } catch (pageErr) {
                    console.error(`Error syncing page ${page}:`, pageErr);
                    // Continue to next page instead of failing entirely
                }
            }

            showToast(`Successfully synced ${processedCount} users!`, 'success');
            fetchEmployeesAndUsers(currentPage); // Refresh current view
            setTimeout(() => {
                setShowSyncModal(false);
                setIsSyncingAll(false);
                setSyncProgress(null);
            }, 1500);
            
            return; // Exit early so finally doesn't reset state too quickly
        } catch (err) {
            console.error("Error syncing users:", err);
            const errMsg = err.response?.data?.error || 'Failed to sync users.';
            showToast(`Error: ${errMsg}`, 'error');
            setIsSyncingAll(false);
            setSyncProgress(null);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const searchLower = searchTerm.toLowerCase();

        const code = (emp.employee_code || emp.employee?.employee_code || '').toLowerCase();
        const name = (emp.name || emp.employee?.name || '').toLowerCase();
        const dept = (emp.department || emp.position?.department || '').toLowerCase();

        return code.startsWith(searchLower) || name.startsWith(searchLower) || dept.startsWith(searchLower);
    });


    return (
        <div className="dashboard-page">
            <div className="dashboard-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="welcome-text">User Management</h1>
                    <p className="header-subtitle">Manage system access for employees.</p>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={() => setShowSyncModal(true)}
                    disabled={isSyncingAll || loading}
                >
                    {isSyncingAll ? 'Syncing...' : (
                        <>
                            <Users size={18} />
                            <span>Make All Employees As Users</span>
                        </>
                    )}
                </button>
            </div>



            <div className="premium-card um-content-card">
                {apiKeyMissing && (
                    <div style={{ padding: '15px', backgroundColor: '#fff7ed', borderLeft: '4px solid #f97316', marginBottom: '15px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <AlertCircle className="text-warning" size={20} />
                            <span style={{ color: '#9a3412', fontSize: '14px' }}>External Database Not Configured. New employees cannot be synced.</span>
                        </div>
                        <Link to="/api-management" className="btn btn-primary btn-sm" style={{ padding: '4px 12px', fontSize: '13px' }}>
                            Fix Setup
                        </Link>
                    </div>
                )}
                <div className="content-toolbar">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, ID or department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Add filters if needed */}
                </div>

                {loading ? (
                    <div className="um-loading-spinner">Loading Employees...</div>
                ) : error ? (
                    <div className="um-text-danger">{error}</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Employee Name</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map((emp, idx) => {
                                        // derive values for display
                                        const displayCode = emp.employee_code || emp.employee?.employee_code || 'N/A';
                                        const displayName = emp.name || emp.employee?.name || 'Unknown';
                                        const displayDept = emp.department || emp.position?.department || 'N/A';
                                        const displayRole = emp.role || emp.role_name || emp.position?.role_name || 'N/A';

                                        return (
                                            <tr key={idx}>
                                                <td>
                                                    <span className="badge badge-secondary um-badge-bold">
                                                        {displayCode}
                                                    </span>
                                                </td>
                                                <td>
                                                    <strong>{displayName}</strong>
                                                </td>
                                                <td className="actions-cell">
                                                    <button
                                                        className={`btn ${emp.isUser ? 'btn-secondary' : 'btn-primary'} um-btn-sm`}
                                                        onClick={() => !emp.isUser && handleMakeUser(emp)}
                                                        disabled={processingId === displayCode || emp.isUser}
                                                    >
                                                        {processingId === displayCode ? (
                                                            'Processing...'
                                                        ) : emp.isUser ? (
                                                            <>
                                                                <UserCheck size={16} />
                                                                <span>Already User</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserPlus size={16} />
                                                                <span>Make it as User</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="um-empty-state">
                                            No employees found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        
                        {/* Pagination Controls */}
                        {!loading && !error && totalPages > 1 && (
                            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '20px 0' }}>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </button>
                                <span className="font-medium text-slate-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Custom Sync Confirmation Modal */}
            {showSyncModal && (
                <div className="modal-overlay">
                    <div className="modal-content animate-pop-in" style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AlertCircle className="text-warning" size={24} />
                                Confirm Bulk Sync
                            </h2>
                            {!isSyncingAll && <button className="badge-btn" onClick={() => setShowSyncModal(false)}>✕</button>}
                        </div>
                        <div className="modal-body">
                            {isSyncingAll && syncProgress ? (
                                <div style={{ padding: '10px 0' }}>
                                    <h4 style={{ marginBottom: '8px', color: '#1e293b' }}>{syncProgress.step}</h4>
                                    <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '8px', overflow: 'hidden', height: '14px', marginBottom: '8px' }}>
                                        <div 
                                            style={{ 
                                                width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%`, 
                                                backgroundColor: '#3b82f6', 
                                                height: '100%',
                                                transition: 'width 0.3s ease'
                                            }} 
                                        />
                                    </div>
                                    <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'right' }}>
                                        {syncProgress.current} / {syncProgress.total} processed
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <p style={{ fontSize: '15px', color: '#475569', marginBottom: '15px', lineHeight: '1.5' }}>
                                        Are you sure you want to create user accounts for <strong>ALL</strong> active employees in the system?
                                    </p>
                                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', fontSize: '14px' }}>
                                        <strong>Note:</strong> Default password for new accounts will be <code style={{ backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>user123</code>.
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowSyncModal(false)} disabled={isSyncingAll}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSyncAllUsers} disabled={isSyncingAll}>
                                {isSyncingAll ? 'Processing...' : 'Confirm & Sync'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
