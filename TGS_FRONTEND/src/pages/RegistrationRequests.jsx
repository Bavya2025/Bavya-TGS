import React, { useState, useEffect } from 'react';
import { 
    Users, Search, CheckCircle, XCircle, Clock, Info, 
    UserPlus, Phone, Building2, Briefcase, MapPin, ClipboardList,
    ShieldAlert
} from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext';

const RegistrationRequests = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState(null);

    const roleLower = (user?.role || '').toLowerCase();
    const deptLower = (user?.department || '').toLowerCase();
    
    const isHR = roleLower.includes('hr') || deptLower.includes('hr');
    const isAdmin = roleLower.includes('admin') || roleLower.includes('sys') || roleLower.includes('support');
    const isManager = isHR || isAdmin;

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/auth/manage-registrations');
            setRequests(res.data);
        } catch (err) {
            showToast('Failed to fetch registration requests.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAccountCreation = async (req) => {
        setProcessingId(req.id);
        try {
            // First, try to create the account using the core signup API
            const signupPayload = {
                employee_id: req.employee_id,
                password: 'user123', // Default password
                name: req.name,
                role: 'Employee'
            };

            await api.post('/api/signup/', signupPayload);
            
            // Then, update the registration request status
            await api.post('/api/auth/manage-registrations', { 
                id: req.id, 
                action: 'created', 
                remarks: 'Account created automatically by Administrator.' 
            });

            showToast(`Account created successfully for ${req.name}. Default password: user123`, 'success');
            fetchRequests();
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to create account.';
            showToast(errorMsg, 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleAction = async (id, action, remarks = '') => {
        setProcessingId(id);
        try {
            await api.post('/api/auth/manage-registrations', { id, action, remarks });
            showToast(`Request ${action} successfully!`, 'success');
            fetchRequests();
        } catch (err) {
            showToast(err.response?.data?.error || `Failed to ${action} request.`, 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredRequests = requests.filter(req => 
        req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusStyle = (status) => {
        switch (status) {
            case 'HR Approved': return { bg: '#f0fdf4', color: '#166534', icon: <CheckCircle size={14} /> };
            case 'Account Created': return { bg: '#eff6ff', color: '#1e40af', icon: <UserPlus size={14} /> };
            case 'Rejected': return { bg: '#fef2f2', color: '#991b1b', icon: <XCircle size={14} /> };
            default: return { bg: '#fff7ed', color: '#9a3412', icon: <Clock size={14} /> };
        }
    };

    if (!isManager) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
                <h3>Access Denied</h3>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1f2937' }}>Registration Requests</h2>
                    <p style={{ color: '#6b7280', marginTop: '4px' }}>Manage self-registration requests from new employees.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input 
                            type="text" 
                            placeholder="Search by name or ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '10px 15px 10px 40px', borderRadius: '10px', border: '1px solid #e5e7eb', width: '250px' }}
                        />
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
                {loading ? (
                    <p>Loading requests...</p>
                ) : filteredRequests.length === 0 ? (
                    <p>No registration requests found.</p>
                ) : filteredRequests.map(req => {
                    const style = getStatusStyle(req.status);
                    return (
                        <div key={req.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{ width: '48px', height: '48px', background: '#fce7f3', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d81b60', fontWeight: 'bold' }}>
                                        {req.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>{req.name}</h4>
                                        <span style={{ fontSize: '13px', color: '#6b7280' }}>ID: {req.employee_id}</span>
                                    </div>
                                </div>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: style.bg, color: style.color }}>
                                    {style.icon} {req.status}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563' }}>
                                    <Building2 size={14} /> {req.department}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563' }}>
                                    <Briefcase size={14} /> {req.section}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563' }}>
                                    <MapPin size={14} /> {req.office}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563' }}>
                                    <Phone size={14} /> {req.contact_number}
                                </div>
                            </div>

                            {req.remarks && (
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', color: '#64748b' }}>
                                    <span style={{ fontWeight: 'bold' }}>Note:</span> {req.remarks}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px' }}>
                                {req.status === 'Pending' && isHR && (
                                    <>
                                        <button 
                                            onClick={() => handleAction(req.id, 'approve')}
                                            disabled={processingId === req.id}
                                            style={{ flex: 1, padding: '10px', background: '#d81b60', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            Approve Request
                                        </button>
                                        <button 
                                            onClick={() => handleAction(req.id, 'reject')}
                                            disabled={processingId === req.id}
                                            style={{ flex: 1, padding: '10px', background: 'white', border: '1px solid #e5e7eb', color: '#374151', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}

                                {req.status === 'HR Approved' && isAdmin && (
                                    <button 
                                        onClick={() => handleAccountCreation(req)}
                                        disabled={processingId === req.id}
                                        style={{ width: '100%', padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <UserPlus size={16} /> 
                                            {processingId === req.id ? 'Creating Account...' : 'Create Account & Mark Done'}
                                        </div>
                                    </button>
                                )}

                                {req.status === 'HR Approved' && !isAdmin && (
                                    <div style={{ width: '100%', padding: '10px', background: '#f0fdf4', color: '#166534', borderRadius: '8px', fontSize: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                                        Awaiting Admin Account Creation
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RegistrationRequests;
