import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';
import {
    AlertCircle,
    MessageSquare,
    CheckCircle2,
    Clock,
    Plus,
    ArrowRight
} from 'lucide-react';

const Disputes = () => {
    const { showToast } = useToast();
    const [disputes, setDisputes] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [trips, setTrips] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loadingExpenses, setLoadingExpenses] = useState(false);
    const [formData, setFormData] = useState({
        trip: '',
        expense: '',
        category: 'Mileage',
        reason: ''
    });

    useEffect(() => {
        fetchDisputes();
        fetchTrips();
    }, []);

    useEffect(() => {
        if (formData.trip) {
            fetchExpenses(formData.trip);
        } else {
            setExpenses([]);
        }
    }, [formData.trip]);

    const fetchDisputes = async () => {
        try {
            const response = await api.get('/api/disputes/');
            setDisputes(response.data);
        } catch (error) {
            console.error("Error fetching disputes:", error);
        }
    };

    const fetchTrips = async () => {
        try {
            const response = await api.get('/api/trips/');
            setTrips(response.data);
        } catch (error) {
            console.error("Error fetching trips:", error);
        }
    };

const fetchExpenses = async (tripId) => {
        setLoadingExpenses(true);
        try {
            
            let encodedId = btoa(tripId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            const response = await api.get(`/api/expenses/?trip_id=${encodedId}`);
            setExpenses(response.data);
        } catch (error) {
            console.error("Error fetching expenses:", error);
        } finally {
            setLoadingExpenses(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                expense: formData.category === 'Expense' ? formData.expense : null
            };
            await api.post('/api/disputes/', payload);
            setShowModal(false);
            fetchDisputes();
            setFormData({ trip: '', expense: '', category: 'Mileage', reason: '' });
        } catch (error) {
            console.error("Error raising dispute:", error);
            showToast("Failed to raise dispute. Please try again.", "error");
        }
    };

    return (
        <div className="disputes-page">
            <div className="page-header">
                <h1>Disputes Module</h1>
                <p>Raise and track concerns regarding your travel claims and settlements.</p>
            </div>

            <div className="disputes-grid">
                <div className="disputes-list premium-card">
                    <div className="list-header">
                        <h3>Your Open Disputes</h3>
                        <button className="btn-primary-small" onClick={() => setShowModal(true)}>
                            <Plus size={16} />
                            <span>Raise New Dispute</span>
                        </button>
                    </div>

                    <div className="dispute-items">
                        {disputes.length === 0 ? (
                            <div className="no-data">
                                <AlertCircle size={48} className="d-empty-icon" />
                                <p>No disputes found.</p>
                                <span className="d-empty-text">
                                    You haven't raised any disputes yet. If you have an issue with a trip or expense, click "Raise New Dispute".
                                </span>
                            </div>
                        ) : (
                            disputes.map(d => (
                                <div key={d.id} className="dispute-row">
                                    <div className="d-icon">
                                        <AlertCircle size={20} />
                                    </div>
                                    <div className="d-main">
                                        <p>{d.reason}</p>
                                        <span>
                                            <span className="d-trip-info-text">{d.trip_id_display}</span> • {d.category} 
                                            {d.expense_category && ` • ${d.expense_category}`} • {new Date(d.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className={`d-status ${d.status.toLowerCase().replace(' ', '-')}`}>
                                        {d.status === 'In Review' ? <Clock size={12} /> : 
                                         d.status === 'Resolved' ? <CheckCircle2 size={12} /> : 
                                         <AlertCircle size={12} />}
                                        {d.status}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="dispute-workflow premium-card">
                    <h3>Dispute Resolution Process</h3>
                    <p className="d-workflow-desc">
                        Here is how we handle your concerns from submission to resolution.
                    </p>
                    <div className="workflow-steps">
                        <div className="step active">
                            <div className="step-num">1</div>
                            <div className="step-txt">
                                <p>Raise Dispute</p>
                                <span>Submit reason and evidence for your claim rejection or policy violation.</span>
                            </div>
                            <div className="step-line"></div>
                        </div>
                        <div className="step">
                            <div className="step-num">2</div>
                            <div className="step-txt">
                                <p>Finance Review</p>
                                <span>Finance team reviews your justification against company policy.</span>
                            </div>
                            <div className="step-line"></div>
                        </div>
                        <div className="step">
                            <div className="step-num">3</div>
                            <div className="step-txt">
                                <p>Resolution</p>
                                <span>Final decision is made and any necessary adjustments are processed.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Raise New Dispute</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="dispute-form">
                            <div className="form-group">
                                <label>Select Trip</label>
                                <select name="trip" value={formData.trip} onChange={handleInputChange} required>
                                    <option value="">-- Select Trip --</option>
                                    {trips.map(t => (
                                        <option key={t.trip_id} value={t.trip_id}>{t.trip_id} - {t.destination}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Category</label>
                                <select name="category" value={formData.category} onChange={handleInputChange} required>
                                    <option value="Mileage">Mileage / GPS Variance</option>
                                    <option value="Expense">Expense Rejection</option>
                                    <option value="Policy">Policy Violation</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {formData.category === 'Expense' && (
                                <div className="form-group">
                                    <label>Select Expense</label>
                                    <select 
                                        name="expense" 
                                        value={formData.expense} 
                                        onChange={handleInputChange} 
                                        required
                                        disabled={!formData.trip || loadingExpenses}
                                    >
                                        <option value="">-- Select Expense --</option>
                                        {expenses.map(e => (
                                            <option key={e.id} value={e.id}>
                                                {e.category} - ₹{e.amount} ({new Date(e.date).toLocaleDateString()})
                                            </option>
                                        ))}
                                    </select>
                                    {loadingExpenses && <span className="helper-text">Loading expenses...</span>}
                                </div>
                            )}

                            <div className="form-group">
                                <label>Reason / Description</label>
                                <textarea 
                                    name="reason" 
                                    value={formData.reason} 
                                    onChange={handleInputChange} 
                                    required 
                                    rows="4"
                                    placeholder="Describe the issue in detail..."
                                ></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Submit Dispute</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Disputes;
