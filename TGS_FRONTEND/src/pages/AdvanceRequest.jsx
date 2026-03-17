import React, { useState, useEffect } from 'react';
import {
    Wallet,
    Info,
    AlertCircle,
    ShieldAlert,
    ArrowRight,
    Clock,
    CheckCircle
} from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext.jsx';

const AdvanceRequest = () => {
    const { showToast } = useToast();
    const [trips, setTrips] = useState([]);
    const [selectedTripId, setSelectedTripId] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [advances, setAdvances] = useState([]);
    const [isLoadingTrips, setIsLoadingTrips] = useState(true);
    const [isLoadingAdvances, setIsLoadingAdvances] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const capacity = 45000;

    useEffect(() => {
        fetchTrips();
        fetchAdvances();
    }, []);

    const fetchTrips = async () => {
        try {
            const response = await api.get('/api/trips/');
            const filtered = response.data.filter(trip =>
                ['Approved', 'On-Going'].includes(trip.status)
            );
            setTrips(filtered);
        } catch (error) {
            console.error("Failed to fetch trips:", error);
            showToast("Failed to load active trips", "error");
        } finally {
            setIsLoadingTrips(false);
        }
    };

    const fetchAdvances = async () => {
        try {
            const response = await api.get('/api/advances/');
            setAdvances(response.data);
        } catch (error) {
            console.error("Failed to fetch advances:", error);
            showToast("Failed to load past advances", "error");
        } finally {
            setIsLoadingAdvances(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedTripId) {
            showToast("Please select a trip first", "error");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                trip: selectedTripId,
                requested_amount: parseFloat(amount),
                purpose: reason,
                status: 'Submitted'
            };

            const response = await api.post('/api/advances/', payload);

            if (parseFloat(amount) > capacity) {
                showToast(`Request submitted. Note: Exceeds capacity, routing to CFO.`, "warning");
            } else {
                showToast(`Advance request submitted successfully.`, "success");
            }

            setAdvances([response.data, ...advances]);
            setAmount('');
            setReason('');
            setSelectedTripId('');
        } catch (error) {
            console.error("Failed to submit advance request:", error);
            showToast("Failed to submit request", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="advance-page">
            <div className="page-header">
                <h1>Advance Request</h1>
                <p>Apply for a cash advance for your upcoming business travel.</p>
            </div>

            <div className="advance-grid">
                <div className="advance-form-container premium-card">
                    {isLoadingTrips ? (
                        <div className="loading-state-p">
                            <div className="spinner"></div>
                            <p>Loading journey details...</p>
                        </div>
                    ) : trips.length === 0 ? (
                        <div className="locked-state-premium">
                            <div className="lock-icon-wrapper">
                                <Clock size={48} className="animate-pulse" />
                            </div>
                            <h3>Request Locked</h3>
                            <p>No <strong>Approved</strong> journeys found. Advances can only be requested for journeys with manager clearance.</p>
                            <button className="btn-secondary" onClick={() => window.location.href = '/trips'}>View My Trips</button>
                        </div>
                    ) : (
                        <>
                            <h3>Request New Advance</h3>
                            <form onSubmit={handleSubmit} className="advance-form">
                                <div className="input-field">
                                    <label>Select Trip</label>
                                    <select
                                        value={selectedTripId}
                                        onChange={(e) => setSelectedTripId(e.target.value)}
                                        required
                                        className="trip-selector-premium"
                                    >
                                        <option value="">Choose a trip...</option>
                                        {trips.map(trip => (
                                            <option key={trip.trip_id} value={trip.trip_id}>{trip.trip_id}: {trip.purpose} ({trip.source} → {trip.destination})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="input-field">
                                    <label>Requested Amount (₹)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="input-field">
                                    <label>Reason / Remittance Details</label>
                                    <textarea
                                        placeholder="e.g. For local transport and food"
                                        rows={4}
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        required
                                    ></textarea>
                                </div>

                                {amount && parseFloat(amount) > capacity && (
                                    <div className="cfo-routing-alert">
                                        <ShieldAlert size={20} />
                                        <div>
                                            <p><strong>CFO Approval Required</strong></p>
                                            <span>Request exceeds your capacity of ₹{capacity.toLocaleString()}.</span>
                                        </div>
                                    </div>
                                )}

                                <button type="submit" className="btn-primary full-btn" disabled={isSaving}>
                                    {isSaving ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <div className="advance-details-side">
                    <div className="premium-card exposure-card">
                        <h3>Recovery Capacity</h3>
                        <div className="capacity-items">
                            <div className="cap-item">
                                <span>F&F Payable</span>
                                <strong>₹25,000</strong>
                            </div>
                            <div className="cap-item">
                                <span>Asset Value</span>
                                <strong>₹30,000</strong>
                            </div>
                            <div className="cap-divider"></div>
                            <div className="cap-item total">
                                <span>Total Capacity</span>
                                <strong>₹{capacity.toLocaleString()}</strong>
                            </div>
                        </div>
                        <div className="capacity-note">
                            <Info size={14} />
                            <p>Advance limits are calculated based on your final settlement capacity.</p>
                        </div>
                    </div>

                    <div className="premium-card status-card">
                        <h3>Recent Advances</h3>
                        <div className="advance-log scrollbar-hide">
                            {isLoadingAdvances ? (
                                <div className="loading-state-vsmall">
                                    <div className="spinner"></div>
                                </div>
                            ) : advances.length > 0 ? (
                                advances.map(adv => (
                                    <div key={adv.id} className="log-entry">
                                        <div className="log-main">
                                            <div className="log-id-badge">{adv.trip}</div>
                                            <p>₹{parseFloat(adv.requested_amount).toLocaleString()}</p>
                                            <span>{new Date(adv.created_at || Date.now()).toLocaleDateString()}</span>
                                        </div>
                                        <div className={`log-status ${adv.status.toLowerCase()}`}>{adv.status}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-msg">
                                    <Clock size={24} />
                                    <p>No recent advance requests.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AdvanceRequest;
