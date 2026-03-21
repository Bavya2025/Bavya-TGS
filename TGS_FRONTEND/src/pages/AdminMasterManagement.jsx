import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
    Plus, Edit2, Trash2, CheckCircle, XCircle, ChevronDown, AlignLeft, Settings, Layers, AlertCircle
} from 'lucide-react';
//
import { useToast } from '../context/ToastContext';

// Config layout for managing the system architecture itself
const CONFIG_GROUP = {
    id: 'config',
    label: 'Config (Add Masters)',
    tables: [
        { id: 'master_module', name: 'Manage Modules', endpoint: 'master-modules', fields: ['name', 'display_order'] },
        { id: 'custom_master_def', name: 'Manage Master Tables', endpoint: 'custom-master-definitions', fields: ['table_name', 'module_ref', 'api_endpoint', 'fields_list'] },
    ]
};

export default function AdminMasterManagement() {
    const { showToast } = useToast() || { showToast: () => { } };

    // UI State
    const [groups, setGroups] = useState([CONFIG_GROUP]);
    const [activeGroup, setActiveGroup] = useState(CONFIG_GROUP);
    const [activeTab, setActiveTab] = useState(CONFIG_GROUP.tables[0]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Master data definitions from DB
    const [allModules, setAllModules] = useState([]);

    // Form / Modal State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const getVisibleFields = (tab) => {
        if (!tab) return [];
        if (tab.id === 'custom_master_def') {
            return tab.fields.filter(field => !['api_endpoint', 'fields_list'].includes(field));
        }
        return tab.fields;
    };

    const visibleFields = getVisibleFields(activeTab);

    // Initial load: Fetch the structure from the database
    useEffect(() => {
        fetchStructure();
    }, []);

    // Fetch data whenever the active tab changes
    useEffect(() => {
        fetchData();
    }, [activeTab]);

    /**
     * Fetches modules and table definitions from the database to build the UI navigation.
     * No hardcoded system tables are used here; everything comes from travel_custommasterdefinition.
     */
    const fetchStructure = async () => {
        try {
            // 1. Fetch Top-Level Modules (Travel, Local, etc.)
            const modRes = await api.get('/api/master-modules/');
            const modules = modRes.data;
            setAllModules(modules);

            // 2. Fetch Table Definitions (both original system tables and user-added ones)
            const defRes = await api.get('/api/custom-master-definitions/');
            const definitions = defRes.data;

            // 3. Group tables into their respective modules
            const newGroups = modules.map(mod => {
                const tables = definitions
                    .filter(d => d.module_ref === mod.id)
                    .map(def => ({
                        id: `table_${def.id}`,
                        name: def.table_name,
                        endpoint: def.api_endpoint || 'custom-master-values',
                        fields: def.fields_list ? def.fields_list.split(',').map(f => f.trim()) : ['name', 'code'],
                        definitionId: def.api_endpoint ? null : def.id, // Only send definitionId for custom values table
                        isCustom: !def.is_system
                    }));

                return {
                    id: mod.id,
                    label: mod.name,
                    tables: tables
                };
            }).filter(g => g.tables.length > 0); // Keep modules that have tables

            // 4. Add the configuration management group
            newGroups.push(CONFIG_GROUP);
            setGroups(newGroups);

            // 5. Update active markers to ensure UI doesn't break after reload
            if (activeGroup.id !== 'config') {
                const updatedActive = newGroups.find(g => g.id === activeGroup.id);
                if (updatedActive) {
                    setActiveGroup(updatedActive);
                    // Update activeTab to ensure its fields array is refreshed from the new definition fetch
                    if (activeTab) {
                        const newTab = updatedActive.tables.find(t => t.id === activeTab.id);
                        if (newTab) {
                            setActiveTab(newTab);
                        }
                    }
                } else {
                    const first = newGroups[0];
                    if (first) {
                        setActiveGroup(first);
                        setActiveTab(first.tables[0]);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load master structure", error);
            showToast("Failed to load master data structure", "error");
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = `/api/${activeTab.endpoint}/`;

            // If it's a generic custom value table, we must filter by the specific definition ID
            if (activeTab.definitionId) {
                url += `?definition=${activeTab.definitionId}`;
            }

            const res = await api.get(url);
            setData(res.data);
        } catch (error) {
            console.error("Fetch failed", error);
            showToast("Failed to load table data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (item = null) => {
        setEditingItem(item);
        if (item) {
            const nextFormData = { ...item };
            if (activeTab.id === 'custom_master_def') {
                nextFormData.api_endpoint = item.api_endpoint || '';
                nextFormData.fields_list = item.fields_list || '';
            }
            setFormData(nextFormData);
        } else {
            const initial = {};
            activeTab.fields.forEach(f => {
                if (f === 'module_ref' && activeGroup.id !== 'config') initial[f] = activeGroup.id;
                else if (f.startsWith('is_')) initial[f] = false;
                else initial[f] = '';
            });
            if (activeTab.id === 'custom_master_def') {
                initial.api_endpoint = '';
                initial.fields_list = '';
            }
            setFormData(initial);
        }
        setIsFormOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };

            if (activeTab.id === 'custom_master_def') {
                payload.api_endpoint = payload.api_endpoint || '';
                payload.fields_list = (payload.fields_list || 'name,code').trim();
            }

            // Inject definition ID for custom value records
            if (activeTab.definitionId) {
                payload.definition = activeTab.definitionId;
            }

            if (editingItem) {
                await api.put(`/api/${activeTab.endpoint}/${editingItem.id}/`, payload);
                showToast("Updated successfully", "success");
            } else {
                await api.post(`/api/${activeTab.endpoint}/`, payload);
                showToast("Created successfully", "success");
            }
            setIsFormOpen(false);
            fetchData();
            // If we modified definitions, refresh the whole UI structure
            if (activeTab.id === 'custom_master_def' || activeTab.id === 'master_module') {
                fetchStructure();
            }
        } catch (error) {
            const errorData = error.response?.data;
            const firstFieldError = errorData && typeof errorData === 'object'
                ? Object.values(errorData).flat().find(Boolean)
                : null;
            showToast(firstFieldError || errorData?.detail || "Operation failed. Check inputs.", "error");
        }
    };

    const confirmDelete = (id) => {
        setDeletingId(id);
        setIsConfirmOpen(true);
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/api/${activeTab.endpoint}/${deletingId}/`);
            showToast("Deleted successfully", "success");
            setIsConfirmOpen(false);
            fetchData();
            if (activeTab.id === 'custom_master_def' || activeTab.id === 'master_module') {
                fetchStructure();
            }
        } catch (error) {
            showToast("Deletion failed", "error");
        }
    };

    return (
        <div className="content-inner animate-fade-in">
            <div className="admin-mgmt-header">
                <h1>Master Data Management</h1>
                <p>Configure system hierarchies and dynamic data tables.</p>
            </div>

            {/* Top Navigation - Module Level */}
            <div className="trip-category-toggle">
                {groups.map(group => (
                    <button
                        key={group.id}
                        className={`module-btn ${activeGroup.id === group.id ? 'active' : ''}`}
                        onClick={() => {
                            setActiveGroup(group);
                            setActiveTab(group.tables[0]);
                        }}
                    >
                        {group.id === 'config' ? <Settings size={18} /> : <Layers size={18} />}
                        {group.label}
                    </button>
                ))}
            </div>

            <div className="admin-content-grid">
                {/* Sidebar - Table Level */}
                <div className="glass premium-card">
                    <h3 className="sidebar-title">Available Tables</h3>
                    <div className="master-selector-list">
                        {activeGroup.tables.map(table => (
                            <button
                                key={table.id}
                                className={`master-selector-btn ${activeTab.id === table.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(table)}
                            >
                                <AlignLeft size={16} style={{ marginRight: '10px' }} />
                                {table.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Data Panel */}
                <div className="glass premium-card">
                    <div className="panel-header">
                        <h2>{activeTab.name}</h2>
                        <button className="add-btn" onClick={() => handleOpenForm()}>
                            <Plus size={18} />
                            Add Record
                        </button>
                    </div>

                    <div className="data-table-container">
                        {loading ? (
                            <div className="loading-state">
                                <div className="loader"></div>
                                <p>Fetching data...</p>
                            </div>
                        ) : (
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        {visibleFields.map(f => (
                                            <th key={f}>{f.replace(/_/g, ' ').toUpperCase()}</th>
                                        ))}
                                        <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? data.map(item => (
                                        <tr key={item.id}>
                                            <td><span className="id-badge">{item.id}</span></td>
                                            {(() => { console.log("Rendering Item Row:", item); return null; })()}
                                            {visibleFields.map(f => (
                                                <td key={f}>
                                                    {f === 'module_ref' ? (
                                                        allModules.find(m => m.id === item[f])?.name || item[f]
                                                    ) : f.startsWith('is_') || item[f] === true || item[f] === false || item[f] === 'true' || item[f] === 'false' ? (
                                                        <span style={{ 
                                                            color: (item[f] === true || item[f] === 'true' || item[f] === 1 || item[f] === '1') ? '#059669' : '#dc2626',
                                                            fontWeight: 'bold',
                                                            background: (item[f] === true || item[f] === 'true' || item[f] === 1 || item[f] === '1') ? '#ecfdf5' : '#fef2f2',
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.8rem',
                                                            display: 'inline-block'
                                                        }}>
                                                            {(item[f] === true || item[f] === 'true' || item[f] === 1 || item[f] === '1') ? 'TRUE' : 'FALSE'}
                                                        </span>
                                                    ) : (
                                                        item[f] === null || item[f] === undefined ? '' : String(item[f])
                                                    )}
                                                </td>
                                            ))}
                                            <td>
                                                <div className="action-row">
                                                    <button className="action-btn edit-btn" title="Edit" onClick={() => handleOpenForm(item)}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button className="action-btn delete-btn" title="Delete" onClick={() => confirmDelete(item.id)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={visibleFields.length + 2} className="empty-row">No records found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {isFormOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 className="modal-title">{editingItem ? 'Edit Record' : 'Add New Record'}</h2>
                        <form onSubmit={handleSave}>
                            {visibleFields.map(field => (
                                <div key={field} className="form-field">
                                    <label>{field.replace(/_/g, ' ').toUpperCase()}</label>
                                    {field === 'module_ref' ? (
                                        <select
                                            className="form-select"
                                            value={formData[field] || ''}
                                            onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Module</option>
                                            {allModules.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    ) : field.startsWith('is_') ? (
                                        <input
                                            type="checkbox"
                                            className="form-checkbox-custom"
                                            checked={formData[field] === true || formData[field] === 'true' || formData[field] === 1 || formData[field] === '1'}
                                            onChange={e => setFormData({ ...formData, [field]: e.target.checked })}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData[field] || ''}
                                            onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                                            placeholder={`Enter ${field}...`}
                                            required={field !== 'display_order' && field !== 'code'}
                                        />
                                    )}
                                </div>
                            ))}
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsFormOpen(false)}>Cancel</button>
                                <button type="submit" className="save-btn">{editingItem ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {isConfirmOpen && (
                <div className="modal-overlay">
                    <div className="modal-content confirm-modal">
                        <div className="confirm-icon"><AlertCircle size={32} /></div>
                        <h2>Confirm Deletion</h2>
                        <p style={{ color: '#64748b', marginBottom: '32px' }}>Are you sure you want to delete this record? This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setIsConfirmOpen(false)}>No, Keep it</button>
                            <button className="save-btn" style={{ background: '#CB6040' }} onClick={handleDelete}>Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
