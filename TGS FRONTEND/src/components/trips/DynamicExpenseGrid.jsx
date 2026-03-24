import { formatIndianCurrency } from '../../utils/formatters';
import React, { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Trash2,
    Upload,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    Clock,
    Camera,
    FileText,
    Calendar,
    MapPin,
    Car,
    Plane,
    Coffee,
    Hotel,
    AlertCircle,
    CheckCircle2,
    Info,
    Receipt,
    Navigation,
    Home,
    IndianRupee,
    AlertTriangle,
    RotateCcw,
    XCircle,
    ArrowLeftRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { useToast } from '../../context/ToastContext';


const NATURE_OPTIONS = [
    { value: 'Travel', label: 'Travel', icon: <Plane size={14} /> },
    { value: 'Local Travel', label: 'Local Travel', icon: <Car size={14} /> },
    { value: 'Food', label: 'Food & Refreshments', icon: <Coffee size={14} /> },
    { value: 'Accommodation', label: 'Accommodation', icon: <Hotel size={14} /> },
    { value: 'Incidental', label: 'Incidental Expenses', icon: <Receipt size={14} /> },
    { value: 'Review', label: 'Final Review', icon: <CheckCircle2 size={14} /> }
];

const INCIDENTAL_KEYWORDS = {
    fuel: ['fuel'],
    parking: ['parking'],
    toll: ['toll']
};

const normalizeToken = (value = '') =>
    String(value)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const normalizeBookingLabel = (value = '') => {
    const token = normalizeToken(value);
    if (['CA', 'COMPANY_ARRANGEMENT', 'COMPANY_BOOKED'].includes(token)) return 'Company Arrangement';
    if (['SA', 'SELF_ARRANGEMENT', 'SELF_BOOKED'].includes(token)) return 'Self Booked';
    return value;
};

const COMPANY_BOOKING_TYPES = new Set(['COMPANY_ARRANGEMENT', 'COMPANY_BOOKED', 'CA']);
const isCompanyBooked = (bookedBy) => COMPANY_BOOKING_TYPES.has(normalizeToken(bookedBy));

const normalizeMasterCode = (masterKey, item) => {
    const rawCode = normalizeToken(item.code);
    const normalizedName = normalizeToken(item.name);

    switch (masterKey) {
        case 'travel_mode':
            if (rawCode === 'FL' || normalizedName === 'FLIGHT') return 'FLIGHT';
            if (rawCode === 'TR' || normalizedName === 'TRAIN') return 'TRAIN';
            if (rawCode === 'IB' || normalizedName === 'INTERCITY_BUS') return 'INTERCITY_BUS';
            if (rawCode === 'IC' || normalizedName === 'INTERCITY_CAB') return 'INTERCITY_CAB';
            return rawCode || normalizedName;
        case 'local_travel_mode':
            if (normalizedName === 'METRO_TRAIN' || rawCode === 'MT') return 'METRO';
            if (normalizedName === 'LOCAL_TRAIN') return 'LOCAL_TRAIN';
            if (normalizedName === 'PUBLIC_TRANSPORT') return 'BUS';
            return rawCode || normalizedName;
        case 'local_car_subtype':
            if (normalizedName === 'OWN_CAR' || rawCode === 'OC') return 'OWN_CAR';
            if (normalizedName === 'COMPANY_CAR' || rawCode === 'CC') return 'COMPANY_CAR';
            if (normalizedName === 'POOL_VECHILE' || normalizedName === 'POOL_VEHICLE' || rawCode === 'PV') return 'POOL_VEHICLE';
            if (normalizedName === 'RENTED_CAR_WITH_DRIVER' || normalizedName === 'RENTED_CAR_WITH__DRIVER_' || rawCode === 'RCWD') return 'RENTED_CAR_WITH_DRIVER';
            if (normalizedName === 'SELF_DRIVE_RENTAL' || rawCode === 'SDR') return 'SELF_DRIVE_RENTAL';
            if (normalizedName === 'RIDE_HAILING' || rawCode === 'RH') return 'RIDE_HAILING';
            return rawCode || normalizedName;
        case 'local_bike_subtype':
            if (normalizedName === 'OWN_BIKE' || rawCode === 'OB') return 'OWN_BIKE';
            if (normalizedName === 'COMAPNY_BIKE' || normalizedName === 'COMPANY_BIKE' || rawCode === 'CB') return 'COMPANY_BIKE';
            if (normalizedName === 'RENTAL_BIKE' || rawCode === 'RB') return 'RENTAL_BIKE';
            if (normalizedName === 'RIDE_BIKE' || rawCode === 'RBB') return 'RIDE_BIKE';
            return rawCode || normalizedName;
        case 'local_provider':
            if (normalizedName === 'LOCAL_VENDOR' || rawCode === 'LV') return 'LOCAL_VENDOR';
            if (normalizedName.includes('TAXI_VENDOR')) return 'LOCAL_TAXI_VENDOR';
            return rawCode || normalizedName;
        case 'incidental_type':
            return rawCode || normalizedName;
        default:
            return rawCode || normalizedName;
    }
};

const mapMasterObjects = (masterKey, master, labelKey) =>
    (master?.values || []).map(item => ({
        id: item.id,
        [labelKey]: item.name,
        key: normalizeMasterCode(masterKey, item),
        raw_code: item.code,
        status: item.status,
        extra_data: item.extra_data || {}
    }));

const SearchableInput = ({ value, onChange, options, placeholder, onBlur, error, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(value || '');
    const dropdownRef = useRef(null);

    useEffect(() => {
        setSearch(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        String(opt).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <input
                type="text"
                className={`cat-input ${error ? 'error' : ''}`}
                value={search}
                placeholder={placeholder}
                disabled={disabled}
                onChange={(e) => {
                    const val = e.target.value;
                    setSearch(val);
                    onChange(val);
                    setIsOpen(true);
                }}
                onFocus={() => !disabled && setIsOpen(true)}
                onBlur={() => {
                    setTimeout(() => setIsOpen(false), 200);
                    if (onBlur) onBlur(search);
                }}
            />
            {isOpen && filteredOptions.length > 0 && !disabled && (
                <div className="absolute z-[1000] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredOptions.map((opt, i) => (
                        <div
                            key={i}
                            className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 font-medium text-slate-700"
                            onClick={() => {
                                onChange(opt);
                                setSearch(opt);
                                setIsOpen(false);
                            }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Constants removed: fully reliant on dynamic DB Masters

const DynamicExpenseGrid = ({ tripId, startDate, endDate, initialExpenses = [], totalAdvance = 0, onUpdate, tripStatus, claimStatus }) => {
    // Master data states
    const [travelModes, setTravelModes] = useState([]);
    const [bookedByOptions, setBookedByOptions] = useState([]);
    const [flightClasses, setFlightClasses] = useState([]);
    const [trainClasses, setTrainClasses] = useState([]);
    const [busSeatTypes, setBusSeatTypes] = useState([]);
    const [intercityCabVehicleTypes, setIntercityCabVehicleTypes] = useState([]);
    const [airlines, setAirlines] = useState([]);
    const [busOperators, setBusOperators] = useState([]);
    const [travelProviders, setTravelProviders] = useState([]);
    const [trainProviders, setTrainProviders] = useState([]);
    const [busProviders, setBusProviders] = useState([]);
    const [cabProviders, setCabProviders] = useState([]);

    // Local Masters
    const [localTravelModes, setLocalTravelModes] = useState([]);
    const [localCarSubTypes, setLocalCarSubTypes] = useState([]);
    const [localBikeSubTypes, setLocalBikeSubTypes] = useState([]);
    const [localProviders, setLocalProviders] = useState([]);

    // Stay Masters
    const [stayTypes, setStayTypes] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]);

    // Food Masters
    const [mealCategories, setMealCategories] = useState([]);
    const [mealTypes, setMealTypes] = useState([]);

    // Incidental Masters
    const [incidentalTypes, setIncidentalTypes] = useState([]);

    const [rows, setRows] = useState([]);
    const [errors, setErrors] = useState({}); // { rowId: { fieldKey: message } }
    const [activeCategory, setActiveCategory] = useState('Travel'); // Default selection
    const prevCategoryRef = useRef('Travel'); // keep last known category across syncs
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const { showToast, confirm } = useToast();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const activeRowRef = useRef(null);
    const activeFieldRef = useRef(null);
    const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'warning' });
    const [reviewFilter, setReviewFilter] = useState('All');
    const [focusedInput, setFocusedInput] = useState(null); // { rowId: string, field: 'amount' }

    // --- DATE RANGE CONSTRAINTS ---
    const getMinDate = () => {
        if (!startDate) return undefined;
        try {
            return new Date(startDate).toISOString().split('T')[0];
        } catch (e) { return undefined; }
    };

    const getMaxDate = () => {
        if (!endDate) return undefined;
        try {
            return new Date(endDate).toISOString().split('T')[0];
        } catch (e) { return undefined; }
    };

    const getBookingMinDate = () => {
        if (!startDate) return undefined;
        try {
            const d = new Date(startDate);
            d.setDate(d.getDate() - 7);
            return d.toISOString().split('T')[0];
        } catch (e) { return undefined; }
    };

    const getBookingMaxDate = () => {
        if (!startDate) return undefined;
        try {
            return new Date(startDate).toISOString().split('T')[0];
        } catch (e) { return undefined; }
    };

    const minDate = getMinDate();
    const maxDate = getMaxDate();
    const bookingMinDate = getBookingMinDate();
    const bookingMaxDate = getBookingMaxDate();

    // Additional state for location hierarchy
    const [locationsPool, setLocationsPool] = useState([]);

    const isTripApproved = ['approved', 'hr approved', 'on-going'].includes(tripStatus?.toLowerCase());

    const isSameDayTrip = () => {
        return rows.some(r => {
            if (r.nature !== 'Travel') return false;
            const modeObj = travelModes.find(m => m.mode_name === r.details.mode) || {};
            return modeObj.key === 'INTERCITY_CAB' && r.date === (r.endDate || r.date);
        });
    };

    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const mastersRes = await api.get('/api/dynamic-masters/');
                const masters = mastersRes.data || {};

                // Populate Travel
                setTravelModes(mapMasterObjects('travel_mode', masters.travel_mode, 'mode_name'));
                setBookedByOptions((masters.booking_type?.values || []).filter(m => m.status).map(m => normalizeBookingLabel(m.name)));
                setFlightClasses((masters.flight_class?.values || []).filter(m => m.status).map(m => m.name));
                setTrainClasses((masters.train_class?.values || []).filter(m => m.status).map(m => m.name));
                setBusSeatTypes((masters.bus_type?.values || []).filter(m => m.status).map(m => m.name));
                setIntercityCabVehicleTypes((masters.intercity_cab_vehicle?.values || []).filter(m => m.status).map(m => m.name));
                setAirlines((masters.airline?.values || []).filter(m => m.status).map(m => m.name));
                setBusOperators((masters.bus_operator?.values || []).filter(m => m.status).map(m => m.name));
                setTravelProviders(mapMasterObjects('travel_provider', masters.travel_provider, 'provider_name'));
                setTrainProviders(mapMasterObjects('train_provider', masters.train_provider, 'provider_name'));
                setBusProviders(mapMasterObjects('bus_provider', masters.bus_provider, 'provider_name'));
                setCabProviders(mapMasterObjects('intercity_cab_provider', masters.intercity_cab_provider, 'provider_name'));

                // Populate Local
                setLocalTravelModes(mapMasterObjects('local_travel_mode', masters.local_travel_mode, 'mode_name'));
                setLocalCarSubTypes(mapMasterObjects('local_car_subtype', masters.local_car_subtype, 'sub_type'));
                setLocalBikeSubTypes(mapMasterObjects('local_bike_subtype', masters.local_bike_subtype, 'sub_type'));
                setLocalProviders(mapMasterObjects('local_provider', masters.local_provider, 'provider_name'));

                // Populate Stay
                setStayTypes((masters.stay_type?.values || []).filter(m => m.status).map(m => m.name));
                setRoomTypes((masters.room_type?.values || []).filter(m => m.status).map(m => m.name));

                // Populate Food
                setMealCategories((masters.meal_category?.values || []).filter(m => m.status).map(m => m.name));
                setMealTypes((masters.meal_type?.values || []).filter(m => m.status).map(m => m.name));

                // Populate Incidental
                setIncidentalTypes((masters.incidental_type?.values || []).filter(m => m.status).map(m => ({
                    id: m.id,
                    expense_type: m.name,
                    key: normalizeMasterCode('incidental_type', m),
                    raw_code: m.code,
                    status: m.status,
                    extra_data: m.extra_data || {}
                })));

                // Fetch locations for searchable dropdown
                try {
                    const geoRes = await api.get('/api/geo/hierarchy/');
                    const geoData = geoRes.data.results || geoRes.data.data || geoRes.data;
                    const pool = [];
                    const walk = (node) => {
                        if (node.name) pool.push(node.name);
                        ['states', 'districts', 'mandals', 'clusters', 'villages', 'towns', 'cities', 'metro_polyten_cities', 'locations', 'landmarks'].forEach(k => {
                            if (Array.isArray(node[k])) node[k].forEach(walk);
                        });
                        if (Array.isArray(node.children)) node.children.forEach(walk);
                    };
                    if (Array.isArray(geoData)) geoData.forEach(walk);
                    setLocationsPool([...new Set(pool)].sort());
                } catch (e) { console.error("Geo hierarchy fetch failed", e); }

            } catch (error) {
                console.error("Failed to fetch masters:", error);
            }
        };
        fetchMasters();
    }, []);

    useEffect(() => {
        // restore the category after syncing with server data
        if (prevCategoryRef.current) {
            setActiveCategory(prevCategoryRef.current);
        }

        if (initialExpenses && initialExpenses.length > 0) {
            const syncedRows = initialExpenses.map(exp => {
                let details = { description: exp.description || '' };
                try {
                    if (typeof exp.description === 'string' && exp.description.startsWith('{')) {
                        details = JSON.parse(exp.description);
                    }
                } catch (e) { }

                if (!details.auditTrail) details.auditTrail = [];
                if (!details.travelStatus) details.travelStatus = 'Completed';

                return {
                    id: exp.id || Math.random().toString(36).substr(2, 9),
                    date: exp.date || new Date().toISOString().split('T')[0],
                    nature: exp.category === 'Others' ? 'Travel' : (exp.category === 'Fuel' ? 'Local Travel' : exp.category),
                    details: details,
                    timeDetails: details.time || { boardingTime: '', scheduledTime: '', delay: 0, actualTime: '' },
                    amount: exp.amount || '',
                    remarks: details.remarks || exp.remarks || '',
                    bills: (() => {
                        try {
                            if (typeof exp.receipt_image === 'string' && exp.receipt_image.startsWith('[')) {
                                return JSON.parse(exp.receipt_image);
                            }
                        } catch (e) { }
                        return exp.receipt_image ? [exp.receipt_image] : [];
                    })(),
                    claim: true,
                    isExpanded: true,
                    isSaved: true
                };
            });
            // Preserve rows that haven't been saved yet when syncing
            setRows(currentRows => {
                const unsavedRows = currentRows.filter(r => !r.isSaved);
                return [...syncedRows, ...unsavedRows];
            });
        }
    }, [initialExpenses]);

    // keep ref up to date whenever user switches tabs
    useEffect(() => {
        prevCategoryRef.current = activeCategory;
    }, [activeCategory]);

    const getIncidentalTypeKey = (type) => {
        const match = incidentalTypes.find(item => item.expense_type === type);
        return match?.key || '';
    };

    const isIncidentalMatch = (type, kind) => {
        const normalized = `${type || ''} ${getIncidentalTypeKey(type)}`.toLowerCase();
        return INCIDENTAL_KEYWORDS[kind].some(token => normalized.includes(token));
    };

    const ownVehicleRows = rows.filter(r => r.nature === 'Local Travel' && ['Own Car', 'Own Bike'].includes(r.details.subType));
    const ownCarRows = rows.filter(r => r.nature === 'Local Travel' && r.details.subType === 'Own Car');
    const fuelMissing = ownVehicleRows.some(r => !parseFloat(r.details.fuel || 0));
    const parkingMissing = ownVehicleRows.some(r => !parseFloat(r.details.parking || 0));
    const tollManualAllowed = ownCarRows.some(r => r.details.tollLookup?.manualEntryAllowed && !parseFloat(r.details.toll || 0));
    const filteredIncidentalTypes = incidentalTypes.filter(item => {
        const type = item.expense_type;
        if (isIncidentalMatch(type, 'fuel') || isIncidentalMatch(type, 'parking')) {
            if (isIncidentalMatch(type, 'fuel')) return fuelMissing;
            return parkingMissing;
        }
        if (isIncidentalMatch(type, 'toll')) {
            return tollManualAllowed;
        }
        return true;
    });

    const applyOwnCarTollLookup = async (rowId, details) => {
        if (details.subType !== 'Own Car' || !details.origin || !details.destination) {
            setRows(prevRows => prevRows.map(row => {
                if (row.id !== rowId) return row;
                const nextDetails = { ...row.details };
                delete nextDetails.tollLookup;
                if (row.details.tollAutoFetched) {
                    delete nextDetails.toll;
                }
                delete nextDetails.tollAutoFetched;
                return { ...row, details: nextDetails, isSaved: false };
            }));
            return;
        }

        try {
            const res = await api.get('/api/masters/routes/toll-lookup/', {
                params: { source: details.origin, destination: details.destination }
            });
            const lookup = res.data || {};

            setRows(prevRows => prevRows.map(row => {
                if (row.id !== rowId) return row;

                const shouldApplyAutoAmount = lookup.has_rate_record && (!row.details.toll || row.details.tollAutoFetched);
                const nextDetails = {
                    ...row.details,
                    tollLookup: {
                        hasRoute: !!lookup.has_route,
                        hasTollRecord: !!lookup.has_toll_record,
                        hasRateRecord: !!lookup.has_rate_record,
                        manualEntryAllowed: !!lookup.manual_entry_allowed,
                        amount: lookup.amount || 0
                    },
                    tollAutoFetched: shouldApplyAutoAmount
                };

                if (shouldApplyAutoAmount) {
                    nextDetails.toll = String(lookup.amount || 0);
                } else if (!lookup.has_rate_record && row.details.tollAutoFetched) {
                    delete nextDetails.toll;
                    nextDetails.tollAutoFetched = false;
                }

                return { ...row, details: nextDetails, isSaved: false };
            }));
        } catch (error) {
            console.error('Toll lookup failed:', error);
        }
    };

    const saveRegistry = async () => {
        setErrors({}); // clear previous inline errors
        if (rows.length === 0) {
            showToast("No expenses to save", "info");
            return false;
        }

        // --- DUPLICATE ENTRY CHECK ---
        const entrySet = new Set();
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            let key = '';
            if (row.nature === 'Travel') {
                key = `Travel|${row.date}|${row.details.mode}|${row.details.origin}|${row.details.destination}|${row.details.pnr || ''}`;
            } else if (row.nature === 'Local Travel') {
                key = `Local|${row.date}|${row.details.mode}|${row.details.subType}|${row.details.origin || ''}|${row.details.destination || ''}`;
            } else if (row.nature === 'Food') {
                key = `Food|${row.date}|${row.details.mealType}|${row.details.restaurant}`;
            } else if (row.nature === 'Accommodation') {
                key = `Accommodation|${row.date}|${row.details.accomType || ''}|${row.details.hotelName || ''}`;
            } else if (row.nature === 'Incidental') {
                key = `Incidental|${row.date}|${row.details.incidentalType}`;
            } else {
                key = `Other|${row.nature}|${row.date}|${row.amount}|${row.remarks}`;
            }

            if (entrySet.has(key)) {
                showToast(`Duplicate entry detected at row #${i + 1}. Please remove or modify unique details like PNR or Route.`, "error");
                return false;
            }
            entrySet.add(key);
        }

        // --- PRE-FLIGHT VALIDATION ---

        if (rows.length === 0) {
            showToast("At least one expense entry must exist before saving.", "error");
            return false;
        }

        // Check for overlapping long distance journeys
        const sortedTravelRows = rows.filter(r => r.nature === 'Travel').sort((a, b) => {
            const dateA = new Date((a.details.depDate || a.date) + 'T' + (a.timeDetails.boardingTime || '00:00'));
            const dateB = new Date((b.details.depDate || b.date) + 'T' + (b.timeDetails.boardingTime || '00:00'));
            return dateA - dateB;
        });

        for (let i = 1; i < sortedTravelRows.length; i++) {
            const prevRow = sortedTravelRows[i - 1];
            const currRow = sortedTravelRows[i];

            if (prevRow.details.arrDate && prevRow.timeDetails.actualTime && currRow.details.depDate && currRow.timeDetails.boardingTime) {
                const prevArrival = new Date(prevRow.details.arrDate + 'T' + prevRow.timeDetails.actualTime);
                const currDeparture = new Date(currRow.details.depDate + 'T' + currRow.timeDetails.boardingTime);

                // Handle next day arrival for prevRow
                const prevDeparture = new Date((prevRow.details.depDate || prevRow.date) + 'T' + (prevRow.timeDetails.boardingTime || '00:00'));
                if (prevArrival < prevDeparture) {
                    prevArrival.setDate(prevArrival.getDate() + 1);
                }

                if (currDeparture < prevArrival) {
                    const rowIdx = rows.findIndex(r => r.id === currRow.id) + 1;
                    showToast(`Item #${rowIdx}: This journey overlaps with the previous journey. Please adjust the departure time.`, "error");
                    return false;
                }
            }
        }

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 1;

            // DATE RANGE VALIDATION
            if (minDate && maxDate) {
                if (row.nature === 'Travel') {
                    if (row.date < bookingMinDate || row.date > bookingMaxDate) {
                        showToast(`Item #${rowNum}: Booking date (${row.date}) must be within 7 days before trip start date and not later than trip end date.`, "error");
                        return false;
                    }
                    if (row.details.depDate && (row.details.depDate < minDate || row.details.depDate > maxDate)) {
                        showToast(`Item #${rowNum}: Departure date (${row.details.depDate}) must fall within trip range.`, "error");
                        return false;
                    }
                    if (row.details.arrDate && (row.details.arrDate < minDate || row.details.arrDate > maxDate)) {
                        showToast(`Item #${rowNum}: Arrival date (${row.details.arrDate}) must fall within trip range.`, "error");
                        return false;
                    }
                } else if (row.nature === 'Local Travel') {
                    if (row.date < minDate || row.date > maxDate) {
                        showToast(`Item #${rowNum}: Local travel start date (${row.date}) must fall within trip range.`, "error");
                        return false;
                    }
                    if (row.endDate && (row.endDate < minDate || row.endDate > maxDate)) {
                        showToast(`Item #${rowNum}: Local travel end date (${row.endDate}) must fall within trip range.`, "error");
                        return false;
                    }
                } else if (row.nature === 'Accommodation') {
                    if (row.details.actualCheckInDate && (row.details.actualCheckInDate < minDate || row.details.actualCheckInDate > maxDate)) {
                        showToast(`Item #${rowNum}: Check-In date must fall within trip range.`, "error");
                        return false;
                    }
                    if (row.details.actualCheckOutDate && (row.details.actualCheckOutDate < minDate || row.details.actualCheckOutDate > maxDate)) {
                        showToast(`Item #${rowNum}: Check-Out date must fall within trip range.`, "error");
                        return false;
                    }
                } else {
                    if (row.date < minDate || row.date > maxDate) {
                        showToast(`Item #${rowNum}: Selected date (${row.date}) must fall within trip range.`, "error");
                        return false;
                    }
                }
            }

            // AMOUNT
            if (row.amount === '' || row.amount === null || row.amount === undefined || isNaN(parseFloat(row.amount))) {
                showToast(`Item #${rowNum}: Please enter a valid numeric amount.`, "error");
                return false;
            }

            const amt = parseFloat(row.amount);

            // Rule: Amount must be exactly 0 for "Company Arrangement" items
            if ((row.nature === 'Travel' || row.nature === 'Local Travel') && isCompanyBooked(row.details.bookedBy)) {
                if (amt !== 0) {
                    showToast(`Item #${rowNum}: Amount must be exactly 0 for Company Arrangement items.`, "error");
                    return false;
                }
            } else if (row.nature === 'Local Travel') {
                const modeObj = localTravelModes.find(m => m.mode_name === row.details.mode) || {};
                if (modeObj.key === 'WALK' && amt !== 0) {
                    showToast(`Item #${rowNum}: Walk mode amount must be exactly 0.`, "error");
                    return false;
                }
            } else {
                if (amt <= 0) {
                    showToast(`Item #${rowNum}: Amount must be greater than 0.`, "error");
                    return false;
                }
            }

            // require bill if any charge present
            if (amt > 0 && (!row.bills || row.bills.length === 0)) {
                showToast(`Item #${rowNum}: Any entry with amount > 0 must have at least one receipt uploaded.`, "error");
                return false;
            }
            if (amt < 0) {
                showToast(`Item #${rowNum}: Amount cannot be negative.`, "error");
                return false;
            }
            // two decimal places
            if (!/^\d+(\.\d{1,2})?$/.test(String(row.amount))) {
                showToast(`Item #${rowNum}: Amount can have at most two decimal places.`, "error");
                return false;
            }
            // TODO: compare against company policy limit if available


            if (row.nature === 'Travel') {
                const selectedModeObj = travelModes.find(m => m.mode_name === row.details.mode) || {};
                const modeKey = selectedModeObj.key || '';
                const { origin, destination, travelStatus, bookedBy, provider, ticketNo, pnr, travelNo, depDate, arrDate } = row.details;
                const isSelfBooked = !isCompanyBooked(bookedBy);

                // Booking date must always be present
                if (!row.date) {
                    showToast(`Item #${rowNum}: Booking Date is required.`, "error");
                    return false;
                }

                // COMMON MANDATORY FIELDS
                if (!row.details.mode) {
                    showToast(`Item #${rowNum}: Please select a Travel Mode.`, "error");
                    return false;
                }

                // origin/destination validations
                if (!origin || !destination) {
                    showToast(`Item #${rowNum}: Origin and Destination are required for Travel entries.`, "error");
                    return false;
                }
                if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
                    showToast(`Item #${rowNum}: Origin and Destination cannot be the same.`, "error");
                    return false;
                }
                const locRegex = /^[A-Za-z ]{2,}$/;
                if (!locRegex.test(origin) || !locRegex.test(destination)) {
                    showToast(`Item #${rowNum}: From/To must be at least 2 alphabetic characters.`, "error");
                    return false;
                }
                // invoice number validation (alphanumeric, max 30)
                if (row.details.invoiceNo) {
                    const inv = row.details.invoiceNo;
                    if (!/^[A-Za-z0-9]+$/.test(inv)) {
                        showToast(`Item #${rowNum}: Invoice Number may only be alphanumeric.`, "error");
                        return false;
                    }
                    if (inv.length > 30) {
                        showToast(`Item #${rowNum}: Invoice Number cannot exceed 30 characters.`, "error");
                        return false;
                    }
                }
                // carrier name allowed letters and spaces
                if (row.details.carrier && !/^[A-Za-z ]+$/.test(row.details.carrier)) {
                    showToast(`Item #${rowNum}: Carrier name may only contain letters and spaces.`, "error");
                    return false;
                }

                // universal date order checks
                const bookDateObj = new Date(row.date);
                const depDateObj = new Date(depDate || row.date);
                const arrDateObj = new Date(arrDate || row.date);
                if (depDateObj < bookDateObj) {
                    setRowError(row.id, 'depDate', 'Departure Date cannot be before Booking Date.');
                    return false;
                }
                if (arrDateObj < depDateObj) {
                    setRowError(row.id, 'arrDate', 'Arrival Date cannot be before Departure Date.');
                    return false;
                }

                // time order check (if both times provided)
                if (row.timeDetails.boardingTime && row.timeDetails.actualTime) {
                    if (arrDateObj.getTime() === depDateObj.getTime()) {
                        if (row.timeDetails.boardingTime >= row.timeDetails.actualTime) {
                            showToast(`Item #${rowNum}: Arrival time must be later than Departure time on the same day.`, "error");
                            return false;
                        }
                    }
                }

                if (modeKey === 'FLIGHT') {
                    if (!provider) { setRowError(row.id, 'provider', 'Airline Name is mandatory.'); return false; }
                    if (!ticketNo) { setRowError(row.id, 'ticketNo', 'Ticket Number is mandatory.'); return false; }
                    if (!pnr) { setRowError(row.id, 'pnr', 'PNR is mandatory.'); return false; }
                    if (!row.details.classType) { setRowError(row.id, 'classType', 'Class is mandatory for Flight.'); return false; }
                    if (!travelNo) { setRowError(row.id, 'travelNo', 'Flight Number is mandatory.'); return false; }
                    if (!row.timeDetails.boardingTime || !row.timeDetails.actualTime) { setRowError(row.id, 'time', 'Departure and Arrival times are mandatory.'); return false; }
                    // format/length validations
                    const alnum = /^[A-Za-z0-9]+$/;
                    if (!alnum.test(ticketNo)) { setRowError(row.id, 'ticketNo', 'Ticket Number may only contain letters and numbers.'); return false; }
                    if (ticketNo.length > 25) { setRowError(row.id, 'ticketNo', 'Ticket Number cannot exceed 25 characters.'); return false; }
                    if (!alnum.test(pnr)) { setRowError(row.id, 'pnr', 'PNR may only contain letters and numbers.'); return false; }
                    if (pnr.length < 5 || pnr.length > 15) { setRowError(row.id, 'pnr', 'PNR must be 5-15 characters long.'); return false; }
                } else if (modeKey === 'TRAIN') {
                    if (!ticketNo) { setRowError(row.id, 'ticketNo', 'Ticket Number is mandatory for Train.'); return false; }
                    if (!pnr) { setRowError(row.id, 'pnr', 'PNR is mandatory for Train.'); return false; }
                    if (!row.details.carrier) { setRowError(row.id, 'carrier', 'Train Name is mandatory.'); return false; }
                    if (!row.details.classType) { setRowError(row.id, 'classType', 'Class is mandatory for Train.'); return false; }
                    const alnum = /^[A-Za-z0-9]+$/;
                    if (!alnum.test(ticketNo)) { setRowError(row.id, 'ticketNo', 'Ticket Number may only contain letters and numbers.'); return false; }
                    if (ticketNo.length > 25) { setRowError(row.id, 'ticketNo', 'Ticket Number cannot exceed 25 characters.'); return false; }
                    if (!alnum.test(pnr)) { setRowError(row.id, 'pnr', 'PNR may only contain letters and numbers.'); return false; }
                    if (pnr.length < 5 || pnr.length > 15) { setRowError(row.id, 'pnr', 'PNR must be 5-15 characters long.'); return false; }
                } else if (modeKey === 'INTERCITY_BUS') {
                    if (!row.details.carrier) { setRowError(row.id, 'carrier', 'Bus Operator is mandatory.'); return false; }
                } else if (modeKey === 'INTERCITY_CAB') {
                    if (!provider) { setRowError(row.id, 'provider', 'Provider / Vendor (Ola/Uber etc) is mandatory.'); return false; }
                    if (!row.timeDetails.boardingTime || !row.timeDetails.actualTime) { setRowError(row.id, 'time', 'Departure and Arrival times are mandatory for Cab.'); return false; }
                }

                if (isSelfBooked) {
                    // travel-specific requirement
                    if (row.nature === 'Travel') {
                        if (row.amount === '' || row.amount <= 0) {
                            showToast(`${row.nature} Item #${rowNum}: Total Amount is mandatory for Self Booked.`, "error");
                            return false;
                        }
                    }
                    // local travel also needs positive amount when self-booked
                    if (row.nature === 'Local Travel') {
                        if (row.amount === '' || row.amount <= 0) {
                            showToast(`${row.nature} Item #${rowNum}: Total Amount is mandatory for Self Booked.`, "error");
                            return false;
                        }
                    }
                    if (['FLIGHT', 'INTERCITY_BUS', 'INTERCITY_CAB'].includes(modeKey)) {
                        // Ticket/Invoice requirements
                        if (!row.bills || row.bills.length < (modeKey === 'INTERCITY_CAB' ? 1 : 2)) {
                            showToast(`Item #${rowNum}: Please upload ${modeKey === 'INTERCITY_CAB' ? 'Invoice' : 'Ticket and Invoice'} for self-booked entry.`, "warning");
                        }
                    }
                }

                // Cancellation/No-Show Logic
                if (travelStatus === 'Cancelled') {
                    const charges = parseFloat(row.details.cancellationCharges || 0);
                    const refund = parseFloat(row.details.refundAmount || 0);
                    const baseFare = parseFloat(row.details.baseFare || 0);
                    if (baseFare > 0 && (charges + refund > baseFare + 0.5)) {
                        showToast(`Item #${rowNum}: Sum of Charges and Refund exceeds original Ticket Amount.`, "error");
                        return false;
                    }
                    if (!row.details.cancellationReason || row.details.cancellationReason.trim().length < 3) {
                        showToast(`Item #${rowNum}: Please provide a valid cancellation reason.`, "error");
                        return false;
                    }
                }

                // Upload Validation
                if (isSelfBooked || modeKey !== 'FLIGHT') {
                    if (!row.bills || row.bills.length === 0) {
                        showToast(`Item #${rowNum}: Please upload your ticket/invoice. This is mandatory for all travel.`, "error");
                        return false;
                    }
                }
            }

            if (row.nature === 'Local Travel') {
                const selectedModeObj = localTravelModes.find(m => m.mode_name === row.details.mode) || {};
                const modeKey = selectedModeObj.key || '';
                const selectedSubTypeObj = [...localCarSubTypes, ...localBikeSubTypes].find(s => s.sub_type === row.details.subType) || {};
                const subTypeKey = selectedSubTypeObj.key || '';
                const { odoStart, odoEnd, origin, destination } = row.details;

                // Prevent during active long distance travel
                const localStart = new Date(row.date + 'T' + (row.timeDetails.boardingTime || '00:00'));
                const localEnd = new Date((row.endDate || row.date) + 'T' + (row.timeDetails.actualTime || '23:59'));
                for (let j = 0; j < rows.length; j++) {
                    const other = rows[j];
                    if (other.nature === 'Travel') {
                        if (other.details.depDate && other.details.arrDate) {
                            const dep = new Date(other.details.depDate + 'T' + (other.timeDetails.boardingTime || '00:00'));
                            const arr = new Date(other.details.arrDate + 'T' + (other.timeDetails.actualTime || '23:59'));
                            if (localStart >= dep && localStart <= arr) {
                                showToast(`Item #${rowNum}: Cannot record local conveyance during active long-distance travel period.`, "error");
                                return false;
                            }
                        }
                    }
                }

                if (!row.details.mode) {
                    showToast(`Item #${rowNum}: Please select a Mode for Local Travel.`, "error");
                    return false;
                }

                if (modeKey !== 'WALK' && !row.details.subType) {
                    showToast(`Item #${rowNum}: Please select a Sub-Type for ${row.details.mode}.`, "error");
                    return false;
                }

                // date range validation for local travel
                if (row.date && row.endDate) {
                    if (new Date(row.date) > new Date(row.endDate)) {
                        showToast(`Item #${rowNum}: End Date should be after Start Date.`, "error");
                        return false;
                    }
                }
                const today = new Date();
                if ((row.date && new Date(row.date) > today) || (row.endDate && new Date(row.endDate) > today)) {
                    showToast(`Item #${rowNum}: Travel dates cannot be in the future.`, "error");
                    return false;
                }

                // location cross-check
                if (origin && destination && origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
                    showToast(`Item #${rowNum}: Origin and Destination cannot be the same.`, "error");
                    return false;
                }
                // time validations for local travel
                if ((row.timeDetails.boardingTime && !row.timeDetails.actualTime) || (!row.timeDetails.boardingTime && row.timeDetails.actualTime)) {
                    showToast(`Item #${rowNum}: Both start and end times are required for Local Travel.`, "error");
                    return false;
                }
                if (row.timeDetails.boardingTime && row.timeDetails.actualTime) {
                    if (row.timeDetails.boardingTime >= row.timeDetails.actualTime) {
                        showToast(`Item #${rowNum}: End Time must be after Start Time.`, "error");
                        return false;
                    }
                }

                if (modeKey === 'WALK') {
                    if (parseFloat(row.amount) > 0) {
                        showToast(`Item #${rowNum}: Walk mode cannot have an associated cost.`, "error");
                        return false;
                    }
                    if (!origin || !destination) {
                        showToast(`Item #${rowNum}: From and To locations are required for Walk entries.`, "error");
                        return false;
                    }
                }

                if (row.details.subType === 'Own Car') {
                    if (!odoStart || !odoEnd) {
                        showToast(`Item #${rowNum}: Both start and end odometer readings are required for Own Car.`, "error");
                        return false;
                    }
                    if (isNaN(parseFloat(odoStart)) || isNaN(parseFloat(odoEnd))) {
                        showToast(`Item #${rowNum}: Odometer readings must be numeric.`, "error");
                        return false;
                    }
                    if (parseFloat(odoEnd) <= parseFloat(odoStart)) {
                        showToast(`Item #${rowNum}: End Odometer should be greater than Start Odometer.`, "error");
                        return false;
                    }
                    // require photos for both start and end readings
                    if (!row.details.odoStartImg || !row.details.odoEndImg) {
                        if (!row.details.odoStartImg) setRowError(row.id, 'odoStartImg', 'Start odometer photo required.');
                        if (!row.details.odoEndImg) setRowError(row.id, 'odoEndImg', 'End odometer photo required.');
                        return false;
                    }
                } else if (['Self Drive Rental', 'Own Bike'].includes(row.details.subType)) {
                    if (odoStart && odoEnd && parseFloat(odoEnd) <= parseFloat(odoStart)) {
                        showToast(`Item #${rowNum}: ODO End must be greater than ODO Start.`, "error");
                        return false;
                    }
                }
            }

            if (row.nature === 'Food') {
                if (!row.details.mealTime) { showToast(`Item #${rowNum}: Meal Time is required.`, "error"); return false; }
                if (!row.details.restaurant) { showToast(`Item #${rowNum}: Restaurant / Hotel Name is required.`, "error"); return false; }
                if (!row.details.purpose) { showToast(`Item #${rowNum}: Address is required.`, "error"); return false; }
                if (!row.amount || parseFloat(row.amount) <= 0) { showToast(`Item #${rowNum}: Amount must be > 0.`, "error"); return false; }
                if (!row.bills || row.bills.length === 0) { showToast(`Item #${rowNum}: Bill upload is mandatory.`, "error"); return false; }
            }

            if (row.nature === 'Accommodation') {
                if (!row.details.accomType) {
                    showToast(`Item #${rowNum}: Please select an Accommodation Type.`, "error");
                    return false;
                }
                if (!['No Stay', 'Self Stay'].includes(row.details.accomType) && !row.details.hotelName) {
                    showToast(`Item #${rowNum}: Please provide the Hotel/Guest House name.`, "error");
                    return false;
                }
                if (!['No Stay'].includes(row.details.accomType) && (!row.details.actualCheckInDate || !row.details.actualCheckOutDate)) {
                    showToast(`Item #${rowNum}: Actual Check-In and Check-Out dates are required for stays.`, "error");
                    return false;
                }
                if (row.details.actualCheckInDate && row.details.actualCheckOutDate && new Date(row.details.actualCheckInDate) > new Date(row.details.actualCheckOutDate)) {
                    showToast(`Item #${rowNum}: Check-Out date cannot be before Check-In date.`, "error");
                    return false;
                }
                if (row.details.actualCheckInDate && !row.details.actualCheckInTime) {
                    showToast(`Item #${rowNum}: Actual Check-In time is required for stays.`, "error");
                    return false;
                }
                if (row.details.actualCheckOutDate && !row.details.actualCheckOutTime) {
                    showToast(`Item #${rowNum}: Actual Check-Out time is required for stays.`, "error");
                    return false;
                }
                if (row.details.actualCheckInDate === row.details.actualCheckOutDate && row.details.actualCheckInTime && row.details.actualCheckOutTime) {
                    if (row.details.actualCheckInTime >= row.details.actualCheckOutTime) {
                        showToast(`Item #${rowNum}: Check-Out time must be after Check-In time on the same day.`, "error");
                        return false;
                    }
                }
            }

            if (row.nature === 'Incidental') {
                if (!row.details.incidentalType) {
                    showToast(`Item #${rowNum}: Please select an Incidental Type.`, "error");
                    return false;
                }
                if (!row.details.location) {
                    showToast(`Item #${rowNum}: Location is mandatory for incidental expenses.`, "error");
                    return false;
                }
                if (parseFloat(row.amount) <= 0) {
                    showToast(`Item #${rowNum}: Amount must be greater than 0.`, "error");
                    return false;
                }
                if (!row.bills || row.bills.length === 0) {
                    showToast(`Item #${rowNum}: Bill upload is mandatory for incidental expenses.`, "error");
                    return false;
                }
                if (row.details.incidentalType === 'Others') {
                    if (!row.details.otherReason) {
                        showToast(`Item #${rowNum}: Reason is required for 'Others' expense type.`, "error");
                        return false;
                    }
                    if (!row.details.description) {
                        showToast(`Item #${rowNum}: Description is required for 'Others' expense type.`, "error");
                        return false;
                    }
                }
            }
        }

        // Overlap Validation (Simplified: check if multiple travel segments have same start date)
        const travelRows = rows.filter(r => r.nature === 'Travel');
        const dates = travelRows.map(r => r.date);
        const hasOverlap = new Set(dates).size !== dates.length;
        if (hasOverlap) {
            // Further check could be done for time, but date level is a good start as per "No overlapping segments"
            const confirmOverlap = await confirm("Warning: Overlapping travel segments detected on the same date. Continue?");
            if (!confirmOverlap) return false;
        }

        // Meal overlap validation
        for (const row of rows) {
            if (row.nature === 'Food') {
                const hasMealBenefit = rows.some(r => r.nature === 'Travel' && r.date === row.date && r.details.mealIncluded);
                if (hasMealBenefit) {
                    const confirmMeal = await confirm(`Warning: You marked "Meal Included" for travel on ${row.date}. Separate meal claims for this day might be blocked. Continue?`);
                    if (!confirmMeal) return false;
                }
            }
        }

        setIsSaving(true);
        try {
            const newRows = rows.filter(r => !r.isSaved);

            if (newRows.length === 0) {
                setIsSaving(false);
                showToast("Registry is already up to date.", "info");
                return true;
            }

            for (const row of newRows) {
                const categoryMap = {
                    'Travel': 'Others',
                    'Local Travel': 'Fuel',
                    'Food': 'Food',
                    'Accommodation': 'Accommodation',
                    'Incidental': 'Incidental'
                };

                const filteredDetails = { ...row.details };
                if (row.nature === 'Local Travel') {
                    const modeObj = localTravelModes.find(m => m.mode_name === row.details.mode) || {};
                    const subTypeObj = localCarSubTypes.find(s => s.sub_type === row.details.subType) ||
                        localBikeSubTypes.find(s => s.sub_type === row.details.subType) || {};

                    const modeKey = modeObj.key || '';
                    const subTypeKey = subTypeObj.key || '';

                    // Remove fields not applicable for current mode/subtype
                    if (modeKey === 'WALK') {
                        delete filteredDetails.toll;
                        delete filteredDetails.parking;
                        delete filteredDetails.fuel;
                        delete filteredDetails.odoStart;
                        delete filteredDetails.odoEnd;
                        delete filteredDetails.totalKm;
                    }
                    if (modeKey === 'LOCAL_BUS' || modeKey === 'METRO' || modeKey === 'LOCAL_TRAIN') {
                        delete filteredDetails.odoStart;
                        delete filteredDetails.odoEnd;
                        delete filteredDetails.fuel;
                        delete filteredDetails.toll;
                        delete filteredDetails.parking;
                    }

                    const odoApplicableKeys = ['OWN_CAR', 'SELF_DRIVE_RENTAL', 'OWN_BIKE', 'COMPANY_CAR', 'COMPANY_BIKE'];
                    if (!odoApplicableKeys.includes(subTypeKey)) {
                        delete filteredDetails.odoStart;
                        delete filteredDetails.odoEnd;
                    }
                }

                const selectedModeObj = travelModes.find(m => m.mode_name === row.details.mode) || {};
                const modeKey = selectedModeObj.key || '';

                if (row.nature === 'Travel' && modeKey === 'INTERCITY_CAB') {
                    const { vehicleType } = row.details;
                    // For Intercity Cab vehicleType keys (HATCHBACK, SEDAN, SUV, MUV) we don't necessarily have keys for mapping if vehicleType is just strings from IntercityCabVehicleMaster class_name map
                    // But we check if it's 'Own Car' etc.
                    if (!['Own Car', 'Self Drive Rental'].includes(vehicleType)) {
                        delete filteredDetails.odoStart;
                        delete filteredDetails.odoEnd;
                    }
                    if (vehicleType === 'Company Car' && !row.details.driverName) {
                        delete filteredDetails.driverAllowance;
                    }
                    if (row.details.nightTravel !== 'Yes') {
                        delete filteredDetails.nightHaltCharges;
                    }
                    delete filteredDetails.travelStatus;
                }

                const payload = {
                    trip: tripId,
                    date: row.date,
                    category: categoryMap[row.nature] || 'Others',
                    amount: parseFloat(row.amount),
                    // New Database Fields
                    travel_mode: row.nature === 'Travel' ? row.details.mode : (row.nature === 'Local Travel' ? row.details.mode : null),
                    class_type: row.nature === 'Travel' ? row.details.classType : null,
                    booking_reference: row.nature === 'Travel' ? (row.details.pnr || row.details.bookingRef) : null,
                    refundable_flag: row.nature === 'Travel' ? row.details.refundable === 'Yes' : false,
                    meal_included_flag: row.nature === 'Travel' ? (row.details.mealIncluded === 'Yes' || row.details.mealIncluded === true) : false,
                    vehicle_type: (row.nature === 'Travel' || row.nature === 'Local Travel') ? (row.details.subType || row.details.vehicleType) : null,
                    odo_start: ((row.nature === 'Travel' || row.nature === 'Local Travel') && row.details.odoStart) ? parseFloat(row.details.odoStart) : null,
                    odo_end: ((row.nature === 'Travel' || row.nature === 'Local Travel') && row.details.odoEnd) ? parseFloat(row.details.odoEnd) : null,
                    distance: (row.nature === 'Travel' || row.nature === 'Local Travel') ? parseFloat(row.details.totalKm || 0) : null,
                    cancellation_status: row.nature === 'Travel' ? (row.details.travelStatus || 'Completed') : null,
                    cancellation_date: row.nature === 'Travel' ? row.details.cancellationDate : null,
                    refund_amount: row.nature === 'Travel' ? parseFloat(row.details.refundAmount || 0) : null,
                    cancellation_reason: row.nature === 'Travel' ? row.details.cancellationReason : null,
                    booked_by: row.nature === 'Travel' || row.nature === 'Local Travel' ? row.details.bookedBy : null,
                    reimbursement_eligible: row.nature === 'Travel' || row.nature === 'Local Travel' ? (row.details.bookedBy === 'Self Booked') : true,

                    // Stay & Lodging specific DB columns
                    scheduled_check_in_date: row.nature === 'Accommodation' ? row.details.scheduledCheckInDate : null,
                    scheduled_check_in_time: row.nature === 'Accommodation' ? row.details.scheduledCheckInTime : null,
                    actual_check_in_date: row.nature === 'Accommodation' ? row.details.actualCheckInDate : null,
                    actual_check_in_time: row.nature === 'Accommodation' ? row.details.actualCheckInTime : null,
                    scheduled_check_out_date: row.nature === 'Accommodation' ? row.details.scheduledCheckOutDate : null,
                    scheduled_check_out_time: row.nature === 'Accommodation' ? row.details.scheduledCheckOutTime : null,
                    actual_check_out_date: row.nature === 'Accommodation' ? row.details.actualCheckOutDate : null,
                    actual_check_out_time: row.nature === 'Accommodation' ? row.details.actualCheckOutTime : null,

                    description: JSON.stringify({
                        ...filteredDetails,
                        remarks: row.remarks,
                        time: row.timeDetails,
                        natureOfVisit: row.details.natureOfVisit || ''
                    }),
                    receipt_image: JSON.stringify(row.bills || []),
                };

                if (!isNaN(Number(row.id))) {
                    await api.patch(`/api/expenses/${row.id}/`, payload);
                } else {
                    const res = await api.post('/api/expenses/', payload);
                    if (res.data && res.data.id) {
                        row.id = res.data.id; // Update the ID to the real database ID
                    }
                }
            }

            showToast("Saved Successfully", "success");
            if (onUpdate) onUpdate();

            setRows(rows.map(r => ({ ...r, isSaved: true })));
            return true;

        } catch (error) {
            console.error("Save error:", error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || "Failed to commit registry due to a server error.";
            showToast(errorMsg, "error");
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleClaim = async () => {
        if (rows.length === 0) {
            showToast("Cannot submit a claim with no expenses", "error");
            return;
        }

        const hasUnsaved = rows.some(r => !r.isSaved);
        if (hasUnsaved) {
            setConfirmDialog({
                show: true,
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. These will be saved automatically before submission. Continue?',
                type: 'warning',
                onConfirm: async () => {
                    setConfirmDialog(prev => ({ ...prev, show: false }));
                    const saved = await saveRegistry();
                    if (saved) await submitFinalClaim();
                }
            });
            return;
        }

        await submitFinalClaim();
    };

    const submitFinalClaim = async () => {
        if (!isTripApproved) {
            showToast("Trip must be approved before filing claim", "warning");
            return;
        }

        const ledgerTotal = rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

        setConfirmDialog({
            show: true,
            title: 'Submit Final Claim',
            message: `Are you sure you want to submit the final claim for ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(ledgerTotal)}? This will lock the registry for approval.`,
            type: 'primary',
            onConfirm: async () => {
                setIsSubmitting(true);
                try {
                    await api.post('/api/claims/', {
                        trip: tripId,
                        total_amount: ledgerTotal,
                        status: 'Submitted',
                        submitted_at: new Date().toISOString()
                    });

                    showToast("Claim submitted successfully!", "success");
                    if (onUpdate) onUpdate();
                } catch (error) {
                    console.error("Claim submission error:", error);
                    showToast(error.response?.data?.error || "Failed to submit claim", "error");
                } finally {
                    setIsSubmitting(false);
                    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, type: 'warning' });
                }
            }
        });
    };

    const addRow = (nature = '') => {
        const targetNature = nature || activeCategory;
        const newRow = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            nature: targetNature,
            details: {
                segmentId: `SEG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                auditTrail: [],
                bookedBy: 'Self Booked', // Default
                travelStatus: 'Completed',
                scheduledCheckInDate: new Date().toISOString().split('T')[0],
                scheduledCheckInTime: '12:00',
                actualCheckInDate: new Date().toISOString().split('T')[0],
                actualCheckInTime: '',
                scheduledCheckOutDate: new Date().toISOString().split('T')[0],
                scheduledCheckOutTime: '12:00',
                actualCheckOutDate: new Date().toISOString().split('T')[0],
                actualCheckOutTime: ''
            },
            timeDetails: {
                boardingDate: new Date().toISOString().split('T')[0],
                boardingTime: '',
                checkInTime: '',
                scheduledTime: '',
                delay: 0,
                actualTime: ''
            },
            amount: '',
            bills: [],
            claim: true,
            isExpanded: true
        };
        setRows(prevRows => [...prevRows, newRow]);
    };

    const deleteRow = async (id) => {
        const row = rows.find(r => r.id === id);
        if (!row) return;

        // If it's already saved in DB, we need to delete it from server
        if (row.isSaved) {
            setConfirmDialog({
                show: true,
                title: 'Confirm Deletion',
                message: 'This entry is already saved. Are you sure you want to permanently delete it from the registry?',
                type: 'danger',
                onConfirm: async () => {
                    try {
                        await api.delete(`/api/expenses/${id}/`);
                        showToast("Entry removed from registry", "success");
                        setRows(prevRows => prevRows.filter(r => r.id !== id));
                        if (onUpdate) onUpdate();
                    } catch (error) {
                        console.error("Failed to delete expense:", error);
                        showToast("Failed to delete entry from server", "error");
                    } finally {
                        setConfirmDialog(prev => ({ ...prev, show: false }));
                    }
                }
            });
            return;
        }

        setRows(prevRows => prevRows.filter(row => row.id !== id));
    };

    const clearRowError = (id, key) => {
        setErrors(prev => {
            const copy = { ...prev };
            if (copy[id]) {
                delete copy[id][key];
                if (Object.keys(copy[id]).length === 0) delete copy[id];
            }
            return copy;
        });
    };

    const setRowError = (id, key, msg) => {
        setErrors(prev => ({
            ...prev,
            [id]: { ...(prev[id] || {}), [key]: msg }
        }));
    };

    const updateRow = (id, field, value) => {
        // clear error for this field
        clearRowError(id, field);
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                // RULE: If Company Booked Travel, Amount must be 0 and is non-editable
                if (field === 'amount' && row.nature === 'Travel' && isCompanyBooked(row.details.bookedBy)) {
                    return { ...row, amount: '0' };
                }
                const updatedRow = { ...row, [field]: value, isSaved: false };
                if (field === 'nature') {
                    updatedRow.details = { bookedBy: 'Self Booked' };
                    updatedRow.timeDetails = { boardingTime: '', scheduledTime: '', delay: 0, actualTime: '' };
                }
                return updatedRow;
            }
            return row;
        }));
    };

    const updateDetails = (id, detailField, value) => {
        clearRowError(id, detailField);
        let tollLookupPayload = null;
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                let updatedAmount = row.amount;

                // Rule: If switching to Company Arrangement, force amount to 0
                if (detailField === 'bookedBy' && isCompanyBooked(value) && row.nature === 'Travel') {
                    updatedAmount = '0';
                }

                const newDetails = { ...row.details, [detailField]: value };

                if (detailField === 'odoStart' || detailField === 'odoEnd') {
                    const start = parseFloat(newDetails.odoStart || 0);
                    const end = parseFloat(newDetails.odoEnd || 0);
                    newDetails.totalKm = end >= start ? (end - start).toFixed(2) : 0;

                    // KM Reimbursement for Own Bike
                    if (row.nature === 'Local Travel' && newDetails.subType === 'Own Bike') {
                        const rate = 3; // Placeholder rate for Bike
                        newDetails.kmReimbursement = (newDetails.totalKm * rate).toFixed(2);
                    }
                }

                if (detailField === 'actualCheckInDate' || detailField === 'actualCheckOutDate') {
                    if (newDetails.actualCheckInDate && newDetails.actualCheckOutDate) {
                        const start = new Date(newDetails.actualCheckInDate);
                        const end = new Date(newDetails.actualCheckOutDate);
                        const diffTime = Math.abs(end - start);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        newDetails.nights = diffDays;
                    }
                }

                if (detailField === 'startTime' || detailField === 'endTime' || detailField === 'nightTravel') {
                    if (row.nature === 'Travel' && row.details.mode === 'Intercity Car') {
                        if (newDetails.startTime && newDetails.endTime) {
                            const [sH, sM] = newDetails.startTime.split(':').map(Number);
                            const [eH, eM] = newDetails.endTime.split(':').map(Number);
                            let durationHours = (eH - sH) + (eM - sM) / 60;
                            if (durationHours < 0) durationHours += 24; // Cross-day

                            if (newDetails.nightTravel === 'Yes' && durationHours > 8) {
                                // Potentially auto-fill or just enable flag
                                newDetails.haltEligible = true;
                            } else {
                                newDetails.haltEligible = false;
                                newDetails.nightHaltCharges = 0;
                            }
                        }
                    }
                }

                if (detailField === 'bookedBy' && row.nature === 'Travel') {
                    if (isCompanyBooked(value)) {
                        newDetails.reimbursement_eligible = false;
                        updatedAmount = '0';
                    } else {
                        newDetails.reimbursement_eligible = true;
                    }
                }

                if (row.nature === 'Local Travel' && ['subType', 'origin', 'destination'].includes(detailField)) {
                    tollLookupPayload = { ...newDetails };
                    if (detailField === 'subType' && value !== 'Own Car') {
                        delete newDetails.tollLookup;
                        delete newDetails.tollAutoFetched;
                        delete newDetails.toll;
                    }
                }

                return { ...row, details: newDetails, amount: updatedAmount, isSaved: false };
            }
            return row;
        }));
        if (tollLookupPayload) {
            applyOwnCarTollLookup(id, tollLookupPayload);
        }
    };

    const swapRoute = (id) => {
        setRows(prevRows => {
            const travelRows = prevRows.filter(r => r.nature === 'Travel');
            const currentIndex = travelRows.findIndex(r => r.id === id);

            if (currentIndex > 0) {
                const prevRow = travelRows[currentIndex - 1];
                const fromPrev = prevRow.details.origin || '';
                const toPrev = prevRow.details.destination || '';

                return prevRows.map(row => {
                    if (row.id === id) {
                        return {
                            ...row,
                            details: {
                                ...row.details,
                                origin: toPrev,
                                destination: fromPrev
                            },
                            isSaved: false
                        };
                    }
                    return row;
                });
            }
            return prevRows;
        });
    };

    const updateTimeDetails = (id, timeField, value) => {
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                const newTimeDetails = { ...row.timeDetails, [timeField]: value };
                if (timeField === 'scheduledTime' || timeField === 'actualTime') {
                    const scheduled = newTimeDetails.scheduledTime;
                    const actual = newTimeDetails.actualTime;
                    if (scheduled && actual) {
                        try {
                            const [sH, sM] = scheduled.split(':').map(Number);
                            const [aH, aM] = actual.split(':').map(Number);
                            const sDate = new Date();
                            sDate.setHours(sH, sM, 0);
                            const aDate = new Date();
                            aDate.setHours(aH, aM, 0);

                            // Handle next day arrival if actual < scheduled
                            if (aDate < sDate) aDate.setDate(aDate.getDate() + 1);

                            const diffMin = Math.round((aDate - sDate) / (1000 * 60));
                            if (diffMin >= 0) newTimeDetails.delay = diffMin;
                        } catch (e) { }
                    }
                }
                return { ...row, timeDetails: newTimeDetails, isSaved: false };
            }
            return row;
        }));
    };

    // INLINE VALIDATION HANDLER (Triggers on onBlur)
    const validateFieldInline = (id, field, value) => {
        const row = rows.find(r => r.id === id);
        if (!row) return;

        let errorMsg = null;

        // Skip validation if empty (let saveRegistry catch required fields to avoid aggressive red text)
        if (!value || String(value).trim() === '') {
            clearRowError(id, field);
            return;
        }

        if (field === 'origin' || field === 'destination') {
            if (String(value).trim().length < 2) errorMsg = 'Min 2 characters required';
            else if (field === 'destination' && row.details?.origin?.trim().toLowerCase() === String(value).trim().toLowerCase()) {
                errorMsg = 'Origin and Destination must differ';
            }
        } else if (field === 'amount') {
            if (isNaN(parseFloat(value)) || parseFloat(value) < 0) errorMsg = 'Invalid amount entered';
        } else if (field === 'pnr') {
            if (!/^[A-Za-z0-9]+$/.test(value)) errorMsg = 'Alphanumeric only';
            else if (value.length < 5 || value.length > 15) errorMsg = 'PNR must be 5-15 characters';
        } else if (field === 'ticketNo') {
            if (!/^[A-Za-z0-9]+$/.test(value)) errorMsg = 'Alphanumeric only';
            else if (value.length > 25) errorMsg = 'Cannot exceed 25 characters';
        }

        if (errorMsg) {
            setRowError(id, field, errorMsg);
        } else {
            clearRowError(id, field);
        }
    };

    const handleOdoCapture = (id, field) => {
        activeRowRef.current = id;
        activeFieldRef.current = field;
        fileInputRef.current?.click();
    };

    const handleReviewStatusChange = (id, newStatus) => {
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                // RULE: Company Arrangement cannot be Cancelled or Rescheduled by employee
                if (row.nature === 'Travel' && isCompanyBooked(row.details.bookedBy)) {
                    showToast("This ticket is booked and paid by the company. Please contact the Travel Desk for any changes.", "warning");
                    return row;
                }

                const oldStatus = row.details.travelStatus || 'Completed';
                if (oldStatus === newStatus) return row;

                const timestamp = new Date();
                const logEntry = `[${timestamp}] Status changed from ${oldStatus} to ${newStatus}`;
                const newAuditTrail = [...(row.details.auditTrail || []), logEntry];

                const newDetails = {
                    ...row.details,
                    travelStatus: newStatus,
                    auditTrail: newAuditTrail
                };

                let newAmount = row.amount;
                // Logic-driven amount recalculation
                if (newStatus === 'Cancelled' || newStatus === 'No-Show') {
                    // Preserve original amount as baseFare before switching if we don't have it yet
                    // or if we're moving from a status where 'amount' was the full price
                    if (oldStatus === 'Completed' || oldStatus === 'Rescheduled') {
                        newDetails.baseFare = row.amount;
                    }
                    newAmount = newStatus === 'Cancelled' ? (row.details.cancellationCharges || 0) : (row.details.noShowCharges || 0);
                } else if (oldStatus === 'Cancelled' || oldStatus === 'No-Show') {
                    // Reverting back to Completed or Rescheduled
                    newAmount = row.details.baseFare || row.amount;
                }

                return { ...row, details: newDetails, amount: newAmount, isSaved: false };
            }
            return row;
        }));
    };

    const handleOdoFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            const blockedExtensions = ['.exe', '.zip'];
            const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            const maxSize = 5 * 1024 * 1024; // 5MB

            if (blockedExtensions.includes(fileExtension) || file.name.toLowerCase().endsWith('.exe') || file.name.toLowerCase().endsWith('.zip')) {
                showToast(`Files of type ${fileExtension} are not allowed.`, "error");
                return;
            }

            if (!allowedTypes.includes(file.type) && !['.pdf', '.jpg', '.jpeg', '.png'].includes(fileExtension)) {
                showToast("Only PDF, JPG, and PNG files are allowed.", "error");
                return;
            }

            if (file.size > maxSize) {
                showToast("File size cannot exceed 5MB.", "error");
                return;
            }

            captureLocation();
            const reader = new FileReader();
            reader.onloadend = () => {
                const id = activeRowRef.current;
                const field = activeFieldRef.current;
                updateDetails(id, `${field}Img`, reader.result);
                showToast("Odometer photo captured", "success");
            };
            reader.readAsDataURL(file);
        }
    };

    const captureLocation = () => {
        if (!navigator.geolocation) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const id = activeRowRef.current;
                const field = activeFieldRef.current;
                updateDetails(id, `${field}Lat`, pos.coords.latitude);
                updateDetails(id, `${field}Long`, pos.coords.longitude);
                setIsLocating(false);
            },
            () => setIsLocating(false),
            { enableHighAccuracy: true }
        );
    };

    const handleFileUpload = (id, file) => {
        if (!file) return;

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
        const blockedExtensions = ['.exe', '.zip'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (blockedExtensions.includes(fileExtension) || file.name.toLowerCase().endsWith('.exe') || file.name.toLowerCase().endsWith('.zip')) {
            showToast(`Files of type ${fileExtension} are not allowed.`, "error");
            return;
        }

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            showToast("Only PDF, JPG, and PNG files are allowed.", "error");
            return;
        }

        if (file.size > maxSize) {
            showToast("File size cannot exceed 5MB.", "error");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setRows(prevRows => prevRows.map(row => {
                if (row.id === id) {
                    const currentBills = row.bills || [];
                    return { ...row, bills: [...currentBills, reader.result], isSaved: false };
                }
                return row;
            }));
        };
        reader.readAsDataURL(file);
    };

    const removeBill = (rowId, index) => {
        setRows(prevRows => prevRows.map(row => {
            if (row.id === rowId) {
                const newBills = [...(row.bills || [])];
                newBills.splice(index, 1);
                return { ...row, bills: newBills, isSaved: false };
            }
            return row;
        }));
    };

    const previewBill = (bill) => {
        if (!bill) return;
        const newWindow = window.open();
        newWindow.document.write(`<img src="${bill}" style="max-width:100%; height:auto;" />`);
    };

    const isLocked = claimStatus && !['Draft', 'Rejected'].includes(claimStatus);

    const renderCategoryTable = (nature, title, icon) => {
        const categoryRows = rows.filter(r => r.nature === nature);

        const gridTemplateColumns = (() => {
            switch (nature) {
                case 'Travel': return '1.5fr 2fr 2.8fr 2.2fr 1fr 1fr 50px';
                case 'Local Travel': return '240px 160px 1fr 280px 230px 100px 50px';
                case 'Food': return '140px 140px 180px 1fr 180px 100px 50px';
                case 'Accommodation': return '2fr 2fr 2.5fr 1.5fr 1fr 50px';
                case 'Incidental': return '140px 220px 1fr 180px 100px 50px';
                default: return '1fr';
            }
        })();

        const calculateJourneyDuration = (depDate, depTime, arrDate, arrTime) => {
            if (!depDate || !depTime || !arrDate || !arrTime) return null;
            try {
                const start = new Date(`${depDate}T${depTime}`);
                const end = new Date(`${arrDate}T${arrTime}`);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
                const diffMs = end - start;
                if (diffMs <= 0) return null;

                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                let res = "";
                if (diffDays > 0) res += `${diffDays}d `;
                if (diffHrs > 0) res += `${diffHrs}h `;
                if (diffMins > 0) res += `${diffMins}m`;
                return res.trim();
            } catch (e) {
                return null;
            }
        };

        return (
            <div className={`category-section-container ${nature.toLowerCase().replace(' ', '-')} ${isLocked ? 'is-locked' : ''}`}>
                <div className="category-section-header">
                    <div className="cat-title">
                        {icon}
                        <h4>{title}</h4>
                        <span className="cat-count">{categoryRows.length} Items</span>

                        {nature === 'Incidental' && (
                            <div className="header-actions-extra ml-4" style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center' }}>
                            </div>
                        )}
                    </div>
                    {!isLocked && (
                        <button className="add-cat-row-btn" onClick={() => addRow(nature)}>
                            <Plus size={14} />
                            <span>Add {title}</span>
                        </button>
                    )}
                </div>

                <div className="category-table-wrapper">
                    <table className="category-table">
                        <thead>
                            {nature === 'Travel' && (
                                <tr className="category-grid-row" style={{ gridTemplateColumns }}>
                                    <th>Dates (Book & Journey)</th>
                                    <th>Mode & Booking</th>
                                    <th>Route & Carrier</th>
                                    <th>Schedule</th>
                                    <th>Expense</th>
                                    <th>Upload</th>
                                    <th></th>
                                </tr>
                            )}
                            {nature === 'Local Travel' && (
                                <tr className="category-grid-row" style={{ gridTemplateColumns }}>
                                    <th>Dates (Start - End)</th>
                                    <th>Mode & Type</th>
                                    <th>Location</th>
                                    <th>Tracking (Odo Capture)</th>
                                    <th>Expense</th>
                                    <th>Upload</th>
                                    <th></th>
                                </tr>
                            )}
                            {nature === 'Food' && (
                                <tr className="category-grid-row" style={{ gridTemplateColumns }}>
                                    <th>Date</th>
                                    <th>Meal Info</th>
                                    <th>Meal Category</th>
                                    <th>Restaurant & Purpose</th>
                                    <th>Expense</th>
                                    <th>Upload</th>
                                    <th></th>
                                </tr>
                            )}
                            {nature === 'Accommodation' && (
                                <tr className="category-grid-row" style={{ gridTemplateColumns, gap: '24px' }}>
                                    <th>Stay Schedule</th>
                                    <th>Lodging Info</th>
                                    <th>City & Nights</th>
                                    <th>Expense</th>
                                    <th>Upload</th>
                                    <th></th>
                                </tr>
                            )}
                            {nature === 'Incidental' && (
                                <tr className="category-grid-row" style={{ gridTemplateColumns }}>
                                    <th>Date</th>
                                    <th>Type & Location</th>
                                    <th>Details / Other info</th>
                                    <th>Expense</th>
                                    <th>Upload</th>
                                    <th></th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {categoryRows.length === 0 ? (
                                <tr className="category-grid-row" style={{ gridTemplateColumns: '1fr' }}>
                                    <td className="empty-cat-row">
                                        No {title.toLowerCase()} recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                categoryRows.map((row, index) => {
                                    const selectedLocalSubType = [...localCarSubTypes, ...localBikeSubTypes].find(
                                        s => s.sub_type === row.details.subType
                                    ) || {};
                                    const localSubTypeKey = selectedLocalSubType.key || '';

                                    return (
                                        <React.Fragment key={row.id}>
                                            <tr className={`category-row category-grid-row ${row.details.travelStatus && row.details.travelStatus !== 'Completed' ? 'status-row-' + row.details.travelStatus.toLowerCase() : ''}`} style={{ gridTemplateColumns }}>
                                                {/* DATE COLUMN */}
                                                <td>
                                                    {nature === 'Travel' ? (
                                                        <div className="row-fields" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            <div className="input-with-label-mini">
                                                                <label>Booking Date & Time</label>
                                                                <div className="field-group" style={{ gap: '8px' }}>
                                                                    <input type="date" min={bookingMinDate} max={bookingMaxDate} value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)} style={{ flex: 1.4 }} />
                                                                    <input type="time" value={row.details.bookingTime || ''} onChange={e => updateDetails(row.id, 'bookingTime', e.target.value)} style={{ flex: 1 }} />
                                                                </div>
                                                                {errors[row.id]?.date && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].date}</div>}
                                                            </div>
                                                            <div className="input-with-label-mini">
                                                                <label>Booking Id</label>
                                                                <input type="text" placeholder="ID Number" className="cat-input" value={row.details.bookingId || ''} onChange={e => updateDetails(row.id, 'bookingId', e.target.value)} />
                                                            </div>
                                                            {(() => {
                                                                const selectedModeObj = travelModes.find(m => m.mode_name === row.details.mode) || {};
                                                                const modeKey = selectedModeObj.key || normalizeMasterCode('travel_mode', { name: row.details.mode });
                                                                return ['FLIGHT', 'TRAIN', 'INTERCITY_BUS', 'INTERCITY_CAB'].includes(modeKey);
                                                            })() && (
                                                                <div className="status-warnings" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                    {row.date && row.details.depDate && new Date(row.date) > new Date(row.details.depDate) && (
                                                                        <div className="text-danger" style={{ fontSize: '0.55rem', fontWeight: 800 }}>⚠️ BOOKING &gt; DEPARTURE</div>
                                                                    )}
                                                                    {row.details.depDate && row.details.arrDate && new Date(row.details.depDate) > new Date(row.details.arrDate) && (
                                                                        <div className="text-danger" style={{ fontSize: '0.55rem', fontWeight: 800 }}>⚠️ DEP &gt; ARR DATE</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : nature === 'Accommodation' ? (
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '16px', background: 'rgba(248, 250, 252, 0.5)', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                            <div className="stay-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <Calendar size={12} /> Check-In
                                                                </div>
                                                                <div className="group-card shadow-sm" style={{ padding: '10px', background: 'white', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                                                    <div className="input-with-label-mini">
                                                                        <label style={{ color: '#94a3b8', fontSize: '0.6rem' }}>Scheduled</label>
                                                                        <div className="field-group" style={{ gap: '4px' }}>
                                                                            <input type="date" value={row.details.scheduledCheckInDate || ''} onChange={e => updateDetails(row.id, 'scheduledCheckInDate', e.target.value)} style={{ fontSize: '0.75rem', padding: '4px' }} />
                                                                            <input type="time" value={row.details.scheduledCheckInTime || ''} onChange={e => updateDetails(row.id, 'scheduledCheckInTime', e.target.value)} style={{ fontSize: '0.75rem', padding: '4px' }} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="input-with-label-mini mt-2">
                                                                        <label style={{ color: 'var(--primary)', fontSize: '0.6rem', fontWeight: 700 }}>Actual</label>
                                                                        <div className="field-group" style={{ gap: '4px' }}>
                                                                            <input type="date" value={row.details.actualCheckInDate || ''} onChange={e => updateDetails(row.id, 'actualCheckInDate', e.target.value)} style={{ fontSize: '0.75rem', padding: '4px', borderLeft: '2px solid var(--primary)' }} />
                                                                            <input type="time" value={row.details.actualCheckInTime || ''} onChange={e => updateDetails(row.id, 'actualCheckInTime', e.target.value)} style={{ fontSize: '0.75rem', padding: '4px' }} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="stay-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <Clock size={12} /> Check-Out
                                                                </div>
                                                                <div className="group-card shadow-sm" style={{ padding: '10px', background: 'white', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                                                    <div className="input-with-label-mini">
                                                                        <label style={{ color: '#94a3b8', fontSize: '0.6rem' }}>Scheduled</label>
                                                                        <div className="field-group" style={{ gap: '4px' }}>
                                                                            <input type="date" value={row.details.scheduledCheckOutDate || ''} onChange={e => updateDetails(row.id, 'scheduledCheckOutDate', e.target.value)} style={{ fontSize: '0.75rem', padding: '4px' }} />
                                                                            <input type="time" value={row.details.scheduledCheckOutTime || ''} onChange={e => updateDetails(row.id, 'scheduledCheckOutTime', e.target.value)} style={{ fontSize: '0.75rem', padding: '4px' }} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="input-with-label-mini mt-2">
                                                                        <label style={{ color: 'var(--primary)', fontSize: '0.6rem', fontWeight: 700 }}>Actual</label>
                                                                        <div className="field-group" style={{ gap: '4px' }}>
                                                                            <input type="date" value={row.details.actualCheckOutDate || ''} onChange={e => updateDetails(row.id, 'actualCheckOutDate', e.target.value)} style={{ fontSize: '0.75rem', padding: '4px', borderLeft: '2px solid var(--primary)' }} />
                                                                            <input type="time" value={row.details.actualCheckOutTime || ''} onChange={e => updateDetails(row.id, 'actualCheckOutTime', e.target.value)} style={{ fontSize: '0.75rem', padding: '4px' }} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : nature === 'Local Travel' ? (
                                                        <div className="field-group">
                                                            <div className="input-with-label-mini">
                                                                <label>START DATE</label>
                                                                <input type="date" value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)} />
                                                            </div>
                                                            <div className="input-with-label-mini">
                                                                <label>END DATE</label>
                                                                <input type="date" min={minDate} max={maxDate} value={row.endDate || row.date} onChange={e => updateRow(row.id, 'endDate', e.target.value)} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <input type="date" min={minDate} max={maxDate} className="cat-input" value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)} />
                                                    )}
                                                </td>

                                                {/* NATURE SPECIFIC DETAILS */}
                                                {nature === 'Travel' && (
                                                    <>
                                                        {/* TRAVEL MODE COLUMN (Matches Header: Travel Mode) */}
                                                        <td>
                                                            <div className="row-fields" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                <div className="input-with-label-mini">
                                                                    <label>Travel Mode</label>
                                                                    <select className="cat-input" value={row.details.mode || ''} onChange={e => {
                                                                        updateDetails(row.id, 'mode', e.target.value);
                                                                        const modeObj = travelModes.find(m => m.mode_name === e.target.value) || {};
                                                                        if (modeObj.key === 'INTERCITY_CAB') {
                                                                            updateDetails(row.id, 'cancellationDate', null);
                                                                            updateDetails(row.id, 'refundAmount', 0);
                                                                        }
                                                                    }}>
                                                                        <option value="">Select Mode</option>
                                                                        {travelModes.map(m => <option key={m.id} value={m.mode_name}>{m.mode_name}</option>)}
                                                                    </select>
                                                                    {errors[row.id]?.mode && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].mode}</div>}
                                                                </div>
                                                                <div className="input-with-label-mini" style={{ flex: 1 }}>
                                                                    <label>Booked By</label>
                                                                    <select className="cat-input" value={row.details.bookedBy || 'Self Booked'} onChange={e => updateDetails(row.id, 'bookedBy', e.target.value)}>
                                                                        {bookedByOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </td>


                                                        {/* ROUTE & CARRIER INFO */}
                                                        <td>
                                                            <div className="row-fields" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                {(() => {
                                                                    const selectedModeObj = travelModes.find(m => m.mode_name === row.details.mode) || {};
                                                                    const modeKey = selectedModeObj.key || '';

                                                                    return (
                                                                        <>
                                                                            {/* FROM / TO WITH SWAP BUTTON */}
                                                                            <div className="field-group" style={{ gap: '8px', alignItems: 'flex-end', display: 'flex' }}>
                                                                                <div className="input-with-label-mini" style={{ flex: 1 }}>
                                                                                    <label>FROM</label>
                                                                                    <input type="text" placeholder="Origin" value={row.details.origin || ''} onChange={e => updateDetails(row.id, 'origin', e.target.value)} onBlur={e => validateFieldInline(row.id, 'origin', e.target.value)} />
                                                                                    {errors[row.id]?.origin && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].origin}</div>}
                                                                                </div>
                                                                                {index > 0 && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => swapRoute(row.id)}
                                                                                        style={{
                                                                                            padding: '6px',
                                                                                            borderRadius: '6px',
                                                                                            border: '1px solid #e2e8f0',
                                                                                            background: '#fff',
                                                                                            color: '#6366f1',
                                                                                            marginBottom: '2px',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            cursor: 'pointer',
                                                                                            transition: 'all 0.2s',
                                                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                                                        }}
                                                                                        className="swap-btn-hover"
                                                                                        title="Swap Previous Route (Return Journey)"
                                                                                    >
                                                                                        <ArrowLeftRight size={14} />
                                                                                    </button>
                                                                                )}
                                                                                <div className="input-with-label-mini" style={{ flex: 1 }}>
                                                                                    <label>TO</label>
                                                                                    <input type="text" placeholder="Destination" value={row.details.destination || ''} onChange={e => updateDetails(row.id, 'destination', e.target.value)} onBlur={e => validateFieldInline(row.id, 'destination', e.target.value)} />
                                                                                    {errors[row.id]?.destination && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].destination}</div>}
                                                                                </div>
                                                                            </div>

                                                                            {modeKey === 'FLIGHT' ? (
                                                                                <>
                                                                                    <div className="field-group" style={{ gap: '10px' }}>
                                                                                        <div className="input-with-label-mini" style={{ flex: 1.5 }}>
                                                                                            <label>AIRLINE NAME</label>
                                                                                            <select style={{ width: '100%' }} className="cat-input" value={row.details.provider || ''} onChange={e => updateDetails(row.id, 'provider', e.target.value)}>
                                                                                                <option value="">Select Airline</option>
                                                                                                {airlines.map(a => <option key={a} value={a}>{a}</option>)}
                                                                                                <option value="Other">Other</option>
                                                                                            </select>
                                                                                            {row.details.provider === 'Other' && (
                                                                                                <input type="text" className="mt-1" placeholder="Specify Airline" value={row.details.otherAirline || ''} onChange={e => updateDetails(row.id, 'otherAirline', e.target.value)} />
                                                                                            )}
                                                                                            {errors[row.id]?.provider && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].provider}</div>}
                                                                                        </div>
                                                                                        <div className="input-with-label-mini" style={{ flex: 1 }}>
                                                                                            <label>CLASS</label>
                                                                                            <select style={{ width: '100%' }} value={row.details.classType || ''} onChange={e => updateDetails(row.id, 'classType', e.target.value)}>
                                                                                                <option value="">Class</option>
                                                                                                {flightClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                                                                            </select>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="field-group" style={{ gap: '10px' }}>
                                                                                        <div className="input-with-label-mini" style={{ flex: 1 }}>
                                                                                            <label>FLIGHT NO.</label>
                                                                                            <input type="text" placeholder="No." value={row.details.travelNo || ''} onChange={e => updateDetails(row.id, 'travelNo', e.target.value)} onBlur={e => validateFieldInline(row.id, 'travelNo', e.target.value)} />
                                                                                            {errors[row.id]?.travelNo && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].travelNo}</div>}
                                                                                        </div>
                                                                                        <div className="input-with-label-mini" style={{ flex: 1 }}>
                                                                                            <label>TICKET</label>
                                                                                            <input type="text" placeholder="Number" value={row.details.ticketNo || ''} onChange={e => updateDetails(row.id, 'ticketNo', e.target.value)} onBlur={e => validateFieldInline(row.id, 'ticketNo', e.target.value)} />
                                                                                            {errors[row.id]?.ticketNo && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].ticketNo}</div>}
                                                                                        </div>
                                                                                        <div className="input-with-label-mini" style={{ flex: 1 }}>
                                                                                            <label>PNR</label>
                                                                                            <input type="text" placeholder="PNR" value={row.details.pnr || ''} onChange={e => updateDetails(row.id, 'pnr', e.target.value)} onBlur={e => validateFieldInline(row.id, 'pnr', e.target.value)} />
                                                                                            {errors[row.id]?.pnr && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].pnr}</div>}
                                                                                        </div>
                                                                                    </div>
                                                                                </>
                                                                            ) : modeKey === 'INTERCITY_CAB' ? (
                                                                                <>
                                                                                    <div className="field-group" style={{ gap: '10px' }}>
                                                                                        <div className="input-with-label-mini" style={{ flex: 1.5 }}>
                                                                                            <label>VEHICLE TYPE</label>
                                                                                            <select value={row.details.vehicleType || ''} onChange={e => updateDetails(row.id, 'vehicleType', e.target.value)}>
                                                                                                <option value="">Vehicle Type</option>
                                                                                                {intercityCabVehicleTypes.map(v => <option key={v} value={v}>{v}</option>)}
                                                                                            </select>
                                                                                        </div>
                                                                                        <div className="input-with-label-mini" style={{ flex: 1 }}>
                                                                                            <label>DRIVER</label>
                                                                                            <input type="text" placeholder="Driver Name" value={row.details.driverName || ''} onChange={e => updateDetails(row.id, 'driverName', e.target.value)} />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="field-group" style={{ gap: '10px' }}>
                                                                                        <div className="input-with-label-mini" style={{ flex: 1 }}>
                                                                                            <label>PROVIDER</label>
                                                                                            <select className="cat-input" value={row.details.provider || ''} onChange={e => updateDetails(row.id, 'provider', e.target.value)}>
                                                                                                <option value="">Vendor</option>
                                                                                                {cabProviders.map(p => <option key={p.id} value={p.provider_name}>{p.provider_name}</option>)}
                                                                                                <option value="Other">Other</option>
                                                                                            </select>
                                                                                        </div>
                                                                                    </div>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    {/* Default (Train, Intercity Bus, etc.) */}
                                                                                    <div className="field-group" style={{ gap: '10px' }}>
                                                                                        <div className="input-with-label-mini" style={{ flex: 2 }}>
                                                                                            <label>{modeKey === 'INTERCITY_BUS' ? 'BUS OPERATOR' : modeKey === 'TRAIN' ? 'TRAIN NAME/NO.' : 'CARRIER'}</label>
                                                                                            {modeKey === 'INTERCITY_BUS' ? (
                                                                                                <select className="cat-input" value={row.details.carrier || ''} onChange={e => updateDetails(row.id, 'carrier', e.target.value)}>
                                                                                                    <option value="">Select Operator</option>
                                                                                                    {busOperators.map(o => <option key={o} value={o}>{o}</option>)}
                                                                                                    <option value="Other">Other</option>
                                                                                                </select>
                                                                                            ) : (
                                                                                                <input type="text" placeholder="Carrier Info" value={row.details.carrier || ''} onChange={e => updateDetails(row.id, 'carrier', e.target.value)} />
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="input-with-label-mini" style={{ flex: 1 }}>
                                                                                            <label>CLASS</label>
                                                                                            <select value={row.details.classType || ''} onChange={e => updateDetails(row.id, 'classType', e.target.value)}>
                                                                                                <option value="">Cls</option>
                                                                                                {modeKey === 'TRAIN' && trainClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                                                                                {modeKey === 'INTERCITY_BUS' && busSeatTypes.map(c => <option key={c} value={c}>{c}</option>)}
                                                                                            </select>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="field-group" style={{ gap: '10px' }}>
                                                                                        <div className="input-with-label-mini" style={{ flex: 1.5 }}>
                                                                                            <label>PROVIDER</label>
                                                                                            <select className="cat-input" value={row.details.provider || ''} onChange={e => updateDetails(row.id, 'provider', e.target.value)}>
                                                                                                <option value="">Agent/Govt</option>
                                                                                                {modeKey === 'TRAIN' && trainProviders.map(p => <option key={p.id} value={p.provider_name}>{p.provider_name}</option>)}
                                                                                                {modeKey === 'INTERCITY_BUS' && busProviders.map(p => <option key={p.id} value={p.provider_name}>{p.provider_name}</option>)}
                                                                                                <option value="Other">Other</option>
                                                                                            </select>
                                                                                        </div>
                                                                                        <div className="input-with-label-mini" style={{ flex: 1 }}>
                                                                                            <label>TICKET</label>
                                                                                            <input type="text" placeholder="No." value={row.details.ticketNo || ''} onChange={e => updateDetails(row.id, 'ticketNo', e.target.value)} />
                                                                                        </div>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </td>

                                                        {/* JOURNEY SCHEDULE COLUMN */}
                                                        <td>
                                                            <div className="time-fields quad" style={{ gap: '12px' }}>
                                                                {/* 2-Column Layout for Departure and Arrival */}
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                                    {/* Departure Column */}
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                        <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textAlign: 'center', marginBottom: '4px', display: 'block' }}>DEPARTURE</label>
                                                                        <div className="input-with-label-mini">
                                                                            <input type="date" min={minDate} max={maxDate} value={row.details.depDate || row.date} onChange={e => updateDetails(row.id, 'depDate', e.target.value)} />
                                                                            {errors[row.id]?.depDate && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].depDate}</div>}
                                                                        </div>
                                                                        <div className="input-with-label-mini">
                                                                            <input type="time" value={row.timeDetails.boardingTime || ''} onChange={e => updateTimeDetails(row.id, 'boardingTime', e.target.value)} />
                                                                        </div>
                                                                    </div>

                                                                    {/* Arrival Column */}
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                        <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textAlign: 'center', marginBottom: '4px', display: 'block' }}>ARRIVAL</label>
                                                                        <div className="input-with-label-mini">
                                                                            <input type="date" min={minDate} max={maxDate} value={row.details.arrDate || row.date} onChange={e => updateDetails(row.id, 'arrDate', e.target.value)} />
                                                                            {errors[row.id]?.arrDate && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].arrDate}</div>}
                                                                        </div>
                                                                        <div className="input-with-label-mini">
                                                                            <input type="time" value={row.timeDetails.actualTime || ''} onChange={e => updateTimeDetails(row.id, 'actualTime', e.target.value)} />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Journey Duration Display */}
                                                                {(() => {
                                                                    const duration = calculateJourneyDuration(
                                                                        row.details.depDate || row.date,
                                                                        row.timeDetails.boardingTime,
                                                                        row.details.arrDate || row.date,
                                                                        row.timeDetails.actualTime
                                                                    );
                                                                    return duration ? (
                                                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                                            <div className="duration-display" style={{
                                                                                fontSize: '0.65rem',
                                                                                color: '#6366f1',
                                                                                fontWeight: 800,
                                                                                background: '#f5f3ff',
                                                                                padding: '4px 12px',
                                                                                borderRadius: '6px',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '6px',
                                                                                border: '1px solid #e0e7ff',
                                                                                marginTop: '4px'
                                                                            }}>
                                                                                ⏱️ {duration}
                                                                            </div>
                                                                        </div>
                                                                    ) : null;
                                                                })()}

                                                                {row.details.mode === 'Flight' && (
                                                                    <div className="field-group mt-1" style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                                                                        <div className="input-with-label-mini" style={{ flex: 1.5 }}>
                                                                            <label>Check-in Time</label>
                                                                            <input type="time" value={row.timeDetails.checkInTime || ''} onChange={e => updateTimeDetails(row.id, 'checkInTime', e.target.value)} />
                                                                        </div>
                                                                        <label className="checkbox-item mini" style={{ flex: 1, marginTop: '16px' }}>
                                                                            <input type="checkbox" checked={row.details.mealIncluded === 'Yes' || row.details.mealIncluded === true} onChange={e => updateDetails(row.id, 'mealIncluded', e.target.checked ? 'Yes' : 'No')} />
                                                                            <span style={{ fontSize: '0.65rem' }}>Meal?</span>
                                                                        </label>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </>
                                                )}

                                                {nature === 'Local Travel' && (
                                                    <>
                                                        {/* MODE & SUBTYPE COLUMN */}
                                                        <td>
                                                            <div className="row-fields">
                                                                {(() => {
                                                                    const selectedMode = localTravelModes.find(m => m.mode_name === row.details.mode) || {};
                                                                    const normalizedModeName = (selectedMode.mode_name || row.details.mode || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
                                                                    const modeKey = selectedMode.key || normalizedModeName;
                                                                    const selectedSubType = [...localCarSubTypes, ...localBikeSubTypes].find(s => s.sub_type === row.details.subType) || {};
                                                                    const subTypeKey = selectedSubType.key || '';
                                                                    const selectedProv = localProviders.find(p => p.provider_name === row.details.provider) || {};
                                                                    const provKey = selectedProv.key || '';

                                                                    return (
                                                                        <>
                                                                            <select className="cat-input" value={row.details.mode || ''} onChange={e => { updateDetails(row.id, 'mode', e.target.value); updateDetails(row.id, 'subType', ''); }}>
                                                                                <option value="">Select Mode</option>
                                                                                {localTravelModes.map(m => <option key={m.id} value={m.mode_name}>{m.mode_name}</option>)}
                                                                            </select>

                                                                            {['CAR', 'CAR_CAB'].includes(modeKey) && (
                                                                                <select className="cat-input mt-1" value={row.details.subType || ''} onChange={e => updateDetails(row.id, 'subType', e.target.value)}>
                                                                                    <option value="">Select Sub-Type</option>
                                                                                    {localCarSubTypes.map(s => <option key={s.id} value={s.sub_type}>{s.sub_type}</option>)}
                                                                                </select>
                                                                            )}

                                                                            {modeKey === 'BIKE' && (
                                                                                <select className="cat-input mt-1" value={row.details.subType || ''} onChange={e => updateDetails(row.id, 'subType', e.target.value)}>
                                                                                    <option value="">Select Sub-Type</option>
                                                                                    {localBikeSubTypes.map(s => <option key={s.id} value={s.sub_type}>{s.sub_type}</option>)}
                                                                                </select>
                                                                            )}

                                                                            {/* Provider - Hide for Public Transport, Walk, and Internal Vehicles */}
                                                                            {!['BUS', 'METRO', 'LOCAL_TRAIN', 'OWN_VEHICLE', 'WALK'].includes(modeKey) &&
                                                                                !['OWN_CAR', 'COMPANY_CAR', 'OWN_BIKE', 'COMPANY_BIKE'].includes(subTypeKey) && (
                                                                                    <div className="field-group mt-1">
                                                                                        <select className="cat-input" value={row.details.provider || ''} onChange={e => updateDetails(row.id, 'provider', e.target.value)} style={{ flex: 1.5 }}>
                                                                                            <option value="">Select Provider</option>
                                                                                            {localProviders.map(p => <option key={p.id} value={p.provider_name}>{p.provider_name}</option>)}
                                                                                        </select>
                                                                                    </div>
                                                                                )}

                                                                            {/* Booking Type - Hide for Public Transport, Walk, Internal Vehicles, and Local Auto */}
                                                                            {!['BUS', 'METRO', 'LOCAL_TRAIN', 'OWN_VEHICLE', 'WALK'].includes(modeKey) &&
                                                                                !['OWN_CAR', 'COMPANY_CAR', 'OWN_BIKE', 'COMPANY_BIKE'].includes(subTypeKey) &&
                                                                                !(modeKey === 'AUTO' && ['LOCAL_VENDOR', 'LOCAL_TAXI_VENDOR'].includes(provKey)) && (
                                                                                    <div className="input-with-label-mini mt-1">
                                                                                        <label>Booking Type</label>
                                                                                        <select className="cat-input" value={row.details.bookedBy || 'Self Booked'} onChange={e => updateDetails(row.id, 'bookedBy', e.target.value)}>
                                                                                            {bookedByOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                                                                        </select>
                                                                                    </div>
                                                                                )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="row-fields">
                                                                <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    <div className="input-with-label-mini">
                                                                        <label>ORIGIN (FROM LOCATION)</label>
                                                                        <SearchableInput
                                                                            value={row.details.origin || ''}
                                                                            options={locationsPool}
                                                                            placeholder="Search or type origin"
                                                                            onChange={val => updateDetails(row.id, 'origin', val)}
                                                                            onBlur={val => validateFieldInline(row.id, 'origin', val)}
                                                                            error={errors[row.id]?.origin}
                                                                        />
                                                                        {errors[row.id]?.origin && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].origin}</div>}
                                                                    </div>
                                                                    <div className="input-with-label-mini">
                                                                        <label>DESTINATION (TO LOCATION)</label>
                                                                        <SearchableInput
                                                                            value={row.details.destination || ''}
                                                                            options={locationsPool}
                                                                            placeholder="Search or type destination"
                                                                            onChange={val => updateDetails(row.id, 'destination', val)}
                                                                            onBlur={val => validateFieldInline(row.id, 'destination', val)}
                                                                            error={errors[row.id]?.destination}
                                                                        />
                                                                        {errors[row.id]?.destination && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].destination}</div>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {/* TIME & TRACKING COLUMN */}
                                                        <td>
                                                            <div className="time-fields quad">
                                                                <div className="time-row">
                                                                    <label>Start Time</label>
                                                                    <input type="time" value={row.timeDetails.boardingTime || ''} onChange={e => updateTimeDetails(row.id, 'boardingTime', e.target.value)} />
                                                                </div>
                                                                <div className="time-row">
                                                                    <label>End Time</label>
                                                                    <input type="time" value={row.timeDetails.actualTime || ''} onChange={e => updateTimeDetails(row.id, 'actualTime', e.target.value)} />
                                                                </div>

                                                                {['OWN_CAR', 'COMPANY_CAR', 'OWN_BIKE', 'SELF_DRIVE_RENTAL', 'COMPANY_BIKE'].includes(localSubTypeKey) ? (
                                                                    <div className="odo-tracking mt-2" style={{ gridColumn: '1 / -1' }}>
                                                                        <div className="odo-row">
                                                                            <span className="odo-label">Start</span>
                                                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                                <input
                                                                                    type="number"
                                                                                    placeholder="0"
                                                                                    value={row.details.odoStart || ''}
                                                                                    onChange={e => updateDetails(row.id, 'odoStart', e.target.value)}
                                                                                    className={errors[row.id]?.odoStart ? 'error' : ''}
                                                                                />
                                                                                <button type="button" className="odo-cam-btn" onClick={() => handleOdoCapture(row.id, 'odoStart')}>
                                                                                    {row.details.odoStartImg ? <Check size={12} className="text-success" /> : <Camera size={12} />}
                                                                                </button>
                                                                            </div>
                                                                            <span className="odo-label">End</span>
                                                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                                <input
                                                                                    type="number"
                                                                                    placeholder="0"
                                                                                    value={row.details.odoEnd || ''}
                                                                                    onChange={e => updateDetails(row.id, 'odoEnd', e.target.value)}
                                                                                    className={errors[row.id]?.odoEnd ? 'error' : ''}
                                                                                />
                                                                                <button type="button" className="odo-cam-btn" onClick={() => handleOdoCapture(row.id, 'odoEnd')}>
                                                                                    {row.details.odoEndImg ? <Check size={12} className="text-success" /> : <Camera size={12} />}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        {(errors[row.id]?.odoStart || errors[row.id]?.odoEnd) && (
                                                                            <div className="text-danger mt-1" style={{ fontSize: '0.65rem' }}>
                                                                                {errors[row.id]?.odoStart || errors[row.id]?.odoEnd}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="nights-badge mt-1" style={{ background: '#f8fafc', color: '#94a3b8', gridColumn: '1 / -1' }}>No ODO Tracking</div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </>
                                                )}

                                                {nature === 'Food' && (
                                                    <>
                                                        <td>
                                                            <div className="row-fields">
                                                                <div className="input-with-label-mini">
                                                                    <label>MEAL TIME</label>
                                                                    <input type="time" className="cat-input" value={row.details.mealTime || ''} onChange={e => updateDetails(row.id, 'mealTime', e.target.value)} />
                                                                </div>
                                                                <div className="row-fields mt-1">
                                                                    <select
                                                                        className="cat-input"
                                                                        value={row.details.mealType || ''}
                                                                        onChange={e => updateDetails(row.id, 'mealType', e.target.value)}
                                                                    >
                                                                        <option value="">Meal Type</option>
                                                                        {mealTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="row-fields">
                                                                <select
                                                                    className="cat-input"
                                                                    value={row.details.mealCategory || ''}
                                                                    onChange={e => {
                                                                        updateDetails(row.id, 'mealCategory', e.target.value);
                                                                        updateDetails(row.id, 'mealType', ''); // Reset type when category changes
                                                                    }}
                                                                >
                                                                    <option value="">Meal Category</option>
                                                                    {mealCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                                </select>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="row-fields">
                                                                <div className="input-with-label-mini">
                                                                    <label>RESTAURANT / HOTEL NAME</label>
                                                                    <input type="text" placeholder="Hotel Name" value={row.details.restaurant || ''} onChange={e => updateDetails(row.id, 'restaurant', e.target.value)} />
                                                                </div>
                                                                <div className="field-group mt-1">
                                                                    <div className="input-with-label-mini" style={{ flex: 2 }}>
                                                                        <label>PURPOSE & ADDRESS</label>
                                                                        <input type="text" placeholder="Location Address" value={row.details.purpose || ''} onChange={e => updateDetails(row.id, 'purpose', e.target.value)} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}

                                                {nature === 'Accommodation' && (
                                                    <>
                                                        <td>
                                                            <div className="row-fields" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                                                <div className="input-with-label-mini">
                                                                    <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>Stay Type</label>
                                                                    <select
                                                                        className={`cat-input ${isSameDayTrip() ? "opacity-30" : ""}`}
                                                                        value={row.details.accomType || ''}
                                                                        onChange={e => updateDetails(row.id, 'accomType', e.target.value)}
                                                                        disabled={isSameDayTrip()}
                                                                        style={{ height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', fontSize: '0.85rem', fontWeight: 700, padding: '0 10px' }}
                                                                    >
                                                                        <option value="">Stay Type</option>
                                                                        {stayTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="input-with-label-mini">
                                                                    <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>Hotel Name</label>
                                                                    <input
                                                                        type="text"
                                                                        className={`cat-input ${isSameDayTrip() ? "opacity-30" : ""}`}
                                                                        placeholder="Hotel Name"
                                                                        value={row.details.hotelName || ''}
                                                                        onChange={e => updateDetails(row.id, 'hotelName', e.target.value)}
                                                                        disabled={isSameDayTrip()}
                                                                        style={{ height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', fontSize: '0.85rem', fontWeight: 700, padding: '0 10px' }}
                                                                    />
                                                                </div>
                                                                <div className="input-with-label-mini">
                                                                    <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>Room Type</label>
                                                                    <select
                                                                        value={row.details.roomType || ''}
                                                                        onChange={e => updateDetails(row.id, 'roomType', e.target.value)}
                                                                        disabled={isSameDayTrip() || (row.details.accomType && ['No Stay', 'Self Stay', 'Client Provided'].includes(row.details.accomType))}
                                                                        className={isSameDayTrip() ? "opacity-30" : ""}
                                                                        style={{ height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', fontSize: '0.85rem', fontWeight: 700, padding: '0 10px' }}
                                                                    >
                                                                        <option value="">Room</option>
                                                                        {roomTypes.map(r => <option key={r} value={r}>{r}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="row-fields" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                                                <div className="input-with-label-mini">
                                                                    <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>City</label>
                                                                    <input type="text" className="cat-input" placeholder="City" value={row.details.city || ''} onChange={e => updateDetails(row.id, 'city', e.target.value)} style={{ height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', fontSize: '0.85rem', fontWeight: 700, padding: '0 10px' }} />
                                                                </div>
                                                                <div className="input-with-label-mini">
                                                                    <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>Nights</label>
                                                                    <div className="nights-badge shadow-sm" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>
                                                                        {row.details.nights || 0} Nights
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}

                                                {nature === 'Incidental' && (
                                                    <>
                                                        <td>
                                                            <div className="row-fields">
                                                                <div className="input-with-label-mini">
                                                                    <label>EXPENSE TYPE</label>
                                                                    <select className="cat-input" value={row.details.incidentalType || ''} onChange={e => updateDetails(row.id, 'incidentalType', e.target.value)}>
                                                                        <option value="">Select Type</option>
                                                                        {filteredIncidentalTypes.map(t => (
                                                                            <option key={t.id || t.expense_type} value={t.expense_type}>{t.expense_type}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div className="input-with-label-mini mt-1">
                                                                    <label>LOCATION</label>
                                                                    <input type="text" placeholder="Where occurred" value={row.details.location || ''} onChange={e => updateDetails(row.id, 'location', e.target.value)} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="row-fields">
                                                                {row.details.incidentalType === 'Others' ? (
                                                                    <>
                                                                        <div className="input-with-label-mini">
                                                                            <label>REASON FOR OTHERS</label>
                                                                            <input type="text" placeholder="Mandatory reason" value={row.details.otherReason || ''} onChange={e => updateDetails(row.id, 'otherReason', e.target.value)} />
                                                                        </div>
                                                                        <div className="input-with-label-mini mt-1">
                                                                            <label>DESCRIPTION</label>
                                                                            <textarea className="cat-input" placeholder="Detailed explanation" value={row.details.description || ''} onChange={e => updateDetails(row.id, 'description', e.target.value)} style={{ minHeight: '60px' }} />
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="input-with-label-mini">
                                                                        <label>REMARKS / DETAILS</label>
                                                                        <input type="text" placeholder="Additional info" value={row.details.notes || ''} onChange={e => updateDetails(row.id, 'notes', e.target.value)} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </>
                                                )}

                                                {/* COMMON COLUMNS */}
                                                <td className="cost-col">
                                                    <div className="amount-input-box">
                                                        <div className="input-with-label-mini">
                                                            <div className="amount-with-currency">
                                                                <span className="currency-symbol">₹</span>
                                                                <input
                                                                    type="text"
                                                                    className={errors[row.id]?.amount ? 'error' : ''}
                                                                    placeholder={(row.nature === 'Travel' || row.nature === 'Local Travel') && isCompanyBooked(row.details.bookedBy) ? "Company Paid" : ""}
                                                                    value={(() => {
                                                                        const rawVal = (row.details.travelStatus === 'Cancelled' || row.details.travelStatus === 'No-Show') ? (row.details.baseFare || row.amount || '') : (row.amount || '');
                                                                        if (focusedInput?.rowId === row.id) return rawVal;
                                                                        return rawVal ? formatIndianCurrency(rawVal) : '';
                                                                    })()}
                                                                    onFocus={() => setFocusedInput({ rowId: row.id, field: 'amount' })}
                                                                    onBlur={(e) => {
                                                                        setFocusedInput(null);
                                                                        validateFieldInline(row.id, 'amount', e.target.value);
                                                                    }}
                                                                    onChange={e => {
                                                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                        if (val.split('.').length > 2) return;
                                                                        updateRow(row.id, 'amount', val);
                                                                    }}
                                                                    disabled={row.details.travelStatus === 'Cancelled' || row.details.travelStatus === 'No-Show' || ((row.nature === 'Travel' || row.nature === 'Local Travel') && isCompanyBooked(row.details.bookedBy))}
                                                                />
                                                                {errors[row.id]?.amount && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].amount}</div>}
                                                            </div>
                                                            <div className="input-with-label-mini mt-1">
                                                                <label>INV NO.</label>
                                                                <input type="text" placeholder="Invoice Number" value={row.details.invoiceNo || ''} onChange={e => updateDetails(row.id, 'invoiceNo', e.target.value)} className={`invoice-input ${errors[row.id]?.invoiceNo ? 'error' : ''}`} />
                                                                {errors[row.id]?.invoiceNo && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].invoiceNo}</div>}
                                                            </div>
                                                        </div>

                                                        {row.nature === 'Accommodation' && (
                                                            <div className="extra-charges mt-2" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                                                                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Extra Charges</div>
                                                                <div className="field-group" style={{ gap: '8px' }}>
                                                                    <div className="input-with-label-mini">
                                                                        <label style={{ fontSize: '0.55rem' }}>Early Check-In</label>
                                                                        <input type="number" value={row.details.earlyCheckInCharges || ''} onChange={e => updateDetails(row.id, 'earlyCheckInCharges', e.target.value)} disabled={isSameDayTrip()} style={{ height: '28px' }} />
                                                                    </div>
                                                                    <div className="input-with-label-mini">
                                                                        <label style={{ fontSize: '0.55rem' }}>Late Check-Out</label>
                                                                        <input type="number" value={row.details.lateCheckOutCharges || ''} onChange={e => updateDetails(row.id, 'lateCheckOutCharges', e.target.value)} disabled={isSameDayTrip()} style={{ height: '28px' }} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {row.nature === 'Travel' && (row.details.mode === 'Flight' || row.details.mode === 'Intercity Bus' || row.details.mode === 'Train' || row.details.mode === 'Intercity Cab') && null}

                                                        {row.nature === 'Travel' && row.details.mode === 'Intercity Car' && (
                                                            <div className="car-costs mt-1">
                                                                {row.details.travelStatus !== 'Cancelled' && row.details.travelStatus !== 'No-Show' ? (
                                                                    <>
                                                                        {(['Own Car', 'Self Drive Rental'].includes(row.details.vehicleType)) && (
                                                                            <div className="input-with-label-mini">
                                                                                <label>Fuel</label>
                                                                                <input type="number" value={row.details.fuel || ''} onChange={e => updateDetails(row.id, 'fuel', e.target.value)} />
                                                                            </div>
                                                                        )}
                                                                        {(['Rental Car (With Driver)', 'Self Drive Rental'].includes(row.details.vehicleType)) && (
                                                                            <div className="input-with-label-mini mt-1">
                                                                                <label>Rental Chg</label>
                                                                                <input type="number" value={row.details.rentalCharge || ''} onChange={e => updateDetails(row.id, 'rentalCharge', e.target.value)} />
                                                                            </div>
                                                                        )}
                                                                        {(['Own Car', 'Company Car', 'Rental Car (With Driver)', 'Self Drive Rental', 'Pool Vehicle'].includes(row.details.vehicleType)) && (
                                                                            <div className="field-group mt-1">
                                                                                <div className="input-with-label-mini">
                                                                                    <label>Toll</label>
                                                                                    <input type="number" value={row.details.toll || ''} onChange={e => updateDetails(row.id, 'toll', e.target.value)} />
                                                                                </div>
                                                                                <div className="input-with-label-mini">
                                                                                    <label>Parking</label>
                                                                                    <input type="number" value={row.details.parking || ''} onChange={e => updateDetails(row.id, 'parking', e.target.value)} />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {row.details.vehicleType === 'Company Car' && (
                                                                            <div className="field-group mt-1 px-1">
                                                                                <label className="checkbox-item mini">
                                                                                    <input type="checkbox" checked={row.details.driverProvided || false} onChange={e => updateDetails(row.id, 'driverProvided', e.target.checked)} />
                                                                                    <span>Driver?</span>
                                                                                </label>
                                                                                {row.details.driverProvided && (
                                                                                    <div className="input-with-label-mini ml-auto">
                                                                                        <label>Allow.</label>
                                                                                        <input type="number" value={row.details.driverAllowance || ''} onChange={e => updateDetails(row.id, 'driverAllowance', e.target.value)} />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {row.details.vehicleType === 'Ride Hailing' && (
                                                                            <div className="field-group mt-1 px-1">
                                                                                <label className="checkbox-item mini">
                                                                                    <input type="checkbox" checked={row.details.includeToll || false} onChange={e => updateDetails(row.id, 'includeToll', e.target.checked)} />
                                                                                    <span>Incl. Toll?</span>
                                                                                </label>
                                                                            </div>
                                                                        )}
                                                                        {row.details.nightTravel === 'Yes' && (
                                                                            <div className="input-with-label-mini mt-1">
                                                                                <label>Night Halt</label>
                                                                                <input
                                                                                    type="number"
                                                                                    value={row.details.nightHaltCharges || ''}
                                                                                    onChange={e => updateDetails(row.id, 'nightHaltCharges', e.target.value)}
                                                                                    disabled={!row.details.haltEligible}
                                                                                    className={!row.details.haltEligible ? 'btn-disabled' : ''}
                                                                                    title={!row.details.haltEligible ? "Requires Night Travel = Yes and Duration > 8h" : ""}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : <div className="cat-notice text-danger" style={{ fontSize: '0.65rem', fontWeight: '700' }}>Cancelled / No-Show Info Hidden</div>}
                                                            </div>
                                                        )}

                                                        {row.nature === 'Local Travel' && (
                                                            <div className="local-costs mt-1">
                                                                {(() => {
                                                                    const selectedMode = localTravelModes.find(m => m.mode_name === row.details.mode) || {};
                                                                    const modeKey = selectedMode.key || normalizeMasterCode('local_travel_mode', { name: row.details.mode });
                                                                    return modeKey === 'WALK';
                                                                })() ? (
                                                                    <div className="no-cost-badge">No Cost (Walk)</div>
                                                                ) : (
                                                                    row.details.travelStatus !== 'Cancelled' && row.details.travelStatus !== 'No-Show' ? (
                                                                        <>
                                                                            {row.details.subType === 'Own Car' && (
                                                                                <div className="field-group">
                                                                                    <div className="input-with-label-mini">
                                                                                        <label>Toll</label>
                                                                                        <input
                                                                                            type="number"
                                                                                            value={row.details.toll || ''}
                                                                                            onChange={e => updateDetails(row.id, 'toll', e.target.value)}
                                                                                            disabled={row.details.tollAutoFetched}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="input-with-label-mini">
                                                                                        <label>Parking</label>
                                                                                        <input type="number" value={row.details.parking || ''} onChange={e => updateDetails(row.id, 'parking', e.target.value)} />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {(['Own Car', 'Own Bike'].includes(row.details.subType)) && (
                                                                                <div className="input-with-label-mini mt-1">
                                                                                    <label>Fuel</label>
                                                                                    <input type="number" value={row.details.fuel || ''} onChange={e => updateDetails(row.id, 'fuel', e.target.value)} />
                                                                                </div>
                                                                            )}
                                                                            {row.details.subType === 'Own Bike' && (
                                                                                <div className="input-with-label-mini mt-1">
                                                                                    <label>Parking</label>
                                                                                    <input type="number" value={row.details.parking || ''} onChange={e => updateDetails(row.id, 'parking', e.target.value)} />
                                                                                </div>
                                                                            )}
                                                                            {row.details.subType === 'Company Car' && (
                                                                                <div className="field-group mt-1 px-1">
                                                                                    <label className="checkbox-item mini">
                                                                                        <input type="checkbox" checked={row.details.driverProvided || false} onChange={e => updateDetails(row.id, 'driverProvided', e.target.checked)} />
                                                                                        <span>Driver?</span>
                                                                                    </label>
                                                                                    {row.details.driverProvided && (
                                                                                        <div className="input-with-label-mini ml-auto">
                                                                                            <label>Allow.</label>
                                                                                            <input type="number" value={row.details.driverAllowance || ''} onChange={e => updateDetails(row.id, 'driverAllowance', e.target.value)} />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            {(() => {
                                                                                const selectedMode = localTravelModes.find(m => m.mode_name === row.details.mode) || {};
                                                                                const modeKey = selectedMode.key || normalizeMasterCode('local_travel_mode', { name: row.details.mode });
                                                                                return ['BUS', 'METRO', 'LOCAL_TRAIN'].includes(modeKey);
                                                                            })() && (
                                                                                <div className="input-with-label-mini mt-1">
                                                                                    <label>Topup?</label>
                                                                                    <input type="number" value={row.details.smartCardRecharge || ''} onChange={e => updateDetails(row.id, 'smartCardRecharge', e.target.value)} />
                                                                                </div>
                                                                            )}
                                                                            {row.details.subType === 'Ride Hailing' && (
                                                                                <div className="field-group mt-1 px-1">
                                                                                    <label className="checkbox-item mini">
                                                                                        <input type="checkbox" checked={row.details.includeToll || false} onChange={e => updateDetails(row.id, 'includeToll', e.target.checked)} />
                                                                                        <span>Incl. Toll?</span>
                                                                                    </label>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : <div className="cat-notice text-danger" style={{ fontSize: '0.65rem', fontWeight: '700' }}>Cancelled / No-Show Info Hidden</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="bills-collection-zone custom-upload" style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '1.5px dashed #cbd5e1',
                                                        borderRadius: '8px',
                                                        padding: '8px',
                                                        minHeight: '80px',
                                                        background: '#f8fafc',
                                                        gap: '8px'
                                                    }}>
                                                        {(() => {
                                                            const selectedModeObj = travelModes.find(m => m.mode_name === row.details.mode) || {};
                                                            const modeKey = selectedModeObj.key || normalizeMasterCode('travel_mode', { name: row.details.mode });
                                                            return row.nature === 'Travel' && ['FLIGHT', 'TRAIN', 'INTERCITY_BUS', 'INTERCITY_CAB'].includes(modeKey) && isCompanyBooked(row.details.bookedBy);
                                                        })() && (
                                                            <div className="company-paid-notice" style={{ textAlign: 'center' }}>
                                                                <CheckCircle2 size={12} className="text-secondary" />
                                                                <span style={{ fontSize: '0.6rem' }}>Booked & paid by company.</span>
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                                                            {(row.bills || []).map((b, idx) => (
                                                                <div key={idx} className="bill-thumbnail-mini">
                                                                    <div className="thumb-preview" onClick={() => previewBill(b)}>
                                                                        <FileText size={14} />
                                                                    </div>
                                                                    {!isLocked && (
                                                                        <button className="remove-bill-dot" onClick={() => removeBill(row.id, idx)}>
                                                                            <X size={10} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="upload-controls-mini" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                                            {!isLocked && (
                                                                <button className="add-bill-btn-mini" onClick={() => document.getElementById(`f-${row.id}`).click()} title="Add Bill">
                                                                    <Plus size={14} />
                                                                    <input type="file" id={`f-${row.id}`} hidden onChange={e => handleFileUpload(row.id, e.target.files[0])} accept="image/*,.pdf" />
                                                                </button>
                                                            )}
                                                            {(row.bills || []).length === 0 && (
                                                                <span className="no-bill-hint" style={{ fontSize: '0.6rem', color: '#94a3b8' }}>No Bills</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="actions-col">
                                                    {!isLocked && (
                                                        <button className="row-del-btn" onClick={() => deleteRow(row.id)}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table >
                </div >
            </div >
        );
    };

    const renderReviewSummary = () => {
        const total = rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
        const savedCount = rows.filter(r => r.isSaved).length;
        const unsavedCount = rows.length - savedCount;

        return (
            <div className="review-summary-container">
                <div className="review-header-box">
                    <div className="review-title">
                        <CheckCircle2 size={24} className="text-primary" />
                        <div>
                            <h4>Master Journey Ledger (Final Audit)</h4>
                            <p>Verify your complete trip story across all expense heads</p>
                        </div>
                    </div>
                    <div className="review-filter-actions">
                        <div className="filter-control">
                            <label>Filter Nature:</label>
                            <select
                                className="rev-filter-select"
                                value={reviewFilter}
                                onChange={(e) => setReviewFilter(e.target.value)}
                            >
                                <option value="All">All Categories</option>
                                {NATURE_OPTIONS.filter(o => o.value !== 'Review').map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="review-master-table-wrapper mt-4">
                    <table className="review-master-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Date</th>
                                <th>Activity / Route Details</th>
                                <th className="text-right">Amount</th>
                                <th className="text-center">Receipt</th>
                                <th className="text-center">Status</th>
                                {!isLocked && <th className="text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={isLocked ? 6 : 7} className="empty-review">No entries found for review</td>
                                </tr>
                            ) : (
                                (() => {
                                    const filtered = reviewFilter === 'All' ? rows : rows.filter(r => r.nature === reviewFilter);
                                    if (filtered.length === 0) {
                                        return <tr><td colSpan={isLocked ? 6 : 7} className="empty-review">No entries found for {reviewFilter}</td></tr>;
                                    }
                                    return filtered.map(r => {
                                        const categoryOpt = NATURE_OPTIONS.find(o => o.value === r.nature);
                                        const availableStatuses = r.nature === 'Travel' ? TRAVEL_STATUSES : (r.nature === 'Local Travel' ? LOCAL_TRAVEL_STATUSES : ['Completed']);

                                        return (
                                            <React.Fragment key={r.id}>
                                                <tr className={r.details.travelStatus && r.details.travelStatus !== 'Completed' ? `status-row-${r.details.travelStatus.toLowerCase().replace(' ', '-')}` : ''}>
                                                    <td className="rev-cat-cell">
                                                        <div className="rev-cat-icon-label">
                                                            {categoryOpt?.icon}
                                                            <span>{r.nature}</span>
                                                        </div>
                                                    </td>
                                                    <td className="mono" style={{ fontSize: '0.75rem' }}>{r.date}</td>
                                                    <td className="rev-desc-cell">
                                                        <div className="rev-main-info">
                                                            {r.nature === 'Travel' && (
                                                                <>
                                                                    <strong>{r.details.mode || 'Travel'}</strong>
                                                                    <span>{r.details.origin} → {r.details.destination}</span>
                                                                </>
                                                            )}
                                                            {r.nature === 'Local Travel' && (
                                                                <>
                                                                    <strong>{r.details.mode || 'Local'} - {r.details.subType || 'No Type'}</strong>
                                                                    <span>{r.details.fromLocation || 'Start'} → {r.details.toLocation || 'End'}</span>
                                                                </>
                                                            )}
                                                            {r.nature === 'Food' && (
                                                                <>
                                                                    <strong>{r.details.mealType || 'Meal'}</strong>
                                                                    <span>{r.details.restaurant || 'Refreshments'}</span>
                                                                </>
                                                            )}
                                                            {r.nature === 'Accommodation' && (
                                                                <>
                                                                    <strong>{r.details.hotelName || 'Stay'}</strong>
                                                                    <span>{r.details.city} ({r.details.nights} Nights)</span>
                                                                    {(r.details.scheduledCheckInDate || r.details.scheduledCheckOutDate) && (
                                                                        <div className="rev-sub-info" style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                                                            Sched: {r.details.scheduledCheckInDate || '--'} {r.details.scheduledCheckInTime} → {r.details.scheduledCheckOutDate || '--'} {r.details.scheduledCheckOutTime}
                                                                        </div>
                                                                    )}
                                                                    {(r.details.actualCheckInDate || r.details.actualCheckOutDate) && (
                                                                        <div className="rev-sub-info" style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600 }}>
                                                                            Actual: {r.details.actualCheckInDate || '--'} {r.details.actualCheckInTime} → {r.details.actualCheckOutDate || '--'} {r.details.actualCheckOutTime}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                            {r.nature === 'Incidental' && (
                                                                <>
                                                                    <strong>{r.details.incidentalType || 'Misc'}</strong>
                                                                    <span>{r.details.notes || 'No notes'}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        {r.isSaved && r.details.travelStatus && r.details.travelStatus !== 'Completed' && (
                                                            <div className={`rev-status-tag ${r.details.travelStatus.toLowerCase().replace(' ', '-')}`}>
                                                                {r.details.travelStatus}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="rev-amount-cell text-right">
                                                        <div className="amount-stack">
                                                            <span className="main-amt">₹{formatIndianCurrency(parseFloat(r.amount || 0))}</span>
                                                            {r.details.travelStatus === 'Cancelled' && (
                                                                <>
                                                                    <span className="amt-note">CANCELLATION ONLY</span>
                                                                    {r.details.baseFare && <span className="amt-note strikethrough" style={{ opacity: 0.6, fontSize: '0.65rem' }}>Original: ₹{formatIndianCurrency(parseFloat(r.details.baseFare))}</span>}
                                                                </>
                                                            )}
                                                            {r.details.travelStatus === 'No-Show' && (
                                                                <>
                                                                    <span className="amt-note">NO-SHOW ONLY</span>
                                                                    {r.details.baseFare && <span className="amt-note strikethrough" style={{ opacity: 0.6, fontSize: '0.65rem' }}>Original: ₹{formatIndianCurrency(parseFloat(r.details.baseFare))}</span>}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        {r.bills && r.bills.length > 0 ? (
                                                            <div className="rev-bills-list">
                                                                {r.bills.map((b, bidx) => (
                                                                    <button key={bidx} className="rev-bill-preview" title={`View Bill ${bidx + 1}`} onClick={() => previewBill(b)}>
                                                                        <FileText size={14} />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : <span className="no-bill-dash">—</span>}
                                                    </td>
                                                    <td className="text-center">
                                                        {(r.isSaved || r.details.travelStatus !== 'Completed') ? (
                                                            <div className="status-cell-wrapper">
                                                                <select
                                                                    className={`rev-status-select ${r.details.travelStatus && r.details.travelStatus !== 'Completed' ? 'status-' + r.details.travelStatus.toLowerCase().replace(' ', '-') : ''}`}
                                                                    value={r.details.travelStatus || 'Completed'}
                                                                    onChange={e => handleReviewStatusChange(r.id, e.target.value)}
                                                                    disabled={(r.nature === 'Travel' || r.nature === 'Local Travel') && isCompanyBooked(r.details.bookedBy)}
                                                                    title={(r.nature === 'Travel' || r.nature === 'Local Travel') && isCompanyBooked(r.details.bookedBy) ? "This ticket is booked and paid by the company. Please contact the Travel Desk for any changes." : ""}
                                                                >
                                                                    {availableStatuses.map(s => {
                                                                        const isOwnVehicle = r.details.subType === 'Own Car' || r.details.subType === 'Own Bike';
                                                                        const isDisabled = (isOwnVehicle && (s === 'Cancelled' || s === 'No-Show')) || ((r.nature === 'Travel' || r.nature === 'Local Travel') && isCompanyBooked(r.details.bookedBy) && s !== 'Completed');
                                                                        return <option key={s} value={s} disabled={isDisabled}>{s}</option>;
                                                                    })}
                                                                </select>
                                                                {(r.nature === 'Travel' || r.nature === 'Local Travel') && isCompanyBooked(r.details.bookedBy) && (
                                                                    <div className="company-booked-msg" style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                                                                        Contact Travel Desk for changes
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="rev-stat-dot pending" title="Draft - Commit Registry to enable status changes">
                                                                <Clock size={10} />
                                                            </div>
                                                        )}
                                                    </td>
                                                    {!isLocked && (
                                                        <td className="text-center">
                                                            <button className="row-del-btn" onClick={() => deleteRow(r.id)} title="Remove this record">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                                {r.details.travelStatus && r.details.travelStatus !== 'Completed' && (
                                                    <tr className="rev-status-extension">
                                                        <td colSpan={isLocked ? 7 : 8}>
                                                            <div className="rev-extension-panel">
                                                                {r.details.travelStatus === 'Cancelled' && (
                                                                    <div className="panel-grid-3">
                                                                        <div className="p-field">
                                                                            <label>Cancel Date</label>
                                                                            <input type="date" min={minDate} max={maxDate} value={r.details.cancellationDate || ''} onChange={e => updateDetails(r.id, 'cancellationDate', e.target.value)} />
                                                                        </div>
                                                                        <div className="p-field">
                                                                            <label>Charges</label>
                                                                            <input type="number"
                                                                                value={r.details.cancellationCharges || ''}
                                                                                onChange={e => {
                                                                                    updateDetails(r.id, 'cancellationCharges', e.target.value);
                                                                                    updateRow(r.id, 'amount', e.target.value); // Sync claim amount
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="p-field">
                                                                            <label>Refund</label>
                                                                            <input type="number" value={r.details.refundAmount || ''} onChange={e => updateDetails(r.id, 'refundAmount', e.target.value)} />
                                                                        </div>
                                                                        <div className="p-field full">
                                                                            <label>Cancel Reason (Mandatory)</label>
                                                                            <textarea value={r.details.cancellationReason || ''} onChange={e => updateDetails(r.id, 'cancellationReason', e.target.value)} placeholder="Why was this cancelled?" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {r.details.travelStatus === 'Rescheduled' && (
                                                                    <div className="panel-grid-3">
                                                                        <div className="p-field">
                                                                            <label>New Travel Date</label>
                                                                            <input type="date" min={minDate} max={maxDate} value={r.details.newTravelDate || ''} onChange={e => updateDetails(r.id, 'newTravelDate', e.target.value)} />
                                                                        </div>
                                                                        <div className="p-field">
                                                                            <label>Reschedule Fee</label>
                                                                            <input type="number" value={r.details.rescheduleCharges || ''} onChange={e => updateDetails(r.id, 'rescheduleCharges', e.target.value)} />
                                                                        </div>
                                                                        <div className="p-field">
                                                                            <label>New Ref/PNR</label>
                                                                            <input type="text" value={r.details.newBookingRef || ''} onChange={e => updateDetails(r.id, 'newBookingRef', e.target.value)} />
                                                                        </div>
                                                                        <div className="p-field full">
                                                                            <label>Reason</label>
                                                                            <textarea value={r.details.rescheduleReason || ''} onChange={e => updateDetails(r.id, 'rescheduleReason', e.target.value)} placeholder="Reason for rescheduling..." />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {r.details.travelStatus === 'No-Show' && (
                                                                    <div className="panel-grid-2">
                                                                        <div className="p-field">
                                                                            <label>No-Show Charges</label>
                                                                            <input type="number"
                                                                                value={r.details.noShowCharges || ''}
                                                                                onChange={e => {
                                                                                    updateDetails(r.id, 'noShowCharges', e.target.value);
                                                                                    updateRow(r.id, 'amount', e.target.value); // Sync claim amount
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="p-field">
                                                                            <label>Reason</label>
                                                                            <textarea value={r.details.noShowReason || ''} onChange={e => updateDetails(r.id, 'noShowReason', e.target.value)} placeholder="Reason for no-show..." />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className="rev-audit-trail mt-2">
                                                                    <div className="trail-label"><RotateCcw size={12} /> Status Audit History</div>
                                                                    <ul className="trail-list">
                                                                        {r.details.auditTrail?.map((log, i) => <li key={i}>{log}</li>)}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    });
                                })()
                            )}
                        </tbody>
                        {rows.length > 0 && (
                            <tfoot>
                                <tr>
                                    <td colSpan="3" className="text-right">
                                        <strong>{reviewFilter === 'All' ? 'Grand Total Ledger' : `${reviewFilter} Sub-Total`}</strong>
                                    </td>
                                    <td className="text-right">
                                        <strong>₹{formatIndianCurrency((reviewFilter === 'All'
                                            ? rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)
                                            : rows.filter(r => r.nature === reviewFilter).reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)
                                        ))}</strong>
                                    </td>
                                    <td colSpan="3"></td>
                                </tr>
                                {reviewFilter !== 'All' && (
                                    <tr className="grand-total-static">
                                        <td colSpan="3" className="text-right"><span className="text-muted">Grand Total (All)</span></td>
                                        <td className="text-right">₹{formatIndianCurrency(rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0))}</td>
                                        <td colSpan="3"></td>
                                    </tr>
                                )}
                            </tfoot>
                        )}
                    </table>
                </div>

                {unsavedCount > 0 && (
                    <div className="review-warning-banner mt-3">
                        <AlertCircle size={16} />
                        <span>You have <strong>{unsavedCount}</strong> uncommitted items. Please click "Commit Registry" before final submission.</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`smart-grid-container categorized ${isLocked ? 'registry-locked' : ''}`}>
            <div className="grid-master-header">
                <div className="m-left">
                    <div className="registry-title-row">
                        <h3>{isLocked ? 'Finalized Journey Ledger' : 'Dynamic Journey Ledger'}</h3>
                    </div>
                    <div className="category-tabs-selector mt-2">
                        {NATURE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                className={`cat-tab-btn ${activeCategory === opt.value ? 'active' : ''}`}
                                onClick={() => setActiveCategory(opt.value)}
                            >
                                {opt.icon}
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="active-nature-display">
                        <span className="nature-label">Nature of Transaction:</span>
                        <span className="nature-value">{activeCategory}</span>
                    </div>
                </div>
                <div className="m-right">
                    <div className="master-stats">
                        <div className="m-stat">
                            <label>Items</label>
                            <strong>{rows.length}</strong>
                        </div>
                        <div className="m-stat">
                            <label>Ledger Total</label>
                            <strong>₹{formatIndianCurrency(rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0))}</strong>
                        </div>
                        <div className="m-stat primary">
                            <label>Projected Wallet</label>
                            <strong style={{ color: (totalAdvance - rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)) >= 0 ? '#10b981' : '#ef4444' }}>
                                ₹{formatIndianCurrency((totalAdvance - rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)))}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>

            <div className="categorized-sections-grid single-mode">
                {activeCategory === 'Travel' && renderCategoryTable('Travel', 'Long Distance Travel', <Plane size={18} />)}
                {activeCategory === 'Local Travel' && renderCategoryTable('Local Travel', 'Local Conveyance', <Car size={18} />)}
                {activeCategory === 'Food' && renderCategoryTable('Food', 'Food & Refreshments', <Coffee size={18} />)}
                {activeCategory === 'Accommodation' && renderCategoryTable('Accommodation', 'Stay & Lodging', <Hotel size={18} />)}
                {activeCategory === 'Incidental' && renderCategoryTable('Incidental', 'Incidental Expenses', <Receipt size={18} />)}
                {activeCategory === 'Review' && renderReviewSummary()}
            </div>

            {/* Hidden Input for Odometer Camera */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                hidden
                onChange={handleOdoFileChange}
            />

            {confirmDialog.show && (
                <div className="custom-confirm-overlay">
                    <div className="custom-confirm-modal">
                        <div className={`modal-status-bar ${confirmDialog.type}`}></div>
                        <div className="modal-content-p">
                            <div className="modal-icon-h">
                                {confirmDialog.type === 'danger' ? <XCircle size={32} color="#ef4444" /> :
                                    confirmDialog.type === 'warning' ? <AlertTriangle size={32} color="#f59e0b" /> :
                                        <Info size={32} color="#3b82f6" />}
                            </div>
                            <h3>{confirmDialog.title}</h3>
                            <p>{confirmDialog.message}</p>
                            <div className="modal-actions-p">
                                <button className="modal-btn cancel" onClick={() => setConfirmDialog({ ...confirmDialog, show: false })}>Cancel</button>
                                <button className={`modal-btn confirm ${confirmDialog.type}`} onClick={confirmDialog.onConfirm}>Confirm Action</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="grid-master-footer">
                <div className="legend">
                    <div className="l-item"><div className="grid-dot t"></div> Travel</div>
                    <div className="l-item"><div className="grid-dot l"></div> Local</div>
                    <div className="l-item"><div className="grid-dot f"></div> Food</div>
                    <div className="l-item"><div className="grid-dot a"></div> Stay</div>
                </div>
                {!isLocked && (
                    <div className="review-action-footer">
                        {/* Always show Commit/Save button on every tab to allow incremental saving */}
                        <button
                            className={`master-save-btn ${(isSaving || (rows.length > 0 && rows.every(r => r.isSaved))) ? 'loading btn-disabled' : ''}`}
                            onClick={saveRegistry}
                            disabled={isSaving || isSubmitting || (rows.length > 0 && rows.every(r => r.isSaved))}
                        >
                            {isSaving ? <Clock className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                            <span>{isSaving ? 'Saving Progress...' : (rows.length > 0 && rows.every(r => r.isSaved) ? 'Saved' : 'Commit Registry')}</span>
                        </button>

                        {activeCategory === 'Review' ? (
                            <div className="review-submit-group">
                                <button
                                    className={`master-claim-btn ${isSubmitting ? 'loading' : ''} ${(!rows.every(r => r.isSaved) || !isTripApproved) ? 'btn-disabled' : ''}`}
                                    onClick={handleClaim}
                                    disabled={isSaving || isSubmitting || !rows.every(r => r.isSaved) || rows.length === 0 || !isTripApproved}
                                    title={!isTripApproved ? "Wait for Trip Approval to submit claim" : (!rows.every(r => r.isSaved) ? "Please Commit Registry first" : "")}
                                >
                                    {isSubmitting ? <Clock className="animate-spin" size={18} /> : <IndianRupee size={18} />}
                                    <span>{isSubmitting ? 'Finalizing...' : 'Submit Full Claim'}</span>
                                </button>
                                {!isTripApproved && (
                                    <div className="status-lock-hint">
                                        <AlertTriangle size={14} />
                                        <span>Submission locked until Trip is Approved</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                className="master-claim-btn secondary"
                                onClick={() => setActiveCategory('Review')}
                            >
                                <Navigation size={18} />
                                <span>Go to Final Review</span>
                            </button>
                        )}
                    </div>
                )}
                {isLocked && (
                    <div className="lock-status-notice">
                        <CheckCircle2 size={16} />
                        <span>Claim Reference: {tripId} Submitted for Review</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DynamicExpenseGrid;
