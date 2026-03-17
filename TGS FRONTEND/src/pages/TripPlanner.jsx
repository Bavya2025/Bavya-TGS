import React, { useState } from 'react';
import {
    Compass,
    Users,
    MapPin,
    Hotel,
    Share2,
    Sparkles,
    ArrowRight,
    UserPlus,
    UserMinus
} from 'lucide-react';

const TripPlanner = () => {
    const [members, setMembers] = useState([
        { id: 1, name: 'Siva Kumar', role: 'Leader', status: 'Confirmed' },
        { id: 2, name: 'Anil Rao', role: 'Member', status: 'Joiner' },
    ]);

    return (
        <div className="planner-page">
            <div className="page-header">
                <h1>Trip Planner (FiMS)</h1>
                <p>Advanced route planning and group logistics for your team.</p>
            </div>

            <div className="planner-grid">
                <div className="planner-main">
                    {/* Group Management */}
                    <div className="planner-section premium-card">
                        <div className="section-header">
                            <div className="title-with-icon">
                                <Users size={20} />
                                <h3>Group Dynamics</h3>
                            </div>
                            <button className="btn-outline-small">Auto-Detect Groups</button>
                        </div>

                        <div className="member-list">
                            {members.map(m => (
                                <div key={m.id} className="member-row">
                                    <div className="member-avatar">{m.name.charAt(0)}</div>
                                    <div className="member-info">
                                        <p>{m.name}</p>
                                        <span>{m.role}</span>
                                    </div>
                                    <div className={`member-tag ${m.status.toLowerCase()}`}>
                                        {m.status}
                                    </div>
                                    <div className="member-actions">
                                        <button className="icon-btn-vsmall"><UserMinus size={14} /></button>
                                    </div>
                                </div>
                            ))}
                            <div className="add-joiner">
                                <button className="text-btn"><UserPlus size={16} /> Add Joiner / Dropper</button>
                            </div>
                        </div>
                    </div>

                    {/* Route & Preferences */}
                    <div className="planner-section premium-card">
                        <div className="section-header">
                            <div className="title-with-icon">
                                <Compass size={20} />
                                <h3>Route & Preferences</h3>
                            </div>
                        </div>

                        <div className="route-map-mock">
                            <div className="stop-item">
                                <MapPin size={16} color="var(--primary)" />
                                <div className="stop-details">
                                    <p>Origin: Hyderabad</p>
                                    <span>HQ - Office</span>
                                </div>
                            </div>
                            <div className="route-line"></div>
                            <div className="stop-item">
                                <MapPin size={16} color="var(--secondary)" />
                                <div className="stop-details">
                                    <p>Destination: Vizag</p>
                                    <span>Branch Visit</span>
                                </div>
                            </div>
                        </div>

                        <div className="input-field mt-4">
                            <label>Accommodation Preference</label>
                            <div className="preference-chips">
                                <button className="chip active">Single Occupancy</button>
                                <button className="chip">Twin Sharing</button>
                                <button className="chip">Guest House</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="planner-side">
                    {/* AI Pooling Suggestions */}
                    <div className="premium-card ai-suggestions">
                        <div className="suggestion-header">
                            <Sparkles size={20} color="#8b5cf6" />
                            <h3>Pooling Suggestions</h3>
                        </div>
                        <div className="suggestion-item">
                            <p>Team Marketing is also traveling to <strong>Vizag</strong> on the same dates.</p>
                            <div className="suggestion-action">
                                <span>Save 40% on Transport</span>
                                <button className="btn-primary-small">Pool Request</button>
                            </div>
                        </div>
                    </div>

                    <div className="premium-card logistics-summary">
                        <h3>Logistics Overview</h3>
                        <div className="log-stat">
                            <span>Total Distance</span>
                            <strong>620 km</strong>
                        </div>
                        <div className="log-stat">
                            <span>Travel Mode</span>
                            <strong>Pooled SUV</strong>
                        </div>
                        <div className="log-stat">
                            <span>Est. Carbon Footprint</span>
                            <strong>12kg CO2</strong>
                        </div>
                        <button className="btn-primary full-btn mt-4">Generate Itinerary</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripPlanner;
