import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
    Plus, Edit2, Trash2, CheckCircle, XCircle, ChevronDown, AlignLeft, Settings, Layers, AlertCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';



// Config layout for managing the system architecture itself
const CONFIG_GROUP = {
    id: 'config',
    label: 'Config (Add Masters)',
    tables: [
        { id: 'master_module', name: 'Manage Modules', endpoint: 'master-modules', fields: ['name', 'display_order'] },
        { id: 'custom_master_def', name: 'Manage Master Tables', endpoint: 'custom-master-definitions', fields: ['table_name', 'module_ref'] },
    ]
};

export default function AdminMasterManagement() {
    const { showToast } = useToast() || { showToast: () => { } };
    const PAGE_SIZE = 10;

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
    const [currentPage, setCurrentPage] = useState(1);

    const getVisibleFields = (tab = activeTab) => {
        if (!tab) return [];
        return tab.fields || [];
    };

    const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
    const paginatedData = data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Initial load: Fetch the structure from the database
    useEffect(() => {
        fetchStructure();
    }, []);

    // Fetch data whenever the active tab changes
    useEffect(() => {
        fetchData();
    }, [activeTab]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, data.length]);

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
                        endpoint: 'custom-master-values',
                        fields: ['name', 'code'],
                        definitionId: def.id,
                        isCustom: !def.is_system
                    }));

                return {
                    id: mod.id,
                    label: mod.name,
                    tables: tables
                };
            });

            // 4. Add the configuration management group
            newGroups.push(CONFIG_GROUP);
            setGroups(newGroups);

            // 5. Update active markers to ensure UI doesn't break after reload
            if (activeGroup.id !== 'config') {
                const updatedActive = newGroups.find(g => g.id === activeGroup.id);
                if (updatedActive) {
                    setActiveGroup(updatedActive);
                    setActiveTab(currentTab => {
                        if (!currentTab) return updatedActive.tables[0] || null;
                        return updatedActive.tables.find(t => t.id === currentTab.id) || updatedActive.tables[0] || null;
                    });
                } else {
                    const first = newGroups[0];
                    if (first) {
                        setActiveGroup(first);
                        setActiveTab(first.tables[0] || null);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load master structure", error);
            showToast("Failed to load master data structure", "error");
        }
    };

    const fetchData = async () => {
        if (!activeTab) {
            setData([]);
            setLoading(false);
            return;
        }
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

    const handleGroupChange = (group) => {
        setActiveGroup(group);
        setActiveTab(group.tables[0] || null);
    };

    const handleOpenForm = (item = null) => {
        setEditingItem(item);
        if (item) {
            const initialData = { ...item };
            if (activeTab.endpoint === 'custom-master-definitions') {
                initialData.api_endpoint = item.api_endpoint || '';
                initialData.fields_list = item.fields_list || '';
            }
            setFormData(initialData);
        } else {
            const initial = {};
            const visibleFields = getVisibleFields(activeTab);
            visibleFields.forEach(f => {
                if (f === 'module_ref' && activeGroup.id !== 'config') initial[f] = activeGroup.id;
                else initial[f] = '';
            });
            if (activeTab.endpoint === 'custom-master-definitions') {
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
            const requiredFields = getVisibleFields(activeTab);

            for (const field of requiredFields) {
                if (field === 'display_order' || field === 'code') continue;
                if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
                    showToast(`${field.replace(/_/g, ' ')} is required`, 'error');
                    return;
                }
            }

            // Inject definition ID for custom value records
            if (activeTab.definitionId) {
                payload.definition = activeTab.definitionId;
            }

            if (activeTab.endpoint === 'custom-master-definitions') {
                delete payload.api_endpoint;
                delete payload.fields_list;
                delete payload.key;
                delete payload.module;
                delete payload.is_system;
                delete payload.deleted_at;
                delete payload.deleted_by;
                delete payload.is_deleted;
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
            let errorMsg = "Operation failed. Check inputs.";
            if (error.response && error.response.data) {
                // DRF typically returns errors as { field: [messages] } or { non_field_errors: [messages] }
                const data = error.response.data;
                if (typeof data === 'object') {
                    const firstField = Object.keys(data)[0];
                    const msg = data[firstField];
                    errorMsg = Array.isArray(msg) ? msg[0] : (typeof msg === 'string' ? msg : errorMsg);
                } else if (typeof data === 'string') {
                    errorMsg = data;
                }
            }
            showToast(errorMsg, "error");
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
        <div className="admin-mgmt-wrapper custom-scrollbar">
            <div className="admin-mgmt-header">
                <h1>Master Data Management</h1>
                <p>Configure system hierarchies and dynamic data tables.</p>
            </div>

            {/* Top Navigation - Module Level */}
            <div className="module-nav">
                {groups.map(group => (
                    <button
                        key={group.id}
                        className={`module-btn ${activeGroup.id === group.id ? 'active' : ''}`}
                        onClick={() => handleGroupChange(group)}
                    >
                        {group.id === 'config' ? <Settings size={18} /> : <Layers size={18} />}
                        {group.label}
                    </button>
                ))}
            </div>

            <div className="admin-content-grid">
                {/* Sidebar - Table Level */}
                <div className="sidebar-panel">
                    <h3 className="sidebar-title">Available Tables</h3>
                    <div className="master-selector-list">
                        {activeGroup.tables.map(table => (
                            <button
                                key={table.id}
                                className={`master-selector-btn ${activeTab?.id === table.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(table)}
                            >
                                <AlignLeft size={16} style={{ marginRight: '10px' }} />
                                {table.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Data Panel */}
                <div className="main-table-panel">
                    <div className="panel-header">
                        <h2>{activeTab?.name || 'Master Tables'}</h2>
                        <button className="add-btn" onClick={() => handleOpenForm()} disabled={!activeTab}>
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
                            activeTab ? <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        {getVisibleFields(activeTab).map(f => (
                                            <th key={f}>{f.replace(/_/g, ' ').toUpperCase()}</th>
                                        ))}
                                        <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? paginatedData.map(item => (
                                        <tr key={item.id}>
                                            <td><span className="id-badge">{item.id}</span></td>
                                            {getVisibleFields(activeTab).map(f => (
                                                <td key={f}>
                                                    {f === 'module_ref' ?
                                                        (allModules.find(m => m.id === item[f])?.name || item[f]) :
                                                        String(item[f] || '')
                                                    }
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
                                            <td colSpan={getVisibleFields(activeTab).length + (activeGroup.id !== 'config' ? 3 : 2)} className="empty-row">No records found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table> : (
                                <div className="empty-row">
                                    {activeGroup?.id !== 'config'
                                        ? `No master tables added under ${activeGroup?.label || 'this module'} yet. Use "Config (Add Masters) > Manage Master Tables" to add one.`
                                        : 'Select a table from the sidebar to manage records.'}
                                </div>
                            )
                        )}
                    </div>
                    {!loading && activeTab && data.length > 0 && (
                        <div className="pagination-bar">
                            <div className="pagination-summary">
                                Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, data.length)} of {data.length} records
                            </div>
                            <div className="pagination-controls">
                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </button>
                                <span className="pagination-page">Page {currentPage} of {totalPages}</span>
                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add / Edit Modal */}
            {isFormOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 className="modal-title">{editingItem ? 'Edit Record' : 'Add New Record'}</h2>
                        <form onSubmit={handleSave}>
                            {getVisibleFields(activeTab).map(field => (
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
