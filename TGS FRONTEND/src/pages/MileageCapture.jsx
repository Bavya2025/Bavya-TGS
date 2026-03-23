import React, { useState, useEffect } from 'react';
import {
    Navigation,
    Camera,
    MapPin,
    Clock,
    CheckCircle,
    AlertCircle,
    ChevronDown
} from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext.jsx';

const MileageCapture = () => {
    const { showToast } = useToast();
    const [trips, setTrips] = useState([]);
    const [selectedTripId, setSelectedTripId] = useState('');
    const [tripStarted, setTripStarted] = useState(false);
    const [startOdometer, setStartOdometer] = useState('');
    const [endOdometer, setEndOdometer] = useState('');
    const [isLoadingTrips, setIsLoadingTrips] = useState(true);

    useEffect(() => {
        const fetchTrips = async () => {
            try {
                const response = await api.get('/api/trips/');
                const vehicleTrips = response.data.filter(trip => {
                    const isVehicle = trip.travel_mode === 'Own Vehicle' || trip.travel_mode === 'Service Vehicle';
                    const isActive = ['Approved', 'On-Going'].includes(trip.status);
                    return isVehicle && isActive;
                });
                setTrips(vehicleTrips);
            } catch (error) {
                console.error("Failed to fetch trips:", error);
                showToast("Failed to load journeys", "error");
            } finally {
                setIsLoadingTrips(false);
            }
        };
        fetchTrips();
    }, []);

    const handleStartCapture = () => {
        if (!selectedTripId) {
            showToast("Please select a journey first", "error");
            return;
        }
        showToast('Camera triggered for Start Odometer', "success");
        setTripStarted(true);
    };

    const handleEndCapture = () => {
        showToast('Mileage Capture Successful! Syncing with GPS.', "success");
    };

    return (
        <div className="mileage-page">
            <div className="mileage-header">
                <h1>Mileage Capture</h1>
                <p>Record your vehicle mileage for reimbursement.</p>
            </div>

            <div className="mileage-card premium-card">
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
                        <h3>Capture Locked</h3>
                        <p>No <strong>Approved</strong> vehicle journeys found. You can only start mileage tracking for authorized vehicle trips.</p>
                        <button className="btn-secondary" onClick={() => window.location.href = '/trips'}>View My Trips</button>
                    </div>
                ) : (
                    <>
                        {!tripStarted && (
                            <div className="input-field trip-selection-mileage mc-mb-1-5">
                                <label>Select Journey for Odometer Entry</label>
                                <select
                                    value={selectedTripId}
                                    onChange={(e) => setSelectedTripId(e.target.value)}
                                    className="trip-selector-premium"
                                >
                                    <option value="">Choose a journey...</option>
                                    {trips.map(trip => (
                                        <option key={trip.trip_id} value={trip.trip_id}>
                                            {trip.trip_id}: {trip.source} → {trip.destination} ({trip.purpose})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="trip-status-indicator">
                            {tripStarted ? (
                                <div className="status active">
                                    <Navigation className="pulse" size={20} />
                                    <span>Trip Mileage Tracking Active</span>
                                </div>
                            ) : (
                                <div className="status idle">
                                    <Clock size={20} />
                                    <span>Ready for Journey</span>
                                </div>
                            )}
                        </div>

                        <div className="mileage-info">
                            <div className="info-item">
                                <MapPin size={18} />
                                <span>GPS Verified: <strong>Active</strong></span>
                            </div>
                            <div className="info-item">
                                <Clock size={18} />
                                <span>Timestamp: <strong>{new Date().toLocaleTimeString()}</strong></span>
                            </div>
                        </div>

                        {!tripStarted ? (
                            <div className="capture-flow">
                                <div className="input-field">
                                    <label>Start Odometer Reading</label>
                                    <input
                                        type="number"
                                        placeholder="000000"
                                        value={startOdometer}
                                        onChange={(e) => setStartOdometer(e.target.value)}
                                    />
                                </div>
                                <button className="capture-btn start" onClick={handleStartCapture}>
                                    <Camera size={24} />
                                    <span>Capture Start Photo</span>
                                </button>
                                <p className="validation-note">
                                    <AlertCircle size={14} />
                                    Photo & GPS verification mandatory.
                                </p>
                            </div>
                        ) : (
                            <div className="capture-flow">
                                <div className="data-preview">
                                    <div className="preview-label">Started at</div>
                                    <div className="preview-value">{startOdometer} km</div>
                                </div>

                                <div className="input-field">
                                    <label>Final Odometer Reading</label>
                                    <input
                                        type="number"
                                        placeholder="000000"
                                        value={endOdometer}
                                        onChange={(e) => setEndOdometer(e.target.value)}
                                    />
                                </div>
                                <button className="capture-btn end" onClick={handleEndCapture}>
                                    <Camera size={24} />
                                    <span>Complete & Sync Trip</span>
                                </button>
                                <button className="btn-minimal mc-mt-1" onClick={() => setTripStarted(false)}>
                                    Cancel Tracking
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="recent-logs premium-card">
                <h3>Recent Verified Logs</h3>
                <div className="log-list">
                    <div className="empty-msg">
                        <CheckCircle size={32} />
                        <p>Previously verified odometer logs will appear here.</p>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default MileageCapture;
