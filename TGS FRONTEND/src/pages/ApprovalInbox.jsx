import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/idEncoder';
import {
    CheckCircle,
    XCircle,
    HelpCircle,
    PauseCircle,
    AlertTriangle,
    FileText,
    User,
    ArrowRight,
    Loader2,
    IndianRupee,
    ChevronDown,
    ChevronUp,
    Filter,
    ExternalLink
} from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import ImageModal from '../components/ImageModal';


const ApprovalInbox = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('pending');
    const [filterType, setFilterType] = useState('all');
    const [tasks, setTasks] = useState([]);
    const [counts, setCounts] = useState({ total: 0, advances: 0, trips: 0, claims: 0 });
    const [selectedTask, setSelectedTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const { showToast } = useToast();
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [itemRemarks, setItemRemarks] = useState({});
    const [execAmount, setExecAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [receiptFile, setReceiptFile] = useState(null);
    const { user } = useAuth();

    // Modal state
    const [previewImage, setPreviewImage] = useState(null);
    const [previewTitle, setPreviewTitle] = useState('');

    const rawRole = user?.role?.toLowerCase() || '';
    const dept = user?.department?.toLowerCase() || '';
    const desig = user?.designation?.toLowerCase() || '';

    // Advanced Detection matching backend
    const isFinanceHead = (dept.includes('finance') && dept.includes('head')) || 
                         (desig.includes('finance') && desig.includes('head')) || 
                         rawRole === 'cfo';
    
    const isFinance = dept.includes('finance') || desig.includes('finance') || rawRole === 'finance' || isFinanceHead;
    const isFinanceExec = isFinance && !isFinanceHead;

    useEffect(() => {
        console.log("Current User Role:", rawRole, "Dept:", dept, "Desig:", desig);
    }, [user, rawRole, dept, desig]);

    const fetchCounts = async () => {
        try {
            const resp = await api.get('/api/approvals/count/');
            setCounts(resp.data);
        } catch (e) {
            console.error("Failed to fetch counts");
        }
    };

    const fetchTasks = async (tab = 'pending', type = filterType) => {
        try {
            setLoading(true);
            const url = `/api/approvals/?tab=${tab}&type=${type}`;
            const response = await api.get(url);
            setTasks(response.data);
            if (response.data.length > 0) {
                const firstTask = response.data[0];
                setSelectedTask(firstTask);
                // Pre-fill amount for editing if exec
                if (firstTask.details?.executive_approved_amount && parseFloat(firstTask.details.executive_approved_amount) > 0) {
                    setExecAmount(firstTask.details.executive_approved_amount);
                } else {
                    setExecAmount(firstTask.details?.requested_amount || firstTask.cost?.replace('₹', '') || '');
                }
            } else {
                setSelectedTask(null);
            }
        } catch (error) {
            console.error("Failed to fetch approvals:", error);
            showToast("Failed to load approval tasks", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks(activeTab, filterType);
        fetchCounts();
        // Show breakdown by default for claims
        setShowBreakdown(true);
    }, [activeTab, filterType]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const handleAction = async (action) => {
        if (!selectedTask) return;

        let remarks = "";
        if (action === 'Reject' || action === 'RejectByFinance') {
            remarks = window.prompt("Please enter the reason for rejection:");
            if (remarks === null) return; // User cancelled
            if (!remarks.trim()) {
                showToast("Rejection reason is mandatory", "error");
                return;
            }
        }

        try {
            const payload = {
                id: selectedTask.id,
                action: action,
                remarks: remarks,
                executive_approved_amount: execAmount,
                payment_mode: paymentMode,
                transaction_id: transactionId,
                receipt_file: receiptFile
            };

            await api.post('/api/approvals/', payload);
            showToast(`Request ${action}ed successfully`, "success");

            // Clear inputs
            setPaymentMode('');
            setTransactionId('');
            setReceiptFile(null);

            fetchTasks(activeTab);
            fetchCounts();
        } catch (error) {
            console.error(`Failed to ${action} task:`, error);
            showToast(error.response?.data?.error || `Failed to ${action} request`, "error");
        }
    };

    const handleItemAction = async (itemId, itemStatus) => {
        try {
            const remark = itemRemarks[itemId] || '';
            await api.post('/api/approvals/', {
                id: selectedTask.id,
                action: 'UpdateItem',
                item_id: itemId,
                item_status: itemStatus,
                remarks: remark
            });

            // Update local state to show the change immediately
            const updatedTasks = tasks.map(t => {
                if (t.id === selectedTask.id) {
                    const updatedExpenses = t.details.expenses.map(e =>
                        e.id === itemId ? { ...e, status: itemStatus } : e
                    );
                    return { ...t, details: { ...t.details, expenses: updatedExpenses } };
                }
                return t;
            });
            setTasks(updatedTasks);
            const currentTask = updatedTasks.find(t => t.id === selectedTask.id);
            setSelectedTask(currentTask);
            showToast(`Item ${itemStatus.toLowerCase()}ed with feedback`, "success");
        } catch (e) {
            showToast("Failed to update item status", "error");
        }
    };


    return (
        <div className="approvals-page">
            <div className="page-header">
                <div className="header-row">
                    <div>
                        <h1>Approval Inbox</h1>
                        <p>Review and act on pending requests from your team.</p>
                    </div>
                    <div className="tabs">
                        <button
                            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                            onClick={() => handleTabChange('pending')}
                        >
                            Pending {counts.total > 0 && <span className="tab-badge">{counts.total}</span>}
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => handleTabChange('history')}
                        >
                            History
                        </button>
                    </div>
                </div>
                <div className="filter-container">
                    <span className="filter-label">Filter Requests:</span>
                    <div className="relative-position">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="filter-btn"
                        >
                            <div className="filter-btn-content">
                                <Filter size={16} className="text-slate-400" />
                                <span>
                                    {filterType === 'all' ? 'All Requests' :
                                        filterType === 'money' ? 'Money Only' :
                                            filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                                </span>
                            </div>
                            <ChevronDown size={16} />
                        </button>

                        {isFilterOpen && (
                            <>
                                <div
                                    className="filter-backdrop"
                                    onClick={() => setIsFilterOpen(false)}
                                />
                                <div className="filter-dropdown-menu">
                                    {['all', 'trip', 'expense', 'advance', 'mileage', 'dispute'].map(type => (
                                        <div
                                            key={type}
                                            onClick={() => {
                                                setFilterType(type);
                                                setIsFilterOpen(false);
                                            }}
                                            className={`filter-dropdown-item ${filterType === type ? 'active' : ''}`}
                                        >
                                            <span className="capitalize-text">
                                                {type === 'all' ? 'All Requests' : type}
                                            </span>
                                            {filterType === type && <CheckCircle size={16} className="text-blue-600" />}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <Loader2 className="animate-spin" size={40} />
                    <p>Loading requests...</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="empty-state-container">
                    <div className="empty-state premium-card">
                        <CheckCircle size={48} color="#10b981" />
                        <h3>All caught up!</h3>
                        <p>No pending approvals found for your review.</p>
                    </div>
                </div>
            ) : (
                <div className="approvals-container">
                    {/* Task List */}
                    <div className="task-list premium-card">
                        <div className="list-search">
                            <input type="text" placeholder="Search requests..." />
                        </div>
                        <div className="task-items">
                            {tasks.map(task => (
                                <div
                                    key={task.id}
                                    className={`task-item ${selectedTask?.id === task.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedTask(task);
                                        const amt = task.details?.executive_approved_amount && parseFloat(task.details.executive_approved_amount) > 0
                                            ? task.details.executive_approved_amount
                                            : (task.details?.requested_amount || task.cost?.replace('₹', '') || '');
                                        setExecAmount(amt);
                                    }}
                                >
                                    <div className="task-icon">
                                        <FileText size={20} />
                                    </div>
                                    <div className="task-info">
                                        <h4>{task.purpose}</h4>
                                        <div className="task-meta">
                                            <span className="task-requester">{task.requester}</span>
                                            <span className="task-date">• {task.date}</span>
                                        </div>
                                    </div>
                                    <div className="task-amount">{task.cost}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detailed View */}
                    {selectedTask && (
                        <div className="task-detail premium-card">
                            <div className="detail-header">
                                <div className="requester-profile">
                                    <div className="avatar"> {selectedTask.requester?.charAt(0) || '?'} </div>
                                    <div>
                                        <h3>{selectedTask.requester || 'Unknown'}</h3>
                                        <p>{selectedTask.type} Request</p>
                                    </div>
                                </div>
                                <div className={`risk-badge ${activeTab === 'history' ? (selectedTask.status?.toLowerCase() || 'pending') : (selectedTask.risk?.toLowerCase() || 'low')}`}>
                                    {activeTab === 'history' ? `Status: ${selectedTask.status || 'Unknown'}` : `Risk Score: ${selectedTask.risk || 'Low'}`}
                                </div>
                            </div>

                            <div className="detail-content">
                                <div className="info-grid">
                                    <div className="info-block">
                                        <span>Request Type</span>
                                        <p>{selectedTask.type}</p>
                                    </div>
                                    {!isFinanceHead && (
                                        <div className="info-block">
                                            <span>Estimated Cost</span>
                                            <p>{selectedTask.cost}</p>
                                        </div>
                                    )}
                                    <div className="info-block">
                                        <span>Submitted Date</span>
                                        <p>{selectedTask.date}</p>
                                    </div>
                                    {isFinanceHead && (
                                        <div className="info-block highlight">
                                            <span>Executive Recommendation</span>
                                            <p className="text-blue-600 font-bold">₹{selectedTask.details?.executive_approved_amount || '0.00'}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="detail-section">
                                    <h4>Request Objective</h4>
                                    <p className="purpose-text">{selectedTask.purpose}</p>
                                </div>
                                {/* Trip Itinerary & Details */}
                                {selectedTask.type === 'Trip' && selectedTask.details && (
                                    <>
                                        <div className="detail-section">
                                            <h4>Trip Itinerary</h4>
                                            <div className="trip-itinerary">
                                                <div className="itinerary-point">
                                                    <span>From</span>
                                                    <strong>{selectedTask.details.source}</strong>
                                                </div>
                                                <div className="itinerary-arrow">
                                                    <ArrowRight size={24} />
                                                </div>
                                                <div className="itinerary-point">
                                                    <span>To</span>
                                                    <strong>{selectedTask.details.destination}</strong>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="detail-section">
                                            <h4>Travel Details</h4>
                                            <div className="info-grid">
                                                <div className="info-block">
                                                    <span>Travel Mode</span>
                                                    <p>{selectedTask.details.travel_mode}</p>
                                                </div>
                                                {selectedTask.details.vehicle_type && (
                                                    <div className="info-block">
                                                        <span>Vehicle</span>
                                                        <p>{selectedTask.details.vehicle_type}</p>
                                                    </div>
                                                )}
                                                <div className="info-block">
                                                    <span>Composition</span>
                                                    <p>{selectedTask.details.composition}</p>
                                                </div>
                                                <div className="info-block">
                                                    <span>Start Date</span>
                                                    <p>{selectedTask.details.start_date}</p>
                                                </div>
                                                <div className="info-block">
                                                    <span>End Date</span>
                                                    <p>{selectedTask.details.end_date}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Advance Request Details */}
                                {selectedTask.type === 'Money Top-up / Advance' && selectedTask.details && (
                                    <div className="detail-section">
                                        <h4>Advance Request</h4>
                                        <div className="advance-display-container">
                                            <div className="advance-amount-display">
                                                <span>Requested Amount</span>
                                                <h2>₹{selectedTask.details.requested_amount}</h2>
                                            </div>

                                            {isFinanceExec && (['PENDING_EXECUTIVE', 'HR Approved', 'REJECTED_BY_HEAD'].includes(selectedTask.status)) && (
                                                <div className="exec-amount-editor animate-fade-in">
                                                    <label>Set Approved Amount</label>
                                                    <div className="amount-input-wrapper">
                                                        <span className="currency-prefix">₹</span>
                                                        <input
                                                            type="number"
                                                            value={execAmount}
                                                            onChange={(e) => setExecAmount(e.target.value)}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <p className="hint text-xs mt-1">This amount will be sent to Finance Head for authorization.</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="ai-advance-reason-container">
                                            <p className="purpose-text"><strong>Reason:</strong> {selectedTask.details.reason}</p>
                                            <p className="ai-advance-trip-info">
                                                For Trip: {selectedTask.details.trip_destination} ({selectedTask.details.trip_id})
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Dispute Details */}
                                {selectedTask.type === 'Dispute' && selectedTask.details && (
                                    <div className="detail-section">
                                        <div className="ai-dispute-box">
                                            <h4 className="ai-dispute-header">Dispute Details</h4>
                                            <div className="info-grid">
                                                <div className="info-block">
                                                    <span className="ai-dispute-label">Category</span>
                                                    <p>{selectedTask.details.category}</p>
                                                </div>
                                                <div className="info-block">
                                                    <span className="ai-dispute-label">Related Trip</span>
                                                    <p>{selectedTask.details.trip_destination} ({selectedTask.details.trip_id})</p>
                                                </div>
                                            </div>
                                            <div className="ai-dispute-sub-section">
                                                <span className="ai-dispute-reason-label">Reason</span>
                                                <p className="ai-dispute-reason-text">{selectedTask.details.reason}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}




                                {/* Expense Breakdown for Claims */}
                                {selectedTask.details?.expenses?.length > 0 && (
                                    <div className="detail-section">
                                        <div className="section-header-row" onClick={() => setShowBreakdown(!showBreakdown)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4>Expense Breakdown</h4>
                                            <button className="icon-btn-minimal">
                                                {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>

                                        {showBreakdown && (
                                            <div className="expense-breakdown-container animate-fade-in">
                                                <div className="expense-summary-strip">
                                                    <div className="summary-box">
                                                        <span className="label">Total Claimed</span>
                                                        <span className="value">₹{selectedTask.details.expenses.reduce((s, e) => s + parseFloat(e.amount), 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="summary-box approved">
                                                        <span className="label">Approved (Net)</span>
                                                        <span className="value">₹{selectedTask.details.expenses.filter(e => e.status !== 'Rejected').reduce((s, e) => s + parseFloat(e.amount), 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="summary-box rejected">
                                                        <span className="label">Rejected</span>
                                                        <span className="value">₹{selectedTask.details.expenses.filter(e => e.status === 'Rejected').reduce((s, e) => s + parseFloat(e.amount), 0).toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                <div className="expense-breakdown-table-wrapper">
                                                    <table className="breakdown-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Date</th>
                                                                <th>Category</th>
                                                                <th>Activity & Details</th>
                                                                <th className="text-right">Amount</th>
                                                                <th className="text-center">Receipt</th>
                                                                <th>Audit Remarks</th>
                                                                <th className="text-center w-120">Review</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedTask.details.expenses.map((exp, index) => {
                                                                let displayDesc = exp.description;
                                                                let detailInfo = '';
                                                                try {
                                                                    if (exp.description && exp.description.startsWith('{')) {
                                                                        const parsed = JSON.parse(exp.description);
                                                                        displayDesc = parsed.natureOfVisit || parsed.remarks || parsed.reason || '';

                                                                        if (exp.category === 'Others' || exp.category === 'Travel') {
                                                                            if (parsed.origin && parsed.destination) detailInfo = `${parsed.origin} → ${parsed.destination}`;
                                                                            if (parsed.mode) detailInfo += ` (${parsed.mode})`;
                                                                        } else if (exp.category === 'Food') {
                                                                            if (parsed.mealType) detailInfo = `${parsed.mealType} ${parsed.persons ? `(${parsed.persons} Pax)` : ''}`;
                                                                        } else if (exp.category === 'Accommodation') {
                                                                            if (parsed.hotelName) detailInfo = parsed.hotelName;
                                                                        }
                                                                    }
                                                                } catch (e) { }

                                                                return (
                                                                    <tr key={index} className={exp.status === 'Rejected' ? 'row-rejected' : ''}>
                                                                        <td className="w-100">{exp.date}</td>
                                                                        <td className="w-120">
                                                                            <span className={`cat-pill ${exp.category?.toLowerCase() || 'others'}`}>{exp.category || 'Others'}</span>
                                                                        </td>
                                                                        <td>
                                                                            <div className="table-activity">
                                                                                <strong>{displayDesc}</strong>
                                                                                {detailInfo && <span className="detail-subtext">{detailInfo}</span>}
                                                                            </div>
                                                                        </td>
                                                                        <td className="text-right fw-800">₹{parseFloat(exp.amount).toLocaleString()}</td>
                                                                        <td className="text-center">
                                                                            {exp.receipt_image ? (
                                                                                <div className="receipt-preview-mini" onClick={() => {
                                                                                    setPreviewImage(exp.receipt_image);
                                                                                    setPreviewTitle(`Receipt: ${exp.category || 'Expense'}`);
                                                                                }}>
                                                                                    <img src={exp.receipt_image} alt="Receipt" />
                                                                                    <div className="preview-overlay"><ExternalLink size={10} /></div>
                                                                                </div>
                                                                            ) : <span className="no-receipt">-</span>}
                                                                        </td>
                                                                        <td className="w-200">
                                                                            {activeTab === 'pending' ? (
                                                                                <input
                                                                                    type="text"
                                                                                    className="audit-remark-input"
                                                                                    placeholder="Add justification..."
                                                                                    value={itemRemarks[exp.id] || ''}
                                                                                    onChange={(e) => setItemRemarks({ ...itemRemarks, [exp.id]: e.target.value })}
                                                                                />
                                                                            ) : (
                                                                                <div className="audit-remarks-static">
                                                                                    {exp.rm_remarks && <p><strong>RM:</strong> <em>{exp.rm_remarks}</em></p>}
                                                                                    {exp.hr_remarks && <p><strong>HR:</strong> <em>{exp.hr_remarks}</em></p>}
                                                                                    {exp.finance_remarks && <p><strong>Fin:</strong> <em>{exp.finance_remarks}</em></p>}
                                                                                    {!exp.rm_remarks && !exp.hr_remarks && !exp.finance_remarks && <span className="text-muted text-xs">No remarks</span>}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="text-center">
                                                                            {activeTab === 'pending' ? (
                                                                                <div className="row-actions">
                                                                                    <button
                                                                                        className={`row-action-btn approve ${exp.status === 'Approved' ? 'active' : ''}`}
                                                                                        onClick={() => handleItemAction(exp.id, 'Approved')}
                                                                                        title="Approve Item"
                                                                                    >
                                                                                        <CheckCircle size={14} />
                                                                                    </button>
                                                                                    <button
                                                                                        className={`row-action-btn reject ${exp.status === 'Rejected' ? 'active' : ''}`}
                                                                                        onClick={() => handleItemAction(exp.id, 'Rejected')}
                                                                                        title="Reject Item"
                                                                                    >
                                                                                        <XCircle size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <span className={`status-pill ${exp.status?.toLowerCase() || 'pending'}`}>
                                                                                    {exp.status || 'Pending'}
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}


                                {/* Odometer / Mileage Section */}
                                {selectedTask.details?.odometer && (
                                    <div className="detail-section">
                                        <h4>Mileage Log</h4>
                                        <div className="odometer-display">
                                            <div className="odo-reading">
                                                <span>Start Reading</span>
                                                <strong>{selectedTask.details.odometer.start_reading} KM</strong>
                                                {selectedTask.details.odometer.start_image && (
                                                    <img
                                                        src={selectedTask.details.odometer.start_image}
                                                        alt="Start Odometer"
                                                        className="odo-img"
                                                        onClick={() => {
                                                            setPreviewImage(selectedTask.details.odometer.start_image);
                                                            setPreviewTitle('Start Odometer Reading');
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <div className="odo-arrow">
                                                <ArrowRight size={24} />
                                                <span>{selectedTask.details.odometer.total_km} KM</span>
                                            </div>
                                            <div className="odo-reading">
                                                <span>End Reading</span>
                                                <strong>{selectedTask.details.odometer.end_reading} KM</strong>
                                                {selectedTask.details.odometer.end_image && (
                                                    <img
                                                        src={selectedTask.details.odometer.end_image}
                                                        alt="End Odometer"
                                                        className="odo-img"
                                                        onClick={() => {
                                                            setPreviewImage(selectedTask.details.odometer.end_image);
                                                            setPreviewTitle('End Odometer Reading');
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="detail-section">
                                    <h4>Policy Verification</h4>
                                    <div className="compliance-item ok">
                                        <CheckCircle size={16} />
                                        <span>Validated against corporate travel policy & grade limits.</span>
                                    </div>
                                </div>
                            </div>

                            {activeTab !== 'history' && (
                                <div className="detail-actions-container">
                                    {isFinanceExec && (selectedTask.status === 'PENDING_FINAL_RELEASE') && (
                                        <div className="payout-controller premium-card animate-slide-up mb-4 p-4 border rounded-xl bg-slate-50">
                                            <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
                                                <IndianRupee size={20} className="text-green-600" />
                                                Payment Release
                                            </h4>
                                            <div className="payout-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="payout-input flex flex-col gap-1">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase">Payment Mode</label>
                                                    <select
                                                        className="p-2 border rounded-lg bg-white"
                                                        value={paymentMode}
                                                        onChange={(e) => setPaymentMode(e.target.value)}
                                                    >
                                                        <option value="">Select Mode</option>
                                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                                        {parseFloat(execAmount) < 10000 && <option value="CASH">Cash Payment</option>}
                                                    </select>
                                                </div>

                                                {paymentMode === 'BANK_TRANSFER' && (
                                                    <div className="payout-input flex flex-col gap-1">
                                                        <label className="text-xs font-semibold text-slate-500 uppercase">Transaction ID / Reference</label>
                                                        <input
                                                            type="text"
                                                            className="p-2 border rounded-lg bg-white"
                                                            placeholder="TXN12345..."
                                                            value={transactionId}
                                                            onChange={(e) => setTransactionId(e.target.value)}
                                                        />
                                                    </div>
                                                )}

                                                {paymentMode === 'CASH' && (
                                                    <div className="payout-input flex flex-col gap-1">
                                                        <label className="text-xs font-semibold text-slate-500 uppercase">Signed Receipt</label>
                                                        <input
                                                            type="file"
                                                            className="text-xs"
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => setReceiptFile(reader.result);
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="payout-action mt-4">
                                                <button
                                                    className="action-btn pay w-full flex items-center justify-center gap-2 bg-green-600 text-white p-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
                                                    onClick={() => handleAction('Pay')}
                                                    disabled={!paymentMode || (paymentMode === 'BANK_TRANSFER' && !transactionId)}
                                                >
                                                    <CheckCircle size={18} /> <span>Release Payment (₹{execAmount})</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!(isFinanceExec && selectedTask.status === 'PENDING_FINAL_RELEASE') && (
                                        <div className="detail-actions">
                                            <button className="action-btn reject" onClick={() => handleAction('Reject')}>
                                                <XCircle size={18} /> <span>{isFinanceExec ? 'Return to HR' : 'Reject'}</span>
                                            </button>

                                            <button
                                                className="action-btn approve"
                                                onClick={() => handleAction('Approve')}
                                            >
                                                <CheckCircle size={18} />
                                                <span>
                                                    {isFinanceExec && (['PENDING_EXECUTIVE', 'HR Approved', 'REJECTED_BY_HEAD'].includes(selectedTask.status))
                                                        ? `Verify & Send to Head (₹${execAmount})`
                                                        : isFinanceHead ? `Authorize Payment (₹${execAmount})` : 'Approve'
                                                    }
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )
            }

            <ImageModal
                isOpen={!!previewImage}
                onClose={() => setPreviewImage(null)}
                imageUrl={previewImage}
                title={previewTitle}
            />

        </div >
    );
};

export default ApprovalInbox;
