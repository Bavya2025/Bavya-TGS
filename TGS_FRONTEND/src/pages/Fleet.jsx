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
<<<<<<< HEAD
=======
    ArrowRight,
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
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
<<<<<<< HEAD
    Shield
} from 'lucide-react';
import Modal from '../components/Modal';
=======
    Shield,
    FileText,
    Settings,
    User,
    Users,
    CreditCard,
    ClipboardList,
    Clock,
    Camera
} from 'lucide-react';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da

const Fleet = () => {
    const { showToast } = useToast();
    const { user } = useAuth();

    const userRole = (user?.role || 'employee').toLowerCase();
    const isAdmin = userRole === 'admin' || user?.is_superuser || userRole === 'guesthouse_manager';

    const [fleetHubs, setFleetHubs] = useState([]);
<<<<<<< HEAD
    const [isLoading, setIsLoading] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });
    const [formErrors, setFormErrors] = useState({});
    const hubImageInputRef = useRef(null);

=======
    const [selectedHub, setSelectedHub] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('vehicles');
    const [fleetRequests, setFleetRequests] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });
    const [assignModal, setAssignModal] = useState({ open: false, trip: null });
    const [assignForm, setAssignForm] = useState({ vehicleId: '', driverId: '', startDate: '', endDate: '', remarks: '', booking_type: 'Official' });
    const [allVehicles, setAllVehicles] = useState([]);
    const [allDrivers, setAllDrivers] = useState([]);
    const [formErrors, setFormErrors] = useState({});
    const [showAllAvailableMap, setShowAllAvailableMap] = useState({});
    const [activeFleetBookingRequest, setActiveFleetBookingRequest] = useState(null);
    const [isGlobalRequestView, setIsGlobalRequestView] = useState(false);
    const hubImageInputRef = useRef(null);

    const [showHubModal, setShowHubModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingItemId, setEditingItemId] = useState(null);

    const [hubFormData, setHubFormData] = useState({
        name: '', address: '', location: '', pincode: '', isActive: true, latitude: '', longitude: '', image: '', description: '',
        continent_id: '', country_id: '', state_id: '', district_id: '', mandal_id: '', cluster_id: '', visiting_location_id: ''
    });

    const [itemFormData, setItemFormData] = useState({
        name: '', type: 'sedan', phone: '', status: 'Available', fuel_type: 'diesel', capacity: 4, plate_number: '', license_number: '', hubId: ''
    });

    const [hubSearchQuery, setHubSearchQuery] = useState('');
    const [suggestedHub, setSuggestedHub] = useState(null);
    const [showCreateHubPrompt, setShowCreateHubPrompt] = useState(false);
    const [newHubForTransfer, setNewHubForTransfer] = useState({ name: '', address: '', pincode: '' });

    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingTab, setBookingTab] = useState('Official');
    const [tripSearch, setTripSearch] = useState('');
    const [showTripResults, setShowTripResults] = useState(false);
    const [trips, setTrips] = useState([]);
    const [isLoadingTrips, setIsLoadingTrips] = useState(false);
    const inputRef = useRef(null);

    const [bookingData, setBookingData] = useState({
        vehicleId: '', plateNumber: '', status: 'Confirmed', employeeName: '', tripId: '', checkInDate: '', checkOutDate: '', remarks: ''
    });

    const [currentDate, setCurrentDate] = useState(new Date());
    const realToday = new Date();
    realToday.setHours(0, 0, 0, 0);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    // --- GEO HIERARCHY STATES (v12.1 Improved) ---
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

