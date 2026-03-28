import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { encodeId } from '../utils/idEncoder';
import api from '../api/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
    MapPin,
    Search,
    Plus,
    X,
    Edit,
    Trash2,
    ArrowLeft,
    ArrowRight,
    Phone,
    Calendar,
    Save,
    ChevronDown,
    Lock,
    Mail,
    Car,
    CarFront,
    Contact,
    Fuel,
    LocateFixed,
    Shield,
    Settings,
    Globe,
    User,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';

const Fleet = () => {
    const { showToast } = useToast();
    const { user } = useAuth();

    const userRole = (user?.role || 'employee').toLowerCase();
    const isAdmin = userRole === 'admin' || user?.is_superuser || userRole === 'guesthouse_manager';

    const [fleetHubs, setFleetHubs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });
    const [formErrors, setFormErrors] = useState({});
    const hubImageInputRef = useRef(null);

    const validateHubForm = () => {
        const errors = {};
        if (!hubFormData.name || hubFormData.name.length < 3) errors.name = "Hub name is too short (min 3 chars)";
        if (!hubFormData.address || hubFormData.address.length < 10) errors.address = "Address is required (min 10 chars)";
        if (!hubFormData.pincode || !/^\d{6}$/.test(hubFormData.pincode)) errors.pincode = "Invalid 6-digit pincode";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateItemForm = () => {
        const errors = {};
        if (activeTab === 'vehicles') {
            if (!itemFormData.plate_number || !/^[A-Z]{2}\s\d{2}\s[A-Z]{1,2}\s\d{4}$/.test(itemFormData.plate_number.toUpperCase()) && !/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/.test(itemFormData.plate_number.toUpperCase())) {
                // errors.plate_number = "Format: XX 00 XX 0000"; // Lax validation for now as some might be different
            }
            if (!itemFormData.plate_number) errors.plate_number = "Plate number is required";
            if (!itemFormData.name) errors.name = "Model name is required";
        } else {
            if (!itemFormData.name || itemFormData.name.length < 3) errors.name = "Name is required";
            if (!itemFormData.phone || !/^\d{10}$/.test(itemFormData.phone)) errors.phone = "Invalid 10-digit phone number";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Delete handlers for vehicles and drivers
    const handleEditItem = (item) => {
        setEditingItemId(item.id);
        const isVehicle = activeTab === 'vehicles';
        setItemFormData({
            plate_number: item.plate_number || '',
            name: isVehicle ? item.model_name : item.name,
            type: item.vehicle_type || 'sedan',
            fuel_type: item.fuel_type || 'diesel',
            capacity: item.capacity || 4,
            phone: item.phone || '',
            license_number: item.license_number || '',
            status: item.status || 'Available',
            hubId: selectedHub?.id || ''
        });
        setHubSearchQuery('');
        setSuggestedHub(null);
        setShowCreateHubPrompt(false);
        setFormErrors({});
        setShowItemModal(true);
    };

    const handleDeleteItem = (itemId) => {
        const itemType = activeTab === 'vehicles' ? 'Vehicle' : 'Driver';
        setDeleteModal({
            isOpen: true,
            type: activeTab,
            id: itemId,
            title: `Delete ${itemType}?`,
            message: `Are you sure you want to remove this ${itemType.toLowerCase()} from the fleet?`
        });
    };

    const getApiErrorMessage = (error, fallback = 'An error occurred') => {
        const payload = error?.response?.data;
        if (!payload) return error?.message || fallback;
        if (typeof payload === 'string') return payload;
        if (payload.error && typeof payload.error === 'string') return payload.error;
        if (typeof payload === 'object') {
            const firstKey = Object.keys(payload)[0];
            const firstValue = payload[firstKey];
            if (Array.isArray(firstValue) && firstValue.length) return `${firstKey}: ${firstValue[0]}`;
            if (typeof firstValue === 'string') return `${firstKey}: ${firstValue}`;
        }
        return fallback;
    };

    const getGoogleMapsUrl = (hub) => {
        if (!hub) return null;
        const lat = Number(hub.latitude);
        const lng = Number(hub.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        }
        const addressQuery = [hub.address, hub.location, hub.pincode].filter(Boolean).join(', ').trim();
        if (addressQuery) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`;
        return null;
    };

    const openHubInMaps = (hub) => {
        const mapsUrl = getGoogleMapsUrl(hub);
        if (!mapsUrl) {
            showToast('Location not available.', 'warning');
            return;
        }
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    };

    const toTitleCase = (value) => {
        if (!value) return '';
        const normalized = String(value).replace(/_/g, ' ').trim().toLowerCase();
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    };

    // Compute real-time occupancy from booking dates
    const getVehicleLiveStatus = (vehicle) => {
        const todayStr = new Date().toISOString().slice(0, 10);

        const fmt = (d) => {
            const [, m, day] = d.slice(0, 10).split('-');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${parseInt(day)} ${months[parseInt(m) - 1]}`;
        };

        // 1. Active booking (today is within the window)
        const activeBooking = (vehicle.bookings || []).find(b =>
            b.start_date && b.end_date &&
            todayStr >= b.start_date.slice(0, 10) &&
            todayStr <= b.end_date.slice(0, 10)
        );
        if (activeBooking) {
            return {
                liveStatus: 'Occupied',
                activePeriod: `${fmt(activeBooking.start_date)} \u2013 ${fmt(activeBooking.end_date)}`,
                requesterName: activeBooking.requester_name || ''
            };
        }

        // 2. Upcoming booking (starts in the future)
        const upcoming = [...(vehicle.bookings || [])]
            .filter(b => b.start_date && b.start_date.slice(0, 10) > todayStr)
            .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
        if (upcoming) {
            return {
                liveStatus: 'Booked',
                activePeriod: `From ${fmt(upcoming.start_date)} \u2013 ${fmt(upcoming.end_date)}`,
                requesterName: upcoming.requester_name || ''
            };
        }

        return { liveStatus: 'Available', activePeriod: null, requesterName: null };
    };

    const normalizeHub = (hub) => ({
        ...hub,
        isActive: hub.is_active,
        vehicles: (hub.vehicles || []).map(v => {
            const { liveStatus, activePeriod, requesterName } = getVehicleLiveStatus(v);
            return {
                ...v,
                name: v.plate_number,
                type: toTitleCase(v.vehicle_type || 'sedan'),
                status: liveStatus,          // live computed status
                activePeriod,
                requesterName
            };
        }),
        drivers: (hub.drivers || []).map(d => ({ ...d, name: d.name }))
    });

    const mapBookingsToEvents = (hub) => {
        const events = [];
        (hub?.vehicles || []).forEach(vehicle => {
            (vehicle.bookings || []).forEach(booking => {
                const startDate = booking.start_date;
                const endDate = booking.end_date;
                events.push({
                    id: booking.id,
                    vehicleId: vehicle.id,
                    plateNumber: vehicle.plate_number,
                    driverId: booking.driver || '',
                    driverName: booking.driver_name || '',
                    trip: booking.trip || '',
                    bookingType: booking.booking_type || 'Official',
                    status: (booking.remarks || '').startsWith('[STATUS:') ? booking.remarks.split(']')[0].replace('[STATUS:', '') : 'Confirmed',
                    startDate,
                    endDate,
                    details: booking.requester_name || '-',
                    checkIn: new Date(startDate).toLocaleDateString(),
                    checkOut: new Date(endDate).toLocaleDateString(),
                    remarks: (booking.remarks || '').startsWith('[STATUS:') ? booking.remarks.split(']').slice(1).join(']').trim() : (booking.remarks || '')
                });
            });
        });
        return events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    };

    const fetchHubs = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/fleet/hub/');
            const normalized = response.data.map(normalizeHub);
            setFleetHubs(normalized);
        } catch (err) {
            showToast("Failed to load fleet hubs", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchHubs();
            fetchFleetRequests(); // Load count immediately
        }
    }, [isAdmin]);

    const [selectedHub, setSelectedHub] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('vehicles');
    const [topLevelView, setTopLevelView] = useState('hubs'); // 'hubs' or 'requests'
    const [fleetRequests, setFleetRequests] = useState([]);
    const [manualSelections, setManualSelections] = useState({}); // { trip_id: hub_id }
    
    // CALENDAR STATES
    const [currentDate, setCurrentDate] = useState(new Date());
    const realToday = new Date(); realToday.setHours(0,0,0,0);
    const [days, setDays] = useState([]);

    useEffect(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const numDays = new Date(year, month + 1, 0).getDate();
        setDays(Array.from({ length: numDays }, (_, i) => i + 1));
    }, [currentDate]);


    const fetchFleetRequests = async () => {
        try {
            const response = await api.get('/api/trips/?all=true');
            const trips = Array.isArray(response.data) ? response.data : (response.data.results || []);
            const requests = trips.filter(t =>
                t.accommodation_requests &&
                t.accommodation_requests.includes('Request for Company Vehicle') &&
                !t.has_vehicle_booking
            );
            setFleetRequests(requests);
        } catch (err) { }
    };

    const handleNoVehicleNotify = async (req) => {
        try {
            await api.post('/api/notifications/', {
                title: 'No Vehicle Available',
                message: `No company vehicle is available at your destination (${req.destination}) for trip ${req.trip_id}. Please arrange alternate transport or contact the fleet manager.`,
                type: 'info',
                trip_id: req.trip_id,
                user: req.user
            });

            // Update trip to remove the vehicle request so it doesn't show up again
            const updatedAcc = (req.accommodation_requests || []).filter(item => item !== 'Request for Company Vehicle');
            await api.patch(`/api/trips/${req.trip_id}/`, {
                accommodation_requests: updatedAcc
            });

            showToast(`Employee informed and request cleared`, 'warning');
            fetchFleetRequests();
        } catch (err) {
            showToast('Failed to process request', 'error');
        }
    };

    useEffect(() => {
        if (activeTab === 'requests') fetchFleetRequests();
    }, [activeTab]);

    const [assignModal, setAssignModal] = useState({ open: false, trip: null });
    const [assignForm, setAssignForm] = useState({ vehicleId: '', driverId: '', startDate: '', endDate: '', remarks: '' });
    const [allVehicles, setAllVehicles] = useState([]);
    const [allDrivers, setAllDrivers] = useState([]);

    const openAssignModal = (trip) => {
        const vehicles = fleetHubs.flatMap(h => h.vehicles || []);
        const drivers = fleetHubs.flatMap(h => h.drivers || []);
        setAllVehicles(vehicles);
        setAllDrivers(drivers);
        setAssignForm({ vehicleId: '', driverId: '', startDate: trip.start_date, endDate: trip.end_date, remarks: '' });
        setAssignModal({ open: true, trip });
    };

    const handleAssignVehicle = async () => {
        const { trip } = assignModal;
        if (!assignForm.vehicleId || !assignForm.startDate || !assignForm.endDate) {
            showToast('Please select a vehicle and dates.', 'error');
            return;
        }
        try {
            await api.post(`/api/fleet/vehicles/${assignForm.vehicleId}/bookings/`, {
                trip: trip.trip_id,
                driver: assignForm.driverId || null,
                booking_type: 'Official',
                start_date: assignForm.startDate,
                end_date: assignForm.endDate,
                requester_name: trip.trip_leader,
                remarks: assignForm.remarks
            });
            showToast('Vehicle assigned! Employee notified.', 'success');
            setAssignModal({ open: false, trip: null });
            fetchFleetRequests();
        } catch (err) {
            showToast(getApiErrorMessage(err, 'Failed to assign vehicle'), 'error');
        }
    };

    const [showHubModal, setShowHubModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingItemId, setEditingItemId] = useState(null);

    const [hubFormData, setHubFormData] = useState({
        name: '', address: '', location: '', pincode: '', isActive: true, 
        latitude: '', longitude: '', image: '', description: '',
        continent_id: '', country_id: '', state_id: '', district_id: '',
        mandal_id: '', cluster_id: '', visiting_location_id: ''
    });

    const [itemFormData, setItemFormData] = useState({
        name: '', type: 'sedan', phone: '', status: 'Available', fuel_type: 'diesel', capacity: 4, plate_number: '', license_number: '', hubId: ''
    });

    // Hub transfer state
    const [hubSearchQuery, setHubSearchQuery] = useState('');
    const [suggestedHub, setSuggestedHub] = useState(null);   // matched existing hub
    const [showCreateHubPrompt, setShowCreateHubPrompt] = useState(false);
    const [newHubForTransfer, setNewHubForTransfer] = useState({ name: '', address: '', pincode: '' });

    // --- GEO HIERARCHY STATES ---
    const [fullHierarchy, setFullHierarchy] = useState([]);
    const [geoLoading, setGeoLoading] = useState(false);
    const [geoError, setGeoError] = useState(null);
    const [continents, setContinents] = useState([]);
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [mandals, setMandals] = useState([]);
    const [clusters, setClusters] = useState([]);
    const [visitingLocations, setVisitingLocations] = useState([]);

    const fetchFullHierarchy = async (forceRefetch = false) => {
        if (fullHierarchy.length > 0 && !geoError && !forceRefetch) return;
        setGeoLoading(true);
        try {
            const res = await api.get("/api/masters/locations/live_hierarchy/");
            const data = res.data.results || res.data.data || res.data;
            setFullHierarchy(Array.isArray(data) ? data : []);
        } catch (err) {
            setGeoError("Geo-load failed");
        } finally {
            setGeoLoading(false);
        }
    };

    useEffect(() => {
        if (showHubModal) fetchFullHierarchy();
    }, [showHubModal]);

    useEffect(() => {
        if (fullHierarchy.length > 0) setContinents(fullHierarchy.map(c => ({ id: c.id, name: c.name })));
    }, [fullHierarchy]);

    const getFilterName = (val) => {
        if (!val) return '';
        if (typeof val === 'object') return (val.name || '').trim().toLowerCase();
        return String(val).trim().toLowerCase();
    };

    const getChildren = (type, filters) => {
        if (!fullHierarchy || !fullHierarchy.length) return [];
        let data = fullHierarchy;
        if (type === 'continent') return data;
        const continent = data.find(c => getFilterName(c) === getFilterName(filters.continent_name));
        const countries = continent?.children || continent?.countries || [];
        if (type === 'country') return countries;
        const country = countries.find(c => getFilterName(c) === getFilterName(filters.country_name));
        const states = country?.states || country?.state || country?.children || [];
        if (type === 'state') return states;
        const state = states.find(s => getFilterName(s) === getFilterName(filters.state_name));
        const districts = state?.districts || state?.district || state?.children || [];
        if (type === 'district') return districts;
        const district = districts.find(d => getFilterName(d) === getFilterName(filters.district_name));
        const mandals = district?.mandals || district?.mandal || district?.children || [];
        if (type === 'mandal') return mandals;
        const mandal = mandals.find(m => getFilterName(m) === getFilterName(filters.mandal_name));
        const clusters = [...(mandal?.clusters || []), ...(mandal?.children || [])];
        if (type === 'cluster') return clusters;

        const cluster = clusters.find(c => getFilterName(c) === getFilterName(filters.cluster_name));
        const visitingLocations = cluster?.visiting_locations || cluster?.locations || [];
        if (type === 'visitingLocation') return visitingLocations;

        return [];
    };

    useEffect(() => {
        if (!showHubModal) return;
        const filters = {
            continent_name: continents.find(c => c.id === hubFormData.continent_id)?.name,
            country_name: countries.find(c => c.id === hubFormData.country_id)?.name,
            state_name: states.find(s => s.id === hubFormData.state_id)?.name,
            district_name: districts.find(d => d.id === hubFormData.district_id)?.name,
            mandal_name: mandals.find(m => m.id === hubFormData.mandal_id)?.name,
            cluster_name: clusters.find(c => c.id === hubFormData.cluster_id)?.name,
        };
        setCountries(getChildren('country', filters));
        setStates(getChildren('state', filters));
        setDistricts(getChildren('district', filters));
        setMandals(getChildren('mandal', filters));
        setClusters(getChildren('cluster', filters));
        setVisitingLocations(getChildren('visitingLocation', filters));
    }, [hubFormData.continent_id, hubFormData.country_id, hubFormData.state_id, hubFormData.district_id, hubFormData.mandal_id, hubFormData.cluster_id, continents, fullHierarchy, showHubModal]);

    const handleLocationSelect = (type, selectedOpt) => {
        const idMap = { continent: 'continent_id', country: 'country_id', state: 'state_id', district: 'district_id', mandal: 'mandal_id', cluster: 'cluster_id', visiting_location: 'visiting_location_id' };
        const fieldName = idMap[type];
        const selectedValue = selectedOpt ? (selectedOpt.id || '') : '';
        setHubFormData(prev => {
            const newState = { ...prev, [fieldName]: selectedValue };
            if (type === 'continent') { newState.country_id = ''; newState.state_id = ''; newState.district_id = ''; newState.mandal_id = ''; newState.cluster_id = ''; newState.visiting_location_id = ''; }
            if (type === 'country') { newState.state_id = ''; newState.district_id = ''; newState.mandal_id = ''; newState.cluster_id = ''; newState.visiting_location_id = ''; }
            if (type === 'state') { newState.district_id = ''; newState.mandal_id = ''; newState.cluster_id = ''; newState.visiting_location_id = ''; }
            if (type === 'district') { newState.mandal_id = ''; newState.cluster_id = ''; newState.visiting_location_id = ''; }
            if (type === 'mandal') { newState.cluster_id = ''; newState.visiting_location_id = ''; }
            if (type === 'cluster') { newState.visiting_location_id = ''; }
            if ((type === 'cluster' || type === 'mandal' || type === 'visiting_location') && selectedOpt) { newState.location = selectedOpt.name; }
            return newState;
        });
    };

    const handleHubSearch = (query) => {
        setHubSearchQuery(query);
        setShowCreateHubPrompt(false);
        setSuggestedHub(null);
        if (!query.trim()) { setItemFormData(p => ({ ...p, hubId: selectedHub?.id || '' })); return; }
        const match = fleetHubs.find(h => h.name.toLowerCase().includes(query.toLowerCase()));
        if (match) {
            setSuggestedHub(match);
            setItemFormData(p => ({ ...p, hubId: match.id }));
        } else {
            setShowCreateHubPrompt(true);
            setNewHubForTransfer({ name: query, address: '', pincode: '' });
        }
    };

    const handleTransferHubCreate = async () => {
        if (!newHubForTransfer.name || !newHubForTransfer.address || !newHubForTransfer.pincode) {
            showToast('Please fill Hub name, address and pincode.', 'error');
            return;
        }
        try {
            const res = await api.post('/api/fleet/hub/', {
                name: newHubForTransfer.name,
                address: newHubForTransfer.address,
                location: newHubForTransfer.address,
                pincode: newHubForTransfer.pincode,
                is_active: true
            });
            const createdHub = normalizeHub(res.data);
            setFleetHubs(prev => [...prev, createdHub]);
            setSuggestedHub(createdHub);
            setItemFormData(p => ({ ...p, hubId: createdHub.id }));
            setShowCreateHubPrompt(false);
            showToast(`Hub "${createdHub.name}" created!`, 'success');
        } catch (err) {
            showToast(getApiErrorMessage(err, 'Failed to create hub'), 'error');
        }
    };

    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingTab, setBookingTab] = useState('Official');
    const [tripSearch, setTripSearch] = useState('');
    const [showTripResults, setShowTripResults] = useState(false);
    const [trips, setTrips] = useState([]);
    const [isLoadingTrips, setIsLoadingTrips] = useState(false);
    const inputRef = useRef(null);

    const [bookingData, setBookingData] = useState({
        vehicleId: '', plateNumber: '', status: 'Confirmed', employeeName: '', tripId: '', checkInDate: '', checkOutDate: '', remarks: '', driverId: ''
    });

    useEffect(() => {
        const fetchTrips = async () => {
            if (!showTripResults) return;
            setIsLoadingTrips(true);
            try {
                const encodedSearch = tripSearch ? btoa(tripSearch) : '';
                const params = encodedSearch ? { search: encodedSearch } : {};
                const response = await api.get('/api/trips/search/', { params });
                const results = Array.isArray(response.data) ? response.data : (response.data.results || []);
                const mapped = results.map(t => ({
                    id: t.trip_id,
                    trip_id: t.trip_id,
                    title: t.purpose,
                    employee: t.trip_leader || 'N/A',
                    dept: t.department || 'Admin',
                    startDate: t.start_date,
                    endDate: t.end_date,
                    user: t.user
                }));
                setTrips(mapped);
            } catch (err) { } finally { setIsLoadingTrips(false); }
        };
        const timer = setTimeout(fetchTrips, 300);
        return () => clearTimeout(timer);
    }, [tripSearch, showTripResults]);

    const handleBookingSave = async () => {
        if (!bookingData.vehicleId) return;
        if (bookingTab === 'Official' && !bookingData.tripId) { showToast('Please link a Trip ID', 'warning'); return; }

        const isMaintenance = bookingTab === 'Maintenance';
        const finalRemarks = isMaintenance ? `[MAINTENANCE] ${bookingData.remarks || ''}` : bookingData.remarks;
        
        try {
            const payload = {
                trip: bookingData.tripId,
                booking_type: bookingTab,
                start_date: bookingData.checkInDate,
                end_date: bookingData.checkOutDate,
                requester_name: isMaintenance ? 'Service Dept' : (bookingData.employeeName || 'Other'),
                remarks: finalRemarks,
                driver: isMaintenance ? null : (bookingData.driverId || null)
            };

            await api.post(`/api/fleet/vehicles/${bookingData.vehicleId}/bookings/`, payload);
            
            // If maintenance, update vehicle status globally
            if (isMaintenance) {
                await api.patch(`/api/fleet/vehicles/${bookingData.vehicleId}/`, { status: 'maintenance' });
            }

            showToast(`Vehicle ${bookingData.plateNumber} ${isMaintenance ? 'sent for Maintenance' : 'Booked Successfully'}!`, 'success');
            setShowBookingModal(false);
            if (selectedHub) {
                const res = await api.get(`/api/fleet/hub/${selectedHub.id}/`);
                setSelectedHub(normalizeHub(res.data));
            }
            fetchHubs();
        } catch (err) {
            showToast(getApiErrorMessage(err, 'Booking failed'), 'error');
        }
    };

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const handleHubInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setHubFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleEditHub = (hub) => {
        setEditingId(hub.id);
        setHubFormData({
            name: hub.name || '',
            address: hub.address || '',
            location: hub.location || '',
            pincode: hub.pincode || '',
            isActive: hub.isActive,
            latitude: hub.latitude || '',
            longitude: hub.longitude || '',
            image: hub.image || '',
            description: hub.description || '',
            continent_id: hub.continent_id || '',
            country_id: hub.country_id || '',
            state_id: hub.state_id || '',
            district_id: hub.district_id || '',
            mandal_id: hub.mandal_id || '',
            cluster_id: hub.cluster_id || '',
            visiting_location_id: hub.visiting_location_id || ''
        });
        setFormErrors({});
        setShowHubModal(true);
    };

    const handleDeleteHub = (hub) => {
        setDeleteModal({
            isOpen: true,
            type: 'hub',
            id: hub.id,
            title: 'Delete Fleet Hub?',
            message: `Deleting "${hub.name}" will remove all its vehicles and drivers. This action is irreversible.`
        });
    };

    const confirmDelete = async () => {
        const { type, id } = deleteModal;
        try {
            if (type === 'hub') {
                await api.delete(`/api/fleet/hub/${id}/`);
                setFleetHubs(prev => prev.filter(h => h.id !== id));
                showToast('Hub deleted successfully', 'success');
            } else if (type === 'vehicles' || type === 'drivers') {
                const endpoint = type === 'vehicles' ? 'vehicles' : 'drivers';
                await api.delete(`/api/fleet/items/${endpoint}/${id}/`);
                if (selectedHub) {
                    const res = await api.get(`/api/fleet/hub/${selectedHub.id}/`);
                    setSelectedHub(normalizeHub(res.data));
                }
                showToast(`${type === 'vehicles' ? 'Vehicle' : 'Driver'} removed`, 'success');
            }
            setDeleteModal({ isOpen: false });
            fetchHubs();
        } catch (err) {
            showToast(getApiErrorMessage(err, 'Failed to delete'), 'error');
        }
    };

    const handleSaveHub = () => {
        if (!validateHubForm()) return;

        const payload = {
            name: hubFormData.name,
            address: hubFormData.address,
            location: hubFormData.location || hubFormData.address,
            pincode: hubFormData.pincode,
            latitude: hubFormData.latitude || null,
            longitude: hubFormData.longitude || null,
            is_active: hubFormData.isActive,
            description: hubFormData.description || '',
            continent_id: hubFormData.continent_id,
            country_id: hubFormData.country_id,
            state_id: hubFormData.state_id,
            district_id: hubFormData.district_id,
            mandal_id: hubFormData.mandal_id,
            cluster_id: hubFormData.cluster_id,
            visiting_location_id: hubFormData.visiting_location_id
        };

        const promise = editingId ? api.put(`/api/fleet/hub/${editingId}/`, payload) : api.post('/api/fleet/hub/', payload);
        promise.then(res => {
            fetchHubs();
            setShowHubModal(false);
            showToast(editingId ? 'Hub updated successfully' : 'New hub created', 'success');
        }).catch(err => showToast(getApiErrorMessage(err), 'error'));
    };

    const handleAddItem = () => {
        setEditingItemId(null);
        setItemFormData({
            name: '',
            type: 'sedan',
            phone: '',
            status: 'Available',
            fuel_type: 'diesel',
            capacity: 4,
            plate_number: '',
            license_number: '',
            hubId: selectedHub?.id || ''
        });
        setFormErrors({});
        setShowItemModal(true);
    };

    const handleSaveItem = async () => {
        if (!validateItemForm()) return;

        const isVehicle = activeTab === 'vehicles';
        const endpoint = isVehicle ? 'vehicles' : 'drivers';
        const targetHubId = itemFormData.hubId || selectedHub?.id;

        const payload = isVehicle ? {
            plate_number: itemFormData.plate_number,
            model_name: itemFormData.name,
            vehicle_type: itemFormData.type,
            fuel_type: itemFormData.fuel_type,
            capacity: parseInt(itemFormData.capacity),
            status: itemFormData.status.toLowerCase(),
            hub: targetHubId
        } : {
            name: itemFormData.name,
            phone: itemFormData.phone,
            license_number: itemFormData.license_number,
            status: itemFormData.status,
            hub: targetHubId
        };

        try {
            const promise = editingItemId
                ? api.put(`/api/fleet/items/${endpoint}/${editingItemId}/`, payload)
                : api.post(`/api/fleet/items/${endpoint}/`, payload);
            await promise;

            showToast(editingItemId ? 'Item updated' : 'Added successfully', 'success');

            if (selectedHub) {
                const res = await api.get(`/api/fleet/hub/${selectedHub.id}/`);
                setSelectedHub(normalizeHub(res.data));
            }
            fetchHubs();
            setShowItemModal(false);
            setHubSearchQuery(''); setSuggestedHub(null); setShowCreateHubPrompt(false);
        } catch (err) {
            showToast(getApiErrorMessage(err), 'error');
        }
    };

    const renderCalendarView = () => {
        if (!selectedHub) return null;
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        // Pre-calculate mapping for performance
        const hubEvents = mapBookingsToEvents(selectedHub);

        // Filter events for the monthly log
        const monthlyEvents = hubEvents.filter(event => {
            const startStr = event.startDate.slice(0, 10);
            const endStr = event.endDate.slice(0, 10);
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            const fmtStart = new Date(startStr);
            const fmtEnd = new Date(endStr);
            return fmtStart <= monthEnd && fmtEnd >= monthStart;
        });

        if (!selectedHub.vehicles || selectedHub.vehicles.length === 0) {
            return (
                <div className="gh-list-section mt-4">
                    <div className="calendar-container">
                        <div className="calendar-controls">
                            <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                            <div className="calendar-nav">
                                <button onClick={() => changeMonth(-1)}>&lt;</button>
                                <button onClick={() => changeMonth(1)}>&gt;</button>
                            </div>
                        </div>
                        <div style={{ padding: '5rem 2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <div className="mb-3" style={{ opacity: 0.15 }}><MapPin size={48} /></div>
                            <h3 style={{ color: '#64748b', fontWeight: 600 }}>No Vehicles in this Hub</h3>
                            <p style={{ color: '#94a3b8' }}>Please add vehicles to see availability on the calendar.</p>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="gh-list-section mt-4">
                <div className="calendar-container">
                    <div className="calendar-controls">
                        <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                        <div className="calendar-nav">
                            <button onClick={() => changeMonth(-1)}>&lt;</button>
                            <button onClick={() => changeMonth(1)}>&gt;</button>
                        </div>
                        <div className="calendar-legend">
                            <span className="legend-item"><span className="dot available"></span> Available</span>
                            <span className="legend-item"><span className="dot occupied"></span> Occupied</span>
                            <span className="legend-item"><span className="dot maintenance"></span> Maintenance</span>
                        </div>
                    </div>

                    <div className="calendar-grid-wrapper">
                        <table className="calendar-table">
                            <thead>
                                <tr>
                                    <th className="room-col-header" style={{ width: '220px' }}>Vehicle Detail</th>
                                    {days.map(d => {
                                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                        const isToday = date.toDateString() === realToday.toDateString();
                                        return (
                                            <th key={d} className={`date-header ${isToday ? 'current-day' : ''}`}>
                                                <div className="date-num">{d}</div>
                                                <div className="day-name">{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {selectedHub.vehicles.map(v => (
                                    <tr key={v.id}>
                                        <td className="room-cell">
                                            <div className="room-name">{v.plate_number}</div>
                                            <span className="room-type">{v.type || v.model_name}</span>
                                        </td>
                                        {days.map(d => {
                                            const { status, color } = getStatusForDate(v.id, d, hubEvents);
                                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                            const isToday = date.toDateString() === realToday.toDateString();
                                            const isPast = date.getTime() < realToday.getTime() && !isToday;
                                            
                                            // Handle cell-color mapping same as GH
                                            const cellColorClass = status === 'available' ? 'available' : status;

                                            return (
                                                <td key={d} 
                                                    className={`status-cell ${cellColorClass} ${isPast ? 'past' : ''} ${isToday ? 'today-cell' : ''}`}
                                                    onClick={() => !isPast && handleCalendarCellClick(v, d)}
                                                >
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="event-log-container mt-4">
                        <h3>Monthly Fleet Event Log</h3>
                        <table className="event-log-table">
                            <thead>
                                <tr>
                                    <th>VEHICLE</th>
                                    <th>MODEL</th>
                                    <th>REQUESTER / BOOKED BY</th>
                                    <th>ALLOCATION PERIOD</th>
                                    <th>TYPE</th>
                                    <th>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                <Calendar size={32} style={{ opacity: 0.35 }} />
                                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>No Fleet Events This Month</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    monthlyEvents.map(e => (
                                        <tr key={e.id}>
                                            <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{e.vehiclePlate}</td>
                                            <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{e.vehicleModel}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600 }}>{e.details}</span>
                                                    {e.driverName && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Driver: {e.driverName}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.8rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ArrowRight size={10} color="var(--success)" /> {e.startDate.slice(0, 16).replace('T', ' ')}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ArrowLeft size={10} color="var(--error)" /> {e.endDate.slice(0, 16).replace('T', ' ')}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ 
                                                    padding: '4px 10px', 
                                                    borderRadius: '6px', 
                                                    fontSize: '0.7rem', 
                                                    fontWeight: 800, 
                                                    textTransform: 'uppercase',
                                                    background: e.bookingType === 'Maintenance' ? '#fef2f2' : (e.bookingType === 'Official' ? '#f0f9ff' : '#f8fafc'),
                                                    color: e.bookingType === 'Maintenance' ? '#ef4444' : (e.bookingType === 'Official' ? '#0ea5e9' : '#64748b')
                                                }}>
                                                    {e.bookingType}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-pill ${e.status.toLowerCase().replace(' ', '-')}`}>
                                                    <span className="dot-small"></span> {e.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const getStatusForDate = (vehicleId, day, hubEvents) => {
        const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const match = hubEvents.find(e => {
            if (String(e.vehicleId) !== String(vehicleId)) return false;
            return dateStr >= e.startDate.slice(0,10) && dateStr <= e.endDate.slice(0,10);
        });

        if (match) {
            const mStatus = (match.status || '').toLowerCase();
            const status = mStatus === 'maintenance' ? 'maintenance' : 'occupied';
            return { status, color: status };
        }
        return { status: 'available', color: 'available' };
    };

    const handleCalendarCellClick = (v, day) => {
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        clickedDate.setHours(0, 0, 0, 0);
        if (clickedDate.getTime() < realToday.getTime()) return;

        const dateStr = `${clickedDate.getFullYear()}-${String(clickedDate.getMonth() + 1).padStart(2, '0')}-${String(clickedDate.getDate()).padStart(2, '0')}`;
        const hubEvents = mapBookingsToEvents(selectedHub);
        const existingEvent = hubEvents.find(e => e.vehicleId === v.id && dateStr >= e.startDate.slice(0,10) && dateStr <= e.endDate.slice(0,10));

        if (existingEvent) {
             setBookingData({
                vehicleId: v.id,
                plateNumber: v.plate_number,
                status: existingEvent.status || 'Confirmed',
                employeeName: existingEvent.details || '',
                tripId: existingEvent.trip || '',
                checkInDate: existingEvent.startDate.slice(0,16),
                checkOutDate: existingEvent.endDate.slice(0,16),
                remarks: existingEvent.remarks || '',
                driverId: existingEvent.driverId || ''
            });
        } else {
            // New booking from calendar click
            setBookingData({
                vehicleId: v.id,
                plateNumber: v.plate_number,
                status: 'Confirmed',
                employeeName: '',
                tripId: '',
                checkInDate: dateStr + 'T00:00',
                checkOutDate: dateStr + 'T23:59',
                remarks: '',
                driverId: ''
            });
        }
        setShowBookingModal(true);
    };

    const renderTabContent = () => {
        if (activeTab === 'requests') {
            return (
                <div className="gh-list-section">
                    <div className="gh-sub-header"><h3>Fleet Requests {selectedHub ? `(@ ${selectedHub.name})` : '(Global)'}</h3><button className="btn-refresh-pill" onClick={fetchFleetRequests}>REFRESH</button></div>
                    <div className="gh-item-list">
                        {(() => {
                            // Filter requests: if selectedHub exists, only show ones matching this hub.
                            // Else show all.
                            const filteredForView = fleetRequests.filter(req => {
                                const reqOrigin = req.source || req.origin;
                                if (selectedHub) {
                                    return selectedHub.location?.toLowerCase().includes(reqOrigin?.toLowerCase()) ||
                                           selectedHub.address?.toLowerCase().includes(reqOrigin?.toLowerCase()) ||
                                           reqOrigin?.toLowerCase().includes(selectedHub.name?.toLowerCase()) ||
                                           manualSelections[req.trip_id] === String(selectedHub.id);
                                }
                                return true;
                            });

                            if (filteredForView.length === 0) return <div className="empty-state-card-vsmall">No pending vehicle requests {selectedHub ? `for ${selectedHub.name}` : ''} found.</div>;

                            return filteredForView.map(req => {
                                const reqOrigin = req.source || req.origin;
                                const matchingHub = fleetHubs.find(h =>
                                    h.location?.toLowerCase().includes(reqOrigin?.toLowerCase()) ||
                                    h.address?.toLowerCase().includes(reqOrigin?.toLowerCase()) ||
                                    reqOrigin?.toLowerCase().includes(h.name?.toLowerCase())
                                );

                            const manualHubId = manualSelections[req.trip_id];
                            const manuallyChosenHub = manualHubId ? fleetHubs.find(h => String(h.id) === String(manualHubId)) : null;

                            const finalHub = manuallyChosenHub || matchingHub;
                            const hasAvailable = finalHub && (finalHub.vehicles || []).some(v => (v.status || '').toLowerCase() === 'available');

                            return (
                                <div key={req.trip_id} className="gh-list-item request-card-premium">
                                    <div className="item-info">
                                        <div className="request-header">
                                            <span className="trip-id-tag-mini">{req.trip_id}</span>
                                            <span className={`badge ${finalHub ? (hasAvailable ? 'pending' : 'rejected') : 'rejected'}`}>
                                                {finalHub ? (hasAvailable ? 'VEHICLE AT HUB' : 'NO VEHICLES @ HUB') : 'NO HUB IN CITY'}
                                            </span>
                                        </div>
                                        <h4 className="mt-2">{req.trip_leader} - {req.purpose}</h4>
                                        <div className="request-meta-grid">
                                            <div className="meta-item"><MapPin size={14} /> <span style={{ fontWeight: 800 }}>{req.source || req.origin}</span> → <span>{req.destination}</span></div>
                                            <div className="meta-item"><Calendar size={14} /> <span>{req.start_date} - {req.end_date}</span></div>
                                        </div>
                                        
                                        {!matchingHub && (
                                            <div className="hub-fallback-selector mt-2">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <select 
                                                        className="input-field-mini" 
                                                        value={manualHubId || ''} 
                                                        onChange={(e) => setManualSelections({ ...manualSelections, [req.trip_id]: e.target.value })}
                                                        style={{ flex: 1, padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem' }}
                                                    >
                                                        <option value="">Select an Alternative Hub...</option>
                                                        {fleetHubs.map(h => (
                                                            <option key={h.id} value={h.id}>{h.name} ({h.location})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                        {finalHub && <p className="hub-tag-small mt-1">Target Hub: {finalHub.name}</p>}
                                    </div>
                                    <div className="actions-cell-vertical">
                                        {finalHub ? (
                                            <button className="btn-primary-mini" onClick={() => { 
                                                setSelectedHub(finalHub); 
                                                setBookingTab('Official');
                                                setBookingData({
                                                    ...bookingData,
                                                    vehicleId: '', // User will select in modal
                                                    tripId: req.trip_id,
                                                    employeeName: req.trip_leader,
                                                    remarks: req.purpose,
                                                    checkInDate: req.start_date.includes('T') ? req.start_date : req.start_date + 'T00:00',
                                                    checkOutDate: req.end_date.includes('T') ? req.end_date : req.end_date + 'T23:59',
                                                    status: 'Confirmed'
                                                });
                                                setTripSearch(req.trip_id);
                                                setShowBookingModal(true);
                                            }}>Allocate Resource</button>
                                        ) : (
                                            <button className="btn-danger-mini" onClick={() => handleNoVehicleNotify(req)}>No Facility: Notify</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })})()}
                    </div>
                </div>
            );
        }

        if (activeTab === 'calendar') return renderCalendarView();

        if (!selectedHub) return null;
        const list = selectedHub[activeTab] || [];
        return (
            <div className="gh-list-section">
                <div className="gh-sub-header">
                    <h3>{toTitleCase(activeTab)} List</h3>
                    <button className="btn-add-item" onClick={handleAddItem}><Plus size={16} /> Add {activeTab === 'vehicles' ? 'Vehicle' : 'Driver'}</button>
                </div>
                <div className="gh-item-list">
                    {list.map(item => {
                        const liveStatusLower = (item.status || 'available').toLowerCase();
                        const badgeClass = liveStatusLower === 'occupied' ? 'rejected'
                            : liveStatusLower === 'booked' ? 'pending'
                                : 'available';
                        return (
                            <div key={item.id} className={`gh-list-item ${activeTab === 'vehicles' && liveStatusLower !== 'available' ? 'occupied-vehicle-card' : ''}`}>
                                <div className="item-info">
                                    <h4>{item.plate_number || item.name} {activeTab === 'vehicles' && `- ${item.model_name}`}</h4>
                                    <div className="item-badges">
                                        <span className={`badge ${activeTab === 'vehicles' ? badgeClass : liveStatusLower}`}>
                                            {item.status || 'Available'}
                                        </span>
                                        {item.vehicle_type && <span className="badge single">{toTitleCase(item.vehicle_type)}</span>}
                                        {item.fuel_type && <span className="badge open">{toTitleCase(item.fuel_type)}</span>}
                                    </div>
                                    {activeTab === 'vehicles' && item.activePeriod && (
                                        <div className="contacts-info" style={{ marginTop: '4px', color: liveStatusLower === 'occupied' ? 'var(--error, #e53e3e)' : 'var(--warning, #d97706)', fontWeight: 500 }}>
                                            <Calendar size={12} />
                                            <span>{item.activePeriod}{item.requesterName ? ` — ${item.requesterName}` : ''}</span>
                                        </div>
                                    )}
                                    {item.phone && <p className="contacts-info"><Phone size={12} /> {item.phone}</p>}
                                </div>
                                <div className="actions-cell">
                                    <button className="icon-btn-small" onClick={() => handleEditItem(item)} title="Edit">
                                        <Edit size={16} />
                                    </button>
                                    <button className="icon-btn-small delete" onClick={() => handleDeleteItem(item.id)} title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {list.length === 0 && (
                        <div className="empty-state-card-vsmall">
                            <Shield size={32} className="mb-1" style={{ opacity: 0.3 }} />
                            <p>No {activeTab} available in this hub yet.</p>
                            <button className="btn-secondary-mini mt-1" onClick={handleAddItem}>Add Now</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!isAdmin) {
        return (
            <div className="gh-page">
                <div className="premium-card gh-access-denied-card">
                    <Lock size={48} color="var(--primary)" className="mb-1" />
                    <h2>Access Denied</h2>
                    <p>Only Administrators or Fleet Managers can access this system.</p>
                </div>
            </div>
        );
    }

    const filteredHubs = fleetHubs.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="gh-page">
            {topLevelView === 'requests' ? (
                <>
                    <div className="gh-header-section">
                        <div className="header-left">
                            <h1 className="welcome-text">Fleet Requests</h1>
                            <p className="welcome-subtext">Manage active vehicle requirements from employees</p>
                        </div>
                        <button className="btn-secondary" onClick={() => setTopLevelView('hubs')}>View Fleet Hubs</button>
                    </div>
                    {renderTabContent()}
                </>
            ) : selectedHub ? (
                <>
                    <div className="gh-details-header">
                        <div className="gh-details-left">
                            <button className="gh-back-btn" onClick={() => setSelectedHub(null)}><ArrowLeft size={16} /> Back</button>
                            <div className="gh-details-title"><h1>{selectedHub.name}</h1><p><MapPin size={14} /> {selectedHub.address}</p></div>
                        </div>
                        <div className="gh-map-preview" onClick={() => openHubInMaps(selectedHub)}>
                            {selectedHub.image ? <img src={selectedHub.image} alt="Hub" /> : <Car size={40} />}
                        </div>
                    </div>
                    <div className="gh-tabs">
                        {[
                            { id: 'vehicles', icon: CarFront, label: 'Vehicles' },
                            { id: 'drivers', icon: Contact, label: 'Drivers' },
                            { id: 'calendar', icon: Calendar, label: 'Availability' },
                            { id: 'requests', icon: Mail, label: 'Fleet Requests' }
                        ].map(t => (
                            <button key={t.id} className={`gh-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}><t.icon size={16} /> {t.label}</button>
                        ))}
                    </div>
                    {renderTabContent()}
                </>
            ) : (
                <>
                    <div className="gh-header-section">
                        <div className="header-left">
                            <h1 className="welcome-text">Fleet Management</h1>
                            <p className="welcome-subtext">Manage corporate vehicles and drivers</p>
                        </div>
                        <div className="header-actions">
                            <button className="btn-secondary mr-2" onClick={() => { setTopLevelView('requests'); setActiveTab('requests'); }}>
                                <Mail size={18} /> View Requests ({fleetRequests.length})
                            </button>
                            <button className="btn-primary" onClick={() => { setEditingId(null); setHubFormData({ name: '', address: '', location: '', pincode: '', isActive: true, latitude: '', longitude: '', image: '', description: '' }); setShowHubModal(true); }}>
                                <Plus size={18} /> Add Fleet Hub
                            </button>
                        </div>
                    </div>
                    <div className="gh-search-bar premium-card">
                        <Search size={20} className="search-icon" />
                        <input type="text" placeholder="Search hubs by name or location..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="gh-grid-list">
                        {filteredHubs.length > 0 ? filteredHubs.map(hub => (
                            <div key={hub.id} className="gh-card-item premium-card cursor-pointer" onClick={() => setSelectedHub(hub)}>
                                <div className="gh-card-map-placeholder">
                                    {hub.image ? <img src={hub.image} alt="Hub" className="gh-card-image" /> : <LocateFixed size={32} className="gh-placeholder-icon" />}
                                    <span className={`status-badge ${hub.isActive ? 'active' : 'inactive'}`}>{hub.isActive ? 'Active' : 'Standby'}</span>

                                    <div className="card-actions-overlay">
                                        <button className="action-circle-btn edit" onClick={(e) => { e.stopPropagation(); handleEditHub(hub); }} title="Edit Hub">
                                            <Edit size={16} />
                                        </button>
                                        <button className="action-circle-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteHub(hub); }} title="Delete Hub">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="gh-card-details">
                                    <div className="hub-header-row">
                                        <h3>{hub.name}</h3>
                                        <ArrowLeft size={16} className="hub-arrow" style={{ transform: 'rotate(180deg)', opacity: 0.3 }} />
                                    </div>
                                    <div className="hub-meta-info">
                                        {hub.location && <p className="gh-address"><MapPin size={12} /> {hub.location}</p>}
                                        <div className="gh-stats">
                                            <div className="stat-item"><CarFront size={14} /> <span>{hub.vehicles?.length || 0} Vehicles</span></div>
                                            <div className="stat-item"><Contact size={14} /> <span>{hub.drivers?.length || 0} Drivers</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="no-data-full-page">
                                <div className="no-data-inner">
                                    <div className="no-data-icon-box">
                                        <Shield size={64} />
                                    </div>
                                    <h2>No Fleet Hubs Found</h2>
                                    <p>We couldn't find any hubs matching your search. Try adjusting your query or click below to create a new hub.</p>
                                    <button className="btn-primary" onClick={() => { setEditingId(null); setShowHubModal(true); }}>
                                        <Plus size={18} /> Add New Fleet Hub
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {showHubModal && (
                <div className="modal-overlay">
                    <div className="modal-content gh-modal premium-card" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit' : 'Add'} Fleet Hub</h2>
                            <button onClick={() => setShowHubModal(false)} className="close-btn"><X size={24} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-section-premium">
                                <h4 className="section-title">General Information</h4>
                                <div className="form-grid">
                                    <div className="form-group full">
                                        <label>Hub Name*</label>
                                        <input className={`input-field ${formErrors.name ? 'error' : ''}`} name="name" value={hubFormData.name} onChange={handleHubInputChange} placeholder="e.g. Hyderabad Main Hub" />
                                        {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                                    </div>
                                    <div className="form-group full">
                                        <label>Full Address*</label>
                                        <textarea className={`input-field ${formErrors.address ? 'error' : ''}`} name="address" rows={2} value={hubFormData.address} onChange={handleHubInputChange} placeholder="Street address, landmark, city..." />
                                        {formErrors.address && <span className="error-text">{formErrors.address}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Pincode*</label>
                                        <input className={`input-field ${formErrors.pincode ? 'error' : ''}`} name="pincode" value={hubFormData.pincode} onChange={handleHubInputChange} maxLength={6} placeholder="6-digit code" />
                                        {formErrors.pincode && <span className="error-text">{formErrors.pincode}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Hub Status</label>
                                        <div className="toggle-switch-group">
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: hubFormData.isActive ? 'var(--success)' : 'var(--text-muted)' }}>{hubFormData.isActive ? 'Active' : 'Standby'}</span>
                                            <label className="toggle-switch">
                                                <input type="checkbox" name="isActive" checked={hubFormData.isActive} onChange={handleHubInputChange} />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section-premium mt-3">
                                <div className="section-title"><Globe size={16} /> GEOGRAPHIC MAPPING</div>
                                <div className="form-grid gh-form-grid-2col">
                                    <div className="form-group"><label>Continent</label><SearchableSelect options={continents} value={continents.find(c => c.id === hubFormData.continent_id)} onChange={v => handleLocationSelect('continent', v)} loading={geoLoading} /></div>
                                    <div className="form-group"><label>Country</label><SearchableSelect options={countries} value={countries.find(c => c.id === hubFormData.country_id)} onChange={v => handleLocationSelect('country', v)} disabled={!hubFormData.continent_id} /></div>
                                    <div className="form-group"><label>State / Province</label><SearchableSelect options={states} value={states.find(s => s.id === hubFormData.state_id)} onChange={v => handleLocationSelect('state', v)} disabled={!hubFormData.country_id} /></div>
                                    <div className="form-group"><label>District / Region</label><SearchableSelect options={districts} value={districts.find(d => d.id === hubFormData.district_id)} onChange={v => handleLocationSelect('district', v)} disabled={!hubFormData.state_id} /></div>
                                    <div className="form-group"><label>Mandal / Sub-district</label><SearchableSelect options={mandals} value={mandals.find(m => m.id === hubFormData.mandal_id)} onChange={v => handleLocationSelect('mandal', v)} disabled={!hubFormData.district_id} /></div>
                                    <div className="form-group"><label>City / Admin Cluster</label><SearchableSelect options={clusters} value={clusters.find(c => c.id === hubFormData.cluster_id)} onChange={v => handleLocationSelect('cluster', v)} disabled={!hubFormData.mandal_id} /></div>
                                    <div className="form-group gh-form-section-full">
                                        <label>Exact Visiting Landmark / Location</label>
                                        <SearchableSelect options={visitingLocations} value={visitingLocations.find(l => l.id === hubFormData.visiting_location_id)} onChange={v => handleLocationSelect('visiting_location', v)} disabled={!hubFormData.cluster_id} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section-premium mt-3">
                                <h4 className="section-title">Coordination Metadata</h4>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Latitude (optional)</label>
                                        <input className="input-field" name="latitude" value={hubFormData.latitude} onChange={handleHubInputChange} placeholder="e.g. 17.3850" />
                                    </div>
                                    <div className="form-group">
                                        <label>Longitude (optional)</label>
                                        <input className="input-field" name="longitude" value={hubFormData.longitude} onChange={handleHubInputChange} placeholder="e.g. 78.4867" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowHubModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSaveHub}><Save size={18} /> {editingId ? 'Update Hub' : 'Create Hub'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showItemModal && (
                <div className="modal-overlay">
                    <div className="modal-content gh-modal premium-card" style={{ width: '650px', maxWidth: '95vw', padding: 0 }}>
                        <div className="modal-header" style={{ padding: '1.5rem', background: 'white' }}>
                            <div className="modal-title">
                                <div style={{ width: '40px', height: '40px', background: '#f0f9ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', marginRight: '1rem' }}>
                                    {activeTab === 'vehicles' ? <CarFront size={22} color="#0ea5e9" /> : <User size={22} color="#0ea5e9" />}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{editingItemId ? 'Edit' : 'Add New'} {activeTab === 'vehicles' ? 'Vehicle Resource' : 'Fleet Driver'}</h2>
                                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>Configure global {activeTab === 'vehicles' ? 'vehicle' : 'driver'} parameters</p>
                                </div>
                            </div>
                            <button onClick={() => setShowItemModal(false)} className="close-btn"><X size={24} /></button>
                        </div>

                        <div className="modal-body scrollbar-thin" style={{ padding: '1.5rem', background: '#f8fafc', maxHeight: '75vh', overflowY: 'auto' }}>
                            {activeTab === 'vehicles' ? (
                                <>
                                    <div className="form-section-premium">
                                        <div className="section-title"><Car size={16} /> BASIC SPECIFICATIONS</div>
                                        <div className="form-grid gh-form-grid-2col">
                                            <div className="form-group">
                                                <label>Plate Number*</label>
                                                <input className={`input-field ${formErrors.plate_number ? 'error' : ''}`} value={itemFormData.plate_number} onChange={e => setItemFormData({ ...itemFormData, plate_number: e.target.value })} placeholder="TS 09 EA 1234" />
                                                {formErrors.plate_number && <span className="error-text">{formErrors.plate_number}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label>Model / Brand*</label>
                                                <input className={`input-field ${formErrors.name ? 'error' : ''}`} value={itemFormData.name} onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })} placeholder="Toyota Innova Crysta" />
                                                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label>Vehicle Type</label>
                                                <select className="input-field" value={itemFormData.type} onChange={e => setItemFormData({ ...itemFormData, type: e.target.value })} style={{ borderRadius: '10px' }}>
                                                    <option value="sedan">Premium Sedan (4+1)</option>
                                                    <option value="suv">Luxury SUV (6+1)</option>
                                                    <option value="pickup">Off-road Pickup</option>
                                                    <option value="ambulance">Emergency Medical</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Fuel Consumption Type</label>
                                                <select className="input-field" value={itemFormData.fuel_type} onChange={e => setItemFormData({ ...itemFormData, fuel_type: e.target.value })} style={{ borderRadius: '10px' }}>
                                                    <option value="diesel">Turbo Diesel</option>
                                                    <option value="petrol">Premium Petrol</option>
                                                    <option value="ev">Full Electric (EV)</option>
                                                    <option value="cng">Economic CNG</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-section-premium mt-3">
                                        <div className="section-title"><Settings size={16} /> OPERATIONAL CONFIG</div>
                                        <div className="form-grid gh-form-grid-2col">
                                            <div className="form-group">
                                                <label>Maximum Seating Capacity</label>
                                                <input type="number" className="input-field" value={itemFormData.capacity} onChange={e => setItemFormData({ ...itemFormData, capacity: e.target.value })} min={1} max={25} />
                                            </div>
                                            <div className="form-group">
                                                <label>Global Status</label>
                                                <select className="input-field" value={itemFormData.status} onChange={e => setItemFormData({ ...itemFormData, status: e.target.value })} style={{ borderRadius: '10px' }}>
                                                    <option value="Available">Available for Duty</option>
                                                    <option value="Maintenance">Under Maintenance</option>
                                                    <option value="Inactive">Retired (Off-field)</option>
                                                </select>
                                            </div>
                                            <div className="form-group gh-form-section-full">
                                                <label>Location / Hub Assignment</label>
                                                <div style={{ position: 'relative' }}>
                                                    <div className="search-input-wrapper">
                                                        <MapPin size={16} className="search-icon" style={{ left: '15px' }} />
                                                        <input
                                                            className="input-field"
                                                            style={{ paddingLeft: '45px' }}
                                                            placeholder={`Current Assignment: ${selectedHub?.name || 'Central Inventory'} — type to change`}
                                                            value={hubSearchQuery}
                                                            onChange={e => handleHubSearch(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                {suggestedHub && (
                                                    <div className="service-alert info" style={{ marginTop: '0.75rem', border: '1.5px solid #bae6fd', background: '#f0f9ff' }}>
                                                        <MapPin size={16} />
                                                        <p>Resource will be moved to: <strong>{suggestedHub.name}</strong> — {suggestedHub.address}</p>
                                                    </div>
                                                )}
                                                {showCreateHubPrompt && (
                                                    <div className="form-section-premium mt-3 bg-light" style={{ borderStyle: 'dashed' }}>
                                                        <p style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={18} /> INITIALIZE NEW HUB?</p>
                                                        <div className="form-grid gh-form-grid-2col">
                                                            <div className="form-group">
                                                                <input className="input-field" placeholder="Hub Name*" value={newHubForTransfer.name} onChange={e => setNewHubForTransfer(p => ({ ...p, name: e.target.value }))} />
                                                            </div>
                                                            <button className="btn-primary" onClick={handleTransferToNewHub} style={{ height: '44px', borderRadius: '10px' }}>Assign New</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="form-section-premium">
                                        <div className="section-title"><User size={16} /> PERSONAL DOSSIER</div>
                                        <div className="form-grid gh-form-grid-2col">
                                            <div className="form-group">
                                                <label>Full Driver Name*</label>
                                                <input className={`input-field ${formErrors.name ? 'error' : ''}`} value={itemFormData.name} onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })} placeholder="John Doe" />
                                                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label>Primary Contact (Mobile)*</label>
                                                <input className={`input-field ${formErrors.phone ? 'error' : ''}`} value={itemFormData.phone} onChange={e => setItemFormData({ ...itemFormData, phone: e.target.value })} maxLength={10} placeholder="+91 00000 00000" />
                                                {formErrors.phone && <span className="error-text">{formErrors.phone}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label>Government License (DL)*</label>
                                                <input className="input-field" value={itemFormData.license_number} onChange={e => setItemFormData({ ...itemFormData, license_number: e.target.value })} placeholder="State-wide code" />
                                            </div>
                                            <div className="form-group">
                                                <label>Current Status</label>
                                                <select className="input-field" value={itemFormData.status} onChange={e => setItemFormData({ ...itemFormData, status: e.target.value })} style={{ borderRadius: '10px' }}>
                                                    <option value="Available">Available (On-field)</option>
                                                    <option value="On Leave">On Scheduled Leave</option>
                                                    <option value="Duty">Currently on Trip</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer" style={{ padding: '1.5rem', background: 'white' }}>
                            <button className="btn-secondary" onClick={() => setShowItemModal(false)}>Discard</button>
                            <button className="btn-primary" onClick={handleSaveItem} style={{ minWidth: '150px', padding: '0.875rem 1.5rem', borderRadius: '12px' }}>
                                <Save size={18} /> {editingItemId ? 'Update Entry' : 'Add entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBookingModal && (
                <div className="modal-overlay">
                    <div className="modal-content gh-modal premium-card" style={{ width: '750px', maxWidth: '95vw', padding: 0, overflow: 'hidden' }}>
                        <div className="modal-header" style={{ padding: '1.5rem', background: 'white', borderBottom: 'none' }}>
                            <div className="modal-title">
                                <div style={{ width: '40px', height: '40px', background: '#fef2f2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', marginRight: '1rem' }}>
                                    <Car size={22} color="#ef4444" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Allocate Fleet Resource</h2>
                                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>Assign vehicle and driver for trip requirements</p>
                                </div>
                            </div>
                            <button onClick={() => setShowBookingModal(false)} className="close-btn"><X size={24} /></button>
                        </div>

                        <div className="booking-form-tabs">
                            <button className={`form-tab ${bookingTab === 'Official' ? 'active' : ''}`} onClick={() => setBookingTab('Official')}>Official Trip</button>
                            <button 
                                className={`form-tab maintenance ${bookingTab === 'Maintenance' ? 'active' : ''}`} 
                                onClick={() => !bookingData.tripId && setBookingTab('Maintenance')}
                                style={{ opacity: bookingData.tripId ? 0.5 : 1, cursor: bookingData.tripId ? 'not-allowed' : 'pointer' }}
                                title={bookingData.tripId ? "Cannot switch to Maintenance while allocating a Trip" : ""}
                            >Vehicle Maintenance</button>
                            <button 
                                className={`form-tab personal ${bookingTab === 'Personal' ? 'active' : ''}`} 
                                onClick={() => !bookingData.tripId && setBookingTab('Personal')}
                                style={{ opacity: bookingData.tripId ? 0.5 : 1, cursor: bookingData.tripId ? 'not-allowed' : 'pointer' }}
                                title={bookingData.tripId ? "Cannot switch to Personal while allocating a Trip" : ""}
                            >Personal/Other</button>
                        </div>

                        <div className="modal-body scrollbar-thin" style={{ padding: '1.5rem', background: '#f8fafc', maxHeight: '70vh', overflowY: 'auto' }}>
                            {bookingTab === 'Official' && (
                                <div className="form-section-premium" style={{ marginBottom: '1.5rem' }}>
                                    <div className="section-title"><Search size={16} /> SEARCH & LINK TRIP</div>
                                    <div className="form-group trip-search-box" style={{ position: 'relative' }}>
                                        <div className="search-input-wrapper">
                                            <Search size={18} className="search-icon" />
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                className="input-field"
                                                style={{ height: '50px', fontSize: '1rem', borderRadius: '12px' }}
                                                placeholder="Search by Trip ID, Employee or Destination..."
                                                value={tripSearch}
                                                onChange={(e) => { setTripSearch(e.target.value); setShowTripResults(true); }}
                                                onFocus={() => setShowTripResults(true)}
                                            />
                                        </div>
                                        {showTripResults && (
                                            <div className="trip-search-dropdown scrollbar-thin" ref={dropdownRef} style={{ left: 0, right: 0 }}>
                                                {isLoadingTrips ? (
                                                    <div className="search-loading" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Searching Trips...</div>
                                                ) : trips.length > 0 ? (
                                                    trips.map(t => (
                                                        <div key={t.id} className="search-result-item" onClick={() => {
                                                            setBookingData({ ...bookingData, tripId: t.id, employeeName: t.employee, remarks: t.title });
                                                            setTripSearch(t.trip_id);
                                                            setShowTripResults(false);
                                                        }}>
                                                            <div className="result-header">
                                                                <span className="result-id">{t.trip_id}</span>
                                                                <span className="result-dept">{t.dept}</span>
                                                            </div>
                                                            <div className="result-main">
                                                                <p className="result-emp">{t.employee}</p>
                                                                <p className="result-purpose">{t.title}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="search-empty" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No active trip requests found</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="form-section-premium">
                                <div className="section-title"><Car size={16} /> RESOURCE DETAILS</div>
                                <div className="form-grid gh-form-grid-2col">
                                    <div className="form-group">
                                        <label>Selected Vehicle</label>
                                        {!bookingData.vehicleId ? (
                                            <select 
                                                className="input-field" 
                                                style={{ borderRadius: '10px' }}
                                                onChange={(e) => {
                                                    const v = selectedHub?.vehicles?.find(veh => String(veh.id) === e.target.value);
                                                    if (v) setBookingData({ ...bookingData, vehicleId: v.id, plateNumber: v.plate_number });
                                                }}
                                            >
                                                <option value="">-- Choose Available Vehicle --</option>
                                                {selectedHub?.vehicles?.filter(v => (v.status || '').toLowerCase() === 'available').map(v => (
                                                    <option key={v.id} value={v.id}>{v.plate_number} — {v.model_name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="input-field disabled" style={{ background: '#f1f5f9', fontWeight: 800, border: '1.5px solid #e2e8f0' }}>
                                                {bookingData.plateNumber}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {bookingTab !== 'Maintenance' && (
                                        <>
                                            <div className="form-group">
                                                <label>Assign Driver</label>
                                                <select className="input-field" value={bookingData.driverId || ''} onChange={(e) => setBookingData({ ...bookingData, driverId: e.target.value })} style={{ borderRadius: '10px' }}>
                                                    <option value="">-- No Driver Assigned --</option>
                                                    {selectedHub?.drivers?.filter(d => (d.status || d.availability || '').toLowerCase() === 'available' || d.id === bookingData.driverId).map(d => (
                                                        <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>{bookingTab === 'Official' ? 'Employee Name' : 'Requested By'}</label>
                                                <input className="input-field" value={bookingData.employeeName} onChange={(e) => setBookingData({ ...bookingData, employeeName: e.target.value })} placeholder="Full Name" />
                                            </div>
                                            <div className="form-group">
                                                <label>Status</label>
                                                <input className="input-field" value={bookingData.status} onChange={(e) => setBookingData({ ...bookingData, status: e.target.value })} placeholder="Confirmed" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="form-section-premium" style={{ marginTop: '1.5rem' }}>
                                <div className="section-title"><Calendar size={16} /> ALLOCATION PERIOD</div>
                                <div className="form-grid gh-form-grid-2col">
                                    <div className="form-group">
                                        <label>Start DateTime *</label>
                                        <input type="datetime-local" className="input-field" value={bookingData.checkInDate} onChange={(e) => setBookingData({ ...bookingData, checkInDate: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>End DateTime *</label>
                                        <input type="datetime-local" className="input-field" value={bookingData.checkOutDate} onChange={(e) => setBookingData({ ...bookingData, checkOutDate: e.target.value })} />
                                    </div>
                                    <div className="form-group gh-form-section-full">
                                        <label>Allocation Remarks / Notes</label>
                                        <textarea className="input-field" rows={2} value={bookingData.remarks} onChange={(e) => setBookingData({ ...bookingData, remarks: e.target.value })} placeholder="Maintenance notes or specific trip requirements..." />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ padding: '1.5rem', background: 'white', borderTop: 'none' }}>
                            <button className="btn-secondary" onClick={() => setShowBookingModal(false)}>Discard</button>
                            <button className="btn-primary" onClick={handleBookingSave} style={{ minWidth: '180px', padding: '0.875rem 1.5rem', borderRadius: '12px' }}>
                                <Save size={18} /> {bookingTab === 'Maintenance' ? 'Save Maintenance' : 'Confirm Allocation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {assignModal.open && (
                <div className="modal-overlay">
                    <div className="modal-content gh-modal premium-card" style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <h2>Assign Vehicle</h2>
                            <button onClick={() => setAssignModal({ open: false, trip: null })} className="close-btn"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="service-alert info" style={{ marginBottom: '1rem' }}>
                                <Car size={16} />
                                <p><strong>{assignModal.trip?.trip_leader}</strong> — Trip {assignModal.trip?.trip_id} to <strong>{assignModal.trip?.destination}</strong></p>
                            </div>
                            <div className="form-group">
                                <label>Select Vehicle *</label>
                                <select className="input-field" value={assignForm.vehicleId} onChange={e => setAssignForm(p => ({ ...p, vehicleId: e.target.value }))}>
                                    <option value="">-- Choose a vehicle --</option>
                                    {allVehicles.filter(v => (v.status || '').toLowerCase() === 'available').map(v => (
                                        <option key={v.id} value={v.id}>{v.plate_number} — {v.model_name} ({toTitleCase(v.vehicle_type)})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Assign Driver (optional)</label>
                                <select className="input-field" value={assignForm.driverId} onChange={e => setAssignForm(p => ({ ...p, driverId: e.target.value }))}>
                                    <option value="">-- No driver assigned --</option>
                                    {allDrivers.filter(d => (d.availability || '').toLowerCase() === 'available').map(d => (
                                        <option key={d.id} value={d.id}>{d.name} — {d.phone}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="date-row">
                                <div className="form-group">
                                    <label>Start Allocation *</label>
                                    <input type="datetime-local" className="input-field" value={assignForm.startDate} onChange={e => setAssignForm(p => ({ ...p, startDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>End Release *</label>
                                    <input type="datetime-local" className="input-field" value={assignForm.endDate} onChange={e => setAssignForm(p => ({ ...p, endDate: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Remarks</label>
                                <textarea className="input-field" rows={2} placeholder="Any special instructions..." value={assignForm.remarks} onChange={e => setAssignForm(p => ({ ...p, remarks: e.target.value }))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setAssignModal({ open: false, trip: null })}>Cancel</button>
                            <button className="btn-primary" onClick={handleAssignVehicle}>Confirm Assignment</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content confirmation-modal premium-card">
                        <div className="confirm-icon"><Trash2 size={40} color="var(--danger)" /></div>
                        <h2>{deleteModal.title}</h2>
                        <p>{deleteModal.message}</p>
                        <div className="confirm-actions">
                            <button className="btn-secondary" onClick={() => setDeleteModal({ isOpen: false })}>Keep It</button>
                            <button className="btn-danger" onClick={confirmDelete}>Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Fleet;
