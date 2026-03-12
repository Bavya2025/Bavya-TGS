import React, { useState, useEffect } from 'react';
import {
    Shield,
    IndianRupee,
    Tag,
    Globe,
    Plus,
    Edit2,
    Trash2,
    Search,
    RefreshCw,
    X,
    Save
} from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

const AdminMasters = () => {
    const [activeTab, setActiveTab] = useState('Eligibility');
    const [rules, setRules] = useState([]);
    const [cadres, setCadres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCadre, setFilterCadre] = useState('');
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [isAmountFocused, setIsAmountFocused] = useState(false);
    const [currentRule, setCurrentRule] = useState({
        cadre: '',
        category: 'Accommodation',
        city_type: 'Metro',
        limit_amount: '',
        eligibility_class: ''
    });

    const { showToast } = useToast();

    // Constant options across categories
    const preferenceOptions = [
        "Economy", "Premium Economy", "Business Class", "First Class", // Flights
        "I A/c", "II A/c", "III A/c", "Sleeper", "Chair Car", // Trains
        "AC Bus", "Non-AC Bus", "Volvo", "Sleeper Bus", // Bus
        "Company Guest House", "Hotel", "Own Stay", // Accommodation
        "Company Car", "Cab", "Auto", "Two-Wheeler", "Public Transport" // Local
    ];

    const tabs = [
        { name: 'Eligibility', icon: <Shield size={18} /> },
        { name: 'Jurisdiction', icon: <Globe size={18} /> }
    ];

    const categories = [
        "Accommodation", "Daily Allowance", "Flight", 
        "Train", "Bus", "Local Conveyance", "Mileage Rate"
    ];
    
    const cityTypes = [
        "Metro", "Non-Metro", "State HQ", "Districts", "Others", "All", "N/A"
    ];

    useEffect(() => {
        if (activeTab === 'Eligibility') {
            fetchCadres();
            fetchRules();
        }
    }, [activeTab]);

    const fetchCadres = async () => {
        try {
            const response = await api.get('/api/masters/cadres/');
            setCadres(response.data || []);
        } catch (error) {
            console.error("Failed to fetch cadres", error);
        }
    };

    const fetchRules = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/masters/eligibility-rules/');
            setRules(response.data || []);
        } catch (error) {
            console.error("Failed to fetch rules", error);
            showToast("Failed to load eligibility rules", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSyncCadres = async () => {
        setSyncing(true);
        try {
            const response = await api.post('/api/masters/cadres/sync/');
            const result = response.data;
            showToast(`Synced ${result.created} new cadres out of ${result.total} total roles.`, "success");
            fetchCadres(); // Reload the dropdown options
        } catch (error) {
            console.error("Failed to sync cadres", error);
            showToast("Failed to sync cadres from HR system", "error");
        } finally {
            setSyncing(false);
        }
    };

    const openModal = (rule = null) => {
        if (rule) {
            setCurrentRule({
                id: rule.id,
                cadre: rule.cadre,
                category: rule.category,
                city_type: rule.city_type || 'N/A',
                limit_amount: rule.limit_amount || '',
                eligibility_class: rule.eligibility_class || ''
            });
            setEditMode(true);
        } else {
            setCurrentRule({
                cadre: cadres.length > 0 ? cadres[0].id : '',
                category: 'Accommodation',
                city_type: 'N/A',
                limit_amount: '',
                eligibility_class: ''
            });
            setEditMode(false);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentRule({});
    };

    const handleSaveRule = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!currentRule.cadre || !currentRule.category) {
            showToast("Cadre and Category are required", "warning");
            return;
        }

        try {
            const endpoint = editMode ? `/api/masters/eligibility-rules/${currentRule.id}/` : '/api/masters/eligibility-rules/';
            
            const payload = {
                ...currentRule,
                limit_amount: currentRule.limit_amount || 0
            };

            if (editMode) {
                await api.put(endpoint, payload);
            } else {
                await api.post(endpoint, payload);
            }
            
            showToast(`Rule successfully ${editMode ? 'updated' : 'added'}!`, "success");
            closeModal();
            fetchRules();
        } catch (error) {
            console.error("Failed to save rule", error);
            const errMsg = error.response?.data?.non_field_errors?.[0] || error.response?.data?.detail || "Failed to save rule. It may overlap with an existing rule.";
            showToast(errMsg, "error");
        }
    };

    const handleDeleteRule = async (id) => {
        if (!window.confirm("Are you sure you want to delete this eligibility rule?")) return;
        
        try {
            await api.delete(`/api/masters/eligibility-rules/${id}/`);
            showToast("Rule deleted successfully", "success");
            fetchRules();
        } catch (error) {
            console.error("Failed to delete rule", error);
            showToast("Failed to delete rule", "error");
        }
    };

    const filteredRules = rules.filter(r => {
        const matchSearch = r.cadre_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            r.category?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCadre = filterCadre ? r.cadre === parseInt(filterCadre) : true;
        return matchSearch && matchCadre;
    });

    return (
        <div className="admin-page">
            <div className="admin-header">
                <div>
                    <h1>Admin Masters</h1>
                    <p>Configure global travel policy rules, limits, and system parameters.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {activeTab === 'Eligibility' && (
                        <button 
                            className="btn-secondary" 
                            onClick={handleSyncCadres}
                            disabled={syncing}
                            style={{ 
                                whiteSpace: 'nowrap', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '8px 16px',
                                minWidth: 'min-content',
                                flexShrink: 0,
                                fontSize: '0.9rem',
                                color: 'white'
                            }}
                        >
                            <RefreshCw size={18} className={syncing ? 'spin' : ''} />
                            <span>{syncing ? 'Syncing...' : 'Sync Cadres'}</span>
                        </button>
                    )}
                    <button className="btn-primary" onClick={() => openModal()}>
                        <Plus size={18} />
                        <span>Add New Entry</span>
                    </button>
                </div>
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
                    {activeTab === 'Eligibility' ? (
                        <>
                            <div className="content-toolbar">
                                <div className="search-box">
                                    <Search size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Search rules..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="filters-mock">
                                    <select 
                                        value={filterCadre}
                                        onChange={(e) => setFilterCadre(e.target.value)}
                                    >
                                        <option value="">All Cadres / Levels</option>
                                        {cadres.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {loading ? (
                                <div className="loading-spinner">Loading rules...</div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Cadre / Level</th>
                                            <th>Category</th>
                                            <th>City Type</th>
                                            <th>Limit (₹)</th>
                                            <th>Class / Preferred</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRules.length === 0 ? (
                                            <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>No eligibility rules found. Configure them or Sync Cadres first.</td></tr>
                                        ) : (
                                            filteredRules.map((item) => (
                                                <tr key={item.id}>
                                                    <td><strong>{item.cadre_name}</strong></td>
                                                    <td>{item.category}</td>
                                                    <td>
                                                        {item.city_type && item.city_type !== 'N/A' && (
                                                            <span className="badge-city">{item.city_type}</span>
                                                        )}
                                                    </td>
                                                    <td>{item.limit_amount > 0 ? `₹${Number(item.limit_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                                                    <td style={{ fontSize: '0.85rem', color: '#666' }}>{item.eligibility_class || '-'}</td>
                                                    <td className="actions-cell">
                                                        <button className="icon-btn-small" onClick={() => openModal(item)}><Edit2 size={16} /></button>
                                                        <button className="icon-btn-small delete" onClick={() => handleDeleteRule(item.id)}><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </>
                    ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                            Settings for {activeTab} will be available here.
                        </div>
                    )}
                </div>
            </div>

            {/* Add / Edit Rule Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h2>{editMode ? 'Edit Eligibility Rule' : 'Add New Eligibility Rule'}</h2>
                            <button onClick={closeModal} className="icon-btn-small"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveRule} className="modal-body form-grid" style={{ overflowY: 'auto', padding: '1.5rem' }}>
                            
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Cadre / Position Level <span className="required">*</span></label>
                                <select 
                                    value={currentRule.cadre}
                                    onChange={(e) => setCurrentRule({...currentRule, cadre: e.target.value})}
                                    required
                                >
                                    <option value="" disabled>Select Cadre</option>
                                    {cadres.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                {cadres.length === 0 && (
                                    <small style={{ color: 'var(--primary-color)' }}>
                                        No cadres found. Please click "Sync Cadres" first to fetch them.
                                    </small>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Expense Category <span className="required">*</span></label>
                                <select 
                                    value={currentRule.category}
                                    onChange={(e) => setCurrentRule({...currentRule, category: e.target.value})}
                                    required
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>City Type</label>
                                <select 
                                    value={currentRule.city_type}
                                    onChange={(e) => setCurrentRule({...currentRule, city_type: e.target.value})}
                                >
                                    {cityTypes.map(ct => (
                                        <option key={ct} value={ct}>{ct}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Max Limit Amount (₹)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. 2,500.00" 
                                    value={
                                        isAmountFocused 
                                            ? currentRule.limit_amount // Show raw value when typing
                                            : (currentRule.limit_amount 
                                                ? Number(currentRule.limit_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                : '') // Show empty string if 0 or empty when blurred
                                    }
                                    onFocus={() => setIsAmountFocused(true)}
                                    onBlur={(e) => {
                                        setIsAmountFocused(false);
                                        if (currentRule.limit_amount && !isNaN(currentRule.limit_amount)) {
                                            // Ensure raw value is numeric string with max 2 decimals
                                            setCurrentRule({...currentRule, limit_amount: Number(currentRule.limit_amount).toFixed(2).replace(/\.00$/, '')});
                                        }
                                    }}
                                    onChange={(e) => {
                                        // Allow only digits and up to one decimal point
                                        const rawValue = e.target.value.replace(/[^0-9.]/g, ''); 
                                        const parts = rawValue.split('.');
                                        
                                        // Prevent multiple decimal points
                                        if (parts.length > 2) return;
                                        
                                        // Limit decimals to 2 places
                                        if (parts[1] && parts[1].length > 2) return;

                                        setCurrentRule({...currentRule, limit_amount: rawValue});
                                    }}
                                />
                                <small>Leave 0 or empty for 'Actuals' or 'Not Applicable'.</small>
                            </div>

                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Eligibility Class / Preference</label>
                                <div style={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap', 
                                    gap: '12px', 
                                    padding: '12px',
                                    border: '1.5px solid var(--border)',
                                    borderRadius: '8px',
                                    backgroundColor: '#fafafa',
                                    maxHeight: '150px',
                                    overflowY: 'auto'
                                }}>
                                    {preferenceOptions.map(option => {
                                        const isSelected = (currentRule.eligibility_class || '').split(', ').includes(option);
                                        return (
                                            <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        let currentArr = currentRule.eligibility_class ? currentRule.eligibility_class.split(', ') : [];
                                                        if (e.target.checked) {
                                                            currentArr.push(option);
                                                        } else {
                                                            currentArr = currentArr.filter(item => item !== option);
                                                        }
                                                        setCurrentRule({...currentRule, eligibility_class: currentArr.join(', ')});
                                                    }}
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                                {option}
                                            </label>
                                        );
                                    })}
                                </div>
                                <small>Select all applicable travel classes or stay preferences.</small>
                            </div>

                            <div className="form-actions" style={{ 
                                gridColumn: '1 / -1', 
                                marginTop: '2rem', 
                                display: 'flex', 
                                justifyContent: 'flex-end', 
                                gap: '1rem',
                                borderTop: '1px solid #eee',
                                paddingTop: '1.5rem'
                            }}>
                                <button 
                                    type="button" 
                                    className="btn-secondary" 
                                    onClick={closeModal}
                                    style={{ 
                                        backgroundColor: '#f1f5f9', 
                                        color: '#334155',
                                        border: '1.5px solid #e2e8f0'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" style={{ minWidth: '140px' }}>
                                    <Save size={18} />
                                    <span>{editMode ? 'Update Rule' : 'Save Rule'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMasters;
