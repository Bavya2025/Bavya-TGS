import React, { useState } from 'react';
import {
    Shield,
    Settings,
    Map as MapIcon,
    IndianRupee,
    Tag,
    Globe,
    Plus,
    Edit2,
    Trash2,
    Search
} from 'lucide-react';

const AdminMasters = () => {
    const [activeTab, setActiveTab] = useState('Eligibility');

    const tabs = [
        { name: 'Eligibility', icon: <Shield size={18} /> },
        { name: 'Mileage Rates', icon: <IndianRupee size={18} /> },
        { name: 'Categories', icon: <Tag size={18} /> },
        { name: 'Geo-Fences', icon: <MapIcon size={18} /> },
        { name: 'Jurisdiction', icon: <Globe size={18} /> },
    ];

    const eligibilityData = [
        { grade: 'Grade A', category: 'Accommodation', limit: '₹5,000', cityType: 'Metro' },
        { grade: 'Grade A', category: 'Accommodation', limit: '₹3,500', cityType: 'Non-Metro' },
        { grade: 'Grade B', category: 'Accommodation', limit: '₹3,500', cityType: 'Metro' },
    ];

    return (
        <div className="admin-page">
            <div className="admin-header">
                <div>
                    <h1>Admin Masters</h1>
                    <p>Configure global rules, limits, and system parameters.</p>
                </div>
                <button className="btn-primary">
                    <Plus size={18} />
                    <span>Add New Entry</span>
                </button>
            </div>

            <div className="admin-container premium-card">
                <div className="admin-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.name}
                            className={`tab-btn ${activeTab === tab.name ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.name)}
                        >
                            {tab.icon}
                            <span>{tab.name}</span>
                        </button>
                    ))}
                </div>

                <div className="admin-content">
                    <div className="content-toolbar">
                        <div className="search-box">
                            <Search size={18} />
                            <input type="text" placeholder={`Search ${activeTab}...`} />
                        </div>
                        <div className="filters-mock">
                            <select><option>All Grades</option></select>
                        </div>
                    </div>

                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Grade / Rank</th>
                                <th>Category</th>
                                <th>City Type</th>
                                <th>Limit (₹)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {eligibilityData.map((item, idx) => (
                                <tr key={idx}>
                                    <td><strong>{item.grade}</strong></td>
                                    <td>{item.category}</td>
                                    <td><span className="badge-city">{item.cityType}</span></td>
                                    <td>{item.limit}</td>
                                    <td className="actions-cell">
                                        <button className="icon-btn-small"><Edit2 size={16} /></button>
                                        <button className="icon-btn-small delete"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminMasters;
