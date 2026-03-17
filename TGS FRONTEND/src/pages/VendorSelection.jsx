import React, { useState } from 'react';
import {
    Building,
    Star,
    MapPin,
    ShieldCheck,
    AlertCircle,
    ArrowRight,
    TrendingDown
} from 'lucide-react';

const VendorSelection = () => {
    const [selectedVendor, setSelectedVendor] = useState(null);

    const vendors = [
        { id: 1, name: 'Uber for Business', type: 'Transport', rate: '₹12/km', rating: 4.8, approved: true, discount: '15%' },
        { id: 2, name: 'MakeMyTrip Corporate', type: 'Travel Agent', rate: 'Market', rating: 4.5, approved: true, discount: 'Corporate Rates' },
        { id: 3, name: 'Local Taxi Hub', type: 'Transport', rate: '₹18/km', rating: 3.9, approved: false, discount: 'None' },
    ];

    return (
        <div className="vendor-page">
            <div className="page-header">
                <h1>Vendor Selection</h1>
                <p>Choose from approved corporate vendors for best rates and easy settlement.</p>
            </div>

            <div className="vendor-grid">
                <div className="vendor-list">
                    <div className="list-filters">
                        <button className="filter-pill active">All Vendors</button>
                        <button className="filter-pill">Transport</button>
                        <button className="filter-pill">Accommodation</button>
                    </div>

                    <div className="vendor-cards">
                        {vendors.map(v => (
                            <div
                                key={v.id}
                                className={`vendor-card premium-card ${selectedVendor?.id === v.id ? 'active' : ''}`}
                                onClick={() => setSelectedVendor(v)}
                            >
                                <div className="v-header">
                                    <div className="v-title">
                                        <h3>{v.name}</h3>
                                        <div className="v-tags">
                                            {v.approved && <span className="approved-badge"><ShieldCheck size={12} /> Approved</span>}
                                            <span className="type-tag">{v.type}</span>
                                        </div>
                                    </div>
                                    <div className="v-rating"><Star size={14} fill="currentColor" /> {v.rating}</div>
                                </div>

                                <div className="v-body">
                                    <div className="v-rate">
                                        <span>Base Rate:</span>
                                        <strong>{v.rate}</strong>
                                    </div>
                                    {v.discount !== 'None' && (
                                        <div className="v-discount">
                                            <TrendingDown size={14} />
                                            <span>{v.discount} Corporate Savings</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="vendor-action-side">
                    {selectedVendor ? (
                        <div className="selection-preview premium-card">
                            <h3>Vendor Details</h3>
                            <p className="selected-v-name">{selectedVendor.name}</p>

                            {!selectedVendor.approved && (
                                <div className="exception-notice">
                                    <AlertCircle size={20} />
                                    <div>
                                        <p><strong>Policy Violation</strong></p>
                                        <span>This vendor is not on the approved list. Using this requires a "Vendor Exception Request" approved by Finance.</span>
                                    </div>
                                </div>
                            )}

                            <div className="details-list">
                                <div className="detail-item">
                                    <span>Support Line</span>
                                    <strong>1800-TGS-VEND</strong>
                                </div>
                                <div className="detail-item">
                                    <span>Direct Billing</span>
                                    <strong>{selectedVendor.approved ? 'Available' : 'Not Available'}</strong>
                                </div>
                            </div>

                            {selectedVendor.approved ? (
                                <button className="btn-primary full-btn">Link to Trip</button>
                            ) : (
                                <button className="btn-warning full-btn">Request Exception</button>
                            )}
                        </div>
                    ) : (
                        <div className="empty-prompt premium-card">
                            <Building size={48} color="var(--text-light)" />
                            <p>Select a vendor to view detailed terms and link to your trip.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VendorSelection;