>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
    const validateHubForm = () => {
        const errors = {};
        if (!hubFormData.name || hubFormData.name.length < 3) errors.name = "Hub name is too short (min 3 chars)";
        if (!hubFormData.address || hubFormData.address.length < 10) errors.address = "Address is required (min 10 chars)";
        if (!hubFormData.pincode || !/^\d{6}$/.test(hubFormData.pincode)) errors.pincode = "Invalid 6-digit pincode";
<<<<<<< HEAD
=======
        
        // Location hierarchy validations
        if (!hubFormData.state_id) errors.state_id = "State is required";
        if (!hubFormData.district_id) errors.district_id = "District is required";
        if (!hubFormData.mandal_id) errors.mandal_id = "Mandal is required";
        if (!hubFormData.visiting_location_id) errors.visiting_location_id = "Visiting Location is required";

>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateItemForm = () => {
        const errors = {};
        if (activeTab === 'vehicles') {
<<<<<<< HEAD
            if (!itemFormData.plate_number || !/^[A-Z]{2}\s\d{2}\s[A-Z]{1,2}\s\d{4}$/.test(itemFormData.plate_number.toUpperCase()) && !/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/.test(itemFormData.plate_number.toUpperCase())) {
                // errors.plate_number = "Format: XX 00 XX 0000"; // Lax validation for now as some might be different
            }
            if (!itemFormData.plate_number) errors.plate_number = "Plate number is required";
            if (!itemFormData.name) errors.name = "Model name is required";
        } else {
            if (!itemFormData.name || itemFormData.name.length < 3) errors.name = "Name is required";
            if (!itemFormData.phone || !/^\d{10}$/.test(itemFormData.phone)) errors.phone = "Invalid 10-digit phone number";
=======
            const plate = itemFormData.plate_number?.trim().toUpperCase() || '';
            const plateRegex = /^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/;
            
            if (!plate) {
                errors.plate_number = "Plate number is required";
            } else if (!plateRegex.test(plate)) {
                errors.plate_number = "Format: XX 00 XX 0000";
            }

            const modelName = itemFormData.name?.trim() || '';
            if (!modelName) {
                errors.name = "Model name is required";
            } else if (/[,.!@#$%^&*()_+={}\[\]:;"'<>\?\/\\|`~]$/.test(modelName)) {
                errors.name = "Should not end with special characters";
            } else if (modelName.length < 2) {
                errors.name = "Name is too short";
            }
        } else {
            const driverName = itemFormData.name?.trim() || '';
            if (!driverName) {
                errors.name = "Driver name is required";
            } else if (driverName.length < 3) {
                errors.name = "Min 3 characters required";
            } else if (!/^[A-Za-z\s]+$/.test(driverName)) {
                errors.name = "Only letters allowed";
            }

            if (!itemFormData.phone || !/^\d{10}$/.test(itemFormData.phone)) {
                errors.phone = "Invalid 10-digit number";
            }

            const license = itemFormData.license_number?.trim() || '';
            if (!license) {
                errors.license_number = "License number is required";
            } else if (!/^[A-Z0-9\s-]{5,20}$/i.test(license)) {
                errors.license_number = "Invalid format (5-20 characters)";
            }
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
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

<<<<<<< HEAD
    const mapBookingsToEvents = (hub) => {
        const events = [];
        (hub?.vehicles || []).forEach(vehicle => {
            (vehicle.bookings || []).forEach(booking => {
                const startDate = booking.start_date;
                const endDate = booking.end_date;
=======
    const mapVehicleBookingsToEvents = (hub) => {
        const events = [];
        (hub?.vehicles || []).forEach(vehicle => {
            (vehicle.bookings || []).forEach(booking => {
                const startDate = booking.start_date?.slice(0, 10);
                const endDate = booking.end_date?.slice(0, 10);
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                events.push({
                    id: booking.id,
                    vehicleId: vehicle.id,
                    plateNumber: vehicle.plate_number,
                    status: booking.booking_type || 'Official',
                    startDate,
                    endDate,
                    details: booking.requester_name || '-',
<<<<<<< HEAD
                    checkIn: new Date(startDate).toLocaleDateString(),
                    checkOut: new Date(endDate).toLocaleDateString(),
=======
                    checkIn: new Date(booking.start_date).toLocaleDateString(),
                    checkOut: new Date(booking.end_date).toLocaleDateString(),
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                    remarks: booking.remarks || ''
                });
            });
        });
        return events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    };

<<<<<<< HEAD
=======
    useEffect(() => {
        if (selectedHub) {
            setCalendarEvents(mapVehicleBookingsToEvents(selectedHub));
        } else {
            setCalendarEvents([]);
        }
    }, [selectedHub]);

    const getStatusForDate = (vehicleId, day) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = date.toISOString().slice(0, 10);
        
        const isPast = date < realToday;

        const match = calendarEvents.find(e => {
            if (e.vehicleId !== vehicleId) return false;
            return dateStr >= e.startDate && dateStr <= e.endDate;
        });

        if (match) {
            const status = (match.status || '').toLowerCase() === 'maintenance' ? 'maintenance' : 'occupied';
            return { status, color: status, isPast };
        }
        return { status: 'available', color: 'available', isPast };
    };

    const monthlyEvents = calendarEvents.filter(event => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        return start <= monthEnd && end >= monthStart;
    });

>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
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
        if (isAdmin) fetchHubs();
    }, [isAdmin]);

<<<<<<< HEAD
    const [selectedHub, setSelectedHub] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('vehicles');
    const [fleetRequests, setFleetRequests] = useState([]);
=======
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da

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

<<<<<<< HEAD
=======
    const handleStartFleetBookingFromRequest = (req, hub) => {
        setActiveFleetBookingRequest(req);
        setSelectedHub(hub);
        // We logicially switch to the hub detail view to show its calendar
        setIsGlobalRequestView(false);   
        setActiveTab('calendar');         
        showToast(`Opened calendar for ${hub.name} — click a vehicle cell to book for ${req.trip_id}.`, 'info');
    };

>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
    useEffect(() => {
        if (activeTab === 'requests') fetchFleetRequests();
    }, [activeTab]);

<<<<<<< HEAD
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
=======

    const openAssignModal = async (trip, defaultType = 'Official', vehicleId = '') => {
        // Pre-populate form first so the modal opens immediately
        setAssignForm({ 
            vehicleId: vehicleId || '', 
            driverId: '', 
            startDate: trip.start_date || '', 
            endDate: trip.end_date || '', 
            remarks: '', 
            booking_type: defaultType 
        });
        setAllVehicles([]);
        setAllDrivers([]);
        setAssignModal({ open: true, trip, loadingAssets: true });

        try {
            // Build query params from trip dates so the backend can exclude date-conflict bookings
            const params = new URLSearchParams();
            if (trip.start_date) params.append('start_date', trip.start_date);
            if (trip.end_date)   params.append('end_date',   trip.end_date);

            const res = await api.get(`/api/fleet/available-assets/?${params.toString()}`);
            setAllVehicles(res.data.vehicles || []);
            setAllDrivers(res.data.drivers  || []);
        } catch (err) {
            // Fallback: pull from local hub data if the API fails
            const vehicles = fleetHubs.flatMap(h => h.vehicles || []);
            const drivers  = fleetHubs.flatMap(h => h.drivers  || []);
            setAllVehicles(vehicles.filter(v => (v.status || '').toLowerCase() === 'available'));
            setAllDrivers(drivers.filter(d => (d.availability || '').toLowerCase() === 'available'));
            showToast('Could not fetch live availability — showing cached data', 'warning');
        } finally {
            setAssignModal(prev => ({ ...prev, loadingAssets: false }));
        }
    };


    const handleAssignVehicle = async () => {
        const { trip } = assignModal;
        const errors = {};
        if (!assignForm.vehicleId) errors.vehicleId = 'Vehicle is required';
        if (!assignForm.startDate) errors.startDate = 'Start date is required';
        if (!assignForm.endDate) errors.endDate = 'End date is required';

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            showToast('Please fill all required fields.', 'error');
            return;
        }

        try {
            await api.post(`/api/fleet/vehicles/${assignForm.vehicleId}/bookings/`, {
                trip: trip.trip_id === 'INTERNAL' ? null : trip.trip_id,
                driver: assignForm.driverId || null,
                booking_type: assignForm.booking_type,
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                start_date: assignForm.startDate,
                end_date: assignForm.endDate,
                requester_name: trip.trip_leader,
                remarks: assignForm.remarks
            });
<<<<<<< HEAD
            showToast('Vehicle assigned! Employee notified.', 'success');
            setAssignModal({ open: false, trip: null });
            fetchFleetRequests();
=======
             showToast('Vehicle assigned! Employee notified.', 'success');
             setAssignModal({ open: false, trip: null });
             setActiveFleetBookingRequest(null);
             fetchFleetRequests();
            if (selectedHub) {
                const res = await api.get(`/api/fleet/hub/${selectedHub.id}/`);
                setSelectedHub(normalizeHub(res.data));
            }
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
        } catch (err) {
            showToast(getApiErrorMessage(err, 'Failed to assign vehicle'), 'error');
        }
    };

<<<<<<< HEAD
    const [showHubModal, setShowHubModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingItemId, setEditingItemId] = useState(null);

    const [hubFormData, setHubFormData] = useState({
        name: '', address: '', location: '', pincode: '', isActive: true, latitude: '', longitude: '', image: '', description: ''
    });

    const [itemFormData, setItemFormData] = useState({
        name: '', type: 'sedan', phone: '', status: 'Available', fuel_type: 'diesel', capacity: 4, plate_number: '', license_number: '', hubId: ''
    });

    // Hub transfer state
    const [hubSearchQuery, setHubSearchQuery] = useState('');
    const [suggestedHub, setSuggestedHub] = useState(null);   // matched existing hub
    const [showCreateHubPrompt, setShowCreateHubPrompt] = useState(false);
    const [newHubForTransfer, setNewHubForTransfer] = useState({ name: '', address: '', pincode: '' });
=======


    // Hub transfer state
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da

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

<<<<<<< HEAD
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingTab, setBookingTab] = useState('Official');
    const [tripSearch, setTripSearch] = useState('');
    const [showTripResults, setShowTripResults] = useState(false);
    const [trips, setTrips] = useState([]);
    const [isLoadingTrips, setIsLoadingTrips] = useState(false);
    const inputRef = useRef(null);

    const [bookingData, setBookingData] = useState({
        vehicleId: '', plateNumber: '', status: 'Confirmed', employeeName: '', tripId: '', checkInDate: '', checkOutDate: '', remarks: ''
    });

    const [currentDate, setCurrentDate] = useState(new Date());
    const realToday = new Date();
    realToday.setHours(0, 0, 0, 0);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
=======

    // --- GEO HIERARCHY LOGIC (Cloned from GH) ---
    const GEO_API_URL = "/api/masters/locations/live_hierarchy/";

    const fetchFullHierarchy = async (forceRefetch = false) => {
        if (fullHierarchy.length > 0 && !geoError && !forceRefetch) return;
        setGeoLoading(true);
        setGeoError(null);
        try {
            const res = await api.get(GEO_API_URL);
            const data = res.data.results || res.data.data || res.data;
            setFullHierarchy(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Geo Hier error:", err);
            setGeoError("Unable to connect to Geocoding Server.");
        } finally {
            setGeoLoading(false);
        }
    };

    useEffect(() => {
        if (showHubModal) fetchFullHierarchy();
    }, [showHubModal]);

    useEffect(() => {
        if (fullHierarchy.length > 0) {
            setContinents(fullHierarchy.map(c => ({ value: c.id, label: c.name })));
        }
    }, [fullHierarchy]);

    const getFilterName = (val) => {
        if (!val) return '';
        if (typeof val === 'object') return (val.label || '').trim().toLowerCase();
        return String(val).trim().toLowerCase();
    };

    const getChildren = (type, filters) => {
        if (!fullHierarchy || !fullHierarchy.length) return [];
        let data = fullHierarchy;
        if (type === 'continent') return data;
        
        const continent = data.find(c => String(c.id) === String(filters.continent_id));
        const countriesArr = continent?.children || continent?.countries || [];
        if (type === 'country') return countriesArr;
        
        const country = countriesArr.find(c => String(c.id) === String(filters.country_id));
        const statesArr = country?.states || country?.state || country?.children || [];
        if (type === 'state') return statesArr;
        
        const state = statesArr.find(s => String(s.id) === String(filters.state_id));
        const districtsArr = state?.districts || state?.district || state?.children || [];
        if (type === 'district') return districtsArr;
        
        const district = districtsArr.find(d => String(d.id) === String(filters.district_id));
        const mandalsArr = district?.mandals || district?.mandal || district?.children || [];
        if (type === 'mandal') return mandalsArr;
        
        const mandal = mandalsArr.find(m => String(m.id) === String(filters.mandal_id));
        const clustersArr = [
            ...(mandal?.clusters || []), ...(mandal?.metro_polyten_cities || []),
            ...(mandal?.cities || []), ...(mandal?.towns || []),
            ...(mandal?.villages || []), ...(mandal?.children || [])
        ];
        if (type === 'cluster') return clustersArr;
        
        const cluster = clustersArr.find(c => String(c.id) === String(filters.cluster_id));
        return cluster?.visiting_locations || cluster?.locations || [];
    };

    useEffect(() => {
        if (!showHubModal) return;
        const mapToOpt = (arr) => arr.map(x => ({ value: x.id, label: x.name }));
        
        setCountries(mapToOpt(getChildren('country', hubFormData)));
        setStates(mapToOpt(getChildren('state', hubFormData)));
        setDistricts(mapToOpt(getChildren('district', hubFormData)));
        setMandals(mapToOpt(getChildren('mandal', hubFormData)));
        setClusters(mapToOpt(getChildren('cluster', hubFormData)));
        setVisitingLocations(mapToOpt(getChildren('visitingLocation', hubFormData)));
    }, [
        hubFormData.continent_id, 
        hubFormData.country_id, 
        hubFormData.state_id, 
        hubFormData.district_id, 
        hubFormData.mandal_id, 
        hubFormData.cluster_id, 
        continents, 
        fullHierarchy
    ]);

    const handleLocationSelect = (type, selectedValue) => {
        const idMap = { continent: 'continent_id', country: 'country_id', state: 'state_id', district: 'district_id', mandal: 'mandal_id', cluster: 'cluster_id', visiting_location: 'visiting_location_id' };
        const fieldName = idMap[type];
        setHubFormData(prev => {
            const newState = { ...prev, [fieldName]: selectedValue };
            if (type === 'continent') { newState.country_id = ''; newState.state_id = ''; newState.district_id = ''; newState.mandal_id = ''; newState.cluster_id = ''; newState.visiting_location_id = ''; }
            if (type === 'country') { newState.state_id = ''; newState.district_id = ''; newState.mandal_id = ''; newState.cluster_id = ''; newState.visiting_location_id = ''; }
            if (type === 'state') { newState.district_id = ''; newState.mandal_id = ''; newState.cluster_id = ''; newState.visiting_location_id = ''; }
            if (type === 'district') { newState.mandal_id = ''; newState.cluster_id = ''; newState.visiting_location_id = ''; }
            if (type === 'mandal') { newState.cluster_id = ''; newState.visiting_location_id = ''; }
            if (type === 'cluster') { newState.visiting_location_id = ''; }
            if (type === 'visiting_location') {
                const locObj = visitingLocations.find(l => l.value === selectedValue);
                if (locObj) newState.location = locObj.label;
            }
            return newState;
        });
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
    };

    const handleHubInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setHubFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleEditHub = (hub) => {
        setEditingId(hub.id);
        setHubFormData({
            name: hub.name,
            address: hub.address,
            location: hub.location || '',
            pincode: hub.pincode,
            isActive: hub.isActive,
            latitude: hub.latitude || '',
            longitude: hub.longitude || '',
            image: hub.image || '',
<<<<<<< HEAD
            description: hub.description || ''
=======
            description: hub.description || '',
            continent_id: hub.continent_id || '',
            country_id: hub.country_id || '',
            state_id: hub.state_id || '',
            district_id: hub.district_id || '',
            mandal_id: hub.mandal_id || '',
            cluster_id: hub.cluster_id || '',
            visiting_location_id: hub.visiting_location_id || ''
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
        });
        setFormErrors({});
        setShowHubModal(true);
    };

<<<<<<< HEAD
=======
    const handleHubImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { showToast('Please select a valid image file', 'error'); return; }
        if (file.size > 5 * 1024 * 1024) { showToast('Image must be smaller than 5MB', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setHubFormData(prev => ({ ...prev, image: ev.target.result }));
        reader.readAsDataURL(file);
    };

>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
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
            is_active: hubFormData.isActive,
            latitude: hubFormData.latitude || null,
            longitude: hubFormData.longitude || null,
            image: hubFormData.image || null,
<<<<<<< HEAD
            description: hubFormData.description || ''
=======
            description: hubFormData.description || '',
            continent_id: hubFormData.continent_id,
            country_id: hubFormData.country_id,
            state_id: hubFormData.state_id,
            district_id: hubFormData.district_id,
            mandal_id: hubFormData.mandal_id,
            cluster_id: hubFormData.cluster_id,
            visiting_location_id: hubFormData.visiting_location_id,
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
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

    const renderTabContent = () => {
<<<<<<< HEAD
        if (activeTab === 'requests') {
            return (
                <div className="gh-list-section">
                    <div className="gh-sub-header"><h3>Employee Fleet Requests</h3><button className="btn-refresh-pill" onClick={fetchFleetRequests}>REFRESH</button></div>
                    <div className="gh-item-list">
                        {fleetRequests.length > 0 ? fleetRequests.map(req => {
                            // Match destination to a hub by location/address (same as GH pattern)
                            const matchingHub = fleetHubs.find(h =>
                                h.location?.toLowerCase().includes(req.destination?.toLowerCase()) ||
                                h.address?.toLowerCase().includes(req.destination?.toLowerCase()) ||
                                req.destination?.toLowerCase().includes(h.name?.toLowerCase()) ||
                                req.destination?.toLowerCase().includes(h.location?.toLowerCase())
                            );

                            // Check if matching hub has at least 1 available vehicle
                            const hasAvailableVehicle = matchingHub &&
                                (matchingHub.vehicles || []).some(v => (v.status || '').toLowerCase() === 'available');

=======
        // Helper to match request to hub
        const getMatchingHub = (req) => {
            if (!req.user_base_location || req.user_base_location.toLowerCase() === 'not set' || req.user_base_location.toLowerCase() === 'n/a') {
                return null;
            }
            return fleetHubs.find(h =>
                h.location?.toLowerCase().includes(req.user_base_location?.toLowerCase()) ||
                h.address?.toLowerCase().includes(req.user_base_location?.toLowerCase()) ||
                req.user_base_location?.toLowerCase().includes(h.name?.toLowerCase()) ||
                req.user_base_location?.toLowerCase().includes(h.location?.toLowerCase())
            );
        };

        if (activeTab === 'requests') {
            const filteredRequests = selectedHub 
                ? fleetRequests.filter(req => {
                    const hub = getMatchingHub(req);
                    return hub && hub.id === selectedHub.id;
                })
                : fleetRequests;

            return (
                <div className="gh-tab-pane animate-fade-in premium-card">
                    <div className="gh-sub-header">
                        <h3>{selectedHub ? `${selectedHub.name} Requests` : 'Global Fleet Requests'}</h3>
                        <button className="btn-refresh-pill" onClick={fetchFleetRequests}>REFRESH</button>
                    </div>
                    <div className="gh-item-list">
                        {filteredRequests.length > 0 ? filteredRequests.map(req => {
                            const showAll = showAllAvailableMap[req.trip_id];
                            const matchingHub = getMatchingHub(req);

                            const hasAvailableVehicle = matchingHub &&
                                (matchingHub.vehicles || []).some(v => (v.status || '').toLowerCase() === 'available');

                            const canAssign = hasAvailableVehicle || showAll;

>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                            return (
                                <div key={req.trip_id} className="gh-list-item request-card-premium">
                                    <div className="item-info">
                                        <div className="request-header" style={{ marginBottom: '8px' }}>
                                            <span className="trip-id-tag-mini">{req.trip_id}</span>
                                            <span className={`badge ${hasAvailableVehicle ? 'pending' : 'rejected'}`} style={{ fontSize: '10px', padding: '4px 8px' }}>
<<<<<<< HEAD
                                                {hasAvailableVehicle ? 'VEHICLE AVAILABLE' : 'NO VEHICLE FOUND'}
=======
                                                {hasAvailableVehicle ? 'VEHICLE AT BASE' : 'NO VEHICLE AT BASE'}
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                                            </span>
                                        </div>
                                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{req.trip_leader} - {req.purpose}</h4>
                                        <div className="request-meta-grid">
<<<<<<< HEAD
                                            <div className="meta-item"><MapPin size={14} /> <span>Dest: {req.destination}</span></div>
                                            <div className="meta-item"><Calendar size={14} /> <span>{req.start_date} - {req.end_date}</span></div>
                                        </div>
                                        {matchingHub && (
                                            <p className="request-note">Hub: {matchingHub.name} — {matchingHub.address}</p>
                                        )}
                                    </div>
                                    <div className="actions-cell-vertical">
                                        {hasAvailableVehicle ? (
                                            <button className="btn-primary-mini" onClick={() => openAssignModal(req)}>Assign Vehicle</button>
                                        ) : (
                                            <button className="btn-danger-mini" onClick={() => handleNoVehicleNotify(req)}>Inform: No Vehicle at Location</button>
=======
                                            <div className="meta-item" title="Trip Route">
                                                <ArrowRight size={14} className="text-primary" /> 
                                                <span style={{ fontWeight: 600 }}>{req.source || 'N/A'} &rarr; {req.destination || 'N/A'}</span>
                                            </div>
                                            <div className="meta-item"><Calendar size={14} /> <span>{req.start_date} - {req.end_date}</span></div>
                                        </div>
                                    </div>
                                    <div className="actions-cell-vertical">
                                        {matchingHub ? (
                                            <>
                                                <button 
                                                    className="btn-primary-mini" 
                                                    onClick={() => handleStartFleetBookingFromRequest(req, matchingHub)}
                                                    title="Open calendar for this hub to assign a vehicle"
                                                >
                                                    🚗 Assign at {matchingHub.name}
                                                </button>
                                                {!hasAvailableVehicle && (
                                                    <button className="btn-link-mini text-danger" style={{ fontSize: '10px', marginTop: '4px' }} onClick={() => handleNoVehicleNotify(req)}>Inform User: No Vehicle</button>
                                                )}
                                            </>
                                        ) : selectedHub ? (
                                            // Inside a specific hub but no location match — allow assignment as it's already filtered to this hub
                                            <button className="btn-primary-mini" onClick={() => openAssignModal(req)}>Assign Vehicle</button>
                                        ) : (
                                            // Global view, no auto-matched hub — let admin pick any hub manually
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '180px' }}>
                                                <div className="select-wrapper" style={{ fontSize: '0.8rem' }}>
                                                    <select
                                                        className="input-field"
                                                        style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', height: 'auto' }}
                                                        defaultValue=""
                                                        id={`fleet-hub-select-${req.trip_id}`}
                                                    >
                                                        <option value="" disabled>Select a Fleet Hub…</option>
                                                        {fleetHubs.map(hub => (
                                                            <option key={hub.id} value={hub.id}>{hub.name} — {hub.location || hub.address}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    className="btn-primary-mini"
                                                    onClick={() => {
                                                        const select = document.getElementById(`fleet-hub-select-${req.trip_id}`);
                                                        const hubId = select?.value;
                                                        if (!hubId) { showToast('Please select a fleet hub first', 'warning'); return; }
                                                        const chosen = fleetHubs.find(h => String(h.id) === String(hubId));
                                                        if (chosen) handleStartFleetBookingFromRequest(req, chosen);
                                                    }}
                                                >
                                                    📅 Book at Selected Hub
                                                </button>
                                                <button className="btn-danger-mini" onClick={() => handleNoVehicleNotify(req)}>
                                                    Inform: No Vehicle
                                                </button>
                                            </div>
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                                        )}
                                    </div>
                                </div>
                            );
<<<<<<< HEAD
                        }) : <div className="empty-state-vsmall mt-4"><p>No active fleet requests.</p></div>}
=======
                        }) : <div className="empty-state-vsmall mt-4"><p>No {selectedHub ? 'matching' : 'active'} fleet requests found.</p></div>}
                    </div>
                </div>
            );
        }

        if (activeTab === 'calendar' && selectedHub) {
            return (
                <div className="gh-list-section">
                    <div className="calendar-container">
                        <div className="calendar-controls">
                            <h3>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                            <div className="calendar-nav">
                                <button onClick={() => changeMonth(-1)}>&lt;</button>
                                <button onClick={() => changeMonth(1)}>&gt;</button>
                            </div>
                            <div className="calendar-legend">
                                <span className="legend-item"><span className="dot available"></span> Available</span>
                                <span className="legend-item"><span className="dot occupied"></span> Assigned</span>
                                <span className="legend-item"><span className="dot maintenance"></span> Maintenance</span>
                            </div>
                        </div>
                        <div className="calendar-grid-wrapper">
                            <table className="calendar-table">
                                <thead>
                                    <tr>
                                        <th className="room-col-header">Vehicle</th>
                                        {days.map(d => {
                                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                            const isToday = new Date().toDateString() === date.toDateString();
                                            return (
                                                <th key={d} className={`date-header ${isToday ? 'current-day' : ''}`}>
                                                    <div className="date-num">{d}</div>
                                                    <div className="day-name">{date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}</div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedHub.vehicles || []).map(vehicle => (
                                        <tr key={vehicle.id}>
                                            <td className="room-cell">
                                                <div className="room-name">{vehicle.plate_number}</div>
                                                <span className="room-type">{vehicle.model_name}</span>
                                            </td>
                                            {days.map(d => {
                                                const { status, color, isPast } = getStatusForDate(vehicle.id, d);
                                                return (
                                                    <td 
                                                        key={d} 
                                                        className={`status-cell ${color} ${isPast ? 'past' : ''}`}
                                                        onClick={() => {
                                                            if (isPast) {
                                                                showToast('Cannot book for past dates', 'warning');
                                                                return;
                                                            }
                                                            const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                                            const dateStr = selectedDate.toISOString().slice(0, 10);
                                                            
                                                            // If we came from a specific room request, use that trip context
                                                            const tripToUse = activeFleetBookingRequest || { 
                                                                trip_id: 'INTERNAL', 
                                                                trip_leader: user?.name || 'Manager',
                                                                start_date: dateStr,
                                                                end_date: dateStr
                                                            };

                                                            openAssignModal(
                                                                tripToUse, 
                                                                activeFleetBookingRequest ? 'Official' : 'Internal',
                                                                vehicle.id
                                                            );
                                                        }}
                                                        title={isPast ? 'Past date' : `Click to book ${vehicle.plate_number}`}
                                                    ></td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="event-log-container">
                            <h3>Monthly Fleet Schedule</h3>
                            <table className="event-log-table">
                                <thead>
                                    <tr><th>VEHICLE</th><th>TYPE</th><th>REQUESTER / PURPOSE</th><th>CHECK-IN</th><th>CHECK-OUT</th><th>STATUS</th></tr>
                                </thead>
                                <tbody>
                                    {monthlyEvents.length > 0 ? monthlyEvents.map(e => (
                                        <tr key={e.id}>
                                            <td>{e.plateNumber}</td>
                                            <td><span className={`status-pill ${e.status.toLowerCase() === 'internal' ? 'official' : e.status.toLowerCase()}`}>{e.status}</span></td>
                                            <td>{e.details}</td><td>{e.checkIn}</td><td>{e.checkOut}</td><td>Confirmed</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-4" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                No fleet schedule data for this month.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab === 'assignments' && selectedHub) {
            return (
                <div className="gh-list-section">
                    <div className="gh-sub-header">
                        <h3>Active & Upcoming Assignments</h3>
                        <button className="btn-primary-mini" onClick={() => {
                            openAssignModal({ trip_id: 'INTERNAL', trip_leader: user?.name || 'Manager' }, 'Internal');
                        }}>
                             Manual Booking
                        </button>
                    </div>
                    <div className="gh-item-list">
                        {calendarEvents.length > 0 ? calendarEvents.map(e => (
                            <div key={e.id} className="gh-list-item">
                                <div className="item-info">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="trip-id-tag-mini">{e.status === 'Maintenance' ? 'SERVICE' : e.id}</span>
                                        <span className={`badge ${e.status.toLowerCase()}`}>{e.status}</span>
                                    </div>
                                    <h4>{e.plateNumber} — {e.details}</h4>
                                    <div className="request-meta-grid">
                                        <div className="meta-item"><Calendar size={14} /> <span>{e.checkIn} - {e.checkOut}</span></div>
                                        {e.remarks && <div className="meta-item"><FileText size={14} /> <span>{e.remarks}</span></div>}
                                    </div>
                                </div>
                                <div className="actions-cell">
                                    <button className="icon-btn-small delete" onClick={async () => {
                                        if (window.confirm('Delete this booking?')) {
                                            try {
                                                await api.delete(`/api/fleet/bookings/${e.id}/`);
                                                showToast('Booking cancelled', 'success');
                                                const res = await api.get(`/api/fleet/hub/${selectedHub.id}/`);
                                                setSelectedHub(normalizeHub(res.data));
                                            } catch (err) { showToast('Error deleting', 'error'); }
                                        }
                                    }}><Trash2 size={16} /></button>
                                </div>
                            </div>
                        )) : <div className="empty-state-vsmall mt-4"><p>No assignments found for this hub.</p></div>}
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                    </div>
                </div>
            );
        }

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
        <div className="gh-page animate-fade-in">
            {selectedHub ? (
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
<<<<<<< HEAD
                            { id: 'requests', icon: Mail, label: 'Fleet Requests' }
=======
                            { id: 'requests', icon: Mail, label: 'Fleet Requests' },
                            { id: 'calendar', icon: Calendar, label: 'Calendar' },
                            { id: 'assignments', icon: ClipboardList, label: 'Assignments' }
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                        ].map(t => (
                            <button key={t.id} className={`gh-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}><t.icon size={16} /> {t.label}</button>
                        ))}
                    </div>
                    {renderTabContent()}
                </>
<<<<<<< HEAD
=======
            ) : isGlobalRequestView === true ? (
                <>
                    <div className="gh-details-header">
                        <div className="gh-details-left">
                            <button className="gh-back-btn" onClick={() => setIsGlobalRequestView(false)}><ArrowLeft size={16} /> Back to Hubs</button>
                            <div className="gh-details-title"><h1>Global Fleet Requests</h1><p><Shield size={14} /> System-wide asset allocation management</p></div>
                        </div>
                        <div className="gh-map-preview" style={{ background: 'var(--primary-gradient)', color: '#fff' }}>
                            <Mail size={40} />
                        </div>
                    </div>
                    {renderTabContent()}
                </>
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
            ) : (
                <>
                    <div className="gh-header-section">
                        <div className="header-left">
                            <h1 className="welcome-text">Fleet Management</h1>
                        </div>
<<<<<<< HEAD
                        <button className="btn-primary" onClick={() => { setEditingId(null); setHubFormData({ name: '', address: '', location: '', pincode: '', isActive: true, latitude: '', longitude: '', image: '', description: '' }); setShowHubModal(true); }}>
                            <Plus size={18} /> Add Fleet Hub
                        </button>
=======
                        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn-secondary" onClick={() => {
                                setIsGlobalRequestView(true);
                                setActiveTab('requests');
                            }}>
                                <Mail size={18} /> View All Requests
                            </button>
                            <button className="btn-primary" onClick={() => { 
                                setEditingId(null); 
                                setHubFormData({ 
                                    name: '', address: '', location: '', pincode: '', isActive: true, latitude: '', longitude: '', image: '', description: '',
                                    continent_id: '', country_id: '', state_id: '', district_id: '', mandal_id: '', cluster_id: '', visiting_location_id: ''
                                }); 
                                setShowHubModal(true); 
                            }}>
                                <Plus size={18} /> Add Fleet Hub
                            </button>
                        </div>
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
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
                            <div className="no-data-full-page animate-fade-in">
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
<<<<<<< HEAD
                    <div className="modal-content gh-modal premium-card" style={{ maxWidth: '600px' }}>
=======
                    <div className="modal-content gh-modal premium-card overflow-visible" style={{ maxWidth: '600px' }}>
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit' : 'Add'} Fleet Hub</h2>
                            <button onClick={() => setShowHubModal(false)} className="close-btn"><X size={24} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
<<<<<<< HEAD
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
                                    <label>Status</label>
                                    <div className="toggle-switch-group">
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: hubFormData.isActive ? 'var(--success)' : 'var(--text-muted)' }}>{hubFormData.isActive ? 'Active' : 'Standby'}</span>
                                        <label className="toggle-switch">
                                            <input type="checkbox" name="isActive" checked={hubFormData.isActive} onChange={handleHubInputChange} />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Latitude (optional)</label>
                                    <input className="input-field" name="latitude" value={hubFormData.latitude} onChange={handleHubInputChange} placeholder="e.g. 17.3850" />
                                </div>
                                <div className="form-group">
                                    <label>Longitude (optional)</label>
                                    <input className="input-field" name="longitude" value={hubFormData.longitude} onChange={handleHubInputChange} placeholder="e.g. 78.4867" />
=======
                                {/* BLOCK 1: PRIMARY IDENTITY */}
                                <div className="form-section-block" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Shield size={18} /> Primary Identity
                                    </h3>
                                    <div className="form-group full" style={{ marginBottom: 0 }}>
                                        <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Hub Name*</label>
                                        <input className={`input-field ${formErrors.name ? 'error' : ''}`} name="name" value={hubFormData.name} onChange={handleHubInputChange} placeholder="e.g. Hyderabad Main Hub" style={{ background: '#fff' }} />
                                        {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                                    </div>
                                </div>

                                {/* BLOCK: HUB PHOTO */}
                                <div className="form-section-block" style={{ gridColumn: '1 / -1', background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileText size={18} /> Hub Photo (optional)
                                    </h3>
                                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {/* Preview */}
                                        <div
                                            onClick={() => hubImageInputRef.current?.click()}
                                            style={{
                                                width: 110, height: 90, borderRadius: '12px', overflow: 'hidden',
                                                border: '2px dashed #8b5cf6', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: '#f5f3ff', flexShrink: 0, position: 'relative'
                                            }}
                                            title="Click to upload photo"
                                        >
                                            {hubFormData.image ? (
                                                <img src={hubFormData.image} alt="Hub Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ textAlign: 'center', color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    <Camera size={28} style={{ color: '#8b5cf6', marginBottom: '4px' }} />
                                                    <div>Upload Photo</div>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                                                Upload a photo of the hub facility. Supported: JPG, PNG, WebP (max 5 MB).
                                            </p>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => hubImageInputRef.current?.click()}
                                                    style={{ padding: '6px 14px', borderRadius: '8px', background: '#8b5cf6', color: '#fff', fontSize: '0.78rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                                >
                                                    {hubFormData.image ? 'Change Photo' : 'Choose Photo'}
                                                </button>
                                                {hubFormData.image && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setHubFormData(prev => ({ ...prev, image: '' }))}
                                                        style={{ padding: '6px 14px', borderRadius: '8px', background: '#fee2e2', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <input
                                        ref={hubImageInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleHubImageUpload}
                                    />
                                </div>

                                {/* BLOCK 2: GEOGRAPHIC HIERARCHY */}
                                <div className="form-section-block" style={{ gridColumn: '1 / -1', background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '4px solid #3b82f6' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#3b82f6', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <MapPin size={18} /> Geographic Hierarchy
                                    </h3>
                                    <div className="geo-hierarchy-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                                        <div className="geo-item">
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Continent</label>
                                            <SearchableSelect
                                                options={continents}
                                                value={hubFormData.continent_id}
                                                onChange={(val) => handleLocationSelect('continent', val)}
                                                placeholder="Select Continent"
                                                loading={geoLoading}
                                            />
                                        </div>
                                        <div className="geo-item">
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Country</label>
                                            <SearchableSelect
                                                options={countries}
                                                value={hubFormData.country_id}
                                                onChange={(val) => handleLocationSelect('country', val)}
                                                placeholder="Select Country"
                                                disabled={!hubFormData.continent_id}
                                            />
                                        </div>
                                        <div className="geo-item">
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: formErrors.state_id ? 'var(--error)' : '#64748b' }}>State*</label>
                                            <SearchableSelect
                                                options={states}
                                                value={hubFormData.state_id}
                                                onChange={(val) => handleLocationSelect('state', val)}
                                                placeholder="Select State"
                                                disabled={!hubFormData.country_id}
                                                error={formErrors.state_id}
                                            />
                                        </div>
                                        <div className="geo-item">
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: formErrors.district_id ? 'var(--error)' : '#64748b' }}>District*</label>
                                            <SearchableSelect
                                                options={districts}
                                                value={hubFormData.district_id}
                                                onChange={(val) => handleLocationSelect('district', val)}
                                                placeholder="Select District"
                                                disabled={!hubFormData.state_id}
                                                error={formErrors.district_id}
                                            />
                                        </div>
                                        <div className="geo-item">
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: formErrors.mandal_id ? 'var(--error)' : '#64748b' }}>Mandal*</label>
                                            <SearchableSelect
                                                options={mandals}
                                                value={hubFormData.mandal_id}
                                                onChange={(val) => handleLocationSelect('mandal', val)}
                                                placeholder="Select Mandal"
                                                disabled={!hubFormData.district_id}
                                                error={formErrors.mandal_id}
                                            />
                                        </div>
                                        <div className="geo-item">
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Cluster</label>
                                            <SearchableSelect
                                                options={clusters}
                                                value={hubFormData.cluster_id}
                                                onChange={(val) => handleLocationSelect('cluster', val)}
                                                placeholder="Select Cluster"
                                                disabled={!hubFormData.mandal_id}
                                            />
                                        </div>
                                        <div className="geo-item full" style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: formErrors.visiting_location_id ? 'var(--error)' : '#64748b' }}>Visiting Location*</label>
                                            <SearchableSelect
                                                options={visitingLocations}
                                                value={hubFormData.visiting_location_id}
                                                onChange={(val) => handleLocationSelect('visiting_location', val)}
                                                placeholder="Select Visiting Location"
                                                disabled={!hubFormData.mandal_id}
                                                error={formErrors.visiting_location_id}
                                            />
                                            {formErrors.visiting_location_id && <span className="error-text" style={{ fontSize: '0.7rem' }}>{formErrors.visiting_location_id}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* BLOCK 3: ADDRESS & CONTACT */}
                                <div className="form-section-block" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', borderLeft: '4px solid #10b981' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileText size={18} /> Address Details
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '20px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Full Address*</label>
                                            <textarea className={`input-field ${formErrors.address ? 'error' : ''}`} name="address" rows={2} value={hubFormData.address} onChange={handleHubInputChange} placeholder="Street address, landmark, city..." style={{ background: '#fff' }} />
                                            {formErrors.address && <span className="error-text">{formErrors.address}</span>}
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Pincode*</label>
                                            <input className={`input-field ${formErrors.pincode ? 'error' : ''}`} name="pincode" value={hubFormData.pincode} onChange={handleHubInputChange} maxLength={6} placeholder="6-digit code" style={{ background: '#fff' }} />
                                            {formErrors.pincode && <span className="error-text">{formErrors.pincode}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* BLOCK 4: COORDINATES & STATUS */}
                                <div className="form-section-block" style={{ gridColumn: '1 / -1', background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '4px solid #f59e0b' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Settings size={18} /> Settings & Coordinates
                                    </h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '25px', alignItems: 'flex-start' }}>
                                        <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
                                            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Longitude (optional)</label>
                                            <input className="input-field" name="longitude" value={hubFormData.longitude} onChange={handleHubInputChange} placeholder="e.g. 78.4867" />
                                        </div>
                                        <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
                                            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Latitude (optional)</label>
                                            <input className="input-field" name="latitude" value={hubFormData.latitude} onChange={handleHubInputChange} placeholder="e.g. 17.3850" />
                                        </div>
                                        <div className="form-group" style={{ flex: '0 0 160px', marginBottom: 0 }}>
                                            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Hub Status</label>
                                            <div className="toggle-switch-group" style={{ marginTop: '8px', padding: '10px 15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: hubFormData.isActive ? 'var(--success)' : '#94a3b8' }}>{hubFormData.isActive ? 'ACTIVE' : 'STANDBY'}</span>
                                                <label className="toggle-switch">
                                                    <input type="checkbox" name="isActive" checked={hubFormData.isActive} onChange={handleHubInputChange} />
                                                    <span className="slider round"></span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
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
<<<<<<< HEAD
                    <div className="modal-content gh-modal premium-card">
                        <div className="modal-header"><h2>{editingItemId ? 'Edit' : 'Add'} {activeTab === 'vehicles' ? 'Vehicle' : 'Driver'}</h2><button onClick={() => setShowItemModal(false)} className="close-btn"><X size={20} /></button></div>
                        <div className="modal-body">
                            {activeTab === 'vehicles' ? (
                                <>
                                    <div className="form-group">
                                        <label>Plate Number*</label>
                                        <input className={`input-field ${formErrors.plate_number ? 'error' : ''}`} value={itemFormData.plate_number} onChange={e => setItemFormData({ ...itemFormData, plate_number: e.target.value })} placeholder="e.g. TS 09 EA 1234" />
                                        {formErrors.plate_number && <span className="error-text">{formErrors.plate_number}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Model Name*</label>
                                        <input className={`input-field ${formErrors.name ? 'error' : ''}`} value={itemFormData.name} onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })} placeholder="e.g. Toyota Innova" />
                                        {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Vehicle Type</label>
                                            <select className="input-field" value={itemFormData.type} onChange={e => setItemFormData({ ...itemFormData, type: e.target.value })}>
                                                <option value="sedan">Sedan (4 to 5)</option>
                                                <option value="suv">SUV (6 to 7)</option>
                                                <option value="pickup">Pickup</option>
                                                <option value="ambulance">Ambulance</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Fuel Type</label>
                                            <select className="input-field" value={itemFormData.fuel_type} onChange={e => setItemFormData({ ...itemFormData, fuel_type: e.target.value })}>
                                                <option value="diesel">Diesel</option>
                                                <option value="petrol">Petrol</option>
                                                <option value="ev">Electric</option>
                                                <option value="cng">CNG</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Capacity</label>
                                            <input type="number" className="input-field" value={itemFormData.capacity} onChange={e => setItemFormData({ ...itemFormData, capacity: e.target.value })} min={1} max={20} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Status</label>
                                            <select className="input-field" value={itemFormData.status} onChange={e => setItemFormData({ ...itemFormData, status: e.target.value })}>
                                                <option value="Available">Available</option>
                                                <option value="Maintenance">Maintenance</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Hub / Location Transfer */}
                                    {editingItemId && (
                                        <div className="form-group">
                                            <label>Location / Hub</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    className="input-field"
                                                    placeholder={`Current: ${selectedHub?.name || 'Unknown'} — type to change`}
                                                    value={hubSearchQuery}
                                                    onChange={e => handleHubSearch(e.target.value)}
                                                />
                                            </div>
                                            {suggestedHub && (
                                                <div className="service-alert info" style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem' }}>
                                                    <MapPin size={14} />
                                                    <p>Will be moved to: <strong>{suggestedHub.name}</strong> — {suggestedHub.address}</p>
                                                </div>
                                            )}
                                            {showCreateHubPrompt && (
                                                <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px dashed var(--primary)' }}>
                                                    <p style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>No hub found for "{hubSearchQuery}". Create one?</p>
                                                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                                        <input className="input-field" placeholder="Hub Name*" value={newHubForTransfer.name} onChange={e => setNewHubForTransfer(p => ({ ...p, name: e.target.value }))} />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                                        <input className="input-field" placeholder="Address*" value={newHubForTransfer.address} onChange={e => setNewHubForTransfer(p => ({ ...p, address: e.target.value }))} />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                                        <input className="input-field" placeholder="Pincode*" value={newHubForTransfer.pincode} onChange={e => setNewHubForTransfer(p => ({ ...p, pincode: e.target.value }))} />
                                                    </div>
                                                    <button className="btn-primary" style={{ width: '100%' }} onClick={handleTransferHubCreate}>Create Hub &amp; Transfer Vehicle</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label>Driver Name*</label>
                                        <input className={`input-field ${formErrors.name ? 'error' : ''}`} value={itemFormData.name} onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })} placeholder="Full Name" />
                                        {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Phone*</label>
                                        <input className={`input-field ${formErrors.phone ? 'error' : ''}`} value={itemFormData.phone} onChange={e => setItemFormData({ ...itemFormData, phone: e.target.value })} maxLength={10} placeholder="10-digit mobile" />
                                        {formErrors.phone && <span className="error-text">{formErrors.phone}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>License Number</label>
                                        <input className="input-field" value={itemFormData.license_number} onChange={e => setItemFormData({ ...itemFormData, license_number: e.target.value })} placeholder="DL Number" />
                                    </div>
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select className="input-field" value={itemFormData.status} onChange={e => setItemFormData({ ...itemFormData, status: e.target.value })}>
                                            <option value="Available">Available</option>
                                            <option value="On Leave">On Leave</option>
                                            <option value="Duty">On Duty</option>
                                        </select>
                                    </div>
                                </>
=======
                    <div className="modal-content gh-modal premium-card overflow-visible">
                        <div className="modal-header"><h2>{editingItemId ? 'Edit' : 'Add'} {activeTab === 'vehicles' ? 'Vehicle' : 'Driver'}</h2><button onClick={() => setShowItemModal(false)} className="close-btn"><X size={20} /></button></div>
                        <div className="modal-body">
                            {activeTab === 'vehicles' ? (
                                <div className="form-grid">
                                    {/* BLOCK 1: PRIMARY IDENTITY */}
                                    <div className="form-section-block" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Shield size={18} /> Primary Identity
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Plate Number*</label>
                                                <input className={`input-field ${formErrors.plate_number ? 'error' : ''}`} value={itemFormData.plate_number} onChange={e => setItemFormData({ ...itemFormData, plate_number: e.target.value })} placeholder="e.g. TS 09 EA 1234" style={{ background: '#fff' }} />
                                                {formErrors.plate_number && <span className="error-text">{formErrors.plate_number}</span>}
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Model Name*</label>
                                                <input className={`input-field ${formErrors.name ? 'error' : ''}`} value={itemFormData.name} onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })} placeholder="e.g. Toyota Innova" style={{ background: '#fff' }} />
                                                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* BLOCK 2: TECHNICAL SPECS */}
                                    <div className="form-section-block" style={{ gridColumn: '1 / -1', background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '4px solid #3b82f6' }}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#3b82f6', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Car size={18} /> Technical Specifications
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Vehicle Type</label>
                                                <SearchableSelect
                                                    options={[
                                                        { value: 'sedan', label: 'Sedan (4 to 5)' },
                                                        { value: 'suv', label: 'SUV (6 to 7)' },
                                                        { value: 'pickup', label: 'Pickup' },
                                                        { value: 'ambulance', label: 'Ambulance' }
                                                    ]}
                                                    value={itemFormData.type}
                                                    onChange={val => setItemFormData({ ...itemFormData, type: val })}
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Fuel Type</label>
                                                <SearchableSelect
                                                    options={[
                                                        { value: 'diesel', label: 'Diesel' },
                                                        { value: 'petrol', label: 'Petrol' },
                                                        { value: 'ev', label: 'Electric' },
                                                        { value: 'cng', label: 'CNG' }
                                                    ]}
                                                    value={itemFormData.fuel_type}
                                                    onChange={val => setItemFormData({ ...itemFormData, fuel_type: val })}
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Capacity</label>
                                                <input type="number" className="input-field" value={itemFormData.capacity} onChange={e => setItemFormData({ ...itemFormData, capacity: e.target.value })} min={1} max={20} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* BLOCK 3: STATUS & HUB */}
                                    <div className="form-section-block" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b' }}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Settings size={18} /> Performance & Location
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: editingItemId ? '200px 1fr' : '1fr', gap: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Operational Status</label>
                                                <div style={{ marginTop: '5px', padding: '10px 15px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <SearchableSelect
                                                        options={[
                                                            { value: 'Available', label: 'AVAILABLE' },
                                                            { value: 'Maintenance', label: 'MAINTENANCE' }
                                                        ]}
                                                        value={itemFormData.status}
                                                        onChange={val => setItemFormData({ ...itemFormData, status: val })}
                                                        className="status-searchable-select"
                                                        style={{ border: 'none', background: 'transparent', fontWeight: 700, padding: 0, height: 'auto', textAlign: 'center', color: itemFormData.status === 'Available' ? 'var(--success)' : 'var(--danger)' }}
                                                    />
                                                </div>
                                            </div>
                                            
                                            {editingItemId && (
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Transfer to Hub</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            className="input-field"
                                                            placeholder={`Current: ${selectedHub?.name || 'Unknown'} — type to change`}
                                                            value={hubSearchQuery}
                                                            onChange={e => handleHubSearch(e.target.value)}
                                                            style={{ background: '#fff' }}
                                                        />
                                                    </div>
                                                    {suggestedHub && (
                                                        <div className="service-alert info" style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem' }}>
                                                            <MapPin size={14} />
                                                            <p>Target: <strong>{suggestedHub.name}</strong> — {suggestedHub.address}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {showCreateHubPrompt && (
                                            <div style={{ marginTop: '1rem', padding: '1.25rem', background: '#fff', borderRadius: '10px', border: '1.5px dashed var(--primary)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                                                <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem', fontSize: '0.85rem' }}>Create New Hub & Transfer</p>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                                    <input className="input-field" placeholder="Hub Name*" value={newHubForTransfer.name} onChange={e => setNewHubForTransfer(p => ({ ...p, name: e.target.value }))} />
                                                    <input className="input-field" placeholder="Pincode*" value={newHubForTransfer.pincode} onChange={e => setNewHubForTransfer(p => ({ ...p, pincode: e.target.value }))} />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                    <textarea className="input-field" rows={1} placeholder="Full Address*" value={newHubForTransfer.address} onChange={e => setNewHubForTransfer(p => ({ ...p, address: e.target.value }))} />
                                                </div>
                                                <button className="btn-primary" style={{ width: '100%', py: '10px' }} onClick={handleTransferHubCreate}>Confirm Create & Move</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="form-grid">
                                    {/* BLOCK 1: PERSONAL DETAILS */}
                                    <div className="form-section-block" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <User size={18} /> Personal Details
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Driver Name*</label>
                                                <input className={`input-field ${formErrors.name ? 'error' : ''}`} value={itemFormData.name} onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })} placeholder="Full Name" style={{ background: '#fff' }} />
                                                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Phone*</label>
                                                <input className={`input-field ${formErrors.phone ? 'error' : ''}`} value={itemFormData.phone} onChange={e => setItemFormData({ ...itemFormData, phone: e.target.value })} maxLength={10} placeholder="10-digit mobile" style={{ background: '#fff' }} />
                                                {formErrors.phone && <span className="error-text">{formErrors.phone}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* BLOCK 2: PROFESSIONAL INFO */}
                                    <div className="form-section-block" style={{ gridColumn: '1 / -1', background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#3b82f6', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <CreditCard size={18} /> Professional Info
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>License Number</label>
                                                <input className={`input-field ${formErrors.license_number ? 'error' : ''}`} value={itemFormData.license_number} onChange={e => setItemFormData({ ...itemFormData, license_number: e.target.value })} placeholder="DL Number" />
                                                {formErrors.license_number && <span className="error-text">{formErrors.license_number}</span>}
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Status</label>
                                                <div style={{ marginTop: '5px', padding: '5px 15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <SearchableSelect
                                                        options={[
                                                            { value: 'Available', label: 'AVAILABLE' },
                                                            { value: 'On Leave', label: 'ON LEAVE' },
                                                            { value: 'Duty', label: 'ON DUTY' }
                                                        ]}
                                                        value={itemFormData.status}
                                                        onChange={val => setItemFormData({ ...itemFormData, status: val })}
                                                        style={{ border: 'none', background: 'transparent', fontWeight: 700, padding: 0, height: 'auto', textAlign: 'center', width: '100%', color: itemFormData.status === 'Available' ? 'var(--success)' : '#eab308' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
                            )}
                        </div>
                        <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowItemModal(false)}>Cancel</button><button className="btn-primary" onClick={handleSaveItem}>Save Item</button></div>
                    </div>
                </div>
            )}

            {assignModal.open && (
                <div className="modal-overlay">
<<<<<<< HEAD
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
                                    <label>Start Date *</label>
                                    <input type="date" className="input-field" value={assignForm.startDate} onChange={e => setAssignForm(p => ({ ...p, startDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>End Date *</label>
                                    <input type="date" className="input-field" value={assignForm.endDate} onChange={e => setAssignForm(p => ({ ...p, endDate: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Remarks</label>
                                <textarea className="input-field" rows={2} placeholder="Any special instructions..." value={assignForm.remarks} onChange={e => setAssignForm(p => ({ ...p, remarks: e.target.value }))} />
                            </div>
=======
                    <div className="modal-content gh-modal premium-card overflow-visible" style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <h2>Assign Vehicle {assignModal.loadingAssets && <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', marginLeft: '0.5rem' }}>— loading available assets…</span>}</h2>
                            <button onClick={() => setAssignModal({ open: false, trip: null })} className="close-btn"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            {/* BLOCK 1: TRIP IDENTIFIER */}
                            <div className="service-alert info" style={{ marginBottom: '1.25rem', padding: '12px 16px', borderRadius: '10px' }}>
                                <Car size={18} />
                                <p style={{ fontSize: '0.9rem' }}>Assigning asset for: <strong>{assignModal.trip?.trip_leader}</strong> — Trip {assignModal.trip?.trip_id} to <strong>{assignModal.trip?.destination}</strong></p>
                            </div>

                            <div className="form-grid">
                                {/* BLOCK 2: ASSET ALLOCATION */}
                                <div className="form-section-block" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Car size={18} /> Asset Allocation
                                    </h3>
                                    <div style={{ display: 'grid', gap: '15px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontWeight: 600, fontSize: '0.8rem', color: formErrors.vehicleId ? 'var(--error)' : 'inherit' }}>Select Available Vehicle*</label>
                                            <SearchableSelect
                                                options={allVehicles.map(v => ({
                                                    value: v.id,
                                                    label: `${v.plate_number} — ${v.model_name} (${v.vehicle_type || v.type || ''}, ${v.status})`
                                                }))}
                                                value={assignForm.vehicleId}
                                                onChange={val => setAssignForm(p => ({ ...p, vehicleId: val }))}
                                                placeholder={assignModal.loadingAssets ? 'Fetching available vehicles…' : '-- Choose a vehicle --'}
                                                error={formErrors.vehicleId}
                                                loading={assignModal.loadingAssets}
                                                noDataMessage="No available vehicles for the selected dates"
                                            />
                                            {formErrors.vehicleId && <span className="error-text" style={{ fontSize: '0.7rem' }}>{formErrors.vehicleId}</span>}
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Booking Type</label>
                                            <SearchableSelect
                                                options={[
                                                    { value: 'Official', label: 'Trip Assignment' },
                                                    { value: 'Maintenance', label: 'Maintenance / Service' },
                                                    { value: 'Internal', label: 'Internal Movement' }
                                                ]}
                                                value={assignForm.booking_type}
                                                onChange={val => setAssignForm(p => ({ ...p, booking_type: val }))}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Assign Driver (optional)</label>
                                            <SearchableSelect
                                                options={allDrivers.map(d => ({
                                                    value: d.id,
                                                    label: `${d.name} — ${d.phone}`
                                                }))}
                                                value={assignForm.driverId}
                                                onChange={val => setAssignForm(p => ({ ...p, driverId: val }))}
                                                placeholder={assignModal.loadingAssets ? 'Fetching available drivers…' : '-- No driver assigned --'}
                                                loading={assignModal.loadingAssets}
                                                noDataMessage="No available drivers for the selected dates"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* BLOCK 3: SCHEDULE & REMARKS */}
                                <div className="form-section-block" style={{ gridColumn: '1 / -1', background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={18} /> Schedule & Logistics
                                    </h3>
                                    <div className="date-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Start Date*</label>
                                            <input type="date" className="input-field" value={assignForm.startDate} onChange={e => setAssignForm(p => ({ ...p, startDate: e.target.value }))} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>End Date*</label>
                                            <input type="date" className="input-field" value={assignForm.endDate} onChange={e => setAssignForm(p => ({ ...p, endDate: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Assignment Remarks</label>
                                        <textarea className="input-field" rows={2} placeholder="Any special instructions for the driver..." value={assignForm.remarks} onChange={e => setAssignForm(p => ({ ...p, remarks: e.target.value }))} style={{ background: '#f8fafc' }} />
                                    </div>
                                </div>
                            </div>
>>>>>>> ef1d260ab4f0ff0c66d819ad5b78dde9435b14da
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
