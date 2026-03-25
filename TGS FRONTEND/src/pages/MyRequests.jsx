import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plane,
    Wallet,
    FileText,
    Clock,
    Calendar,
    IndianRupee,
    Filter,
    CheckCircle2,
    XCircle,
    ArrowRight
} from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext.jsx';
import { encodeId } from '../utils/idEncoder';
import './MyRequests.css';


const MyRequests = ({ enforceView = null }) => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [trips, setTrips] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [claims, setClaims] = useState([]);
    const [batches, setBatches] = useState([]);

    const [viewMode, setViewMode] = useState(enforceView || 'active'); // 'active' or 'historical'
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (enforceView) {
            setViewMode(enforceView);
        }
    }, [enforceView]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Trips, Travels, and Batches
            const [tripsRes, travelsRes, advancesRes, batchesRes] = await Promise.all([
                api.get('/api/trips/'),
                api.get('/api/travels/'),
                api.get('/api/advances/').catch(() => ({ data: [] })),
                api.get('/api/bulk-activities/').catch(() => ({ data: [] }))
            ]);

            const rawTrips = [...(tripsRes.data || []), ...(travelsRes.data || [])];
            const rawAdvances = advancesRes.data || [];
            const rawBatches = batchesRes.data || [];

            // Map Trips
            const mappedTrips = rawTrips.map(trip => ({
                id: trip.trip_id,
                title: trip.purpose || 'Travel Request',
                date: `${trip.start_date || 'N/A'} - ${trip.end_date || 'N/A'}`,
                amount: parseFloat((trip.cost_estimate || '0').replace(/[^0-9.]/g, '')),
                status: trip.status || 'Pending',
                type: 'trip',
                raw: trip
            }));

            // Map Advances
            const mappedAdvances = rawAdvances.map(adv => ({
                id: `ADV-${adv.id || adv.trip.substring(4)}`,
                title: `Advance for ${adv.trip || 'Trip'}`,
                date: new Date(adv.created_at || Date.now()).toLocaleDateString(),
                amount: parseFloat(adv.requested_amount || 0),
                status: adv.status || 'Pending',
                type: 'advance',
                tripRef: adv.trip
            }));

            // Map Batches
            const mappedBatches = rawBatches.map(batch => ({
                id: `BATCH-${batch.id}`,
                title: `Tour Plan: ${batch.file_name}`,
                date: new Date(batch.created_at || Date.now()).toLocaleDateString(),
                amount: (batch.data_json || []).length,
                status: batch.status || 'Draft',
                type: 'batch',
                label: 'Entries'
            }));

            // Synthesize Expense Claims from Trips 
            const claimsList = [];
            rawTrips.forEach(trip => {
                if (parseFloat(trip.total_expenses) > 0) {
                    claimsList.push({
                        id: `CLM-${trip.trip_id.substring(4)}`,
                        title: `Claim for ${trip.purpose}`,
                        date: new Date(trip.created_at || Date.now()).toLocaleDateString(),
                        amount: parseFloat(trip.total_expenses),
                        status: trip.status === 'Settled' ? 'Settled' : (['Pending Settlement', 'Finance Review'].includes(trip.status) ? 'Processing' : 'Submitted'),
                        type: 'claim',
                        tripRef: trip.trip_id
                    });
                }
            });

            setTrips(mappedTrips);
            setAdvances(mappedAdvances);
            setClaims(claimsList);
            setBatches(mappedBatches);

        } catch (error) {
            showToast("Failed to load request boards", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const isActiveStatus = (status) => {
        const s = status.toLowerCase();
        // Move Approved and Completed to history to keep Active queue clean
        return !['settled', 'rejected', 'cancelled', 'approved', 'completed', 'resolved', 'paid'].includes(s);
    };

    const filterData = (dataArray) => {
        return dataArray.filter(item =>
            viewMode === 'active' ? isActiveStatus(item.status) : !isActiveStatus(item.status)
        );
    };

    const displayTrips = filterData(trips);
    const displayAdvances = filterData(advances);
    const displayClaims = filterData(claims);
    const displayBatches = filterData(batches);

    const formatCurrency = (amount) => {
        const val = parseFloat(amount || 0);
        return '₹' + val.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const renderCard = (item, icon) => (
        <div key={item.id} className="req-card" onClick={() => {
            if (item.type === 'trip') navigate(`/trip-timeline/${encodeId(item.id)}`);
            else if (item.type === 'batch') navigate('/approvals'); // Direct to approvals for details
        }}>
            <div className="card-top-row">
                <span className="req-id">{item.id}</span>
                <span className={`req-status ${item.status.toLowerCase().replace(' ', '-')}`}>{item.status}</span>
            </div>

            <div className="req-main">
                <h4>{item.title}</h4>
                <div className="req-meta">
                    <div className="meta-row">
                        <Calendar size={14} />
                        <span>{item.date}</span>
                    </div>
                </div>
            </div>

            <div className="req-footer">
                <span className="req-date">Last Updated: Today</span>
                <span className="req-amount">
                    {item.type === 'batch' ? `${item.amount} ${item.label}` : formatCurrency(item.amount)}
                </span>
            </div>

            {(item.type === 'trip' || item.type === 'batch') && (
                <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity right-3 bottom-3 text-primary">
                    <ArrowRight size={16} />
                </div>
            )}
        </div>
    );

    return (
        <div className={`requests-page ${enforceView ? 'pt-0 border-none px-0' : ''}`}>
            {!enforceView && (
                <div className="req-header-top">
                    <div>
                        <h1>My Requests</h1>
                    </div>

                    <div className="req-filters">
                        <button
                            className={`filter-btn ${viewMode === 'active' ? 'active' : ''}`}
                            onClick={() => setViewMode('active')}
                        >
                            <Clock size={16} /> Active Queue
                        </button>
                        <button
                            className={`filter-btn ${viewMode === 'historical' ? 'active' : ''}`}
                            onClick={() => setViewMode('historical')}
                        >
                            <CheckCircle2 size={16} /> Historical / Expired
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="loading-state h-64 flex flex-col items-center justify-center">
                    <div className="spinner mb-4"></div>
                    <p className="text-muted">Syncing your requests...</p>
                </div>
            ) : (
                <div className="requests-kanban grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Trips Column */}
                    <div className="kanban-col">
                        <div className="col-header">
                            <div className="col-header-left">
                                <Plane size={18} className="text-primary" />
                                <h3>Journey Trips</h3>
                            </div>
                            <span className="req-count">{displayTrips.length}</span>
                        </div>
                        <div className="col-body">
                            {displayTrips.length === 0 ? (
                                <div className="empty-col">
                                    <FileText size={32} opacity={0.5} />
                                    <p>No {viewMode} trips.</p>
                                </div>
                            ) : (
                                displayTrips.map(trip => renderCard(trip, <Plane size={14} />))
                            )}
                        </div>
                    </div>

                    {/* Monthly Tour Plans (New Column) */}
                    <div className="kanban-col">
                        <div className="col-header">
                            <div className="col-header-left">
                                <FileText size={18} style={{ color: '#6366f1' }} />
                                <h3>Monthly Plans</h3>
                            </div>
                            <span className="req-count">{displayBatches.length}</span>
                        </div>
                        <div className="col-body">
                            {displayBatches.length === 0 ? (
                                <div className="empty-col">
                                    <FileText size={32} opacity={0.5} />
                                    <p>No {viewMode} monthly plans.</p>
                                </div>
                            ) : (
                                displayBatches.map(batch => renderCard(batch, <FileText size={14} />))
                            )}
                        </div>
                    </div>

                    {/* Advances Column */}
                    <div className="kanban-col">
                        <div className="col-header">
                            <div className="col-header-left">
                                <Wallet size={18} style={{ color: '#10b981' }} />
                                <h3>Advances</h3>
                            </div>
                            <span className="req-count">{displayAdvances.length}</span>
                        </div>
                        <div className="col-body">
                            {displayAdvances.length === 0 ? (
                                <div className="empty-col">
                                    <FileText size={32} opacity={0.5} />
                                    <p>No {viewMode} advances.</p>
                                </div>
                            ) : (
                                displayAdvances.map(adv => renderCard(adv, <Wallet size={14} />))
                            )}
                        </div>
                    </div>

                    {/* Claims Column */}
                    <div className="kanban-col">
                        <div className="col-header">
                            <div className="col-header-left">
                                <IndianRupee size={18} style={{ color: '#f59e0b' }} />
                                <h3>Expense Claims</h3>
                            </div>
                            <span className="req-count">{displayClaims.length}</span>
                        </div>
                        <div className="col-body">
                            {displayClaims.length === 0 ? (
                                <div className="empty-col">
                                    <FileText size={32} opacity={0.5} />
                                    <p>No {viewMode} claims.</p>
                                </div>
                            ) : (
                                displayClaims.map(claim => renderCard(claim, <IndianRupee size={14} />))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyRequests;
