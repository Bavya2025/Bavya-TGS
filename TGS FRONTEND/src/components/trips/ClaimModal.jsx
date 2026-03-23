import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, FileText, Send, Loader2, IndianRupee, PieChart } from 'lucide-react';
import { encodeId } from '../../utils/idEncoder';
import api from '../../api/api';
import { useToast } from '../../context/ToastContext';

const ClaimModal = ({ isOpen, onClose, trip }) => {
    const { showToast } = useToast();
    const [claimData, setClaimData] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [remarks, setRemarks] = useState('');

    useEffect(() => {
        if (isOpen && trip) {
            fetchClaimAndExpenses();
        }
    }, [isOpen, trip]);

    const fetchClaimAndExpenses = async () => {
        setIsLoading(true);
        try {
            const claimResponse = await api.get(`/api/claims/?trip_id=${encodeId(trip.id)}`);
            const existingClaim = claimResponse.data[0];
            setClaimData(existingClaim);
            if (existingClaim) {
                setRemarks(existingClaim.remarks || '');
            }

            const expenseResponse = await api.get(`/api/expenses/?trip_id=${encodeId(trip.id)}`);
            setExpenses(expenseResponse.data);

        } catch (error) {
            console.error("Failed to fetch claim data:", error);
            showToast("Failed to load claim data", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    const handleSubmitClaim = async () => {
        if (expenses.length === 0) {
            showToast("No expenses to claim! Please add expenses first.", "warning");
            return;
        }

        setIsSubmitting(true);
        try {
            if (claimData) {
                const response = await api.patch(`/api/claims/${claimData.id}/`, {
                    status: 'Submitted',
                    submitted_at: new Date().toISOString(),
                    total_amount: totalAmount,
                    remarks: remarks
                });
                setClaimData(response.data);
            } else {
                const response = await api.post('/api/claims/', {
                    trip: trip.id,
                    status: 'Submitted',
                    submitted_at: new Date().toISOString(),
                    total_amount: totalAmount,
                    remarks: remarks
                });
                setClaimData(response.data);
            }
            showToast("Claim submitted successfully for approval!", "success");
        } catch (error) {
            console.error("Failed to submit claim:", error);
            showToast("Submission failed. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const renderStatus = () => {
        const status = claimData ? claimData.status : 'Draft';
        switch (status) {
            case 'Submitted': return <div className="claim-status-badge submitted"><Clock size={16} /> Submitted</div>;
            case 'Approved': return <div className="claim-status-badge approved"><CheckCircle2 size={16} /> Approved</div>;
            case 'Rejected': return <div className="claim-status-badge rejected"><AlertCircle size={16} /> Rejected</div>;
            case 'Paid': return <div className="claim-status-badge paid"><IndianRupee size={16} /> Paid</div>;
            default: return <div className="claim-status-badge draft">Draft</div>;
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="claim-modal glass animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="modal-header-premium">
                    <div className="header-left-content">
                        <div className="trip-badge-id">{trip.id}</div>
                        <h2>Reimbursement Claim</h2>
                    </div>
                    <button className="modal-close-icon" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body-scroll-premium">
                    {trip.status !== 'Approved' && trip.status !== 'On-Going' && trip.status !== 'Completed' ? (
                        <div className="claim-locked-state">
                            <div className="lock-icon-wrapper">
                                <Clock size={48} className="animate-pulse" />
                            </div>
                            <h3>Settlement Locked</h3>
                            <p>Reimbursement claims can only be filed once the trip has been <strong>Approved</strong>. Please wait for authorization.</p>
                            <div className="trip-status-context">Current Status: <span className="status-badge pending">{trip.status}</span></div>
                        </div>
                    ) : isLoading ? (
                        <div className="claim-loading-state-full">
                            <Loader2 className="animate-spin" size={40} />
                            <p>Analyzing settlement records...</p>
                        </div>
                    ) : (
                        <div className="claim-details-layout">
                            <div className="claim-summary-card">
                                <div className="summary-header">
                                    <PieChart size={24} />
                                    <span>Settlement Summary</span>
                                    {renderStatus()}
                                </div>

                                <div className="summary-amount-box">
                                    <label>Total Claimable Amount</label>
                                    <div className="main-amount">₹{totalAmount.toLocaleString()}</div>
                                    <div className="expense-count">{expenses.length} Expense Line items detected</div>
                                </div>

                                <div className="summary-details">
                                    <div className="s-detail">
                                        <span>Trip Destination</span>
                                        <strong>{trip.destination}</strong>
                                    </div>
                                    <div className="s-detail">
                                        <span>Trip Date</span>
                                        <strong>{trip.dates || `${trip.start_date} - ${trip.end_date}`}</strong>
                                    </div>
                                    {claimData && claimData.submitted_at && (
                                        <div className="s-detail">
                                            <span>Submitted On</span>
                                            <strong>{new Date(claimData.submitted_at).toLocaleDateString()}</strong>
                                        </div>
                                    )}
                                </div>

                                <div className="expense-breakdown-mini">
                                    <div className="breakdown-title">Line Item Breakdown</div>
                                    <div className="breakdown-scroll">
                                        {expenses.map(exp => (
                                            <div key={exp.id} className="mini-exp-item">
                                                <span className="mini-cat">{exp.category}</span>
                                                <span className="mini-amount">₹{parseFloat(exp.amount).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="claim-action-area">
                                <div className="input-group-premium">
                                    <label><FileText size={16} /> Settlement Remarks</label>
                                    <textarea
                                        placeholder="Add any clarification or notes for the finance department..."
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        disabled={claimData && claimData.status !== 'Draft' && claimData.status !== 'Rejected'}
                                    ></textarea>
                                </div>

                                {(!claimData || claimData.status === 'Draft' || claimData.status === 'Rejected') ? (
                                    <button
                                        className="submit-claim-btn"
                                        onClick={handleSubmitClaim}
                                        disabled={isSubmitting || expenses.length === 0}
                                    >
                                        {isSubmitting ? (
                                            <>Submitting Request...</>
                                        ) : (
                                            <>
                                                <Send size={20} />
                                                Submit Claim for Review
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className="info-lock-card">
                                        <CheckCircle2 size={24} color="var(--success)" />
                                        <div>
                                            <h4>Claim is under review</h4>
                                            <p>This claim has been submitted to your reporting authority. Further updates will be reflected here.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default ClaimModal;
