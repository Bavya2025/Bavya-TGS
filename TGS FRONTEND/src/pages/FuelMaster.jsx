import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
    Plus, Edit2, Trash2, Car, IndianRupee, MapPin,
    ChevronDown, AlertCircle, Fuel, Search, Info, TrendingUp, Layers, CheckCircle2, X
} from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../context/ToastContext';


// Fallback list of Indian states in case the Location API/DB is empty
const INDIA_STATES_FALLBACK = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const FuelMaster = () => {
    const { showToast } = useToast();
    const [rates, setRates] = useState([]);
    const [states, setStates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        state: '',
        vehicle_type: '4 Wheeler',
        rate_per_km: ''
    });

    const [searchQuery, setSearchQuery] = useState('');

    // Compute which vehicle types are already configured for the currently selected state
    // Only applies when CREATING (not editing) so we block duplicates at UI level
    const takenVehicles = React.useMemo(() => {
        if (!formData.state || editingItem) return new Set();
        return new Set(
            rates
                .filter(r => r.state?.toLowerCase() === formData.state?.toLowerCase())
                .map(r => r.vehicle_type)
        );
    }, [formData.state, rates, editingItem]);

    useEffect(() => {
        fetchData();
        fetchStates();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/api/masters/fuel-rate-masters/');
            // Handle both paginated and non-paginated responses
            const data = res.data.results || res.data;
            setRates(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast("Failed to fetch fuel rates", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStates = async () => {
        try {
            const res = await api.get('/api/masters/locations/?type=State');
            const data = res.data.results || res.data;
            const locationStates = Array.isArray(data) ? data : [];
            if (locationStates.length > 0) {
                // Use Location objects from DB (each has .name, .id, etc.)
                setStates(locationStates);
            } else {
                // Fallback: use simple string list of Indian states
                console.warn("Location API returned no states. Using fallback list.");
                setStates(INDIA_STATES_FALLBACK);
            }
        } catch (error) {
            console.error("Failed to fetch states, using fallback list.", error);
            setStates(INDIA_STATES_FALLBACK);
        }
    };

    const handleOpenForm = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                state: item.state,
                vehicle_type: item.vehicle_type,
                rate_per_km: item.rate_per_km
            });
        } else {
            setEditingItem(null);
            setFormData({ state: '', vehicle_type: '4 Wheeler', rate_per_km: '' });
        }
        setIsFormOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await api.put(`/api/masters/fuel-rate-masters/${editingItem.id}/`, formData);
                showToast("Rate updated successfully", "success");
            } else {
                await api.post('/api/masters/fuel-rate-masters/', formData);
                showToast("Rate added successfully", "success");
            }
            setIsFormOpen(false);
            fetchData();
        } catch (error) {
            const msg = error.response?.data?.non_field_errors?.[0] ||
                error.response?.data?.detail ||
                "Operation failed. Check if rate already exists for this state and vehicle.";
            showToast(msg, "error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this rate?")) return;
        try {
            await api.delete(`/api/masters/fuel-rate-masters/${id}/`);
            showToast("Rate deleted successfully", "success");
            fetchData();
        } catch (error) {
            showToast("Deletion failed", "error");
        }
    };

    const filteredRates = rates.filter(r =>
        (r.state || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.vehicle_type || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Stats for UI
    const totalStates = [...new Set(rates.map(r => r.state))].length;
    const avg2Wheeler = rates.filter(r => r.vehicle_type === '2 Wheeler').reduce((acc, curr) => acc + parseFloat(curr.rate_per_km), 0) / (rates.filter(r => r.vehicle_type === '2 Wheeler').length || 1);
    const avg4Wheeler = rates.filter(r => r.vehicle_type === '4 Wheeler').reduce((acc, curr) => acc + parseFloat(curr.rate_per_km), 0) / (rates.filter(r => r.vehicle_type === '4 Wheeler').length || 1);

    return (
        <div className="admin-mgmt-wrapper custom-scrollbar">
            {/* Header Section */}
            <div className="admin-mgmt-header">
                <div className="flex items-center gap-4">
                    <div className="bg-magenta-600 p-4 rounded-2xl shadow-lg shadow-magenta-100 rotate-3 group-hover:rotate-0 transition-transform">
                        <Fuel className="text-white" size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">mileage Reimbursement</h1>
                        <p className="text-slate-500">Configure per-KM rates for dynamic trip expense calculations.</p>
                    </div>
                </div>
                <button className="add-btn hover:scale-105 active:scale-95 transition-all" onClick={() => handleOpenForm()}>
                    <Plus size={20} />
                    Add New Rate
                </button>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-8">
                <div className="premium-card bg-gradient-to-br from-white to-slate-50 border-0 shadow-sm p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <MapPin size={64} />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Layers size={18} />
                        </div>
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">States Covered</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{totalStates}</div>
                    <div className="mt-2 text-xs text-blue-600 font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} /> Active Geographical Filters
                    </div>
                </div>

                <div className="premium-card bg-gradient-to-br from-white to-slate-50 border-0 shadow-sm p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp size={64} />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <Car size={18} />
                        </div>
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Avg 2Wheeler Rate</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">₹{avg2Wheeler.toFixed(2)}</div>
                    <div className="mt-2 text-xs text-purple-600 font-medium italic">Base for Local Travel</div>
                </div>

                <div className="premium-card bg-gradient-to-br from-white to-slate-50 border-0 shadow-sm p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp size={64} />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Car size={18} />
                        </div>
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Avg 4Wheeler Rate</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">₹{avg4Wheeler.toFixed(2)}</div>
                    <div className="mt-2 text-xs text-emerald-600 font-medium italic">Premium Travel Logistics</div>
                </div>
            </div>

            {/* Search and Table Panel */}
            <div className="main-table-panel shadow-xl rounded-3xl border border-slate-100 overflow-hidden">
                <div className="panel-header bg-white/50 backdrop-blur-md p-6 border-b border-slate-100">
                    <div className="search-box-wrapper max-w-md w-full relative">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            className="form-input w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-magenta-100 transition-all"
                            placeholder="Filter by state or vehicle type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="data-table-container custom-scrollbar max-h-[600px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-magenta-200 border-t-magenta-600"></div>
                            <p className="text-slate-500 font-medium">Synchronizing rates...</p>
                        </div>
                    ) : (
                        <table className="modern-table w-full">
                            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">STATE</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">VEHICLE CATEGORY</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">RATE (₹/KM)</th>
                                    <th className="px-6 py-12 text-right text-xs font-bold text-slate-400 uppercase tracking-widest" style={{ textAlign: 'right' }}>CONTROL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRates.length > 0 ? filteredRates.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                                    <MapPin size={16} />
                                                </div>
                                                <span className="font-semibold text-slate-700">{item.state}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${item.vehicle_type === '4 Wheeler'
                                                ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                : 'bg-purple-50 text-purple-600 border border-purple-100'
                                                }`}>
                                                {item.vehicle_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-lg font-bold text-slate-800">
                                                <span className="text-slate-400 font-normal">₹</span>
                                                {item.rate_per_km}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    className="p-2 hover:bg-white hover:text-blue-600 hover:shadow-md rounded-xl transition-all text-slate-400"
                                                    onClick={() => handleOpenForm(item)}
                                                    title="Edit Entry"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    className="p-2 hover:bg-white hover:text-red-500 hover:shadow-md rounded-xl transition-all text-slate-400"
                                                    onClick={() => handleDelete(item.id)}
                                                    title="Delete Entry"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 text-slate-400">
                                                <TrendingUp size={48} className="opacity-20" />
                                                <p className="font-medium">No fuel rates matching your search.</p>
                                                <button className="text-magenta-600 text-sm font-bold hover:underline" onClick={() => handleOpenForm()}>
                                                    Set up your first rate
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal Form */}
            {isFormOpen && (
                <div className="modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                    <div className="modal-content bg-white w-full max-w-lg rounded-[2rem] shadow-2xl relative overflow-hidden animate-pop-in">
                        {/* Modal Header Decoration */}
                        <div className="h-2 bg-gradient-to-r from-magenta-400 to-blue-500"></div>

                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-magenta-50 text-magenta-600 rounded-2xl">
                                        <Fuel size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">{editingItem ? 'Edit Fuel Rate' : 'Initialize Rate'}</h2>
                                        <p className="text-xs text-slate-500">Define per-km pricing policy</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                        <MapPin size={14} className="text-magenta-500" />
                                        Target State
                                    </label>
                                    <SearchableSelect
                                        placeholder="Select State"
                                        options={states}
                                        value={formData.state}
                                        onChange={(val) => {
                                            // val can be a string (fallback) or a Location object (from DB)
                                            const stateName = typeof val === 'string' ? val : (val?.name || '');
                                            // When state changes, auto-pick first available vehicle type
                                            const existingForState = new Set(
                                                rates
                                                    .filter(r => r.state?.toLowerCase() === stateName?.toLowerCase())
                                                    .map(r => r.vehicle_type)
                                            );
                                            const preferredTypes = ['4 Wheeler', '2 Wheeler'];
                                            const firstAvailable = preferredTypes.find(t => !existingForState.has(t));
                                            setFormData({
                                                ...formData,
                                                state: stateName,
                                                vehicle_type: firstAvailable || formData.vehicle_type
                                            });
                                        }}
                                    />
                                    <p className="text-[10px] text-slate-400 px-1">States are synchronized from the Geographic Master data.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                        <Car size={14} className="text-magenta-500" />
                                        Vehicle Class
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['2 Wheeler', '4 Wheeler'].map((vType) => {
                                            const isTaken = takenVehicles.has(vType);
                                            const isSelected = formData.vehicle_type === vType;
                                            return (
                                                <button
                                                    key={vType}
                                                    type="button"
                                                    disabled={isTaken}
                                                    onClick={() => !isTaken && setFormData({ ...formData, vehicle_type: vType })}
                                                    title={isTaken ? `Rate for ${vType} already exists for this state` : ''}
                                                    className={`py-3 px-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 relative
                                                        ${isTaken
                                                            ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-60'
                                                            : isSelected
                                                                ? 'bg-magenta-50 border-magenta-500 text-magenta-700'
                                                                : 'bg-slate-50 border-transparent text-slate-500 grayscale hover:border-slate-300'
                                                        }`}
                                                >
                                                    <Car size={24} />
                                                    <span className="text-sm font-bold uppercase tracking-tighter">{vType}</span>
                                                    {isTaken && (
                                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                                            Already Set
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                        <IndianRupee size={14} className="text-magenta-500" />
                                        Price (Per KM)
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within:text-magenta-500">₹</div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input w-full pl-10 pr-4 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-magenta-200 transition-all font-bold text-lg"
                                            value={formData.rate_per_km}
                                            onChange={(e) => setFormData({ ...formData, rate_per_km: e.target.value })}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all" onClick={() => setIsFormOpen(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="flex-[2] py-4 px-6 rounded-2xl bg-magenta-600 text-white font-bold hover:bg-magenta-700 shadow-lg shadow-magenta-100 hover:shadow-magenta-200 transition-all">
                                        {editingItem ? 'Save Updates' : 'Confirm Rate'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FuelMaster;
