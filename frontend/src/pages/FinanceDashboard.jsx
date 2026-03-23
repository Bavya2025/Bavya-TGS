import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import {
    Users,
    Clock,
    CheckCircle,
    AlertCircle,
    BarChart3,
    TrendingUp,
    IndianRupee,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    FileDown,
    Zap,
    XCircle,
    Send
} from 'lucide-react';

const FinanceDashboard = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([
        { title: 'Pending Audit', value: '0', icon: <Clock color="#f59e0b" />, trend: '0%', isUp: true },
        { title: 'Settled Today', value: '₹0', icon: <CheckCircle color="#22c55e" />, trend: '0%', isUp: true },
        { title: 'Flagged/Disputed', value: '0', icon: <AlertCircle color="#ef4444" />, trend: '0%', isUp: false },
        { title: 'Avg. Audit Time', value: '0h', icon: <TrendingUp color="#3b82f6" />, trend: '0%', isUp: false },
    ]);
    const { showToast } = useToast();

    // Modal states
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    // Form states
    const [transferData, setTransferData] = useState({
        payment_mode: 'NEFT',
        transaction_id: '',
        payment_date: new Date().toISOString().split('T')[0],
        remarks: ''
    });
    const [rejectReason, setRejectReason] = useState('');

    const fetchFinanceData = async () => {
        try {
            setLoading(true);
            const resp = await api.get('/api/approvals/?tab=pending');
            // Finance sees everything that is Approved by managers or already being processed by finance
            const data = resp.data.map(item => ({
                id: item.id,
                trip: item.details?.trip_id || 'N/A',
                employee: item.requester,
                amount: item.cost,
                type: item.type,
                status: item.status,
                date: item.date,
                raw: item // Keep raw data for modal
            }));
            setRecords(data);

            setStats(prev => {
                const updated = [...prev];
                updated[0].value = data.length.toString();
                return updated;
            });
        } catch (e) {
            showToast("Failed to load records", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinanceData();
    }, []);

    const filteredRecords = records.filter(rec =>
        rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.trip.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUnderProcess = async (id) => {
        try {
            await api.post('/api/approvals/', { id, action: 'UnderProcess' });
            showToast("Marked as Under Process", "success");
            fetchFinanceData();
        } catch (e) {
            showToast("Action failed", "error");
        }
    };

    const handleTransfer = async () => {
        if (!transferData.transaction_id) {
            showToast("Transaction ID is required", "warning");
            return;
        }
        try {
            await api.post('/api/approvals/', {
                id: selectedRecord.id,
                action: 'Transfer',
                ...transferData
            });
            showToast("Funds transferred successfully", "success");
            setIsTransferModalOpen(false);
            fetchFinanceData();
        } catch (e) {
            showToast("Transfer recording failed", "error");
        }
    };

    const handleReject = async () => {
        if (!rejectReason) {
            showToast("Rejection reason is required", "warning");
            return;
        }
        try {
            await api.post('/api/approvals/', {
                id: selectedRecord.id,
                action: 'RejectByFinance',
                remarks: rejectReason
            });
            showToast("Request rejected by Finance", "success");
            setIsRejectModalOpen(false);
            fetchFinanceData();
        } catch (e) {
            showToast("Rejection failed", "error");
        }
    };

    const openTransfer = (rec) => {
        setSelectedRecord(rec);
        setIsTransferModalOpen(true);
    };

    const openReject = (rec) => {
        setSelectedRecord(rec);
        setIsRejectModalOpen(true);
    };

    return (
        <div className="finance-dashboard">
            <div className="page-header">
                <div>
                    <h1>FIMS - Financial Information Management System</h1>
                    <p>Real-time oversight of trip logistics, expense records, and audit throughput.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={() => fetchFinanceData()}>
                        <Clock size={18} />
                        Refresh List
                    </button>
                    <button className="btn-primary" onClick={() => navigate('/settlement')}>
                        <Zap size={18} />
                        Settlement Runs
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                {stats.map((stat, idx) => (
                    <div key={idx} className="stat-card premium-card">
                        <div className="stat-icon-wrapper">{stat.icon}</div>
                        <div className="stat-data">
                            <span>{stat.title}</span>
                            <h3>{stat.value}</h3>
                            <div className={`stat - trend ${stat.isUp ? 'pos' : 'neg'} `}>
                                {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {stat.trend} vs last week
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="master-records-section premium-card">
                <div className="section-header">
                    <div className="title-area">
                        <BarChart3 size={20} />
                        <h3>Master Financial Audit Log (Action Required)</h3>
                    </div>
                    <div className="filter-group">
                        <div className="search-fims-wrapper">
                            <Search size={16} className="search-icon-fims" />
                            <input
                                type="text"
                                placeholder="Search ID, Trip, or Employee..."
                                className="search-fims"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="records-table-wrapper">
                    <table className="fims-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Trip</th>
                                <th>Employee</th>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="fd-empty-cell">Loading transactions...</td></tr>
                            ) : filteredRecords.length > 0 ? (
                                filteredRecords.map(rec => (
                                    <tr key={rec.id}>
                                        <td><span className="id-badge-fims">{rec.id}</span></td>
                                        <td><span className="trip-ref">{rec.trip}</span></td>
                                        <td>{rec.employee}</td>
                                        <td>{rec.date}</td>
                                        <td>{rec.type}</td>
                                        <td className="amt-cell">{rec.amount}</td>
                                        <td>
                                            <div className={`status - pill ${rec.status.toLowerCase().replace(/ /g, '-')} `}>
                                                {rec.status}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="finance-actions">
                                                <button className="f-icon-btn process" onClick={() => handleUnderProcess(rec.id)} title="Process">
                                                    <Clock size={16} />
                                                </button>
                                                <button className="f-icon-btn transfer" onClick={() => openTransfer(rec)} title="Transfer">
                                                    <IndianRupee size={16} />
                                                </button>
                                                <button className="f-icon-btn reject" onClick={() => openReject(rec)} title="Reject">
                                                    <XCircle size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="8" className="fd-empty-cell">No pending financial actions.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transfer Modal */}
            <Modal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                title="Fund Transfer Details"
                type="success"
                actions={
                    <div className="modal-actions-grid">
                        <button className="btn-secondary" onClick={() => setIsTransferModalOpen(false)}>Cancel</button>
                        <button className="btn-primary" onClick={handleTransfer}>
                            <Send size={18} /> Confirm Transfer
                        </button>
                    </div>
                }
            >
                <div className="transfer-form">
                    <div className="form-summary-row">
                        <div className="summary-item">
                            <label>Transfer To</label>
                            <p>{selectedRecord?.employee}</p>
                        </div>
                        <div className="summary-item">
                            <label>Amount</label>
                            <p className="highlight-text">{selectedRecord?.amount}</p>
                        </div>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group">
                            <label className="form-label">Mode of Payment</label>
                            <select
                                className="form-input"
                                value={transferData.payment_mode}
                                onChange={(e) => setTransferData({ ...transferData, payment_mode: e.target.value })}
                            >
                                <option value="NEFT">NEFT</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="UPI">UPI</option>
                                <option value="Cash">Cash</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Transfer Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={transferData.payment_date}
                                onChange={(e) => setTransferData({ ...transferData, payment_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Transaction ID / Reference</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter NEFT Ref or UPI ID"
                            value={transferData.transaction_id}
                            onChange={(e) => setTransferData({ ...transferData, transaction_id: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Remarks</label>
                        <textarea
                            className="form-input"
                            placeholder="Add payment notes..."
                            value={transferData.remarks}
                            onChange={(e) => setTransferData({ ...transferData, remarks: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>

            {/* Reject Modal */}
            <Modal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                title="Reject Financial Request"
                type="error"
                actions={
                    <div className="modal-actions-grid">
                        <button className="btn-secondary" onClick={() => setIsRejectModalOpen(false)}>Cancel</button>
                        <button className="btn-danger-primary" onClick={handleReject}>Reject Request</button>
                    </div>
                }
            >
                <div className="reject-form">
                    <p className="warning-text">Are you sure you want to reject this {selectedRecord?.type} for {selectedRecord?.employee}?</p>
                    <div className="form-group mt-4">
                        <label className="form-label">Reason for Rejection</label>
                        <textarea
                            className="form-input"
                            placeholder="Enter specific reason for rejection..."
                            rows="4"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FinanceDashboard;
