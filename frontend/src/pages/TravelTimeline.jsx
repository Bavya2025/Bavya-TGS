import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    CheckCircle2,
    Clock,
    MapPin,
    Briefcase,
    Plane,
    TrendingUp,
    ShieldCheck,
    FileText,
    CreditCard,
    Gauge
} from 'lucide-react';
import { decodeId, encodeId } from '../utils/idEncoder';
import api from '../api/api';
import { useToast } from '../context/ToastContext.jsx';
import './TravelTimeline.css';

const TravelTimeline = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [trip, setTrip] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchTripDetails();
        }
    }, [id]);

    const fetchTripDetails = async () => {
        setIsLoading(true);
        try {
            const decodedId = decodeId(id);
            const response = await api.get(`/api/travels/${decodedId}/`);
            setTrip(response.data);
        } catch (error) {
            console.error("Failed to fetch travel details:", error);
            showToast("Failed to load travel details", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const parseJsonField = (field) => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === 'string') {
            try { return JSON.parse(field); } catch (e) { return []; }
        }
        return [];
    };

    const lifecycleSteps = (() => {
        if (!trip) return [];
        const recordedEvents = parseJsonField(trip.lifecycle_events) || [];
        const builtSteps = [];
        let extractedForwardTo = '';

        recordedEvents.forEach((event, index) => {
            let stepIcon = <CheckCircle2 size={20} />;
            const titleLower = (event.title || '').toLowerCase();

            if (titleLower.includes('request')) stepIcon = <FileText size={20} />;
            else if (titleLower.includes('hr')) stepIcon = <ShieldCheck size={20} />;
            else if (titleLower.includes('finance')) stepIcon = <CreditCard size={20} />;

            const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Completed';
            let title = event.title || 'Action Approved';

            if (index === 0) {
                title = 'Request Sent';
            } else {
                const desc = `${event.description || ''} ${event.title || ''}`.trim();
                if (desc.toLowerCase().includes('forwarded to')) {
                    const parts = desc.split(/forwarded to/i);
                    if (parts.length > 1) {
                        let leftPart = parts[0].replace(/bulk|travel|log|and|level|approval/gi, '');
                        title = leftPart.replace(/[^a-zA-Z\s]/g, '').trim();
                        extractedForwardTo = parts[1].replace(/level|approval/gi, '').replace(/[^a-zA-Z\s]/g, '').trim();
                    }
                } else if (desc.toLowerCase().includes('approved by')) {
                    title = desc.replace(/approved by/gi, '').trim();
                } else if (desc.toLowerCase().includes('initiated by')) {
                    title = 'Request Sent';
                } else if (desc.toLowerCase().includes('bulk activity') || desc.toLowerCase().includes('trip story')) {
                    title = 'Management Approved';
                }
            }

            builtSteps.push({
                title: title,
                status: 'completed',
                date: eventDate,
                description: '',
                icon: stepIcon
            });
        });

        const isClosed = ['Approved', 'Settled', 'Rejected'].includes(trip.status);
        if (!isClosed) {
            const approverName = extractedForwardTo || trip.current_approver_name || 'Approving Manager';
            builtSteps.push({
                title: approverName,
                status: 'current',
                date: 'Action Required',
                description: 'Currently sitting with this manager.',
                icon: <Clock size={20} />
            });
            builtSteps.push({
                title: 'Approved by Everyone',
                status: 'pending',
                date: 'Endpoint',
                description: 'Awaiting intermediate signatures.',
                icon: <CheckCircle2 size={20} />
            });
        } else if (trip.status === 'Approved') {
            const lastStep = builtSteps[builtSteps.length - 1];
            if (lastStep && lastStep.title.toLowerCase() !== 'approved by everyone') {
                builtSteps.push({
                    title: 'Approved by Everyone',
                    status: 'completed',
                    date: 'Success',
                    description: 'Trip request approved successfully.',
                    icon: <CheckCircle2 size={20} className="text-green-600" />
                });
            }
        }
        return builtSteps;
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
                <h2>Travel Not Found</h2>
                <button onClick={() => navigate('/trips')}>Back to Trips</button>
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
                    <h1>Travel Timeline</h1>
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

            <div className="timeline-layout" style={{ gridTemplateColumns: (trip.vehicle_type === 'Own' && trip.odometer) ? '350px 1fr' : '1fr' }}>
                {(trip.vehicle_type === 'Own' && trip.odometer) && (
                    <aside className="timeline-sidebar">
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
                    </aside>
                )}

                <main className="timeline-content-main">
                    <div className="timeline-zigzag-wrapper">
                        <div className="timeline-zigzag-container">
                            <div className="zigzag-line-main"></div>
                            {lifecycleSteps.map((step, index) => {
                                const isEven = index % 2 === 0;
                                const nodeColors = ['#f59e0b', '#ef4444', '#ec4899', '#84cc16', '#3b82f6', '#14b8a6', '#8b5cf6'];
                                const themeColor = nodeColors[index % nodeColors.length];
                                
                                return (
                                    <div key={index} className={`zigzag-node ${step.status}`}>
                                        <div className="zigzag-column">
                                            {isEven ? (
                                                <>
                                                    <div className="zigzag-section top-section align-bottom">
                                                        <div className="node-text">
                                                            <h4>{step.title}</h4>
                                                            <p>{step.description}</p>
                                                        </div>
                                                        <div className="node-date-box" style={{ backgroundColor: themeColor }}>{step.date}</div>
                                                        <div className="node-icon-circle" style={{ backgroundColor: themeColor }}>{step.icon}</div>
                                                    </div>
                                                    <div className="zigzag-center">
                                                        <div className="zigzag-connector-line top-line" style={{ backgroundColor: themeColor }}></div>
                                                        <div className="zigzag-dot" style={{ backgroundColor: step.status === 'completed' ? themeColor : 'white', borderColor: themeColor }}></div>
                                                    </div>
                                                    <div className="zigzag-section bottom-section align-top">
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="zigzag-section top-section align-bottom">
                                                    </div>
                                                    <div className="zigzag-center">
                                                        <div className="zigzag-dot" style={{ backgroundColor: step.status === 'completed' ? themeColor : 'white', borderColor: themeColor }}></div>
                                                        <div className="zigzag-connector-line bottom-line" style={{ backgroundColor: themeColor }}></div>
                                                    </div>
                                                    <div className="zigzag-section bottom-section align-top">
                                                        <div className="node-icon-circle" style={{ backgroundColor: themeColor }}>{step.icon}</div>
                                                        <div className="node-date-box" style={{ backgroundColor: themeColor }}>{step.date}</div>
                                                        <div className="node-text">
                                                            <h4>{step.title}</h4>
                                                            <p>{step.description}</p>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {lifecycleSteps.some(step => step.status === 'current') && (
                        <div className="active-action-box" style={{ margin: '0 2rem' }}>
                            <div className="action-info">
                                <Plane size={20} />
                                <span>This is your current stage. Please complete the necessary steps to proceed.</span>
                            </div>
                            <button className="btn-action-primary" onClick={() => navigate('/trips')}>
                                Go to Actions
                            </button>
                        </div>
                    )}
                </main>
            </div >

        </div >
    );
};

export default TravelTimeline;
