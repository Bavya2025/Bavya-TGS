import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IndianRupee,
    CheckCircle,
    XCircle,
    HelpCircle,
    PauseCircle,
    AlertCircle,
    Eye,
    ArrowLeft
} from 'lucide-react';

const ClaimReview = () => {
    const navigate = useNavigate();
    const [claims, setClaims] = useState([
        { id: 1, employee: 'Siva Kumar', category: 'Accommodation', claimed: 4500, eligible: 4000, variance: '12.5%' },
        { id: 2, employee: 'Siva Kumar', category: 'Transport', claimed: 1200, eligible: 1500, variance: '-20%' },
        { id: 3, employee: 'Amit Rao', category: 'DA', claimed: 800, eligible: 800, variance: '0%' },
    ]);

    const handleAction = (id, action) => {
        showToast(`Claim ${id}: ${action}`, "info");
    };

    return (
        <div className="review-page">
            <div className="page-header">
                <div>
                    <button className="back-btn-minimal" onClick={() => navigate('/finance')}>
                        <ArrowLeft size={16} />
                        <span>Back to FIMS Dashboard</span>
                    </button>
                    <h1>Claim Review (Finance)</h1>
                </div>
                <p>Audit and settle pending expense claims against corporate policies.</p>
            </div>

            <div className="review-container premium-card">
                <div className="table-wrapper">
                    <table className="review-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Category</th>
                                <th>Claimed (₹)</th>
                                <th>Eligible (₹)</th>
                                <th>Variance</th>
                                <th>Bills</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {claims.map(claim => (
                                <tr key={claim.id} className={parseFloat(claim.variance) > 0 ? 'warning-row' : ''}>
                                    <td><strong>{claim.employee}</strong></td>
                                    <td>{claim.category}</td>
                                    <td className="amount">₹{claim.claimed.toLocaleString()}</td>
                                    <td className="amount">₹{claim.eligible.toLocaleString()}</td>
                                    <td>
                                        <span className={`variance-badge ${parseFloat(claim.variance) > 0 ? 'high' : 'ok'}`}>
                                            {claim.variance}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="icon-btn-small" title="View Bill">
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                    <td className="actions-cell">
                                        <button className="action-tag approve" title="Accept" onClick={() => handleAction(claim.id, 'Approve')}>
                                            <CheckCircle size={14} />
                                        </button>
                                        <button className="action-tag suspend" title="Suspend" onClick={() => handleAction(claim.id, 'Suspend')}>
                                            <PauseCircle size={14} />
                                        </button>
                                        <button className="action-tag clarify" title="Clarify" onClick={() => handleAction(claim.id, 'Clarify')}>
                                            <HelpCircle size={14} />
                                        </button>
                                        <button className="action-tag reject" title="Reject" onClick={() => handleAction(claim.id, 'Reject')}>
                                            <XCircle size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="review-summary-row">
                <div className="premium-card summary-item">
                    <span>Total Pending Claims</span>
                    <h4>₹24,50,000</h4>
                </div>
                <div className="premium-card summary-item">
                    <span>High Variance Claims</span>
                    <h4 className="text-danger">12</h4>
                </div>
                <div className="summary-actions">
                    <button className="btn-primary">Batch Settle All Approved</button>
                </div>
            </div>
        </div>
    );
};

export default ClaimReview;
