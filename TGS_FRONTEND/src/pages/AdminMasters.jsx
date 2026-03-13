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
    const [jurisdictions, setJurisdictions] = useState([]);
    const [projects, setProjects] = useState([]);
    const [states, setStates] = useState([]);
    const [circles, setCircles] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCadre, setFilterCadre] = useState('');
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isJurisdictionModalOpen, setIsJurisdictionModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [isAmountFocused, setIsAmountFocused] = useState(false);
    
    const [currentRule, setCurrentRule] = useState({
        cadre: '',
        category: 'Accommodation',
        city_type: 'Metro',
        limit_amount: '',
        eligibility_class: ''
    });

    const [currentJurisdiction, setCurrentJurisdiction] = useState({
        project_name: '',
        project_code: '',
        state: '',
        circle_name: '',
        circle: '', // Existing circle ID if applicable
        districts: [] // Array of location IDs
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
        } else if (activeTab === 'Jurisdiction') {
            fetchJurisdictions();
            fetchProjects();
            fetchStates();
        }
    }, [activeTab]);

    const fetchJurisdictions = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/masters/jurisdictions/');
            setJurisdictions(response.data || []);
        } catch (error) {
            console.error("Failed to fetch jurisdictions", error);
            showToast("Failed to load jurisdictions", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const response = await api.get('/api/masters/jurisdictions/projects/');
            setProjects(response.data || []);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        }
    };

    const fetchStates = async () => {
        try {
            const response = await api.get('/api/masters/locations/?type=State');
            setStates(response.data || []);
        } catch (error) {
            console.error("Failed to fetch states", error);
        }
    };

    const fetchCircles = async (stateId) => {
        if (!stateId) return;
        try {
            const response = await api.get(`/api/masters/circles/?state=${stateId}`);
            setCircles(response.data || []);
        } catch (error) {
            console.error("Failed to fetch circles", error);
        }
    };

    const fetchDistricts = async (stateExtId) => {
        if (!stateExtId) return;
        try {
            const response = await api.get(`/api/masters/locations/?type=District&parent=${stateExtId}`);
            setDistricts(response.data || []);
        } catch (error) {
            console.error("Failed to fetch districts", error);
        }
    };

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

    const openModal = (item = null) => {
        if (activeTab === 'Eligibility') {
            if (item) {
                setCurrentRule({
                    id: item.id,
                    cadre: item.cadre,
                    category: item.category,
                    city_type: item.city_type || 'N/A',
                    limit_amount: item.limit_amount || '',
                    eligibility_class: item.eligibility_class || ''
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
        } else {
            // Jurisdiction Modal
            if (item) {
                setCurrentJurisdiction({
                    id: item.id,
                    project_name: item.project_name,
                    project_code: item.project_code,
                    state: item.state_id,
                    circle_name: item.circle_name,
                    circle: item.circle,
                    districts: item.districts || []
                });
                if (item.state_id) {
                    fetchCircles(item.state_id);
                    fetchDistricts(item.state_external_id);
                }
                setEditMode(true);
            } else {
                setCurrentJurisdiction({
                    project_name: '',
                    project_code: '',
                    state: '',
                    circle_name: '',
                    circle: '',
                    districts: []
                });
                setEditMode(false);
            }
            setIsJurisdictionModalOpen(true);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsJurisdictionModalOpen(false);
        setCurrentRule({
            cadre: '',
            category: 'Accommodation',
            city_type: 'N/A',
            limit_amount: '',
            eligibility_class: ''
        });
        setCurrentJurisdiction({
            project_name: '',
            project_code: '',
            state: '',
            circle_name: '',
            circle: '',
            districts: []
        });
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

    const handleSaveJurisdiction = async (e) => {
        e.preventDefault();
        
        if (!currentJurisdiction.project_code || !currentJurisdiction.circle_name || currentJurisdiction.districts.length === 0) {
            showToast("Project, Circle Name, and Districts are required", "warning");
            return;
        }

        try {
            // 1. Ensure circle exists or create it
            let circleId = currentJurisdiction.circle;
            if (!circleId) {
                const circleResp = await api.post('/api/masters/circles/', {
                    name: currentJurisdiction.circle_name,
                    state: currentJurisdiction.state
                });
                circleId = circleResp.data.id;
            }

            const payload = {
                project_name: currentJurisdiction.project_name,
                project_code: currentJurisdiction.project_code,
                circle: circleId,
                districts: currentJurisdiction.districts
            };

            if (editMode) {
                await api.put(`/api/masters/jurisdictions/${currentJurisdiction.id}/`, payload);
            } else {
                await api.post('/api/masters/jurisdictions/', payload);
            }

            showToast(`Jurisdiction successfully ${editMode ? 'updated' : 'added'}!`, "success");
            closeModal();
            fetchJurisdictions();
        } catch (error) {
            console.error("Failed to save jurisdiction", error);
            showToast("Failed to save jurisdiction. Check for duplicates.", "error");
        }
    };

    const handleDeleteJurisdiction = async (id) => {
        if (!window.confirm("Are you sure you want to delete this jurisdiction?")) return;
        try {
            await api.delete(`/api/masters/jurisdictions/${id}/`);
            showToast("Jurisdiction deleted successfully", "success");
            fetchJurisdictions();
        } catch (error) {
            console.error("Failed to delete jurisdiction", error);
            showToast("Failed to delete jurisdiction", "error");
        }
    };

    const filteredJurisdictions = jurisdictions.filter(j => {
        return j.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
               j.project_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               j.circle_name?.toLowerCase().includes(searchQuery.toLowerCase());
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
                        <>
                            <div className="content-toolbar">
                                <div className="search-box">
                                    <Search size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Search jurisdictions..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {loading ? (
                                <div className="loading-spinner">Loading jurisdictions...</div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Project</th>
                                            <th>Circle (Zone)</th>
                                            <th>State</th>
                                            <th>Linked Districts</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredJurisdictions.length === 0 ? (
                                            <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>No jurisdictions found.</td></tr>
                                        ) : (
                                            filteredJurisdictions.map((item) => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <div style={{ fontWeight: '600' }}>{item.project_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#666' }}>{item.project_code}</div>
                                                    </td>
                                                    <td><span className="badge-city" style={{ backgroundColor: 'var(--magenta)', color: 'white' }}>{item.circle_name}</span></td>
                                                    <td>{item.state_name}</td>
                                                    <td>
                                                        <div style={{ fontSize: '0.85rem', color: '#444', maxWidth: '300px' }}>
                                                            {item.district_names?.join(', ') || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="actions-cell">
                                                        <button className="icon-btn-small" onClick={() => openModal(item)}><Edit2 size={16} /></button>
                                                        <button className="icon-btn-small delete" onClick={() => handleDeleteJurisdiction(item.id)}><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </>
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

            {/* Add / Edit Jurisdiction Modal */}
            {isJurisdictionModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h2>{editMode ? 'Edit Jurisdiction' : 'Add New Jurisdiction'}</h2>
                            <button onClick={closeModal} className="icon-btn-small"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveJurisdiction} className="modal-body form-grid" style={{ overflowY: 'auto', padding: '1.5rem' }}>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Project <span className="required">*</span></label>
                                <select 
                                    value={currentJurisdiction.project_code}
                                    onChange={(e) => {
                                        const proj = projects.find(p => p.code === e.target.value);
                                        setCurrentJurisdiction({
                                            ...currentJurisdiction, 
                                            project_code: e.target.value,
                                            project_name: proj?.name || ''
                                        });
                                    }}
                                    required
                                >
                                    <option value="" disabled>Select Project from Employee API</option>
                                    {projects.map(p => (
                                        <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>State <span className="required">*</span></label>
                                <select 
                                    value={currentJurisdiction.state}
                                    onChange={(e) => {
                                        const state = states.find(s => s.id === parseInt(e.target.value));
                                        setCurrentJurisdiction({
                                            ...currentJurisdiction, 
                                            state: e.target.value,
                                            districts: [] // Reset districts when state changes
                                        });
                                        fetchCircles(e.target.value);
                                        fetchDistricts(state?.external_id);
                                    }}
                                    required
                                >
                                    <option value="" disabled>Select State</option>
                                    {states.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Circle / Zone Name <span className="required">*</span></label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Hyderabad South"
                                        value={currentJurisdiction.circle_name}
                                        onChange={(e) => setCurrentJurisdiction({...currentJurisdiction, circle_name: e.target.value, circle: ''})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Or Select Existing Circle</label>
                                <select 
                                    value={currentJurisdiction.circle}
                                    onChange={(e) => {
                                        const circle = circles.find(c => c.id === parseInt(e.target.value));
                                        setCurrentJurisdiction({
                                            ...currentJurisdiction, 
                                            circle: e.target.value,
                                            circle_name: circle?.name || ''
                                        });
                                    }}
                                >
                                    <option value="">-- New Circle --</option>
                                    {circles.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Link Districts <span className="required">*</span></label>
                                <div className="preference-list" style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr 1fr', 
                                    gap: '8px', 
                                    padding: '12px',
                                    border: '1.5px solid var(--border)',
                                    borderRadius: '8px',
                                    maxHeight: '200px',
                                    overflowY: 'auto'
                                }}>
                                    {districts.map(d => (
                                        <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                            <input 
                                                type="checkbox"
                                                checked={currentJurisdiction.districts.includes(d.id)}
                                                onChange={(e) => {
                                                    let dists = [...currentJurisdiction.districts];
                                                    if (e.target.checked) dists.push(d.id);
                                                    else dists = dists.filter(id => id !== d.id);
                                                    setCurrentJurisdiction({...currentJurisdiction, districts: dists});
                                                }}
                                            />
                                            {d.name}
                                        </label>
                                    ))}
                                    {districts.length === 0 && (
                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#888' }}>
                                            Select a state to view districts.
                                        </div>
                                    )}
                                </div>
                                <small>Select districts to include in this circle for the project.</small>
                            </div>

                            <div className="form-actions" style={{ gridColumn: '1 / -1', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
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
                                    <span>{editMode ? 'Update Jurisdiction' : 'Save Jurisdiction'}</span>
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
