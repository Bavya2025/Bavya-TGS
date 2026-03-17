import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, MapPin, Check, HardDrive, History, IndianRupee, AlertTriangle } from 'lucide-react';
import { encodeId } from '../../utils/idEncoder';
import api from '../../api/api';
import { useToast } from '../../context/ToastContext';

const OdometerModal = ({ isOpen, onClose, trip }) => {
    const { showToast } = useToast();
    const fileInputRef = useRef(null);
    const [odoData, setOdoData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    const [formData, setFormData] = useState({
        reading: '',
        image: '',
        latitude: null,
        longitude: null
    });

    useEffect(() => {
        if (isOpen && trip) {
            fetchOdometer();
        }
    }, [isOpen, trip]);

    const fetchOdometer = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/api/odometers/?trip_id=${encodeId(trip.id)}`);
            const data = response.data[0];
            if (data) {
                setOdoData(data);
            } else {
                setOdoData(null);
            }
        } catch (error) {
            console.error("Failed to fetch odometer:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCaptureTrigger = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            captureLocation();
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, image: reader.result }));
                showToast("Photo captured successfully", "success");
            };
            reader.readAsDataURL(file);
        }
    };

    const captureLocation = () => {
        if (!navigator.geolocation) {
            showToast("Geolocation not supported. Using HQ fallback.", "info");
            setFormData(prev => ({ ...prev, latitude: 17.3850, longitude: 78.4867 }));
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: parseFloat(position.coords.latitude.toFixed(10)),
                    longitude: parseFloat(position.coords.longitude.toFixed(10))
                }));
                setIsLocating(false);
                showToast("Location captured", "success");
            },
            (error) => {
                console.error("Location error:", error);
                setIsLocating(false);
                showToast("GPS blocked. Using HQ fallback coordinates.", "warning");
                setFormData(prev => ({ ...prev, latitude: 17.3850, longitude: 78.4867 }));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleSaveStart = async () => {
        if (!formData.reading || !formData.image) {
            showToast("Reading and photo are mandatory!", "error");
            return;
        }

        if (parseFloat(formData.reading) <= 0) {
            showToast("Odometer reading must be a positive value!", "error");
            return;
        }

        setIsSaving(true);
        try {
            const response = await api.post('/api/odometers/', {
                trip: trip.id,
                start_odo_reading: formData.reading,
                start_odo_image: formData.image,
                start_odo_lat: formData.latitude,
                start_odo_long: formData.longitude
            });
            setOdoData(response.data);
            setFormData({ reading: '', image: '', latitude: null, longitude: null });
            showToast("Trip started! Odometer recorded.", "success");
        } catch (error) {
            console.error("Failed to save odo:", error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : "Failed to save record";
            showToast(errorMsg, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEnd = async () => {
        if (!formData.reading || !formData.image) {
            showToast("Reading and photo are mandatory!", "error");
            return;
        }

        if (parseFloat(formData.reading) <= parseFloat(odoData.start_odo_reading)) {
            showToast("Ending reading must be greater than starting reading!", "error");
            return;
        }

        setIsSaving(true);
        try {
            const response = await api.patch(`/api/odometers/${odoData.id}/`, {
                end_odo_reading: formData.reading,
                end_odo_image: formData.image,
                end_odo_lat: formData.latitude,
                end_odo_long: formData.longitude
            });
            setOdoData(response.data);
            showToast("Journey completed! Final odometer recorded.", "success");
        } catch (error) {
            console.error("Failed to save odo:", error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : "Failed to save record";
            showToast(errorMsg, "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const hasStart = odoData && odoData.start_odo_reading;
    const hasEnd = odoData && odoData.end_odo_reading;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="odo-modal glass animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="modal-header-premium">
                    <div className="header-left-content">
                        <div className="trip-badge-id">{trip.id}</div>
                        <h2>Odometer Entry</h2>
                    </div>
                    <button className="modal-close-icon" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body-scroll-premium">
                    {/* Hidden Global File Input for Camera */}
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />

                    {isLoading ? (
                        <div className="loading-state-p"><div className="spinner"></div></div>
                    ) : !['approved', 'hr approved', 'on-going', 'completed'].includes(trip.status?.toLowerCase()) && !hasStart ? (
                        <div className="odo-locked-state">
                            <div className="lock-icon-wrapper">
                                <Clock size={48} className="animate-pulse" />
                            </div>
                            <h3>Journey Entry Locked</h3>
                            <p>You cannot record odometer readings until the trip request has been officially <strong>Approved</strong>.</p>
                            <div className="current-status-badge">Trip Status: {trip.status}</div>
                        </div>
                    ) : (
                        <div className="odo-content">
                            {/* Start Odometer Section */}
                            <div className={`odo-section ${hasStart ? 'readonly' : 'active'}`}>
                                <div className="odo-sec-header">
                                    <div className="odo-sec-num">01</div>
                                    <h3>Start Odometer</h3>
                                    {hasStart && <div className="odo-badge-fixed">RECORDED</div>}
                                </div>

                                {hasStart ? (
                                    <div className="odo-fixed-data">
                                        <div className="odo-data-row">
                                            <div className="odo-data-item">
                                                <label>Reading</label>
                                                <strong className="km-val">{odoData.start_odo_reading} KM</strong>
                                            </div>
                                            <div className="odo-data-item">
                                                <label>Timestamp</label>
                                                <strong>{new Date(odoData.updated_at).toLocaleString()}</strong>
                                            </div>
                                        </div>
                                        <div className="odo-fixed-preview">
                                            <img src={odoData.start_odo_image} alt="Start Odo" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="odo-form-mini">
                                        <div className="form-group-p">
                                            <label>Current Reading (KM)</label>
                                            <div className="input-with-icon-p">
                                                <HardDrive size={18} />
                                                <input
                                                    type="number"
                                                    placeholder="Enter Kilometers"
                                                    value={formData.reading}
                                                    onChange={(e) => setFormData({ ...formData, reading: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="odo-photo-capture" onClick={handleCaptureTrigger}>
                                            {formData.image ? (
                                                <div className="odo-preview-wrap">
                                                    <img src={formData.image} alt="Capture" />
                                                    <div className="odo-overlay-msg"><Camera size={16} /> Retake Photo</div>
                                                </div>
                                            ) : (
                                                <div className="odo-capture-placeholder">
                                                    <Camera size={32} />
                                                    <p>Capture Dashboard Photo</p>
                                                    <span>(Mandatory)</span>
                                                </div>
                                            )}
                                        </div>

                                        <button className="btn-primary-odo odo-full-width" onClick={handleSaveStart} disabled={isSaving || isLocating}>
                                            {isSaving ? 'Saving Record...' : 'Record Start Entry'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="odo-divider">
                                <History size={20} />
                            </div>

                            {/* End Odometer Section */}
                            <div className={`odo-section ${!hasStart ? 'disabled' : hasEnd ? 'readonly' : 'active'}`}>
                                <div className="odo-sec-header">
                                    <div className="odo-sec-num">02</div>
                                    <h3>End Odometer</h3>
                                    {!hasStart && <span className="odo-locked-msg">LOCKED</span>}
                                    {hasEnd && <div className="badge-fixed">RECORDED</div>}
                                </div>

                                {!hasStart && <p className="odo-help-text">Please record the journey start entry first.</p>}

                                {hasStart && hasEnd ? (
                                    <div className="odo-fixed-data">
                                        <div className="odo-data-row">
                                            <div className="odo-data-item">
                                                <label>Final Reading</label>
                                                <strong className="km-val">{odoData.end_odo_reading} KM</strong>
                                            </div>
                                            <div className="data-item">
                                                <label>Total Distance</label>
                                                <strong className="km-val">{parseFloat(odoData.end_odo_reading) - parseFloat(odoData.start_odo_reading)} KM</strong>
                                            </div>
                                        </div>
                                        <div className="odo-fixed-preview">
                                            <img src={odoData.end_odo_image} alt="End Odo" />
                                        </div>
                                    </div>
                                ) : hasStart && (
                                    <div className="odo-form-mini">
                                        <div className="form-group-p">
                                            <label>Ending Reading (KM)</label>
                                            <div className="input-with-icon-p">
                                                <HardDrive size={18} />
                                                <input
                                                    type="number"
                                                    placeholder="Enter Final Kilometers"
                                                    value={hasEnd ? odoData.end_odo_reading : formData.reading}
                                                    onChange={(e) => setFormData({ ...formData, reading: e.target.value })}
                                                    disabled={hasEnd}
                                                />
                                            </div>
                                        </div>

                                        {!hasEnd && (
                                            <>
                                                <div className="odo-photo-capture" onClick={handleCaptureTrigger}>
                                                    {formData.image ? (
                                                        <div className="odo-preview-wrap">
                                                            <img src={formData.image} alt="Capture" />
                                                            <div className="odo-overlay-msg"><Camera size={16} /> Retake Photo</div>
                                                        </div>
                                                    ) : (
                                                        <div className="odo-capture-placeholder">
                                                            <Camera size={32} />
                                                            <p>Capture Dashboard Photo</p>
                                                            <span>(Mandatory)</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <button className="btn-primary-odo odo-full-width" onClick={handleSaveEnd} disabled={isSaving || isLocating}>
                                                    {isSaving ? 'Finishing Trip...' : 'Record End Entry & Finish Trip'}
                                                </button>
                                            </>
                                        )}
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

export default OdometerModal;
