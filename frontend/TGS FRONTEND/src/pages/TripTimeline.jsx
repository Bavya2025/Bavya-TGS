import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    CheckCircle2,
    Clock,
    MapPin,
    Calendar,
    Briefcase,
    Plane,
    TrendingUp,
    ShieldCheck,
    Gauge
} from 'lucide-react';
import { encodeId } from '../utils/idEncoder';
import api from '../api/api';
import { useToast } from '../context/ToastContext.jsx';

const TripTimeline = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [trip, setTrip] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTripDetails();
    }, [id]);

    const fetchTripDetails = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/api/trips/${id}/`);
            setTrip(response.data);
        } catch (error) {
            console.error("Failed to fetch trip details:", error);
            showToast("Failed to load trip details", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const parseJsonField = (field) => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === 'string') {
            try {
                return JSON.parse(field);
            } catch (e) {
                return [];
            }
        }
        return [];
    };

    const lifecycleSteps = (() => {
        if (!trip) return [];

        const dates = `${trip.start_date} - ${trip.end_date}` || 'N/A';
        const standardSteps = [
            { title: 'Trip Requested', defaultDate: dates.includes(' - ') ? dates.split(' - ')[0] : 'N/A', required: true },
            { title: 'Level 1 Approval', defaultDate: 'Waiting...', required: true },
            { title: 'Level 2 Approval', defaultDate: 'Optional', required: false, hidden: trip.hierarchy_level < 2 && trip.status !== 'Forwarded' && !recordedEvents.some(e => e.title === 'Level 2 Approval') },
            { title: 'Level 3 Approval', defaultDate: 'Optional', required: false, hidden: trip.hierarchy_level < 3 && trip.status !== 'Forwarded' && !recordedEvents.some(e => e.title === 'Level 3 Approval') },
            { title: 'Ticket Booking', defaultDate: 'Waiting...', required: true },
            { title: 'Journey Started', defaultDate: 'Waiting...', required: true },
            { title: 'Journey Ended', defaultDate: 'Waiting...', required: true },
            { title: 'Settlement', defaultDate: 'Waiting...', required: true }
        ].filter(s => !s.hidden);

        const recordedEvents = parseJsonField(trip.lifecycle_events);
        let sequenceBroken = false;

        return standardSteps.map(step => {
            const matchingEvent = recordedEvents.find(e => e.title === step.title);
            const isActuallyCompleted = matchingEvent && matchingEvent.status === 'completed' && !sequenceBroken;

            if (isActuallyCompleted) {
                return {
                    title: step.title,
                    status: 'completed',
                    date: matchingEvent.date,
                    description: matchingEvent.description || step.title,
                    icon: <CheckCircle2 size={24} />
                };
            }

            if (matchingEvent && matchingEvent.status === 'in-progress' && !sequenceBroken) {
                sequenceBroken = true;
                return {
                    title: step.title,
                    status: 'in-progress',
                    date: matchingEvent.date,
                    description: matchingEvent.description || step.title,
                    icon: <Clock size={24} />
                };
            }

            if (!sequenceBroken && step.required) {
                sequenceBroken = true;
                let actionDescription = 'Pending action.';
                if (step.title === 'Journey Started') actionDescription = 'Ready to start. Please record start odometer.';
                if (step.title === 'Journey Ended') actionDescription = 'Journey in progress. Please record end odometer to finish.';
                if (step.title === 'Settlement') actionDescription = 'Trip completed. Please submit expenses and settlement.';
                if (step.title === 'Ticket Booking') actionDescription = 'Waiting for ticket details.';
                if (step.title === 'Level 1 Approval') actionDescription = 'Awaiting manager approval.';
                if (step.title === 'Level 2 Approval') actionDescription = 'Awaiting Senior Manager (L2) approval.';
                if (step.title === 'Level 3 Approval') actionDescription = 'Awaiting Director (L3) approval.';

                return {
                    title: step.title,
                    status: 'current',
                    date: 'Action Required',
                    description: actionDescription,
                    icon: <Clock size={24} />
                };
            }

            if (sequenceBroken) {
                return {
                    title: step.title,
                    status: 'pending',
                    date: 'Waiting...',
                    description: 'Awaiting completion of previous steps.',
                    icon: <Clock size={24} />
                };
            }

            return {
                title: step.title,
                status: 'pending',
                date: 'Optional',
                description: 'Optional step.',
                icon: <Clock size={24} />
            };
        });
    })();

    useEffect(() => {
        if (trip && trip.trip_id === id) {
            const encoded = encodeId(trip.trip_id);
            if (id === trip.trip_id && id !== encoded) {
                navigate(`/trip-timeline/${encoded}`, { replace: true });
            }
        }
    }, [trip, id, navigate]);

    if (isLoading) {
        return (
            <div className="timeline-page-loading">
                <div className="spinner"></div>
                <p>Loading Trip Timeline...</p>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="timeline-page-error">
                <h2>Trip Not Found</h2>
                <button onClick={() => navigate('/trips')}>Back to My Trips</button>
            </div>
        );
    }

    return (
        <div className="timeline-page-container animate-fade-in">
            <header className="timeline-header">
                <button className="back-btn" onClick={() => navigate('/trips')}>
                    <ChevronLeft size={24} />
                    <span>Back to Trips</span>
                </button>
                <div className="header-main">
                    <div className="trip-id-badge">{trip.trip_id}</div>
                    <h1>Journey Timeline</h1>
                    <p>{trip.purpose} • {trip.destination}</p>
                </div>
                <div className="header-stats">
                    <div className="h-stat">
                        <label>Status</label>
                        <span className={`status-pill ${trip.status.toLowerCase()}`}>{trip.status}</span>
                    </div>
                    <div className="h-stat">
                        <label>Travel Dates</label>
                        <div className="date-display-styled">
                            <span className="date-start">{trip.start_date}</span>
                            <span className="date-separator">to</span>
                            <span className="date-end">{trip.end_date}</span>
                        </div>

                    </div>
                </div>
            </header>

            <div className="timeline-layout">
                <aside className="timeline-sidebar">
                    <div className="trip-card-summary premium-card">
                        <h3>Trip Overview</h3>
                        <div className="summary-list">
                            <div className="s-item">
                                <MapPin size={18} />
                                <div>
                                    <label>Route</label>
                                    <p>{trip.source} → {trip.destination}</p>
                                </div>
                            </div>
                            <div className="s-item">
                                <Briefcase size={18} />
                                <div>
                                    <label>Travel Mode</label>
                                    <p>{trip.travel_mode}</p>
                                </div>
                            </div>
                            <div className="s-item">
                                <TrendingUp size={18} />
                                <div>
                                    <label>Estimated Cost</label>
                                    <p>{trip.cost_estimate}</p>
                                </div>
                            </div>
                            <div className="s-item">
                                <ShieldCheck size={18} />
                                <div>
                                    <label>Reporting Manager</label>
                                    <p>{trip.reporting_manager?.name || 'Assigned'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {trip.vehicle_type === 'Own' && trip.odometer && (
                        <div className="telemetry-card premium-card">
                            <div className="t-header">
                                <Gauge size={20} />
                                <h3>Odometer Telemetry</h3>
                            </div>
                            <div className="t-grid">
                                <div className="t-box">
                                    <label>Start Reading</label>
                                    <strong>{trip.odometer.start_odo_reading} KM</strong>
                                </div>
                                <div className="t-box">
                                    <label>End Reading</label>
                                    <strong>{trip.odometer.end_odo_reading || 'In Progress'}</strong>
                                </div>
                                {trip.odometer.end_odo_reading && (
                                    <div className="t-box full">
                                        <label>Total Distance Traveled</label>
                                        <p>{parseFloat(trip.odometer.end_odo_reading) - parseFloat(trip.odometer.start_odo_reading)} KM</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </aside>

                <main className="timeline-content-main">
                    <div className="timeline-track-v2">
                        {lifecycleSteps.map((step, index) => (
                            <div key={index} className={`timeline-node ${step.status}`}>
                                <div className="node-line-container">
                                    <div className="node-icon-wrap">
                                        {step.icon}
                                    </div>
                                </div>
                                <div className="node-body">
                                    <div className="node-header">
                                        <h4>{step.title}</h4>
                                        <div className="node-tags">
                                            <span className="node-date">{step.date}</span>
                                            <span className={`node-status-tag ${step.status}`}>
                                                {step.status === 'current' ? 'Action Required' : step.status}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="node-description">{step.description}</p>

                                    {step.status === 'current' && (
                                        <div className="active-action-box">
                                            <div className="action-info">
                                                <Plane size={20} />
                                                <span>This is your current stage. Please complete the necessary steps to proceed.</span>
                                            </div>
                                            <button className="btn-action-primary" onClick={() => navigate('/trips')}>
                                                Go to Actions
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div >


        </div >
    );
};

export default TripTimeline;
