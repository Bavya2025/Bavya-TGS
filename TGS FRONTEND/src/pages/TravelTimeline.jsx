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
import { encodeId, decodeId } from '../utils/idEncoder';
import api from '../api/api';
import { useToast } from '../context/ToastContext.jsx';

const TravelTimeline = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [trip, setTrip] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTravelDetails();
    }, [id]);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch (e) {
            return dateStr;
        }
    };

    const fetchTravelDetails = async () => {
        setIsLoading(true);
        try {
            const decodedId = decodeId(id);
            const response = await api.get(`/api/travels/${decodedId}/`);
            setTrip(response.data);
        } catch (error) {
            showToast("Failed to load travel details", "error");
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
        const recordedEvents = parseJsonField(trip.lifecycle_events);

        // 1. Initial Step
        const steps = [
            { title: 'Travel Requested', defaultDate: dates.includes(' - ') ? dates.split(' - ')[0] : 'N/A', required: true }
        ];

        // 2. Dynamic Approval Levels based on hierarchy_level
        const numLevels = parseInt(trip.hierarchy_level || 0);
        // Ensure at least 1 level is showing if it's already recorded
        const maxLevel = Math.max(numLevels, ...recordedEvents.filter(e => e.title.includes('Level')).map(e => parseInt(e.title.match(/Level (\d+)/)?.[1] || 0)));

        for (let i = 1; i <= maxLevel; i++) {
            steps.push({
                title: `Level ${i} Approval`,
                defaultDate: i === 1 ? 'Waiting...' : 'Upcoming',
                required: i <= numLevels,
                isApproval: true
            });
        }

        // 3. Post-Approval Steps
        steps.push(
            { title: 'Ticket Booking', defaultDate: 'Waiting...', required: true },
            { title: 'Travel Started', defaultDate: 'Waiting...', required: true },
            { title: 'Travel Ended', defaultDate: 'Waiting...', required: true },
            { title: 'Settlement', defaultDate: 'Waiting...', required: true }
        );

        const standardSteps = steps.filter(s => !s.hidden);

        let sequenceBroken = false;

        return standardSteps.map((step, index) => {
            const matchingEvent = recordedEvents.find(e => 
                e.title?.toLowerCase() === step.title?.toLowerCase() || 
                (step.title === 'Travel Requested' && (e.title === 'Request Sent' || e.title === 'Travel Requested'))
            );
            const isActuallyCompleted = (index === 0 && (trip.status !== 'Draft' && trip.status !== 'Cancelled')) || (matchingEvent && matchingEvent.status === 'completed' && !sequenceBroken);

            if (isActuallyCompleted) {
                return {
                    title: step.title,
                    status: 'completed',
                    date: matchingEvent?.date || formatDate(trip.created_at),
                    description: matchingEvent?.description || step.title,
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
                if (step.isApproval) actionDescription = `Awaiting Level ${step.title.split(' ')[1]} approval.`;
                if (step.title === 'Travel Started') actionDescription = 'Ready to start. Please record your travel movement.';
                if (step.title === 'Travel Ended') actionDescription = 'Movement in progress. Please complete to finish.';
                if (step.title === 'Settlement') actionDescription = 'Travel completed. Please submit expenses and settlement.';
                if (step.title === 'Ticket Booking') actionDescription = 'Waiting for booking confirmation.';

                return {
                    title: step.title,
                    status: 'current',
                    date: matchingEvent?.date || 'Waiting...',
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
        if (trip && trip.trip_id) {
            const encoded = encodeId(trip.trip_id);
            if (id === trip.trip_id && id !== encoded) {
                navigate(`/travel-timeline/${encoded}`, { replace: true });
            }
        }
    }, [trip, id, navigate]);

    if (isLoading) {
        return (
            <div className="timeline-page-loading">
                <div className="spinner"></div>
                <p>Loading Travel Timeline...</p>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="timeline-page-error">
                <h2>Travel Plan Not Found</h2>
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
                    <h1>Travel Plan Timeline</h1>
                    <p>{trip.purpose} • {trip.destination}</p>
                </div>
                <div className="header-stats">
                    <div className="h-stat">
                        <label>Status</label>
                        <span className={`status-pill ${trip.status?.toLowerCase()}`}>{trip.status}</span>
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
                        <h3>Travel Overview</h3>
                        <div className="summary-list">
                            <div className="s-item">
                                <MapPin size={18} />
                                <div>
                                    <label>Route</label>
                                    <p>{trip.source} → {trip.destination}</p>
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
                                    <p>{trip.reporting_manager_name || 'Assigned'}</p>
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

                    <div className="timeline-help-card">
                        <h4>Need Help?</h4>
                        <p>If you're stuck at any stage, please contact your tour coordinator or reporting manager.</p>
                    </div>
                </aside>

                <main className="timeline-content-main">
                    <div className="timeline-track-v2">
                        {lifecycleSteps.map((step, index) => (
                            <div key={index} className={`timeline-node ${step.status}`}>
                                <div className="node-line-container">
                                    <div className="node-icon-wrap">
                                        {step.icon}
                                    </div>
                                    {index !== lifecycleSteps.length - 1 && <div className="node-connector"></div>}
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
            </div>
        </div>
    );
};

export default TravelTimeline;
