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
import SearchableSelect from '../components/SearchableSelect';

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
    
    const [currentRules, setCurrentRules] = useState([]);
    const [selectedRuleIds, setSelectedRuleIds] = useState([]);
    
    const [currentJurisdictions, setCurrentJurisdictions] = useState([]);
    const [selectedJurisdictionIds, setSelectedJurisdictionIds] = useState([]);

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
                setCurrentRules([{
                    id: item.id,
                    cadre: item.cadre,
                    category: item.category,
                    city_type: item.city_type || 'N/A',
                    limit_amount: item.limit_amount || '',
                    eligibility_class: item.eligibility_class || ''
                }]);
                setEditMode(true);
            } else {
                setCurrentRules([{
                    cadre: cadres.length > 0 ? cadres[0].id : '',
                    category: 'Accommodation',
                    city_type: 'Metro',
                    limit_amount: '',
                    eligibility_class: ''
                }]);
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
                setCurrentJurisdictions([{
                    project_name: '',
                    project_code: '',
                    state: '',
                    circle_name: '',
                    circle: '',
                    districts: []
                }]);
                setEditMode(false);
            }
            setIsJurisdictionModalOpen(true);
        }
    };

    const handleBulkEditJurisdiction = () => {
        if (selectedJurisdictionIds.length === 0) return;
        
        const selectedData = jurisdictions.filter(j => selectedJurisdictionIds.includes(j.id));
        setCurrentJurisdictions(selectedData.map(item => ({
            id: item.id,
            project_name: item.project_name,
            project_code: item.project_code,
            state: item.state_id,
            circle_name: item.circle_name,
            circle: item.circle,
            districts: item.districts || []
        })));
        
        setEditMode(true);
        setIsJurisdictionModalOpen(true);
    };

    const toggleJurisdictionSelection = (id) => {
        setSelectedJurisdictionIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAllJurisdictions = () => {
        const allFilteredIds = filteredJurisdictions.map(j => j.id);
        const areAllFilteredSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedJurisdictionIds.includes(id));
        
        if (areAllFilteredSelected) {
            setSelectedJurisdictionIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
        } else {
            setSelectedJurisdictionIds(prev => [...new Set([...prev, ...allFilteredIds])]);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsJurisdictionModalOpen(false);
        setCurrentRules([]);
        setSelectedRuleIds([]); // Reset selection on close
        setCurrentJurisdictions([]);
        setSelectedJurisdictionIds([]);
        setCurrentJurisdiction({
            project_name: '',
            project_code: '',
            state: '',
            circle_name: '',
            circle: '',
            districts: []
        });
    };

    const handleAddJurisdictionRow = () => {
        setCurrentJurisdictions([...currentJurisdictions, {
            project_name: '',
            project_code: '',
            state: '',
            circle_name: '',
            circle: '',
            districts: []
        }]);
    };

    const handleDeleteJurisdictionRow = (index) => {
        if (currentJurisdictions.length <= 1 && !editMode) return;
        const updated = [...currentJurisdictions];
        updated.splice(index, 1);
        setCurrentJurisdictions(updated);
    };

    const handleJurisdictionRowChange = (index, field, value) => {
        const updated = [...currentJurisdictions];
        updated[index] = { ...updated[index], [field]: value };
        setCurrentJurisdictions(updated);
    };

    const handleAddRuleRow = () => {
        setCurrentRules([...currentRules, {
            cadre: cadres.length > 0 ? cadres[0].id : '',
            category: 'Accommodation',
            city_type: 'Metro',
            limit_amount: '',
            eligibility_class: ''
        }]);
    };

    const handleDeleteRuleRow = (index) => {
        if (currentRules.length <= 1 && !editMode) return;
        const updated = [...currentRules];
        updated.splice(index, 1);
        setCurrentRules(updated);
    };

    const toggleRuleSelection = (id) => {
        setSelectedRuleIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAllRules = () => {
        const allFilteredIds = filteredRules.map(r => r.id);
        const areAllFilteredSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedRuleIds.includes(id));
        
        if (areAllFilteredSelected) {
            setSelectedRuleIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
        } else {
            setSelectedRuleIds(prev => [...new Set([...prev, ...allFilteredIds])]);
        }
    };

    const handleBulkEdit = () => {
        if (selectedRuleIds.length === 0) return;
        
        const selectedData = rules.filter(r => selectedRuleIds.includes(r.id));
        setCurrentRules(selectedData.map(item => ({
            id: item.id,
            cadre: item.cadre,
            category: item.category,
            city_type: item.city_type || 'N/A',
            limit_amount: item.limit_amount || '',
            eligibility_class: item.eligibility_class || ''
        })));
        
        setEditMode(true);
        setIsModalOpen(true);
    };

    const handleRuleRowChange = (index, field, value) => {
        const updated = [...currentRules];
        updated[index] = { ...updated[index], [field]: value };
        setCurrentRules(updated);
    };

    const handleSaveRule = async (e) => {
        e.preventDefault();
        
        // Validation

        const invalidRow = currentRules.find(r => !r.cadre || !r.category);
        if (invalidRow) {
            showToast("Cadre and Category are required for all rows", "warning");
            return;
        }

        try {

            const endpoint = '/api/masters/eligibility-rules/bulk-save/';
            
            const payload = currentRules.map(r => ({
                ...r,
                limit_amount: r.limit_amount || 0
            }));

            await api.post(endpoint, payload);
            
            showToast(`Rules successfully ${editMode ? 'updated' : 'saved'}!`, "success");
            closeModal();
            fetchRules();
        } catch (error) {
            console.error("Failed to save rules", error);
            const errMsg = error.response?.data?.non_field_errors?.[0] || error.response?.data?.detail || "Failed to save rules. Some rules may overlap.";
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


    const handleSaveJurisdictionBulk = async (e) => {
        e.preventDefault();
        
        // Validation
        const invalidRow = currentJurisdictions.find(j => !j.project_code || (!j.circle_name && !j.circle) || j.districts.length === 0);
        if (invalidRow) {
            showToast("Project, Circle, and at least one District are required for all rows", "warning");
            return;
        }

        setLoading(true);
        try {
            const finalPayload = [];
            
            // 1. Process each row to ensure circles exist
            for (const juris of currentJurisdictions) {
                let circleId = juris.circle;
                if (!circleId && juris.circle_name) {
                    // Create new circle
                    const circleResp = await api.post('/api/masters/circles/', {
                        name: juris.circle_name,
                        state: juris.state
                    });
                    circleId = circleResp.data.id;
                }
                
                finalPayload.push({
                    id: juris.id,
                    project_name: juris.project_name,
                    project_code: juris.project_code,
                    circle: circleId,
                    districts: juris.districts
                });
            }

            // 2. Bulk Save
            await api.post('/api/masters/jurisdictions/bulk-save/', finalPayload);
            
            showToast(`Jurisdictions successfully ${editMode ? 'updated' : 'saved'}!`, "success");
            closeModal();
            fetchJurisdictions();
        } catch (error) {
            console.error("Failed to save jurisdictions", error);
            showToast("Failed to save jurisdictions. Check for duplicates or connectivity issues.", "error");
        } finally {
            setLoading(false);
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

                                {!selectedRuleIds.length && (
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '8px 16px', borderRadius: '12px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', opacity: 0.6 }}></div>
                                        Select rules to Bulk Edit
                                    </div>
                                )}
                                {selectedRuleIds.length > 0 && (
                                    <button 
                                        className="btn-primary animate-fade-in" 
                                        onClick={handleBulkEdit}
                                        style={{ 
                                            background: 'var(--primary)', 
                                            padding: '8px 20px', 
                                            borderRadius: '12px',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 4px 12px rgba(187, 6, 51, 0.2)'
                                        }}
                                    >
                                        <Edit2 size={16} />
                                        <span>Bulk Edit Selected ({selectedRuleIds.length})</span>
                                    </button>
                                )}
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

                                            <th style={{ width: '40px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedRuleIds.length === filteredRules.length && filteredRules.length > 0}
                                                    onChange={toggleAllRules}
                                                    style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                                                />
                                            </th>

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

                                                <tr key={item.id} className={selectedRuleIds.includes(item.id) ? 'selected-row' : ''} style={{ 
                                                    backgroundColor: selectedRuleIds.includes(item.id) ? 'rgba(187, 6, 51, 0.03)' : 'inherit',
                                                    transition: 'background-color 0.2s'
                                                }}>
                                                    <td>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedRuleIds.includes(item.id)}
                                                            onChange={() => toggleRuleSelection(item.id)}
                                                            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                                                        />
                                                    </td>

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
                                {!selectedJurisdictionIds.length && (
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '8px 16px', borderRadius: '12px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', opacity: 0.6 }}></div>
                                        Select items to Bulk Edit
                                    </div>
                                )}
                                {selectedJurisdictionIds.length > 0 && (
                                    <button 
                                        className="btn-primary animate-fade-in" 
                                        onClick={handleBulkEditJurisdiction}
                                        style={{ 
                                            background: 'var(--primary)', 
                                            padding: '8px 20px', 
                                            borderRadius: '12px',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 4px 12px rgba(187, 6, 51, 0.2)'
                                        }}
                                    >
                                        <Edit2 size={16} />
                                        <span>Bulk Edit Selected ({selectedJurisdictionIds.length})</span>
                                    </button>
                                )}
                            </div>

                            {loading ? (
                                <div className="loading-spinner">Loading jurisdictions...</div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedJurisdictionIds.length === filteredJurisdictions.length && filteredJurisdictions.length > 0}
                                                    onChange={toggleAllJurisdictions}
                                                    style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                                                />
                                            </th>
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
                                                <tr key={item.id} className={selectedJurisdictionIds.includes(item.id) ? 'selected-row' : ''} style={{ 
                                                    backgroundColor: selectedJurisdictionIds.includes(item.id) ? 'rgba(187, 6, 51, 0.03)' : 'inherit',
                                                    transition: 'background-color 0.2s'
                                                }}>
                                                    <td>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedJurisdictionIds.includes(item.id)}
                                                            onChange={() => toggleJurisdictionSelection(item.id)}
                                                            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                                                        />
                                                    </td>
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
                    <div className="modal-content" style={{ maxWidth: '1250px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '32px', boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div className="modal-header" style={{ padding: '2.5rem 3rem 1.5rem', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
                            <div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.5px' }}>
                                    {editMode ? (currentRules.length > 1 ? `Bulk Edit Rules (${currentRules.length})` : 'Edit Eligibility Rule') : 'Bulk Configuration'}
                                </h2>
                                <p style={{ fontSize: '1rem', color: '#64748b', marginTop: '0.5rem', fontWeight: '500' }}>Manage travel limits and stay preferences across multiple levels and categories.</p>
                            </div>
                            <button onClick={closeModal} className="icon-btn-small" style={{ position: 'absolute', right: '2rem', top: '2rem', backgroundColor: '#f8fafc', border: 'none', borderRadius: '15px', width: '45px', height: '45px', color: '#64748b' }}><X size={24} /></button>
                        </div>
                        
                        <div className="modal-body custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '2rem 3rem' }}>
                            {/* Grid Headers */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'minmax(220px, 1.2fr) minmax(160px, 0.8fr) minmax(140px, 0.8fr) minmax(130px, 0.7fr) minmax(250px, 1.5fr) 60px', 
                                gap: '1.25rem', 
                                marginBottom: '1.25rem',
                                padding: '0 1.25rem',
                                borderBottom: '2px solid #f1f5f9',
                                paddingBottom: '1rem'
                            }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Cadre / Position Level <span className="required">*</span></span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Category <span className="required">*</span></span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>City Type</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Limit (₹)</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Preferences & Classes</span>
                                <span></span>
                            </div>

                            {/* Grid Rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {currentRules.map((rule, idx) => (
                                    <div key={idx} className="animate-fade-in" style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'minmax(220px, 1.2fr) minmax(160px, 0.8fr) minmax(140px, 0.8fr) minmax(130px, 0.7fr) minmax(250px, 1.5fr) 60px', 
                                        gap: '1.25rem', 
                                        alignItems: 'start',
                                        background: '#fff',
                                        padding: '1.5rem 1.25rem',
                                        borderRadius: '20px',
                                        border: '1.5px solid #f1f5f9',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        <div>
                                            <SearchableSelect
                                                options={cadres.map(c => ({ value: c.id, label: c.name }))}
                                                value={rule.cadre}
                                                onChange={(val) => handleRuleRowChange(idx, 'cadre', val)}
                                                placeholder="Search Level..."
                                            />
                                        </div>
                                        <div>
                                            <SearchableSelect
                                                options={categories.map(cat => ({ value: cat, label: cat }))}
                                                value={rule.category}
                                                onChange={(val) => handleRuleRowChange(idx, 'category', val)}
                                                placeholder="Category"
                                            />
                                        </div>
                                        <div>
                                            <SearchableSelect
                                                options={cityTypes.map(ct => ({ value: ct, label: ct }))}
                                                value={rule.city_type}
                                                onChange={(val) => handleRuleRowChange(idx, 'city_type', val)}
                                                placeholder="City Type"
                                            />
                                        </div>
                                        <div>
                                            <div style={{ position: 'relative' }}>
                                                <input 
                                                    type="text"
                                                    placeholder="Actuals"
                                                    value={rule.limit_amount}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                                        handleRuleRowChange(idx, 'limit_amount', val);
                                                    }}
                                                    style={{ 
                                                        height: '48px', 
                                                        padding: '0.75rem 1rem',
                                                        borderRadius: '14px',
                                                        border: '2px solid #f1f5f9',
                                                        fontSize: '1rem',
                                                        fontWeight: '700',
                                                        backgroundColor: '#f8fafc',
                                                        color: 'var(--primary)'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ 
                                                maxHeight: '130px', 
                                                overflowY: 'auto', 
                                                padding: '12px',
                                                border: '2px solid #f1f5f9',
                                                borderRadius: '16px',
                                                backgroundColor: '#fff',
                                                fontSize: '0.85rem'
                                            }} className="custom-scrollbar">
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    {preferenceOptions.map(option => {
                                                        const isSelected = (rule.eligibility_class || '').split(', ').includes(option);
                                                        return (
                                                            <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: isSelected ? 'var(--primary)' : '#64748b', fontWeight: isSelected ? '800' : '500', transition: 'all 0.2s' }}>
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                        let currentArr = rule.eligibility_class ? rule.eligibility_class.split(', ') : [];
                                                                        if (e.target.checked) currentArr.push(option);
                                                                        else currentArr = currentArr.filter(item => item !== option);
                                                                        handleRuleRowChange(idx, 'eligibility_class', currentArr.join(', '));
                                                                    }}
                                                                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                                                                />
                                                                {option}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center', pt: '10px' }}>
                                            {!editMode && currentRules.length > 1 && (
                                                <button 
                                                    className="icon-btn-small" 
                                                    onClick={() => handleDeleteRuleRow(idx)}
                                                    style={{ color: '#ef4444', backgroundColor: '#fef2f2', border: 'none', borderRadius: '12px', width: '40px', height: '40px' }}
                                                    title="Remove Row"
                                                ><Trash2 size={18} /></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!editMode && (
                                <button 
                                    className="btn-secondary" 
                                    onClick={handleAddRuleRow}
                                    style={{ 
                                        marginTop: '2rem', 
                                        padding: '1rem', 
                                        borderRadius: '16px', 
                                        border: '2px dashed var(--primary)',
                                        backgroundColor: 'var(--primary-light)',
                                        color: 'var(--primary)',
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '12px',
                                        fontWeight: '800',
                                        fontSize: '1rem',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    <Plus size={24} />
                                    <span>Add Another Eligibility Rule Row</span>
                                </button>
                            )}
                        </div>

                        <div className="modal-footer" style={{ padding: '2rem 3rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0 0 32px 32px' }}>
                            <button type="button" onClick={closeModal} style={{ padding: '1rem 2.5rem', borderRadius: '16px', border: '2px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}>Cancel</button>
                            <button type="button" className="btn-primary" onClick={handleSaveRule} style={{ padding: '1.2rem 3rem', borderRadius: '16px', background: 'var(--primary)', color: '#fff', fontWeight: '900', fontSize: '1rem', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(187, 6, 51, 0.2)', display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px' }}>
                                <Save size={24} />
                                <span>{editMode ? (currentRules.length > 1 ? `Update All Selected (${currentRules.length})` : 'Update Rule') : `Save All Rules (${currentRules.length})`}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Jurisdiction Modal */}
            {isJurisdictionModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '1250px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '32px', boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div className="modal-header" style={{ padding: '2.5rem 3rem 1.5rem', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
                            <div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.5px' }}>
                                    {editMode ? (currentJurisdictions.length > 1 ? `Bulk Edit Jurisdictions (${currentJurisdictions.length})` : 'Edit Jurisdiction') : 'Add Jurisdictions'}
                                </h2>
                                <p style={{ fontSize: '1rem', color: '#64748b', marginTop: '0.5rem', fontWeight: '500' }}>Define project boundaries by linking circles and districts to specific projects.</p>
                            </div>
                            <button onClick={closeModal} className="icon-btn-small" style={{ position: 'absolute', right: '2rem', top: '2rem', backgroundColor: '#f8fafc', border: 'none', borderRadius: '15px', width: '45px', height: '45px', color: '#64748b' }}><X size={24} /></button>
                        </div>
                        
                        <div className="modal-body custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '2rem 3rem' }}>
                            {/* Grid Headers */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'minmax(250px, 1.2fr) minmax(200px, 1fr) minmax(200px, 1fr) minmax(250px, 1.5fr) 60px', 
                                gap: '1.25rem', 
                                marginBottom: '1.25rem',
                                padding: '0 1.25rem',
                                borderBottom: '2px solid #f1f5f9',
                                paddingBottom: '1rem'
                            }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Project <span className="required">*</span></span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>State / Region <span className="required">*</span></span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Circle / Zone <span className="required">*</span></span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Linked Districts <span className="required">*</span></span>
                                <span></span>
                            </div>

                            {/* Grid Rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {currentJurisdictions.map((juris, idx) => (
                                    <div key={idx} className="animate-fade-in" style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'minmax(250px, 1.2fr) minmax(200px, 1fr) minmax(200px, 1fr) minmax(250px, 1.5fr) 60px', 
                                        gap: '1.25rem', 
                                        alignItems: 'start',
                                        background: '#fff',
                                        padding: '1.5rem 1.25rem',
                                        borderRadius: '20px',
                                        border: '1.5px solid #f1f5f9',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        <div>
                                            <SearchableSelect
                                                options={[...new Map(projects.map(p => [p.code, { value: p.code, label: `${p.name} (${p.code})` }])).values()]}
                                                value={juris.project_code}
                                                onChange={(val) => {
                                                    const proj = projects.find(p => p.code === val);
                                                    handleJurisdictionRowChange(idx, 'project_code', val);
                                                    handleJurisdictionRowChange(idx, 'project_name', proj?.name || '');
                                                }}
                                                placeholder="Search Project..."
                                            />
                                        </div>
                                        <div>
                                            <SearchableSelect
                                                options={[...new Map(states.map(s => [s.name, { value: s.id, label: s.name, extId: s.external_id }])).values()]}
                                                value={juris.state}
                                                onChange={(val) => {
                                                    handleJurisdictionRowChange(idx, 'state', val);
                                                    handleJurisdictionRowChange(idx, 'districts', []); // Reset districts
                                                    fetchCircles(val);
                                                    const stateObj = states.find(s => s.id === parseInt(val));
                                                    fetchDistricts(stateObj?.external_id);
                                                }}
                                                placeholder="Search State..."
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <SearchableSelect
                                                options={[
                                                    { value: "", label: "-- New Circle --" },
                                                    ...circles.map(c => ({ value: c.id, label: c.name }))
                                                ]}
                                                value={juris.circle}
                                                onChange={(val) => {
                                                    const circle = circles.find(c => c.id === parseInt(val));
                                                    handleJurisdictionRowChange(idx, 'circle', val);
                                                    handleJurisdictionRowChange(idx, 'circle_name', circle?.name || '');
                                                }}
                                                placeholder="Existing Circle"
                                            />
                                            {!juris.circle && (
                                                <input 
                                                    type="text"
                                                    placeholder="Enter New Circle Name"
                                                    value={juris.circle_name}
                                                    onChange={(e) => handleJurisdictionRowChange(idx, 'circle_name', e.target.value)}
                                                    style={{ 
                                                        height: '40px', 
                                                        padding: '0.5rem 0.8rem',
                                                        borderRadius: '10px',
                                                        border: '2px solid #f1f5f9',
                                                        fontSize: '0.9rem',
                                                        backgroundColor: '#f8fafc'
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ 
                                                maxHeight: '130px', 
                                                overflowY: 'auto', 
                                                padding: '12px',
                                                border: '2px solid #f1f5f9',
                                                borderRadius: '16px',
                                                backgroundColor: '#fff',
                                                fontSize: '0.85rem'
                                            }} className="custom-scrollbar">
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                                    {districts.map(d => (
                                                        <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: juris.districts.includes(d.id) ? 'var(--primary)' : '#64748b', fontWeight: juris.districts.includes(d.id) ? '800' : '500', transition: 'all 0.2s' }}>
                                                            <input 
                                                                type="checkbox"
                                                                checked={juris.districts.includes(d.id)}
                                                                onChange={(e) => {
                                                                    let dists = [...juris.districts];
                                                                    if (e.target.checked) dists.push(d.id);
                                                                    else dists = dists.filter(id => id !== d.id);
                                                                    handleJurisdictionRowChange(idx, 'districts', dists);
                                                                }}
                                                                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                                                            />
                                                            {d.name}
                                                        </label>
                                                    ))}
                                                    {districts.length === 0 && (
                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Select state to view districts</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            {!editMode && currentJurisdictions.length > 1 && (
                                                <button 
                                                    className="icon-btn-small" 
                                                    onClick={() => handleDeleteJurisdictionRow(idx)}
                                                    style={{ color: '#ef4444', backgroundColor: '#fef2f2', border: 'none', borderRadius: '12px', width: '40px', height: '40px' }}
                                                    title="Remove Row"
                                                ><Trash2 size={18} /></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!editMode && (
                                <button 
                                    className="btn-secondary" 
                                    onClick={handleAddJurisdictionRow}
                                    style={{ 
                                        marginTop: '2rem', 
                                        padding: '1rem', 
                                        borderRadius: '16px', 
                                        border: '2px dashed var(--primary)',
                                        backgroundColor: 'var(--primary-light)',
                                        color: 'var(--primary)',
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '12px',
                                        fontWeight: '800',
                                        fontSize: '1rem',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    <Plus size={24} />
                                    <span>Add Another Jurisdiction Row</span>
                                </button>
                            )}
                        </div>

                        <div className="modal-footer" style={{ padding: '2rem 3rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0 0 32px 32px' }}>
                            <button type="button" onClick={closeModal} style={{ padding: '1rem 2.5rem', borderRadius: '16px', border: '2px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}>Cancel</button>
                            <button type="button" className="btn-primary" onClick={handleSaveJurisdictionBulk} style={{ padding: '1.2rem 3rem', borderRadius: '16px', background: 'var(--primary)', color: '#fff', fontWeight: '900', fontSize: '1rem', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(187, 6, 51, 0.2)', display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px' }}>
                                <Save size={24} />
                                <span>{editMode ? (currentJurisdictions.length > 1 ? `Update All Selected (${currentJurisdictions.length})` : 'Update Jurisdiction') : `Save All Jurisdictions (${currentJurisdictions.length})`}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMasters;
