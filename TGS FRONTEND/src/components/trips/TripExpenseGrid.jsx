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
    XCircle
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

// Constants below are used as fallbacks if Master API fails or is empty
const FALLBACK_TRAVEL_MODES = ['Flight', 'Train', 'Intercity Bus', 'Intercity Cab'];
const FALLBACK_BOOKED_BY_OPTIONS = ['Self Booked', 'Company Booked'];
const FALLBACK_LOCAL_TRAVEL_MODES = ['Car / Cab', 'Bike', 'Public Transport'];
const FALLBACK_LOCAL_CAR_SUBTYPES = ['Own Car', 'Company Car', 'Rented Car (With Driver)', 'Self Drive Rental', 'Ride Hailing', 'Pool Vehicle'];
const FALLBACK_LOCAL_BIKE_SUBTYPES = ['Own Bike', 'Rental Bike', 'Ride Bike'];
const FALLBACK_LOCAL_PT_SUBTYPES = ['Auto', 'Metro', 'Local Bus'];
const FALLBACK_ACCOM_TYPES = ['Hotel Stay', 'Bavya Guest House', 'Client Provided', 'Self Stay', 'No Stay'];
const FALLBACK_ROOM_TYPES = ['Standard', 'Deluxe', 'Executive', 'Suite', 'Guest House'];
const FALLBACK_FLIGHT_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First'];
const FALLBACK_TRAIN_CLASSES = ['Sleeper', '3AC', '2AC', '1AC', 'Chair Car', 'General'];
const FALLBACK_BUS_SEAT_TYPES = ['Sleeper', 'Semi Sleeper', 'AC', 'Non-AC', 'Volvo', 'Seater'];
const FALLBACK_INCIDENTAL_TYPES = ['Parking Charges', 'Toll Charges', 'Fuel (Own Vehicle)', 'Luggage Charges', 'Porter Charges', 'Internet / WiFi', 'Others'];

const TRAVEL_STATUSES = ['Completed', 'Cancelled', 'Rescheduled'];
const LOCAL_TRAVEL_STATUSES = ['Completed', 'Cancelled', 'No-Show'];

const MOCK_DATA = [
    {
        id: 'mock-1',
        date: '2026-02-24',
        nature: 'Travel',
        details: { origin: 'Mumbai', destination: 'Delhi', mode: 'Airways', provider: 'IndiGo (6E-201)' },
        timeDetails: { boardingTime: '08:00', scheduledTime: '08:30', delay: 45, actualTime: '09:15' },
        amount: '6500',
        remarks: 'Direct flight for Client Kick-off',
        claim: true,
        isExpanded: true
    },
    {
        id: 'mock-2',
        date: '2026-02-24',
        nature: 'Local Travel',
        details: { location: 'Airport to Hotel', mode: 'Taxi', vehicleType: 'Service', provider: 'Uber Premier' },
        timeDetails: { boardingTime: '', scheduledTime: '', delay: 0, actualTime: '' },
        amount: '850',
        remarks: 'Airport transfer',
        claim: true,
        isExpanded: true
    },
    {
        id: 'mock-3',
        date: '2026-02-24',
        nature: 'Local Travel',
        details: { location: 'Hotel to Client Office', mode: 'Car', vehicleType: 'Own', odoStart: '12400', odoEnd: '12425' },
        timeDetails: { boardingTime: '', scheduledTime: '', delay: 0, actualTime: '' },
        amount: '500',
        remarks: 'Personal Car for local commute',
        claim: true,
        isExpanded: true
    },
    {
        id: 'mock-4',
        date: '2026-02-24',
        nature: 'Food',
        details: { mealType: 'Lunch', restaurant: 'The Imperial Grill', persons: '3', invoiceNo: 'INV-9021' },
        timeDetails: { boardingTime: '', scheduledTime: '', delay: 0, actualTime: '' },
        amount: '2800',
        remarks: 'Team lunch with client partners',
        claim: true,
        isExpanded: true
    },
    {
        id: 'mock-5',
        date: '2026-02-24',
        nature: 'Accommodation',
        details: { city: 'New Delhi', hotelName: 'ITC Maurya', roomType: 'Executive', checkIn: '2026-02-24', checkOut: '2026-02-26', nights: 2 },
        timeDetails: { boardingTime: '', scheduledTime: '', delay: 0, actualTime: '' },
        amount: '18500',
        remarks: '2 nights corporate stay',
        claim: true,
        isExpanded: true
    }
];

const TripExpenseGrid = ({
    tripId,
    startDate,
    endDate,
    initialExpenses = [],
    totalAdvance = 0,
    onUpdate,
    tripStatus,
    claimStatus,
    // array of allowed nature values (e.g. ['Local Travel']); if null all are allowed
    allowedNatures = null,
    // whether to show the bulk upload button (default true)
    showBulkUpload = true,
    onJobReportClick,
    hasAdditionalLuggage = false
}) => {
    // Master data states
    const [travelModes, setTravelModes] = useState(FALLBACK_TRAVEL_MODES);
    const [bookedByOptions, setBookedByOptions] = useState(FALLBACK_BOOKED_BY_OPTIONS);
    const [flightClasses, setFlightClasses] = useState(FALLBACK_FLIGHT_CLASSES);
    const [trainClasses, setTrainClasses] = useState(FALLBACK_TRAIN_CLASSES);
    const [busSeatTypes, setBusSeatTypes] = useState(FALLBACK_BUS_SEAT_TYPES);
    const [intercityCabVehicleTypes, setIntercityCabVehicleTypes] = useState(['Sedan', 'SUV', 'MUV', 'Hatchback']);
    const [airlines, setAirlines] = useState([]);
    const [busOperators, setBusOperators] = useState([]);
    const [travelProviders, setTravelProviders] = useState([]);
    const [trainProviders, setTrainProviders] = useState([]);
    const [busProviders, setBusProviders] = useState([]);
    const [cabProviders, setCabProviders] = useState([]);

    // Local Masters
    const [localTravelModes, setLocalTravelModes] = useState(FALLBACK_LOCAL_TRAVEL_MODES);
    const [localCarSubTypes, setLocalCarSubTypes] = useState(FALLBACK_LOCAL_CAR_SUBTYPES);
    const [localBikeSubTypes, setLocalBikeSubTypes] = useState(FALLBACK_LOCAL_BIKE_SUBTYPES);
    const [localAutoSubTypes, setLocalAutoSubTypes] = useState([]);
    const [localProviders, setLocalProviders] = useState([]);

    // Stay Masters
    const [stayTypes, setStayTypes] = useState(FALLBACK_ACCOM_TYPES);
    const [roomTypes, setRoomTypes] = useState(FALLBACK_ROOM_TYPES);
    const [stayBookingTypes, setStayBookingTypes] = useState([]);
    const [stayBookingSources, setStayBookingSources] = useState([]);

    // Food Masters
    const [mealCategories, setMealCategories] = useState(['Self Meal', 'Working Meal', 'Client Hosted']);
    const [mealTypes, setMealTypes] = useState([]);
    const [mealSources, setMealSources] = useState([]);
    const [mealProviders, setMealProviders] = useState([]);

    // Incidental Masters
    const [incidentalTypes, setIncidentalTypes] = useState(FALLBACK_INCIDENTAL_TYPES);

    const [rows, setRows] = useState([]);
    // when trip id doesn't start with TRP, entries are treated as bike/self-booked and locked
    const isFixedLocal = tripId && !tripId.toLowerCase().startsWith('trp');
    const [errors, setErrors] = useState({}); // { rowId: { fieldKey: message } }
    const enabledNatures = allowedNatures || NATURE_OPTIONS.map(o => o.value);
    const [activeCategory, setActiveCategory] = useState(enabledNatures[0] || 'Travel'); // default to first allowed
    const isLocalOnly = enabledNatures.length === 1 && enabledNatures[0] === 'Local Travel';
    // rows filtered to allowed natures for display/calculations
    const displayRows = allowedNatures ? rows.filter(r => allowedNatures.includes(r.nature)) : rows;
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
    const [jobReportDraft, setJobReportDraft] = useState({}); // { rowId: draftText }
    const [jobReportOpen, setJobReportOpen] = useState({}); // { rowId: bool } — composer open/viewing

    // Fuel Rate State: { '2 Wheeler': 8.5, '4 Wheeler': 12.0 }
    const [fuelRates, setFuelRates] = useState({});

    // Bulk Upload State
    const [bulkModal, setBulkModal] = useState({ visible: false, file: null, uploading: false });

    // Image Preview State
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const [
                    modesRes, bookedByRes, fClassesRes, tClassesRes, busTypesRes,
                    cabVehiclesRes, airlinesRes, busOpsRes, travProvRes,
                    locModesRes, carSubRes, bikeSubRes, autoSubRes, locProvRes,
                    stayTypeRes, roomTypeRes,
                    mealCatRes, mealTypeRes,
                    incTypeRes,
                    trainProvRes, busProvRes, cabProvRes
                ] = await Promise.all([
                    api.get('/api/travel-mode-masters/'),
                    api.get('/api/booking-type-masters/'),
                    api.get('/api/travel-class-masters/?is_flight=true'),
                    api.get('/api/travel-class-masters/?is_train=true'),
                    api.get('/api/travel-class-masters/?is_bus=true'),
                    api.get('/api/travel-vehicle-masters/?is_intercity_cab=true'),
                    api.get('/api/travel-operator-masters/?is_flight=true'),
                    api.get('/api/travel-operator-masters/?is_bus=true'),
                    api.get('/api/travel-provider-masters/'),
                    api.get('/api/local-travel-mode-masters/'),
                    api.get('/api/local-subtype-masters/?is_car=true'),
                    api.get('/api/local-subtype-masters/?is_bike=true'),
                    api.get('/api/local-subtype-masters/?is_auto=true'),
                    api.get('/api/local-provider-masters/'),
                    api.get('/api/stay-type-masters/'),
                    api.get('/api/room-type-masters/'),
                    api.get('/api/meal-category-masters/'),
                    api.get('/api/meal-type-masters/'),
                    api.get('/api/incidental-type-masters/'),
                    api.get('/api/travel-provider-masters/?is_train=true'),
                    api.get('/api/travel-provider-masters/?is_bus=true'),
                    api.get('/api/travel-provider-masters/?is_intercity_cab=true')
                ]);

                // Populate Travel
                if (modesRes.data.length > 0) setTravelModes(modesRes.data.filter(m => m.status).map(m => m.mode_name));
                if (bookedByRes.data.length > 0) setBookedByOptions(bookedByRes.data.filter(m => m.status).map(m => m.booking_type));
                if (fClassesRes.data.length > 0) setFlightClasses(fClassesRes.data.filter(m => m.status).map(m => m.class_name));
                if (tClassesRes.data.length > 0) setTrainClasses(tClassesRes.data.filter(m => m.status).map(m => m.class_name));
                if (busTypesRes.data.length > 0) setBusSeatTypes(busTypesRes.data.filter(m => m.status).map(m => m.class_name));
                if (cabVehiclesRes.data.length > 0) setIntercityCabVehicleTypes(cabVehiclesRes.data.filter(m => m.status).map(m => m.vehicle_name));
                if (airlinesRes.data.length > 0) setAirlines(airlinesRes.data.filter(m => m.status).map(m => m.operator_name));
                if (busOpsRes.data.length > 0) setBusOperators(busOpsRes.data.filter(m => m.status).map(m => m.operator_name));
                if (travProvRes.data.length > 0) setTravelProviders(travProvRes.data.filter(m => m.status).map(m => m.provider_name));
                if (trainProvRes.data.length > 0) setTrainProviders(trainProvRes.data.filter(m => m.status).map(m => m.provider_name));
                if (busProvRes.data.length > 0) setBusProviders(busProvRes.data.filter(m => m.status).map(m => m.provider_name));
                if (cabProvRes.data.length > 0) setCabProviders(cabProvRes.data.map(m => m.provider_name));

                // Populate Local
                if (locModesRes.data.length > 0) setLocalTravelModes(locModesRes.data.filter(m => m.status).map(m => m.mode_name));
                if (carSubRes.data.length > 0) setLocalCarSubTypes(carSubRes.data.filter(m => m.status).map(m => m.sub_type));
                if (bikeSubRes.data.length > 0) setLocalBikeSubTypes(bikeSubRes.data.filter(m => m.status).map(m => m.sub_type));
                if (autoSubRes.data.length > 0) setLocalAutoSubTypes(autoSubRes.data.filter(m => m.status).map(m => m.sub_type));
                if (locProvRes.data.length > 0) setLocalProviders(locProvRes.data.filter(m => m.status).map(m => m.provider_name));

                // Populate Stay
                if (stayTypeRes.data.length > 0) setStayTypes(stayTypeRes.data.filter(m => m.status).map(m => m.stay_type));
                if (roomTypeRes.data.length > 0) setRoomTypes(roomTypeRes.data.filter(m => m.status).map(m => m.room_type));

                // Populate Food
                if (mealCatRes.data.length > 0) setMealCategories(mealCatRes.data.filter(m => m.status).map(m => m.category_name));
                if (mealTypeRes.data.length > 0) setMealTypes(mealTypeRes.data.filter(m => m.status).map(m => m.meal_type));

                // Populate Incidental
                if (incTypeRes.data.length > 0) setIncidentalTypes(incTypeRes.data.filter(m => m.status).map(m => m.expense_type));

            } catch (error) {
                console.error("Failed to fetch masters:", error);
            }
        };
        fetchMasters();

        const fetchStayBookingMasters = async () => {
            try {
                const definitionsRes = await api.get('/api/custom-master-definitions/');
                const definitions = definitionsRes.data || [];
                const bookingTypeDef = definitions.find(def => def.table_name === 'Stay Booking Type');
                const bookingSourceDef = definitions.find(def => def.table_name === 'Stay Booking Source');

                const requests = [];
                if (bookingTypeDef?.id) requests.push(api.get(`/api/custom-master-values/?definition=${bookingTypeDef.id}`));
                else requests.push(Promise.resolve({ data: [] }));
                if (bookingSourceDef?.id) requests.push(api.get(`/api/custom-master-values/?definition=${bookingSourceDef.id}`));
                else requests.push(Promise.resolve({ data: [] }));

                const [bookingTypeRes, bookingSourceRes] = await Promise.all(requests);
                setStayBookingTypes((bookingTypeRes.data || []).filter(item => item.status !== false).map(item => item.name));
                setStayBookingSources((bookingSourceRes.data || []).filter(item => item.status !== false).map(item => item.name));
            } catch (error) {
                console.warn('Could not fetch stay booking masters:', error);
            }
        };
        fetchStayBookingMasters();

        const fetchFoodMasters = async () => {
            try {
                const definitionsRes = await api.get('/api/custom-master-definitions/');
                const definitions = definitionsRes.data || [];
                const mealSourceDef = definitions.find(def => ['Meal Source', 'MealSource', 'Food Source', 'Meal Source Master'].includes(def.table_name));
                const mealProviderDef = definitions.find(def => ['Provider', 'Meal Provider', 'Food Provider', 'Meal Provider Master'].includes(def.table_name));

                const requests = [];
                if (mealSourceDef?.id) requests.push(api.get(`/api/custom-master-values/?definition=${mealSourceDef.id}`));
                else requests.push(Promise.resolve({ data: [] }));
                if (mealProviderDef?.id) requests.push(api.get(`/api/custom-master-values/?definition=${mealProviderDef.id}`));
                else requests.push(Promise.resolve({ data: [] }));

                const [mealSourceRes, mealProviderRes] = await Promise.all(requests);
                setMealSources((mealSourceRes.data || []).filter(item => item.status !== false).map(item => item.name));
                setMealProviders((mealProviderRes.data || []).filter(item => item.status !== false).map(item => item.name));
            } catch (error) {
                console.warn('Could not fetch food masters:', error);
            }
        };
        fetchFoodMasters();

        // Fetch fuel rates for 2 Wheeler and 4 Wheeler for current user's state
        const fetchFuelRates = async () => {
            try {
                const [rate2W, rate4W] = await Promise.all([
                    api.get('/api/masters/fuel-rate-masters/my_rate/?vehicle_type=2 Wheeler'),
                    api.get('/api/masters/fuel-rate-masters/my_rate/?vehicle_type=4 Wheeler')
                ]);
                const rates = {};
                if (rate2W.data?.rate_per_km) rates['2 Wheeler'] = parseFloat(rate2W.data.rate_per_km);
                if (rate4W.data?.rate_per_km) rates['4 Wheeler'] = parseFloat(rate4W.data.rate_per_km);
                if (Object.keys(rates).length > 0) setFuelRates(rates);
            } catch (err) {
                console.warn('Could not fetch fuel rates:', err);
            }
        };
        fetchFuelRates();
    }, []);

    // --- DATE RANGE CONSTRAINTS ---
    const getMinDate = () => {
        if (!startDate) return undefined;
        try {
            const d = new Date(startDate);
            d.setDate(d.getDate() - 1);
            return d.toISOString().split('T')[0];
        } catch (e) { return undefined; }
    };

    const getMaxDate = () => {
        if (!endDate) return undefined;
        try {
            const d = new Date(endDate);
            d.setDate(d.getDate() + 1);
            return d.toISOString().split('T')[0];
        } catch (e) { return undefined; }
    };

    const minDate = getMinDate();
    const maxDate = getMaxDate();

    const isTripApproved = ['approved', 'hr approved', 'on-going'].includes(tripStatus?.toLowerCase());

    const isSameDayTrip = () => {
        return rows.some(r => r.nature === 'Travel' && r.details.mode === 'Intercity Car' && r.date === (r.endDate || r.date));
    };

    useEffect(() => {
        // restore the category after syncing with server data, but only if
        // the previously active category is still permitted (e.g. when the
        // grid is restricted to local conveyance we shouldn't switch back to
        // Travel which may be disallowed).
        if (prevCategoryRef.current && enabledNatures.includes(prevCategoryRef.current)) {
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

                const natureVal = exp.category === 'Others' ? 'Travel' : (exp.category === 'Fuel' ? 'Local Travel' : exp.category);
                // enforce fixed fields for non-TRP trip ids and local travel entries
                if (isFixedLocal && natureVal === 'Local Travel') {
                    details.mode = 'Bike';
                    details.subType = 'Own Bike';
                    details.bookedBy = 'Self Booked';
                }
                return {
                    id: exp.id || Math.random().toString(36).substr(2, 9),
                    date: exp.date || new Date().toISOString().split('T')[0],
                    nature: natureVal,
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

    // ensure activeCategory stays valid if allowedNatures changes
    useEffect(() => {
        if (!enabledNatures.includes(activeCategory)) {
            setActiveCategory(enabledNatures[0] || activeCategory);
        }
    }, [enabledNatures]);

    // keep ref up to date whenever user switches tabs
    useEffect(() => {
        prevCategoryRef.current = activeCategory;
    }, [activeCategory]);

    const saveRegistry = async (saveAll = false) => {
        setErrors({}); // clear previous inline errors
        const targetRows = saveAll ? rows : displayRows;

        if (targetRows.length === 0) {
            showToast("No expenses to save", "info");
            return false;
        }

        // --- DUPLICATE ENTRY CHECK ---
        const entrySet = new Set();
        for (let i = 0; i < targetRows.length; i++) {
            const row = targetRows[i];
            let key = '';
            if (row.nature === 'Travel') {
                key = `Travel|${row.date}|${row.details.mode}|${row.details.origin}|${row.details.destination}|${row.details.pnr || ''}`;
            } else if (row.nature === 'Local Travel') {
                key = `Local|${row.date}|${row.details.mode || ''}|${row.details.subType || ''}|${row.details.origin || ''}|${row.details.destination || ''}`;
            } else if (row.nature === 'Food') {
                key = `Food|${row.date}|${row.details.mealType || ''}|${row.details.mealCategory || ''}|${row.details.mealSource || ''}|${row.details.provider || ''}`;
            } else if (row.nature === 'Accommodation') {
                key = `Hotel|${row.date}|${row.details.hotelName || ''}|${row.details.bookingType || ''}|${row.details.bookingSource || ''}|${row.details.accomType || ''}`;
            } else if (row.nature === 'Incidental') {
                key = `Incidental|${row.date}|${row.details.incidentalType}`;
            } else {
                key = `Other|${row.nature}|${row.date}|${row.amount}|${row.remarks}`;
            }

            if (entrySet.has(key)) {
                setActiveCategory(row.nature);
                showToast(`Duplicate entry detected at row #${i + 1}. Please remove or modify unique details like PNR or Route.`, "error");
                return false;
            }
            entrySet.add(key);
        }

        // --- PRE-FLIGHT VALIDATION ---
        for (let i = 0; i < targetRows.length; i++) {
            const row = targetRows[i];
            const rowNum = i + 1;

            const _originalShowToast = showToast;
            const _originalSetRowError = setRowError;
            const _scopedShowToast = (msg, type) => {
                 if (type === 'error') setActiveCategory(row.nature);
                 _originalShowToast(msg, type);
            };
            const _scopedSetRowError = (id, key, msg) => {
                 setActiveCategory(row.nature);
                 _originalSetRowError(id, key, msg);
            };

            // Temporary variables for this block to avoid shadowing that causes TDZ errors
            const localizedShowToast = _scopedShowToast;
            const localizedSetRowError = _scopedSetRowError;

            // DATE RANGE VALIDATION
            if (minDate && maxDate) {
                if (row.date < minDate || row.date > maxDate) {
                    localizedShowToast(`Item #${rowNum}: Selected date (${row.date}) is outside trip range. Only trip dates +/- 1 day grace allowed.`, "error");
                    return false;
                }
                if (row.nature === 'Accommodation') {
                    if (row.details.checkIn && (row.details.checkIn < minDate || row.details.checkIn > maxDate)) {
                        localizedShowToast(`Item #${rowNum}: Check-In date is outside trip range.`, "error");
                        return false;
                    }
                    if (row.details.checkOut && (row.details.checkOut < minDate || row.details.checkOut > maxDate)) {
                        localizedShowToast(`Item #${rowNum}: Check-Out date is outside trip range.`, "error");
                        return false;
                    }
                }
            }

            // AMOUNT
            if (row.amount === '' || row.amount === null || row.amount === undefined || isNaN(parseFloat(row.amount))) {
                localizedShowToast(`Item #${rowNum}: Please enter a valid numeric amount.`, "error");
                return false;
            }
            // require bill if any charge present
            if (parseFloat(row.amount) > 0 && (!row.bills || row.bills.length === 0)) {
                localizedShowToast(`Item #${rowNum}: Please upload a bill as amount is entered.`, "error");
                return false;
            }
            const amt = parseFloat(row.amount);
            if (amt < 0) {
                localizedShowToast(`Item #${rowNum}: Amount cannot be negative.`, "error");
                return false;
            }
            // two decimal places
            if (!/^\d+(\.\d{1,2})?$/.test(String(row.amount))) {
                localizedShowToast(`Item #${rowNum}: Amount can have at most two decimal places.`, "error");
                return false;
            }
            // TODO: compare against company policy limit if available


            if (row.nature === 'Travel') {
                const { mode, origin, destination, travelStatus, bookedBy, provider, ticketNo, pnr, travelNo, depDate, arrDate } = row.details;
                const isSelfBooked = bookedBy !== 'Company Booked';

                // Booking date must always be present
                if (!row.date) {
                    localizedShowToast(`Item #${rowNum}: Booking Date is required.`, "error");
                    return false;
                }

                // COMMON MANDATORY FIELDS
                if (!mode) {
                    localizedShowToast(`Item #${rowNum}: Please select a Travel Mode.`, "error");
                    return false;
                }

                // origin/destination validations
                if (!origin || !destination) {
                    localizedShowToast(`Item #${rowNum}: Origin and Destination are required for Travel entries.`, "error");
                    return false;
                }
                if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
                    localizedShowToast(`Item #${rowNum}: Origin and Destination cannot be the same.`, "error");
                    return false;
                }
                const locRegex = /^[A-Za-z ]{2,}$/;
                if (!locRegex.test(origin) || !locRegex.test(destination)) {
                    localizedShowToast(`Item #${rowNum}: From/To must be at least 2 alphabetic characters.`, "error");
                    return false;
                }
                // invoice number validation (alphanumeric, max 30)
                if (row.details.invoiceNo) {
                    const inv = row.details.invoiceNo;
                    if (!/^[A-Za-z0-9]+$/.test(inv)) {
                        localizedShowToast(`Item #${rowNum}: Invoice Number may only be alphanumeric.`, "error");
                        return false;
                    }
                    if (inv.length > 30) {
                        localizedShowToast(`Item #${rowNum}: Invoice Number cannot exceed 30 characters.`, "error");
                        return false;
                    }
                }
                // carrier name (Train Name/Operator/Airline) allowed alphanumeric and spaces
                if (row.details.carrier) {
                    const carrierLabel = row.details.mode === 'Train' ? 'Train Name' : row.details.mode === 'Intercity Bus' ? 'Bus Operator' : 'Carrier Name';
                    if (!/^[A-Za-z0-9\s\.\-]+$/.test(row.details.carrier)) {
                        localizedShowToast(`Item #${rowNum}: ${carrierLabel} may only contain letters, numbers, spaces, and symbols like - or .`, "error");
                        return false;
                    }
                }

                // universal date order checks
                const bookDateObj = new Date(row.date);
                const depDateObj = new Date(depDate || row.date);
                const arrDateObj = new Date(arrDate || row.date);
                if (depDateObj < bookDateObj) {
                    localizedSetRowError(row.id, 'depDate', 'Departure Date cannot be before Booking Date.');
                    return false;
                }
                if (arrDateObj < depDateObj) {
                    localizedSetRowError(row.id, 'arrDate', 'Arrival Date cannot be before Departure Date.');
                    return false;
                }

                // time order check (if both times provided)
                if (row.timeDetails.boardingTime && row.timeDetails.actualTime) {
                    if (row.timeDetails.boardingTime >= row.timeDetails.actualTime) {
                        localizedShowToast(`Item #${rowNum}: Arrival time must be later than Departure time.`, "error");
                        return false;
                    }
                }

                if (mode === 'Flight') {
                    if (!provider) { localizedSetRowError(row.id, 'provider', 'Airline Name is mandatory.'); return false; }
                    if (!ticketNo) { localizedSetRowError(row.id, 'ticketNo', 'Ticket Number is mandatory.'); return false; }
                    if (!pnr) { localizedSetRowError(row.id, 'pnr', 'PNR is mandatory.'); return false; }
                    if (!row.details.classType) { localizedSetRowError(row.id, 'classType', 'Class is mandatory for Flight.'); return false; }
                    if (!travelNo) { localizedSetRowError(row.id, 'travelNo', 'Flight Number is mandatory.'); return false; }
                    if (!row.timeDetails.boardingTime || !row.timeDetails.actualTime) { localizedSetRowError(row.id, 'time', 'Departure and Arrival times are mandatory.'); return false; }
                    // format/length validations
                    const alnum = /^[A-Za-z0-9]+$/;
                    if (!alnum.test(ticketNo)) { localizedSetRowError(row.id, 'ticketNo', 'Ticket Number may only contain letters and numbers.'); return false; }
                    if (ticketNo.length > 25) { localizedSetRowError(row.id, 'ticketNo', 'Ticket Number cannot exceed 25 characters.'); return false; }
                    if (!alnum.test(pnr)) { localizedSetRowError(row.id, 'pnr', 'PNR may only contain letters and numbers.'); return false; }
                    if (pnr.length < 5 || pnr.length > 15) { localizedSetRowError(row.id, 'pnr', 'PNR must be 5-15 characters long.'); return false; }
                } else if (mode === 'Train') {
                    if (!ticketNo) { localizedSetRowError(row.id, 'ticketNo', 'Ticket Number is mandatory for Train.'); return false; }
                    if (!pnr) { localizedSetRowError(row.id, 'pnr', 'PNR is mandatory for Train.'); return false; }
                    if (!row.details.carrier) { localizedSetRowError(row.id, 'carrier', 'Train Name is mandatory.'); return false; }
                    if (!row.details.classType) { localizedSetRowError(row.id, 'classType', 'Class is mandatory for Train.'); return false; }
                    const alnum = /^[A-Za-z0-9]+$/;
                    if (!alnum.test(ticketNo)) { localizedSetRowError(row.id, 'ticketNo', 'Ticket Number may only contain letters and numbers.'); return false; }
                    if (ticketNo.length > 25) { localizedSetRowError(row.id, 'ticketNo', 'Ticket Number cannot exceed 25 characters.'); return false; }
                    if (!alnum.test(pnr)) { localizedSetRowError(row.id, 'pnr', 'PNR may only contain letters and numbers.'); return false; }
                    if (pnr.length < 5 || pnr.length > 15) { localizedSetRowError(row.id, 'pnr', 'PNR must be 5-15 characters long.'); return false; }
                } else if (mode === 'Intercity Bus') {
                    if (!row.details.carrier) { localizedSetRowError(row.id, 'carrier', 'Bus Operator is mandatory.'); return false; }
                } else if (mode === 'Intercity Cab') {
                    if (!provider) { localizedSetRowError(row.id, 'provider', 'Provider / Vendor (Ola/Uber etc) is mandatory.'); return false; }
                    if (!row.timeDetails.boardingTime || !row.timeDetails.actualTime) { localizedSetRowError(row.id, 'time', 'Departure and Arrival times are mandatory for Cab.'); return false; }
                }

                if (isSelfBooked) {
                    // travel-specific requirement
                    if (row.nature === 'Travel') {
                        if (row.amount === '' || row.amount <= 0) {
                            localizedShowToast(`${row.nature} Item #${rowNum}: Total Amount is mandatory for Self Booked.`, "error");
                            return false;
                        }
                    }
                    // local travel also needs positive amount when self-booked
                    if (row.nature === 'Local Travel') {
                        if (row.amount === '' || row.amount <= 0) {
                            localizedShowToast(`${row.nature} Item #${rowNum}: Total Amount is mandatory for Self Booked.`, "error");
                            return false;
                        }
                    }
                    if (mode === 'Flight' || mode === 'Intercity Bus' || mode === 'Intercity Cab') {
                        // Ticket/Invoice requirements
                        if (!row.bills || row.bills.length < (mode === 'Intercity Cab' ? 1 : 2)) {
                            localizedShowToast(`Item #${rowNum}: Please upload ${mode === 'Intercity Cab' ? 'Invoice' : 'Ticket and Invoice'} for self-booked ${mode.toLowerCase()}.`, "warning");
                        }
                    }
                }

                if ((row.bills || []).length > 0) {
                    const travelInvoiceNumbers = getTravelInvoiceNumbers(row);
                    const missingInvoice = travelInvoiceNumbers.some(invoice => !invoice || !invoice.trim());
                    if (missingInvoice) {
                        localizedShowToast(`Item #${rowNum}: Invoice number is required for each uploaded file.`, "error");
                        return false;
                    }
                }

                // Cancellation/No-Show Logic
                if (travelStatus === 'Cancelled') {
                    const charges = parseFloat(row.details.cancellationCharges || 0);
                    const refund = parseFloat(row.details.refundAmount || 0);
                    const baseFare = parseFloat(row.details.baseFare || 0);
                    if (baseFare > 0 && (charges + refund > baseFare + 0.5)) {
                        localizedShowToast(`Item #${rowNum}: Sum of Charges and Refund exceeds original Ticket Amount.`, "error");
                        return false;
                    }
                    if (!row.details.cancellationReason || row.details.cancellationReason.trim().length < 3) {
                        localizedShowToast(`Item #${rowNum}: Please provide a valid cancellation reason.`, "error");
                        return false;
                    }
                }

                // Upload Validation
                if (isSelfBooked || mode !== 'Flight') {
                    if (!row.bills || row.bills.length === 0) {
                        localizedShowToast(`Item #${rowNum}: Please upload your ticket/invoice. This is mandatory for all travel.`, "error");
                        return false;
                    }
                }
            }

            if (row.nature === 'Local Travel') {
                const { mode, subType, odoStart, odoEnd, origin, destination } = row.details;

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
                                localizedShowToast(`Item #${rowNum}: Cannot record local conveyance during active long-distance travel period.`, "error");
                                return false;
                            }
                        }
                    }
                }

                if (!mode) {
                    localizedShowToast(`Item #${rowNum}: Please select a Mode for Local Travel.`, "error");
                    return false;
                }

                if (mode !== 'Walk' && !subType) {
                    localizedShowToast(`Item #${rowNum}: Please select a Sub-Type for ${mode}.`, "error");
                    return false;
                }

                // date range validation for local travel
                if (row.date && row.endDate) {
                    if (new Date(row.date) > new Date(row.endDate)) {
                        localizedShowToast(`Item #${rowNum}: End Date should be after Start Date.`, "error");
                        return false;
                    }
                    // optionally block future dates if needed
                    const today = new Date();
                    if (new Date(row.date) > today || new Date(row.endDate) > today) {
                        localizedShowToast(`Item #${rowNum}: Travel dates cannot be in the future.`, "error");
                        return false;
                    }
                }

                // location cross-check
                if (origin && destination && origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
                    localizedShowToast(`Item #${rowNum}: From and To locations cannot be the same.`, "error");
                    return false;
                }
                // time validations for local travel
                if ((row.timeDetails.boardingTime && !row.timeDetails.actualTime) || (!row.timeDetails.boardingTime && row.timeDetails.actualTime)) {
                    localizedShowToast(`Item #${rowNum}: Both start and end times are required for Local Travel.`, "error");
                    return false;
                }
                if (row.timeDetails.boardingTime && row.timeDetails.actualTime) {
                    if (row.timeDetails.boardingTime >= row.timeDetails.actualTime) {
                        localizedShowToast(`Item #${rowNum}: End Time must be greater than Start Time.`, "error");
                        return false;
                    }
                }

                if (mode === 'Walk') {
                    if (parseFloat(row.amount) > 0) {
                        localizedShowToast(`Item #${rowNum}: Walk mode cannot have an associated cost.`, "error");
                        return false;
                    }
                    if (!origin || !destination) {
                        localizedShowToast(`Item #${rowNum}: From and To locations are required for Walk entries.`, "error");
                        return false;
                    }
                }

                if (subType === 'Own Car') {
                    if (!odoStart || !odoEnd) {
                        localizedShowToast(`Item #${rowNum}: Both start and end odometer readings are required for Own Car.`, "error");
                        return false;
                    }
                    if (isNaN(parseFloat(odoStart)) || isNaN(parseFloat(odoEnd))) {
                        localizedShowToast(`Item #${rowNum}: Odometer readings must be numeric.`, "error");
                        return false;
                    }
                    if (parseFloat(odoEnd) <= parseFloat(odoStart)) {
                        localizedShowToast(`Item #${rowNum}: End Odometer should be greater than Start Odometer.`, "error");
                        return false;
                    }
                    // require photos for both start and end readings
                    if (!row.details.odoStartImg || !row.details.odoEndImg) {
                        localizedShowToast(`Item #${rowNum}: Please capture both start and end odometer photos.`, "error");
                        if (!row.details.odoStartImg) localizedSetRowError(row.id, 'odoStartImg', 'Start odometer photo required.');
                        if (!row.details.odoEndImg) localizedSetRowError(row.id, 'odoEndImg', 'End odometer photo required.');
                        return false;
                    }
                } else if (['Self Drive Rental', 'Own Bike'].includes(subType)) {
                    if (odoStart && odoEnd && parseFloat(odoEnd) <= parseFloat(odoStart)) {
                        localizedShowToast(`Item #${rowNum}: ODO End must be greater than ODO Start.`, "error");
                        return false;
                    }
                }

                if ((row.bills || []).length > 0) {
                    const localInvoiceNumbers = getLocalInvoiceNumbers(row);
                    const missingInvoice = localInvoiceNumbers.some(invoice => !invoice || !invoice.trim());
                    if (missingInvoice) {
                        localizedShowToast(`Item #${rowNum}: Invoice number is required for each uploaded bill.`, "error");
                        return false;
                    }
                }
            }

            if (row.nature === 'Food') {
                const mealSource = normalizeMealSource(row.details.mealSource);
                const isSelfMeal = row.details.mealCategory === 'Self Meal';
                if (!row.date) { localizedShowToast(`Item #${rowNum}: Date is required.`, "error"); return false; }
                if (!row.details.mealType) { localizedShowToast(`Item #${rowNum}: Please select Meal Type.`, "error"); return false; }
                if (!row.details.mealTime) { localizedShowToast(`Item #${rowNum}: Meal Time is required.`, "error"); return false; }
                if (!row.details.mealCategory) { localizedShowToast(`Item #${rowNum}: Please select Meal Category.`, "error"); return false; }
                if (isSelfMeal) {
                    if (!row.details.mealSource) { localizedShowToast(`Item #${rowNum}: Please select Meal Source.`, "error"); return false; }
                    if (mealSource === 'online' && (!row.details.provider || !row.details.provider.trim())) { localizedShowToast(`Item #${rowNum}: Provider is required for Online meal source.`, "error"); return false; }
                    if (mealSource === 'hotel' && !row.details.hotelName?.trim()) { localizedShowToast(`Item #${rowNum}: Hotel Name is required.`, "error"); return false; }
                    if (mealSource === 'restaurant' && !row.details.restaurant?.trim()) { localizedShowToast(`Item #${rowNum}: Restaurant Name is required.`, "error"); return false; }
                    if (mealSource === 'online' && !row.details.hotelName?.trim()) { localizedShowToast(`Item #${rowNum}: Hotel/Outlet Name is required for Online meal source.`, "error"); return false; }
                    if (!row.amount || parseFloat(row.amount) <= 0) { localizedShowToast(`Item #${rowNum}: Amount must be greater than 0 for Self Meal.`, "error"); return false; }
                } else if (parseFloat(row.amount || 0) !== 0) {
                    localizedShowToast(`Item #${rowNum}: Amount must be 0 for Client Hosted and Working Meal.`, "error");
                    return false;
                }
                if ((row.bills || []).length > 0) {
                    const foodInvoiceNumbers = getFoodInvoiceNumbers(row);
                    const missingInvoice = foodInvoiceNumbers.some(invoice => !invoice || !invoice.trim());
                    if (missingInvoice) {
                        localizedShowToast(`Item #${rowNum}: Invoice number is required for each uploaded bill.`, "error");
                        return false;
                    }
                }
            }

            if (row.nature === 'Accommodation') {
                const scheduledCheckInDate = row.details.scheduledCheckInDate || row.details.checkIn;
                const scheduledCheckInTime = row.details.scheduledCheckInTime || row.details.checkInTime;
                const scheduledCheckOutDate = row.details.scheduledCheckOutDate || row.details.checkOut;
                const scheduledCheckOutTime = row.details.scheduledCheckOutTime || row.details.checkOutTime;
                const actualCheckInDate = row.details.actualCheckInDate || row.details.checkIn;
                const actualCheckInTime = row.details.actualCheckInTime || row.details.checkInTime;
                const actualCheckOutDate = row.details.actualCheckOutDate || row.details.checkOut;
                const actualCheckOutTime = row.details.actualCheckOutTime || row.details.checkOutTime;

                if (!scheduledCheckInDate || !scheduledCheckInTime || !scheduledCheckOutDate || !scheduledCheckOutTime) {
                    localizedShowToast(`Item #${rowNum}: Scheduled check-in and check-out date/time are required.`, "error");
                    return false;
                }
                if (!actualCheckInDate || !actualCheckInTime || !actualCheckOutDate || !actualCheckOutTime) {
                    localizedShowToast(`Item #${rowNum}: Actual check-in and check-out date/time are required.`, "error");
                    return false;
                }
                if (!row.details.bookingType) {
                    localizedShowToast(`Item #${rowNum}: Please select a Booking Type.`, "error");
                    return false;
                }
                if (!row.details.bookingSource) {
                    localizedShowToast(`Item #${rowNum}: Please select a Booking Source.`, "error");
                    return false;
                }
                if (!row.details.accomType) {
                    localizedShowToast(`Item #${rowNum}: Please select a Stay Type.`, "error");
                    return false;
                }
                if (!['No Stay', 'Self Stay'].includes(row.details.accomType) && !row.details.hotelName) {
                    localizedShowToast(`Item #${rowNum}: Please provide the Hotel/Guest House name.`, "error");
                    return false;
                }
                if (actualCheckInDate && actualCheckOutDate && new Date(actualCheckInDate) > new Date(actualCheckOutDate)) {
                    localizedShowToast(`Item #${rowNum}: Actual check-out date cannot be before actual check-in date.`, "error");
                    return false;
                }
                if (!row.amount || parseFloat(row.amount) <= 0) {
                    localizedShowToast(`Item #${rowNum}: Amount must be greater than 0.`, "error");
                    return false;
                }
                if ((row.bills || []).length > 0) {
                    const accommodationInvoiceNumbers = getAccommodationInvoiceNumbers(row);
                    const missingInvoice = accommodationInvoiceNumbers.some(invoice => !invoice || !invoice.trim());
                    if (missingInvoice) {
                        localizedShowToast(`Item #${rowNum}: Invoice number is required for each uploaded bill.`, "error");
                        return false;
                    }
                }
            }

            if (row.nature === 'Incidental') {
                if (!row.date) {
                    localizedShowToast(`Item #${rowNum}: Date is mandatory for incidental expenses.`, "error");
                    return false;
                }
                if (!row.details.incidentalTime) {
                    localizedShowToast(`Item #${rowNum}: Time is mandatory for incidental expenses.`, "error");
                    return false;
                }
                if (!row.details.incidentalType) {
                    localizedShowToast(`Item #${rowNum}: Please select an Incidental Type.`, "error");
                    return false;
                }
                if (!row.details.location || row.details.location.trim().length < 3) {
                    localizedShowToast(`Item #${rowNum}: Location must be at least 3 characters.`, "error");
                    return false;
                }
                if (!/^\d+(\.\d{1,2})?$/.test(String(row.amount || '').trim())) {
                    localizedShowToast(`Item #${rowNum}: Amount must be a valid number with up to 2 decimal places.`, "error");
                    return false;
                }
                if (parseFloat(row.amount) <= 0) {
                    localizedShowToast(`Item #${rowNum}: Amount must be greater than 0.`, "error");
                    return false;
                }
                if (isIncidentalOthersType(row.details.incidentalType)) {
                    if (countWords(row.details.otherReason) < 5) { localizedShowToast(`Item #${rowNum}: Reason must be at least 5 words.`, "error"); return false; }
                    if (!row.details.notes || !row.details.notes.trim()) { localizedShowToast(`Item #${rowNum}: Remarks are required for 'Others'.`, "error"); return false; }
                    if (countWords(row.details.notes) > 50) { localizedShowToast(`Item #${rowNum}: Remarks can have up to 50 words.`, "error"); return false; }
                }
                if ((row.bills || []).length > 0) {
                    const invoiceNumbers = getIncidentalInvoiceNumbers(row);
                    const missingInvoice = invoiceNumbers.some(invoice => !invoice || !invoice.trim());
                    if (missingInvoice) {
                        localizedShowToast(`Item #${rowNum}: Invoice number is required for each uploaded bill.`, "error");
                        return false;
                    }
                }
            }
        }

        // Overlap Validation (Simplified: check if multiple travel segments have same start date)
        const travelRows = targetRows.filter(r => r.nature === 'Travel');
        const dates = travelRows.map(r => r.date);
        const hasOverlap = new Set(dates).size !== dates.length;
        if (hasOverlap) {
            // Further check could be done for time, but date level is a good start as per "No overlapping segments"
            const confirmOverlap = await confirm("Warning: Overlapping travel segments detected on the same date. Continue?");
            if (!confirmOverlap) return false;
        }

        // Meal overlap validation
        for (const row of targetRows) {
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
            // We need to keep track of updated rows to update state at the end
            let updatedRows = [...rows];
            const targetIdsToProcess = new Set(targetRows.map(r => r.id));
            
            // Loop through only the rows that need saving (or all if saveAll is true)
            // But we process them one by one to handle potential errors and ID updates
            for (let i = 0; i < updatedRows.length; i++) {
                const row = updatedRows[i];
                if (!targetIdsToProcess.has(row.id) || row.isSaved) continue;

                const categoryMap = {
                    'Travel': 'Others',
                    'Local Travel': 'Fuel',
                    'Food': 'Food',
                    'Accommodation': 'Accommodation',
                    'Incidental': 'Incidental'
                };

                const filteredDetails = { ...row.details };
                if (row.nature === 'Local Travel') {
                    const { mode, subType } = row.details;
                    if (mode === 'Walk') {
                        delete filteredDetails.toll;
                        delete filteredDetails.parking;
                        delete filteredDetails.fuel;
                        delete filteredDetails.odoStart;
                        delete filteredDetails.odoEnd;
                        delete filteredDetails.totalKm;
                    }
                    if (mode === 'Public Transport') {
                        delete filteredDetails.odoStart;
                        delete filteredDetails.odoEnd;
                        delete filteredDetails.fuel;
                        delete filteredDetails.toll;
                        delete filteredDetails.parking;
                    }
                    if (!['Own Car', 'Self Drive Rental', 'Own Bike'].includes(subType)) {
                        delete filteredDetails.odoStart;
                        delete filteredDetails.odoEnd;
                    }
                }

                if (row.nature === 'Travel' && row.details.mode === 'Intercity Car') {
                    const { vehicleType } = row.details;
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

                if (row.nature === 'Incidental') {
                    const incidentalInvoices = getIncidentalInvoiceNumbers(row);
                    filteredDetails.invoiceNumbers = incidentalInvoices;
                    filteredDetails.invoiceNo = incidentalInvoices[0] || '';
                }

                if (row.nature === 'Travel') {
                    const travelInvoices = getTravelInvoiceNumbers(row);
                    filteredDetails.travelInvoiceNumbers = travelInvoices;
                    filteredDetails.invoiceNo = travelInvoices[0] || '';
                }

                if (row.nature === 'Local Travel') {
                    const localInvoices = getLocalInvoiceNumbers(row);
                    filteredDetails.localInvoiceNumbers = localInvoices;
                    filteredDetails.invoiceNo = localInvoices[0] || '';
                }

                if (row.nature === 'Food') {
                    const foodInvoices = getFoodInvoiceNumbers(row);
                    filteredDetails.foodInvoiceNumbers = foodInvoices;
                    filteredDetails.invoiceNo = foodInvoices[0] || '';
                }

                if (row.nature === 'Accommodation') {
                    const accommodationInvoices = getAccommodationInvoiceNumbers(row);
                    filteredDetails.accommodationInvoiceNumbers = accommodationInvoices;
                    filteredDetails.invoiceNo = accommodationInvoices[0] || '';
                }

                const payload = {
                    trip: tripId,
                    date: row.date,
                    category: categoryMap[row.nature] || 'Others',
                    amount: parseFloat(row.amount || 0),
                    travel_mode: row.nature === 'Travel' ? row.details.mode : (row.nature === 'Local Travel' ? row.details.mode : null),
                    class_type: row.nature === 'Travel' ? row.details.classType : null,
                    booking_reference: row.nature === 'Travel' ? (row.details.pnr || row.details.bookingRef) : null,
                    refundable_flag: row.nature === 'Travel' ? row.details.refundable === 'Yes' : false,
                    meal_included_flag: row.nature === 'Travel' ? row.details.mealIncluded === true : false,
                    vehicle_type: (row.nature === 'Travel' || row.nature === 'Local Travel') ? (row.details.subType || row.details.vehicleType) : null,
                    odo_start: ((row.nature === 'Travel' || row.nature === 'Local Travel') && row.details.odoStart) ? parseFloat(row.details.odoStart) : null,
                    odo_end: ((row.nature === 'Travel' || row.nature === 'Local Travel') && row.details.odoEnd) ? parseFloat(row.details.odoEnd) : null,
                    distance: (row.nature === 'Travel' || row.nature === 'Local Travel') ? parseFloat(row.details.totalKm || 0) : null,
                    cancellation_status: row.nature === 'Travel' ? (row.details.travelStatus || 'Completed') : null,
                    cancellation_date: row.nature === 'Travel' ? row.details.cancellationDate : null,
                    refund_amount: row.nature === 'Travel' ? parseFloat(row.details.refundAmount || 0) : null,
                    cancellation_reason: row.nature === 'Travel' ? row.details.cancellationReason : null,
                    booked_by: row.nature === 'Travel' ? row.details.bookedBy : null,
                    reimbursement_eligible: row.nature === 'Travel' ? (row.details.bookedBy === 'Self Booked') : true,
                    description: JSON.stringify({
                        ...filteredDetails,
                        remarks: row.remarks ? row.remarks.trim() : '',
                        time: row.timeDetails,
                        natureOfVisit: row.details.natureOfVisit ? row.details.natureOfVisit.trim() : ''
                    }),
                    receipt_image: JSON.stringify(row.bills || []),
                };

                if (isFixedLocal && row.nature === 'Local Travel') {
                    payload.travel_mode = 'Bike';
                    payload.vehicle_type = 'Own Bike';
                    payload.booked_by = 'Self Booked';
                    payload.reimbursement_eligible = true;
                }

                let savedRowData = { ...row, isSaved: true };

                if (!isNaN(Number(row.id))) {
                    await api.patch(`/api/expenses/${row.id}/`, payload);
                } else {
                    const res = await api.post('/api/expenses/', payload);
                    if (res.data && res.data.id) {
                        savedRowData.id = res.data.id;
                    }
                }

                // If incidental expense added, create a separate record
                if (row.nature === 'Local Travel' && row.details.incidentalAmount && parseFloat(row.details.incidentalAmount) > 0) {
                    try {
                        await api.post('/api/expenses/', {
                            trip: tripId,
                            date: row.date,
                            category: 'Incidental',
                            amount: parseFloat(row.details.incidentalAmount),
                            description: JSON.stringify({
                                incidentalType: row.details.incidentalCategory || 'Misc',
                                notes: `Added during local travel: ${row.details.origin || 'Start'} to ${row.details.destination || 'End'}`
                            }),
                            receipt_image: row.details.incidentalBill ? JSON.stringify([row.details.incidentalBill]) : '[]',
                        });
                        savedRowData.details = {
                            ...savedRowData.details,
                            incidentalAmount: '',
                            incidentalBill: '',
                            incidentalCategory: ''
                        };
                    } catch (e) {
                        console.error("Failed to save incidental cost:", e);
                    }
                }

                updatedRows[i] = savedRowData;
            }

            setRows(updatedRows);
            showToast("Registry committed successfully!", "success");
            if (onUpdate) onUpdate();
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
                    const saved = await saveRegistry(true);
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

    const seedMockData = () => {
        setRows(MOCK_DATA);
    };

    const addRow = (nature = '') => {
        const targetNature = nature || activeCategory;
        const todayStr = new Date().toISOString().split('T')[0];
        let defaultDate = '';
        if (startDate && endDate) {
            if (todayStr >= startDate && todayStr <= endDate) {
                defaultDate = todayStr;
            }
        } else if (startDate && todayStr >= startDate) {
            defaultDate = todayStr;
        }

        const newRow = {
            id: Math.random().toString(36).substr(2, 9),
            date: defaultDate,
            endDate: defaultDate,
            nature: targetNature,
            remarks: '',
            details: {
                segmentId: `SEG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                auditTrail: [],
                bookedBy: 'Self Booked', // Default
                travelStatus: 'Completed',
                checkInTime: '',
                checkOutTime: '',
                selfies: [] // Added for Local Travel
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
        if (isFixedLocal && targetNature === 'Local Travel') {
            newRow.details.mode = 'Bike';
            newRow.details.subType = 'Own Bike';
            newRow.details.bookedBy = 'Self Booked';
        }
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

    const countWords = (text) => text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const isIncidentalOthersType = (value) => (value || '').trim().toLowerCase() === 'others' || (value || '').trim().toLowerCase() === 'other';
    const normalizeMealSource = (value) => (value || '').trim().toLowerCase();
    const getAccommodationInvoiceNumbers = (row) => {
        const storedInvoices = Array.isArray(row.details?.accommodationInvoiceNumbers)
            ? row.details.accommodationInvoiceNumbers
            : (row.details?.invoiceNo ? [row.details.invoiceNo] : []);
        const billCount = (row.bills || []).length;
        if (billCount === 0) return storedInvoices;
        return Array.from({ length: billCount }, (_, index) => storedInvoices[index] || '');
    };

    const syncAccommodationInvoiceNumbers = (row, billCount) => {
        const currentInvoices = getAccommodationInvoiceNumbers(row);
        return Array.from({ length: billCount }, (_, index) => currentInvoices[index] || '');
    };

    const updateAccommodationInvoiceNumber = (id, index, value) => {
        clearRowError(id, `accommodationInvoiceNumber_${index}`);
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                const accommodationInvoiceNumbers = getAccommodationInvoiceNumbers(row);
                accommodationInvoiceNumbers[index] = value;
                return {
                    ...row,
                    details: {
                        ...row.details,
                        accommodationInvoiceNumbers,
                        invoiceNo: accommodationInvoiceNumbers[0] || ''
                    },
                    isSaved: false
                };
            }
            return row;
        }));
    };

    const getTravelInvoiceNumbers = (row) => {
        const storedInvoices = Array.isArray(row.details?.travelInvoiceNumbers)
            ? row.details.travelInvoiceNumbers
            : (row.details?.invoiceNo ? [row.details.invoiceNo] : []);
        const billCount = (row.bills || []).length;
        if (billCount === 0) return storedInvoices;
        return Array.from({ length: billCount }, (_, index) => storedInvoices[index] || '');
    };

    const syncTravelInvoiceNumbers = (row, billCount) => {
        const currentInvoices = getTravelInvoiceNumbers(row);
        return Array.from({ length: billCount }, (_, index) => currentInvoices[index] || '');
    };

    const updateTravelInvoiceNumber = (id, index, value) => {
        clearRowError(id, `travelInvoiceNumber_${index}`);
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                const travelInvoiceNumbers = getTravelInvoiceNumbers(row);
                travelInvoiceNumbers[index] = value;
                return {
                    ...row,
                    details: {
                        ...row.details,
                        travelInvoiceNumbers,
                        invoiceNo: travelInvoiceNumbers[0] || ''
                    },
                    isSaved: false
                };
            }
            return row;
        }));
    };

    const getFoodInvoiceNumbers = (row) => {
        const storedInvoices = Array.isArray(row.details?.foodInvoiceNumbers)
            ? row.details.foodInvoiceNumbers
            : (row.details?.invoiceNo ? [row.details.invoiceNo] : []);
        const billCount = (row.bills || []).length;
        if (billCount === 0) return storedInvoices;
        return Array.from({ length: billCount }, (_, index) => storedInvoices[index] || '');
    };

    const syncFoodInvoiceNumbers = (row, billCount) => {
        const currentInvoices = getFoodInvoiceNumbers(row);
        return Array.from({ length: billCount }, (_, index) => currentInvoices[index] || '');
    };

    const updateFoodInvoiceNumber = (id, index, value) => {
        clearRowError(id, `foodInvoiceNumber_${index}`);
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                const foodInvoiceNumbers = getFoodInvoiceNumbers(row);
                foodInvoiceNumbers[index] = value;
                return {
                    ...row,
                    details: {
                        ...row.details,
                        foodInvoiceNumbers,
                        invoiceNo: foodInvoiceNumbers[0] || ''
                    },
                    isSaved: false
                };
            }
            return row;
        }));
    };

    const getLocalInvoiceNumbers = (row) => {
        const storedInvoices = Array.isArray(row.details?.localInvoiceNumbers)
            ? row.details.localInvoiceNumbers
            : (row.details?.invoiceNo ? [row.details.invoiceNo] : []);
        const billCount = (row.bills || []).length;
        if (billCount === 0) return storedInvoices;
        return Array.from({ length: billCount }, (_, index) => storedInvoices[index] || '');
    };

    const syncLocalInvoiceNumbers = (row, billCount) => {
        const currentInvoices = getLocalInvoiceNumbers(row);
        return Array.from({ length: billCount }, (_, index) => currentInvoices[index] || '');
    };

    const updateLocalInvoiceNumber = (id, index, value) => {
        clearRowError(id, `localInvoiceNumber_${index}`);
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                const localInvoiceNumbers = getLocalInvoiceNumbers(row);
                localInvoiceNumbers[index] = value;
                return {
                    ...row,
                    details: {
                        ...row.details,
                        localInvoiceNumbers,
                        invoiceNo: localInvoiceNumbers[0] || ''
                    },
                    isSaved: false
                };
            }
            return row;
        }));
    };

    const getIncidentalInvoiceNumbers = (row) => {
        const storedInvoices = Array.isArray(row.details?.invoiceNumbers)
            ? row.details.invoiceNumbers
            : (row.details?.invoiceNo ? [row.details.invoiceNo] : []);
        const billCount = (row.bills || []).length;
        if (billCount === 0) return storedInvoices;
        return Array.from({ length: billCount }, (_, index) => storedInvoices[index] || '');
    };

    const syncIncidentalInvoiceNumbers = (row, billCount) => {
        const currentInvoices = getIncidentalInvoiceNumbers(row);
        return Array.from({ length: billCount }, (_, index) => currentInvoices[index] || '');
    };

    const updateIncidentalInvoiceNumber = (id, index, value) => {
        clearRowError(id, `invoiceNumber_${index}`);
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                const invoiceNumbers = getIncidentalInvoiceNumbers(row);
                invoiceNumbers[index] = value;
                return {
                    ...row,
                    details: {
                        ...row.details,
                        invoiceNumbers,
                        invoiceNo: invoiceNumbers[0] || ''
                    },
                    isSaved: false
                };
            }
            return row;
        }));
    };

    const updateRow = (id, field, value) => {
        // clear error for this field
        clearRowError(id, field);
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                // Rule: If Company Booked Travel, Amount must be 0 and is non-editable
                if (field === 'amount' && row.nature === 'Travel' && row.details.bookedBy === 'Company Booked') {
                    return { ...row, amount: '0' };
                }

                let finalValue = value;
                // Alphanumeric/Numeric sanitization for specific fields
                if (field === 'amount') {
                    finalValue = value.replace(/[^0-9.]/g, '');
                    // Ensure only one decimal point
                    const parts = finalValue.split('.');
                    if (parts.length > 2) finalValue = parts[0] + '.' + parts.slice(1).join('');
                }

                const updatedRow = { ...row, [field]: finalValue, isSaved: false };
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
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                let updatedAmount = row.amount;
                let updatedDate = row.date;

                // Rule: If switching to Company Booked, force amount to 0
                if (detailField === 'bookedBy' && value === 'Company Booked' && row.nature === 'Travel') {
                    updatedAmount = '0';
                }

                const newDetails = { ...row.details, [detailField]: value };

                if (row.nature === 'Incidental' && detailField === 'incidentalType' && !isIncidentalOthersType(value)) {
                    newDetails.otherReason = '';
                }

                if (row.nature === 'Food' && detailField === 'mealCategory') {
                    if (value !== 'Self Meal') {
                        newDetails.mealSource = '';
                        newDetails.provider = '';
                        newDetails.hotelName = '';
                        newDetails.restaurant = '';
                        updatedAmount = '0';
                    } else if (!row.amount || parseFloat(row.amount || 0) === 0) {
                        updatedAmount = '';
                    }
                }

                if (row.nature === 'Food' && detailField === 'mealSource') {
                    const normalizedSource = normalizeMealSource(value);
                    if (normalizedSource !== 'online') {
                        newDetails.provider = '';
                    }
                    if (!['hotel', 'online'].includes(normalizedSource)) {
                        newDetails.hotelName = '';
                    }
                    if (normalizedSource !== 'restaurant') {
                        newDetails.restaurant = '';
                    }
                }

                if (detailField === 'odoStart' || detailField === 'odoEnd' || detailField === 'subType') {
                    const start = parseFloat(newDetails.odoStart || 0);
                    const end = parseFloat(newDetails.odoEnd || 0);
                    newDetails.totalKm = end >= start ? (end - start).toFixed(2) : 0;

                    // KM Reimbursement for Own vehicles based on state rates
                    if (row.nature === 'Local Travel' && ['Own Car', 'Own Bike'].includes(newDetails.subType)) {
                        const is4W = newDetails.subType === 'Own Car';
                        const vehicleKey = is4W ? '4 Wheeler' : '2 Wheeler';
                        const rate = fuelRates[vehicleKey];

                        // Only auto-calc if we have a valid distance and a rate
                        if (!isNaN(start) && !isNaN(end) && end > start && rate) {
                            const distKm = end - start;
                            updatedAmount = (distKm * rate).toFixed(2);
                            newDetails.isAutoCalculated = true;
                        }
                    }
                }

                if (detailField === 'checkIn' || detailField === 'checkOut') {
                    if (newDetails.checkIn && newDetails.checkOut) {
                        const start = new Date(newDetails.checkIn);
                        const end = new Date(newDetails.checkOut);
                        const diffTime = Math.abs(end - start);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        newDetails.nights = diffDays;
                    }
                }

                if (['scheduledCheckInDate', 'scheduledCheckOutDate', 'actualCheckInDate', 'actualCheckOutDate'].includes(detailField)) {
                    const checkInDate = newDetails.actualCheckInDate || newDetails.scheduledCheckInDate;
                    const checkOutDate = newDetails.actualCheckOutDate || newDetails.scheduledCheckOutDate;
                    newDetails.checkIn = checkInDate || '';
                    newDetails.checkOut = checkOutDate || '';
                    if (checkInDate) updatedDate = checkInDate;

                    if (checkInDate && checkOutDate) {
                        const start = new Date(checkInDate);
                        const end = new Date(checkOutDate);
                        const diffMs = end - start;
                        newDetails.nights = diffMs >= 0 ? Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : 0;
                    } else {
                        newDetails.nights = 0;
                    }
                }

                if (['scheduledCheckInTime', 'scheduledCheckOutTime', 'actualCheckInTime', 'actualCheckOutTime'].includes(detailField)) {
                    newDetails.checkInTime = newDetails.actualCheckInTime || newDetails.scheduledCheckInTime || '';
                    newDetails.checkOutTime = newDetails.actualCheckOutTime || newDetails.scheduledCheckOutTime || '';
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
                    if (value === 'Company Booked') {
                        newDetails.reimbursement_eligible = false;
                        updatedAmount = '0';
                    } else {
                        newDetails.reimbursement_eligible = true;
                    }
                }

                return { ...row, date: updatedDate, details: newDetails, amount: updatedAmount, isSaved: false };
            }
            return row;
        }));
    };

    const updateTimeDetails = (id, timeField, value) => {
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                const newTimeDetails = { ...row.timeDetails, [timeField]: value };

                // Auto-calc delay: scheduledTime vs actualTime
                if (timeField === 'scheduledTime' || timeField === 'actualTime') {
                    const scheduled = newTimeDetails.scheduledTime;
                    const actual = newTimeDetails.actualTime;
                    if (scheduled && actual) {
                        try {
                            const [sH, sM] = scheduled.split(':').map(Number);
                            const [aH, aM] = actual.split(':').map(Number);
                            const sDate = new Date(); sDate.setHours(sH, sM, 0);
                            const aDate = new Date(); aDate.setHours(aH, aM, 0);
                            if (aDate < sDate) aDate.setDate(aDate.getDate() + 1);
                            const diffMin = Math.round((aDate - sDate) / (1000 * 60));
                            if (diffMin >= 0) newTimeDetails.delay = diffMin;
                        } catch (e) { }
                    }
                }

                // Auto-calc journey duration: depDate+boardingTime → arrDate+actualTime
                const depDate = (timeField === 'depDate' ? value : row.details?.depDate) || row.date;
                const arrDate = (timeField === 'arrDate' ? value : row.details?.arrDate) || depDate;
                const boarding = timeField === 'boardingTime' ? value : newTimeDetails.boardingTime;
                const arrival  = timeField === 'actualTime'   ? value : newTimeDetails.actualTime;
                if (depDate && arrDate && boarding && arrival) {
                    try {
                        const dep = new Date(`${depDate}T${boarding}:00`);
                        const arr = new Date(`${arrDate}T${arrival}:00`);
                        if (!isNaN(dep) && !isNaN(arr) && arr >= dep) {
                            const totalMin = Math.round((arr - dep) / 60000);
                            const hh = Math.floor(totalMin / 60);
                            const mm = totalMin % 60;
                            newTimeDetails.journeyDuration = hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
                        } else {
                            newTimeDetails.journeyDuration = '';
                        }
                    } catch (e) { newTimeDetails.journeyDuration = ''; }
                }

                return { ...row, timeDetails: newTimeDetails, isSaved: false };
            }
            return row;
        }));
    };


    const handleOdoCapture = (id, field) => {
        activeRowRef.current = id;
        activeFieldRef.current = field;
        fileInputRef.current?.click();
    };

    const handleReviewStatusChange = (id, newStatus) => {
        setRows(prevRows => prevRows.map(row => {
            if (row.id === id) {
                // RULE: Company Booked cannot be Cancelled or Rescheduled by employee
                if (row.nature === 'Travel' && row.details.bookedBy === 'Company Booked') {
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
            captureLocation();
            const reader = new FileReader();
            reader.onloadend = () => {
                const id = activeRowRef.current;
                const field = activeFieldRef.current;

                if (field === 'selfie') {
                    setRows(prevRows => prevRows.map(row => {
                        if (row.id === id) {
                            const currentSelfies = row.details.selfies || [];
                            return {
                                ...row,
                                details: {
                                    ...row.details,
                                    selfies: [...currentSelfies, reader.result]
                                },
                                isSaved: false
                            };
                        }
                        return row;
                    }));
                    showToast("Selfie captured successfully", "success");
                } else {
                    updateDetails(id, `${field}Img`, reader.result);
                    showToast("Odometer photo captured", "success");
                }
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

    const handleFileUpload = (id, files) => {
        const validFiles = Array.from(files || []).filter(Boolean);
        if (validFiles.length === 0) return;

        Promise.all(validFiles.map(file => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        }))).then((uploadedBills) => {
            setRows(prevRows => prevRows.map(row => {
                if (row.id === id) {
                    const currentBills = row.bills || [];
                    const nextBills = [...currentBills, ...uploadedBills];
                    if (row.nature === 'Travel') {
                        const travelInvoiceNumbers = syncTravelInvoiceNumbers(row, nextBills.length);
                        return {
                            ...row,
                            bills: nextBills,
                            details: {
                                ...row.details,
                                travelInvoiceNumbers,
                                invoiceNo: travelInvoiceNumbers[0] || ''
                            },
                            isSaved: false
                        };
                    }
                    if (row.nature === 'Local Travel') {
                        const localInvoiceNumbers = syncLocalInvoiceNumbers(row, nextBills.length);
                        return {
                            ...row,
                            bills: nextBills,
                            details: {
                                ...row.details,
                                localInvoiceNumbers,
                                invoiceNo: localInvoiceNumbers[0] || ''
                            },
                            isSaved: false
                        };
                    }
                    if (row.nature === 'Food') {
                        const foodInvoiceNumbers = syncFoodInvoiceNumbers(row, nextBills.length);
                        return {
                            ...row,
                            bills: nextBills,
                            details: {
                                ...row.details,
                                foodInvoiceNumbers,
                                invoiceNo: foodInvoiceNumbers[0] || ''
                            },
                            isSaved: false
                        };
                    }
                    if (row.nature === 'Incidental') {
                        const invoiceNumbers = syncIncidentalInvoiceNumbers(row, nextBills.length);
                        return {
                            ...row,
                            bills: nextBills,
                            details: {
                                ...row.details,
                                invoiceNumbers,
                                invoiceNo: invoiceNumbers[0] || ''
                            },
                            isSaved: false
                        };
                    }
                    if (row.nature === 'Accommodation') {
                        const accommodationInvoiceNumbers = syncAccommodationInvoiceNumbers(row, nextBills.length);
                        return {
                            ...row,
                            bills: nextBills,
                            details: {
                                ...row.details,
                                accommodationInvoiceNumbers,
                                invoiceNo: accommodationInvoiceNumbers[0] || ''
                            },
                            isSaved: false
                        };
                    }
                    return { ...row, bills: nextBills, isSaved: false };
                }
                return row;
            }));
        });
    };

    const removeBill = (rowId, index) => {
        setRows(prevRows => prevRows.map(row => {
            if (row.id === rowId) {
                const newBills = [...(row.bills || [])];
                newBills.splice(index, 1);
                if (row.nature === 'Travel') {
                    const currentInvoices = getTravelInvoiceNumbers(row);
                    currentInvoices.splice(index, 1);
                    const travelInvoiceNumbers = Array.from({ length: newBills.length }, (_, invoiceIndex) => currentInvoices[invoiceIndex] || '');
                    return {
                        ...row,
                        bills: newBills,
                        details: {
                            ...row.details,
                            travelInvoiceNumbers,
                            invoiceNo: travelInvoiceNumbers[0] || ''
                        },
                        isSaved: false
                    };
                }
                if (row.nature === 'Local Travel') {
                    const currentInvoices = getLocalInvoiceNumbers(row);
                    currentInvoices.splice(index, 1);
                    const localInvoiceNumbers = Array.from({ length: newBills.length }, (_, invoiceIndex) => currentInvoices[invoiceIndex] || '');
                    return {
                        ...row,
                        bills: newBills,
                        details: {
                            ...row.details,
                            localInvoiceNumbers,
                            invoiceNo: localInvoiceNumbers[0] || ''
                        },
                        isSaved: false
                    };
                }
                if (row.nature === 'Food') {
                    const currentInvoices = getFoodInvoiceNumbers(row);
                    currentInvoices.splice(index, 1);
                    const foodInvoiceNumbers = Array.from({ length: newBills.length }, (_, invoiceIndex) => currentInvoices[invoiceIndex] || '');
                    return {
                        ...row,
                        bills: newBills,
                        details: {
                            ...row.details,
                            foodInvoiceNumbers,
                            invoiceNo: foodInvoiceNumbers[0] || ''
                        },
                        isSaved: false
                    };
                }
                if (row.nature === 'Incidental') {
                    const currentInvoices = getIncidentalInvoiceNumbers(row);
                    currentInvoices.splice(index, 1);
                    const invoiceNumbers = Array.from({ length: newBills.length }, (_, invoiceIndex) => currentInvoices[invoiceIndex] || '');
                    return {
                        ...row,
                        bills: newBills,
                        details: {
                            ...row.details,
                            invoiceNumbers,
                            invoiceNo: invoiceNumbers[0] || ''
                        },
                        isSaved: false
                    };
                }
                if (row.nature === 'Accommodation') {
                    const currentInvoices = getAccommodationInvoiceNumbers(row);
                    currentInvoices.splice(index, 1);
                    const accommodationInvoiceNumbers = Array.from({ length: newBills.length }, (_, invoiceIndex) => currentInvoices[invoiceIndex] || '');
                    return {
                        ...row,
                        bills: newBills,
                        details: {
                            ...row.details,
                            accommodationInvoiceNumbers,
                            invoiceNo: accommodationInvoiceNumbers[0] || ''
                        },
                        isSaved: false
                    };
                }
                return { ...row, bills: newBills, isSaved: false };
            }
            return row;
        }));
    };

    const previewBill = (bill) => {
        if (!bill) return;
        let src = String(bill);
        if (!src.startsWith('data:') && !src.startsWith('http') && !src.startsWith('/')) {
             if (src.startsWith('/9j/') || src.startsWith('JVBER')) {
                 src = src.startsWith('JVBER') ? `data:application/pdf;base64,${src}` : `data:image/jpeg;base64,${src}`;
             } else {
                 src = `data:image/jpeg;base64,${src}`;
             }
        }
        setPreviewImage(src);
    };

    const renderIncidentalCard = (row) => {
        const invoiceNumbers = getIncidentalInvoiceNumbers(row);

        return (
            <tr key={row.id} className="category-row-block incidental-card-row">
                <td colSpan={20} className="incidental-td-stretch">
                    <div className="incidental-entry-shell incidental-entry-shell-full">
                        <div className="incidental-entry-header">
                            <div className="incidental-entry-title">
                                <Receipt size={18} />
                                <div>
                                    <strong>Incidental Expense Detail</strong>
                                    <span>Manual entry for miscellaneous trip costs</span>
                                </div>
                            </div>
                            {!isLocked && (
                                <button type="button" className="row-del-btn" onClick={() => deleteRow(row.id)} title="Delete row">
                                    <Trash2 size={15} />
                                    <span>Delete Entry</span>
                                </button>
                            )}
                        </div>


                        <div className="trip-incidental-card-grid incidental-card-grid">
                            <div className="incidental-form-card">
                                <div className="incidental-card-head">
                                    <Calendar size={14} />
                                    <span>Date &amp; Time</span>
                                </div>
                                <div className="incidental-card-body incidental-date-time-stack">
                                    <div className="input-with-label-mini">
                                        <label>Date *</label>
                                        <input type="date" min={minDate} max={maxDate} className="cat-input" value={row.date || ''} onChange={e => updateRow(row.id, 'date', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Time *</label>
                                        <input type="time" className="cat-input" value={row.details.incidentalTime || ''} onChange={e => updateDetails(row.id, 'incidentalTime', e.target.value)} disabled={isLocked} />
                                    </div>
                                </div>
                            </div>

                            <div className="incidental-form-card">
                                <div className="incidental-card-head">
                                    <MapPin size={14} />
                                    <span>Expense Type &amp; Location</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Expense Type *</label>
                                        <select className="cat-input" value={row.details.incidentalType || ''} onChange={e => updateDetails(row.id, 'incidentalType', e.target.value)} disabled={isLocked}>
                                            <option value="">Select Type</option>
                                            {incidentalTypes.filter(t => t !== 'Porter Charges' || hasAdditionalLuggage).map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Location *</label>
                                        <input type="text" className="cat-input" placeholder="Enter expense location" value={row.details.location || ''} onChange={e => updateDetails(row.id, 'location', e.target.value)} disabled={isLocked} />
                                    </div>
                                </div>
                            </div>

                            <div className="incidental-form-card">
                                <div className="incidental-card-head">
                                    <FileText size={14} />
                                    <span>Remarks / Details</span>
                                </div>
                                <div className="incidental-card-body">
                                    {isIncidentalOthersType(row.details.incidentalType) && (
                                        <div className="incidental-others-stack">
                                            <div className="input-with-label-mini">
                                                <label>Reason *</label>
                                                <textarea className="cat-input incidental-textarea" placeholder="Enter the reason" value={row.details.otherReason || ''} onChange={e => updateDetails(row.id, 'otherReason', e.target.value)} disabled={isLocked} />
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Remarks *</label>
                                                <textarea className="cat-input incidental-textarea" placeholder="Enter remarks" value={row.details.notes || ''} onChange={e => updateDetails(row.id, 'notes', e.target.value)} disabled={isLocked} />
                                            </div>
                                        </div>
                                    )}
                                    {!isIncidentalOthersType(row.details.incidentalType) && (
                                        <div className="input-with-label-mini">
                                            <label>Remarks</label>
                                            <input type="text" className="cat-input" placeholder="Add a short note" value={row.details.notes || ''} onChange={e => updateDetails(row.id, 'notes', e.target.value)} disabled={isLocked} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="incidental-form-card incidental-amount-card">
                                <div className="incidental-card-head">
                                    <IndianRupee size={14} />
                                    <span>Expense</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Amount *</label>
                                        <div className="amount-with-currency">
                                            <span className="currency-symbol">₹</span>
                                            <input
                                                type="text"
                                                className={`cat-input ${errors[row.id]?.amount ? 'error' : ''}`}
                                                placeholder="0.00"
                                                value={row.amount || ''}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                    if (!/^\d*\.?\d{0,2}$/.test(val)) return;
                                                    updateRow(row.id, 'amount', val);
                                                }}
                                                disabled={isLocked}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="incidental-form-card incidental-upload-card">
                                <div className="incidental-card-head">
                                    <Upload size={14} />
                                    <span>Upload</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="incidental-upload-top">
                                        {!isLocked && (
                                            <label className="incidental-upload-btn" htmlFor={`incidental-f-${row.id}`}>
                                                <Upload size={14} />
                                                <span>Upload Bills</span>
                                            </label>
                                        )}
                                        <input
                                            type="file"
                                            id={`incidental-f-${row.id}`}
                                            hidden
                                            multiple
                                            accept="image/*,.pdf"
                                            onChange={e => {
                                                handleFileUpload(row.id, e.target.files);
                                                e.target.value = '';
                                            }}
                                        />
                                        <span className="incidental-upload-count">
                                            {(row.bills || []).length > 0 ? `${(row.bills || []).length} file(s) attached` : 'No files attached'}
                                        </span>
                                    </div>

                                    {(row.bills || []).length > 0 && (
                                        <div className="incidental-upload-list">
                                            {row.bills.map((bill, idx) => (
                                                <div key={idx} className="incidental-upload-item">
                                                    <button type="button" className="incidental-upload-preview" onClick={() => previewBill(bill)}>
                                                        <FileText size={14} />
                                                        <span>Bill {idx + 1}</span>
                                                    </button>
                                                    {!isLocked && (
                                                        <button type="button" className="incidental-upload-remove" onClick={() => removeBill(row.id, idx)}>
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {(row.bills || []).length > 0 && (
                                        <div className="incidental-invoice-stack">
                                            {invoiceNumbers.map((invoice, idx) => (
                                                <div key={idx} className="input-with-label-mini">
                                                    <label>Invoice Number {idx + 1} *</label>
                                                    <input type="text" className="cat-input" placeholder={`Invoice for bill ${idx + 1}`} value={invoice || ''} onChange={e => updateIncidentalInvoiceNumber(row.id, idx, e.target.value)} disabled={isLocked} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    const renderTravelCard = (row) => {
        const travelInvoiceNumbers = getTravelInvoiceNumbers(row);
        const mode = row.details.mode || '';
        const providerOptions = mode === 'Flight'
            ? airlines
            : mode === 'Train'
                ? trainProviders
                : mode === 'Intercity Bus'
                    ? busProviders
                    : mode === 'Intercity Cab'
                        ? cabProviders
                        : travelProviders;
        const classOptions = mode === 'Flight'
            ? flightClasses
            : mode === 'Train'
                ? trainClasses
                : mode === 'Intercity Bus'
                    ? busSeatTypes
                    : [];
        const journeyNumberLabel = mode === 'Flight' ? 'Flight Number' : mode === 'Train' ? 'Train Number' : 'Journey Number';
        const carrierLabel = mode === 'Train' ? 'Train Name' : mode === 'Intercity Bus' ? 'Bus Operator' : 'Carrier Name';

        return (
            <tr key={row.id} className="category-row-block incidental-card-row">
                <td colSpan={20} className="incidental-td-stretch">
                    <div className="incidental-entry-shell travel-entry-shell incidental-entry-shell-full">
                        <div className="incidental-entry-header">
                            <div className="incidental-entry-title">
                                <Plane size={18} />
                                <div>
                                    <strong>Long Distance Travel Entry</strong>
                                    <span>Card-based travel entry for cleaner journey capture</span>
                                </div>
                            </div>
                            {!isLocked && (
                                <button type="button" className="row-del-btn" onClick={() => deleteRow(row.id)} title="Delete row">
                                    <Trash2 size={15} />
                                    <span>Delete Entry</span>
                                </button>
                            )}
                        </div>

                        <div className="trip-travel-card-grid travel-card-grid">
                            {/* 1. Mode & Booking */}
                            <div className="incidental-form-card" style={{ gridRow: '1', gridColumn: '1' }}>
                                <div className="incidental-card-head">
                                    <Receipt size={14} />
                                    <span>Mode &amp; Booking</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Mode *</label>
                                        <select className="cat-input" value={row.details.mode || ''} onChange={e => {
                                            updateDetails(row.id, 'mode', e.target.value);
                                            updateDetails(row.id, 'provider', '');
                                            updateDetails(row.id, 'classType', '');
                                        }} disabled={isLocked}>
                                            <option value="">Select Mode</option>
                                            {travelModes.map(option => <option key={option} value={option}>{option}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Booked By *</label>
                                        <select className="cat-input" value={row.details.bookedBy || 'Self Booked'} onChange={e => {
                                            updateDetails(row.id, 'bookedBy', e.target.value);
                                            if (e.target.value === 'Company Booked') {
                                                updateRow(row.id, 'amount', '0.00');
                                            }
                                        }} disabled={isLocked}>
                                            {bookedByOptions.map(option => <option key={option} value={option}>{option}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            {/* 2. Booking Details */}
                            <div className="incidental-form-card" style={{ gridRow: '1', gridColumn: '2' }}>
                                <div className="incidental-card-head">
                                    <Calendar size={14} />
                                    <span>Booking Details</span>
                                </div>
                                <div className="incidental-card-body incidental-date-time-stack">
                                    <div className="input-with-label-mini">
                                        <label>Booking Date *</label>
                                        <input type="date" min={minDate} max={maxDate} className="cat-input" value={row.date || ''} onChange={e => updateRow(row.id, 'date', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Booking Time</label>
                                        <input type="time" className="cat-input" value={row.details.bookingTime || ''} onChange={e => updateDetails(row.id, 'bookingTime', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Booking ID {row.details.bookedBy === 'Agent' ? '*' : ''}</label>
                                        <input type="text" className="cat-input" placeholder="Enter Booking ID" value={row.details.bookingId || ''} onChange={e => updateDetails(row.id, 'bookingId', e.target.value)} disabled={isLocked} />
                                    </div>
                                </div>
                            </div>
                            {/* 3. Route Details */}
                            <div className="incidental-form-card" style={{ gridRow: '1', gridColumn: '3' }}>
                                <div className="incidental-card-head">
                                    <MapPin size={14} />
                                    <span>Route Details</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>From *</label>
                                        <input type="text" className="cat-input" placeholder="Enter origin" value={row.details.origin || ''} onChange={e => updateDetails(row.id, 'origin', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>To *</label>
                                        <input type="text" className="cat-input" placeholder="Enter destination" value={row.details.destination || ''} onChange={e => updateDetails(row.id, 'destination', e.target.value)} disabled={isLocked} />
                                    </div>
                                    {['Train', 'Intercity Bus', 'Intercity Cab'].includes(mode) && (
                                        <div className="input-with-label-mini">
                                            <label>Boarding Point</label>
                                            <input type="text" className="cat-input" placeholder="Enter boarding point" value={row.details.boardingPoint || ''} onChange={e => updateDetails(row.id, 'boardingPoint', e.target.value)} disabled={isLocked} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* 4. Travel Details (Dynamic) */}
                            <div className="incidental-form-card" style={{ gridRow: '1', gridColumn: '4' }}>
                                <div className="incidental-card-head">
                                    <Plane size={14} />
                                    <span>Travel Details</span>
                                </div>
                                <div className="incidental-card-body">
                                    {mode === 'Train' && (
                                        <>
                                            <div className="input-with-label-mini">
                                                <label>Train Name</label>
                                                <input type="text" className="cat-input" placeholder="Enter Train Name" value={row.details.carrier || ''} onChange={e => updateDetails(row.id, 'carrier', e.target.value)} disabled={isLocked} />
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Ticket Status</label>
                                                <select className="cat-input" value={row.details.ticketStatus || ''} onChange={e => updateDetails(row.id, 'ticketStatus', e.target.value)} disabled={isLocked}>
                                                    <option value="">Select Status</option>
                                                    <option value="Confirmed">Confirmed</option>
                                                    <option value="RAC">RAC</option>
                                                    <option value="WL">WL</option>
                                                </select>
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Class *</label>
                                                <select className="cat-input" value={row.details.classType || ''} onChange={e => updateDetails(row.id, 'classType', e.target.value)} disabled={isLocked}>
                                                    <option value="">Select Class</option>
                                                    {trainClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Coach & Seat</label>
                                                <input type="text" className="cat-input" placeholder="e.g. B1, 24" value={row.details.seatNumber || ''} onChange={e => updateDetails(row.id, 'seatNumber', e.target.value)} disabled={isLocked} />
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Quota Type</label>
                                                <select className="cat-input" value={row.details.isTatkal === true ? 'Tatkal' : 'General'} onChange={e => updateDetails(row.id, 'isTatkal', e.target.value === 'Tatkal')} disabled={isLocked}>
                                                    <option value="General">General</option>
                                                    <option value="Tatkal">Tatkal</option>
                                                </select>
                                            </div>
                                        </>
                                    )}
                                    {mode === 'Flight' && (
                                        <>
                                            <div className="input-with-label-mini">
                                                <label>Airline Name</label>
                                                <input type="text" className="cat-input" placeholder="Enter Airline" value={row.details.carrier || ''} onChange={e => updateDetails(row.id, 'carrier', e.target.value)} disabled={isLocked} />
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Flight Number *</label>
                                                <input type="text" className="cat-input" placeholder="Enter Flight No." value={row.details.travelNo || ''} onChange={e => updateDetails(row.id, 'travelNo', e.target.value)} disabled={isLocked} />
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Class *</label>
                                                <select className="cat-input" value={row.details.classType || ''} onChange={e => updateDetails(row.id, 'classType', e.target.value)} disabled={isLocked}>
                                                    <option value="">Select Class</option>
                                                    {flightClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Seat Number</label>
                                                <input type="text" className="cat-input" placeholder="e.g. 12A" value={row.details.seatNumber || ''} onChange={e => updateDetails(row.id, 'seatNumber', e.target.value)} disabled={isLocked} />
                                            </div>
                                        </>
                                    )}
                                    {mode === 'Intercity Bus' && (
                                        <>
                                            <div className="input-with-label-mini">
                                                <label>Operator Name</label>
                                                <input type="text" className="cat-input" placeholder="Enter Operator" value={row.details.carrier || ''} onChange={e => updateDetails(row.id, 'carrier', e.target.value)} disabled={isLocked} />
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Bus Type *</label>
                                                <select className="cat-input" value={row.details.classType || ''} onChange={e => updateDetails(row.id, 'classType', e.target.value)} disabled={isLocked}>
                                                    <option value="">Select Type</option>
                                                    {busSeatTypes.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Seat Number</label>
                                                <input type="text" className="cat-input" placeholder="e.g. 15" value={row.details.seatNumber || ''} onChange={e => updateDetails(row.id, 'seatNumber', e.target.value)} disabled={isLocked} />
                                            </div>
                                        </>
                                    )}
                                    {mode === 'Intercity Cab' && (
                                        <>
                                            <div className="input-with-label-mini">
                                                <label>Cab Type</label>
                                                <select className="cat-input" value={row.details.vehicleType || ''} onChange={e => updateDetails(row.id, 'vehicleType', e.target.value)} disabled={isLocked}>
                                                    <option value="">Select Type</option>
                                                    {intercityCabVehicleTypes.map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Driver Name</label>
                                                <input type="text" className="cat-input" placeholder="Enter Driver Name" value={row.details.driverName || ''} onChange={e => updateDetails(row.id, 'driverName', e.target.value)} disabled={isLocked} />
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Vehicle Number</label>
                                                <input type="text" className="cat-input" placeholder="Enter Vehicle No." value={row.details.travelNo || ''} onChange={e => updateDetails(row.id, 'travelNo', e.target.value)} disabled={isLocked} />
                                            </div>
                                        </>
                                    )}
                                    {!['Train', 'Flight', 'Intercity Bus', 'Intercity Cab'].includes(mode) && (
                                        <div className="text-muted" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>Please select Travel Mode to see details</div>
                                    )}
                                </div>
                            </div>
                            {/* 5. Schedule Details */}
                            <div className="incidental-form-card travel-schedule-card" style={{ gridRow: '2', gridColumn: '1' }}>
                                <div className="incidental-card-head">
                                    <Clock size={14} />
                                    <span>Schedule Details</span>
                                </div>
                                <div className="incidental-card-body travel-schedule-grid">
                                    <div className="input-with-label-mini">
                                        <label>Departure Date *</label>
                                        <input type="date" min={minDate} max={maxDate} className="cat-input" value={row.details.depDate || row.date || ''} onChange={e => updateDetails(row.id, 'depDate', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Arrival Date *</label>
                                        <input type="date" min={minDate} max={maxDate} className="cat-input" value={row.details.arrDate || row.date || ''} onChange={e => updateDetails(row.id, 'arrDate', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Departure Time *</label>
                                        <input type="time" className="cat-input" value={row.timeDetails?.boardingTime || ''} onChange={e => updateTimeDetails(row.id, 'boardingTime', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Scheduled Arrival</label>
                                        <input type="time" className="cat-input" value={row.timeDetails?.scheduledTime || ''} onChange={e => updateTimeDetails(row.id, 'scheduledTime', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Actual Arrival *</label>
                                        <input type="time" className="cat-input" value={row.timeDetails?.actualTime || ''} onChange={e => updateTimeDetails(row.id, 'actualTime', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Delay (Mins)</label>
                                        <input type="number" readOnly className="cat-input" value={row.timeDetails?.delay || 0} disabled />
                                    </div>
                                    <div className="input-with-label-mini" style={{ gridColumn: 'span 2' }}>
                                        <label>Journey Duration</label>
                                        <input
                                            type="text"
                                            readOnly
                                            className="cat-input"
                                            value={row.timeDetails?.journeyDuration ||
                                                (() => {
                                                    const dep = row.details?.depDate || row.date;
                                                    const arr = row.details?.arrDate || dep;
                                                    const b   = row.timeDetails?.boardingTime;
                                                    const a   = row.timeDetails?.actualTime;
                                                    if (dep && arr && b && a) {
                                                        try {
                                                            const d1 = new Date(`${dep}T${b}:00`);
                                                            const d2 = new Date(`${arr}T${a}:00`);
                                                            if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
                                                                const tot = Math.round((d2 - d1) / 60000);
                                                                const hh = Math.floor(tot / 60);
                                                                const mm = tot % 60;
                                                                return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
                                                            }
                                                        } catch (_) {}
                                                    }
                                                    return 'Fill Departure & Arrival';
                                                })()
                                            }
                                            disabled
                                            style={{ color: row.timeDetails?.journeyDuration ? '#1e293b' : '#94a3b8', fontWeight: row.timeDetails?.journeyDuration ? 700 : 400 }}
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* 6. Ticket Details */}
                            <div className="incidental-form-card" style={{ gridRow: '2', gridColumn: '2' }}>
                                <div className="incidental-card-head">
                                    <Receipt size={14} />
                                    <span>Ticket Details</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Provider / Agent</label>
                                        <select className="cat-input" value={row.details.provider || ''} onChange={e => updateDetails(row.id, 'provider', e.target.value)} disabled={isLocked || providerOptions.length === 0}>
                                            <option value="">{providerOptions.length === 0 ? 'No Providers' : 'Select Provider'}</option>
                                            {providerOptions.map(option => <option key={option} value={option}>{option}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Ticket Number</label>
                                        <input type="text" className="cat-input" placeholder="Enter ticket number" value={row.details.ticketNo || ''} onChange={e => updateDetails(row.id, 'ticketNo', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>PNR / Reference</label>
                                        <input type="text" className="cat-input" placeholder="Enter PNR" value={row.details.pnr || ''} onChange={e => updateDetails(row.id, 'pnr', e.target.value)} disabled={isLocked} />
                                    </div>
                                </div>
                            </div>
                            {/* 7. Expense */}
                            <div className="incidental-form-card incidental-amount-card" style={{ gridRow: '2', gridColumn: '3' }}>
                                <div className="incidental-card-head">
                                    <IndianRupee size={14} />
                                    <span>Expense</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Amount *</label>
                                        <div className="amount-with-currency">
                                            <span className="currency-symbol">₹</span>
                                            <input
                                                type="text"
                                                className="cat-input"
                                                placeholder="0.00"
                                                value={row.amount || ''}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                    if (!/^\d*\.?\d{0,2}$/.test(val)) return;
                                                    updateRow(row.id, 'amount', val);
                                                }}
                                                disabled={isLocked || row.details.bookedBy === 'Company Booked'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="incidental-form-card incidental-upload-card">
                                <div className="incidental-card-head">
                                    <Upload size={14} />
                                    <span>Upload</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="incidental-upload-top">
                                        {!isLocked && (
                                            <label className="incidental-upload-btn" htmlFor={`travel-f-${row.id}`}>
                                                <Upload size={14} />
                                                <span>Upload Bills</span>
                                            </label>
                                        )}
                                        <input
                                            type="file"
                                            id={`travel-f-${row.id}`}
                                            hidden
                                            multiple
                                            accept="image/*,.pdf"
                                            onChange={e => {
                                                handleFileUpload(row.id, e.target.files);
                                                e.target.value = '';
                                            }}
                                        />
                                        <span className="incidental-upload-count">
                                            {(row.bills || []).length > 0 ? `${(row.bills || []).length} file(s) attached` : 'No files attached'}
                                        </span>
                                    </div>

                                    {(row.bills || []).length > 0 && (
                                        <div className="incidental-upload-list">
                                            {row.bills.map((bill, idx) => (
                                                <div key={idx} className="incidental-upload-item">
                                                    <button type="button" className="incidental-upload-preview" onClick={() => previewBill(bill)}>
                                                        <FileText size={14} />
                                                        <span>File {idx + 1}</span>
                                                    </button>
                                                    {!isLocked && (
                                                        <button type="button" className="incidental-upload-remove" onClick={() => removeBill(row.id, idx)}>
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {(row.bills || []).length > 0 && (
                                        <div className="incidental-invoice-stack">
                                            {travelInvoiceNumbers.map((invoice, idx) => (
                                                <div key={idx} className="input-with-label-mini">
                                                    <label>Invoice Number {idx + 1} *</label>
                                                    <input type="text" className="cat-input" placeholder={`Invoice for file ${idx + 1}`} value={invoice || ''} onChange={e => updateTravelInvoiceNumber(row.id, idx, e.target.value)} disabled={isLocked} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    const renderLocalTravelCard = (row) => {
        const localInvoiceNumbers = getLocalInvoiceNumbers(row);
        const showOdoFields = ['Own Car', 'Company Car', 'Own Bike', 'Self Drive Rental'].includes(row.details.subType);

        return (
            <tr key={row.id} className="category-row-block incidental-card-row">
                <td colSpan={20} className="incidental-td-stretch">
                    <div className="incidental-entry-shell local-entry-shell incidental-entry-shell-full">
                        <div className="incidental-entry-header">
                            <div className="incidental-entry-title">
                                <Car size={18} />
                                <div>
                                    <strong>Local Conveyance Entry</strong>
                                    <span>Card-based local travel entry with grouped tracking and billing</span>
                                </div>
                            </div>
                            {!isLocked && (
                                <button type="button" className="row-del-btn" onClick={() => deleteRow(row.id)} title="Delete row">
                                    <Trash2 size={15} />
                                    <span>Delete Entry</span>
                                </button>
                            )}
                        </div>

                        <div className="incidental-card-grid local-card-grid trip-local-card-grid">
                            {/* 1. Mode & Booking */}
                            <div className="incidental-form-card">
                                <div className="incidental-card-head">
                                    <Receipt size={14} />
                                    <span>Mode &amp; Booking</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Mode *</label>
                                        <select className="cat-input" value={row.details.mode || ''} onChange={e => {
                                            if (!isFixedLocal) {
                                                updateDetails(row.id, 'mode', e.target.value);
                                                updateDetails(row.id, 'subType', '');
                                            }
                                        }} disabled={isLocked || isFixedLocal}>
                                            <option value="">Select Mode</option>
                                            {localTravelModes.map(option => <option key={option} value={option}>{option}</option>)}
                                        </select>
                                    </div>
                                    {row.details.mode === 'Car' && (
                                        <div className="input-with-label-mini">
                                            <label>Type *</label>
                                            <select className="cat-input" value={row.details.subType || ''} onChange={e => updateDetails(row.id, 'subType', e.target.value)} disabled={isLocked || isFixedLocal}>
                                                <option value="">Select Type</option>
                                                {localCarSubTypes.map(option => <option key={option} value={option}>{option}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {row.details.mode === 'Bike' && (
                                        <div className="input-with-label-mini">
                                            <label>Type *</label>
                                            <select className="cat-input" value={row.details.subType || ''} onChange={e => updateDetails(row.id, 'subType', e.target.value)} disabled={isLocked || isFixedLocal}>
                                                <option value="">Select Type</option>
                                                {localBikeSubTypes.map(option => <option key={option} value={option}>{option}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {row.details.mode === 'Public Transport' && (
                                        <div className="input-with-label-mini">
                                            <label>Type *</label>
                                            <select className="cat-input" value={row.details.subType || ''} onChange={e => updateDetails(row.id, 'subType', e.target.value)} disabled={isLocked || isFixedLocal}>
                                                <option value="">Select Type</option>
                                                {localProviders.map(option => <option key={option} value={option}>{option}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {!['Own Bike', 'Company Bike', 'Own Car', 'Company Car'].includes(row.details.subType) && !['Metro Train', 'Bus'].includes(row.details.mode) && (
                                        <div className="input-with-label-mini">
                                            <label>Booking Type</label>
                                            <select className="cat-input" value={row.details.bookedBy || 'Self Booked'} onChange={e => { if (!isFixedLocal) updateDetails(row.id, 'bookedBy', e.target.value); }} disabled={isLocked || isFixedLocal}>
                                                {bookedByOptions.map(option => <option key={option} value={option}>{option}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Location */}
                            <div className="incidental-form-card">
                                <div className="incidental-card-head">
                                    <MapPin size={14} />
                                    <span>Location</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>From Location</label>
                                        <input type="text" className="cat-input" placeholder="Enter start location" value={row.details.origin || ''} onChange={e => updateDetails(row.id, 'origin', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>To Location</label>
                                        <input type="text" className="cat-input" placeholder="Enter destination" value={row.details.destination || ''} onChange={e => updateDetails(row.id, 'destination', e.target.value)} disabled={isLocked} />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Expense */}
                            <div className="incidental-form-card incidental-amount-card">
                                <div className="incidental-card-head">
                                    <IndianRupee size={14} />
                                    <span>Expense</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Amount</label>
                                        <div className="amount-with-currency">
                                            <span className="currency-symbol">₹</span>
                                            <input
                                                type="text"
                                                className="cat-input"
                                                placeholder="0.00"
                                                value={row.amount || ''}
                                                onChange={e => updateRow(row.id, 'amount', e.target.value)}
                                                disabled={isLocked || row.details.bookedBy === 'Company Booked'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Date & Time */}
                            <div className="incidental-form-card">
                                <div className="incidental-card-head">
                                    <Calendar size={14} />
                                    <span>Date &amp; Time</span>
                                </div>
                                <div className="incidental-card-body local-date-time-grid">
                                    <div className="input-with-label-mini">
                                        <label>Start Date *</label>
                                        <input type="date" min={minDate} max={maxDate} className="cat-input" value={row.date || ''} onChange={e => updateRow(row.id, 'date', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>End Date *</label>
                                        <input type="date" min={minDate} max={maxDate} className="cat-input" value={row.endDate || row.date || ''} onChange={e => updateRow(row.id, 'endDate', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Start Time</label>
                                        <input type="time" className="cat-input" value={row.timeDetails?.boardingTime || ''} onChange={e => updateTimeDetails(row.id, 'boardingTime', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>End Time</label>
                                        <input type="time" className="cat-input" value={row.timeDetails?.actualTime || ''} onChange={e => updateTimeDetails(row.id, 'actualTime', e.target.value)} disabled={isLocked} />
                                    </div>
                                </div>
                            </div>

                            {/* 5. Tracking (ODO) */}
                            <div className="incidental-form-card local-tracking-card">
                                <div className="incidental-card-head">
                                    <Camera size={14} />
                                    <span>Tracking (ODO)</span>
                                </div>
                                <div className="incidental-card-body">
                                    {showOdoFields && (
                                        <div className="local-odo-grid">
                                            <div className="input-with-label-mini">
                                                <label>Odometer Start *</label>
                                                <input type="number" className="cat-input" placeholder="0" value={row.details.odoStart || ''} onChange={e => updateDetails(row.id, 'odoStart', e.target.value)} disabled={isLocked} />
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Odometer End *</label>
                                                <input type="number" className="cat-input" placeholder="0" value={row.details.odoEnd || ''} onChange={e => updateDetails(row.id, 'odoEnd', e.target.value)} disabled={isLocked} />
                                            </div>
                                            {!isLocked && (
                                                <>
                                                    <button type="button" className="incidental-upload-btn" onClick={() => handleOdoCapture(row.id, 'odoStart')}>
                                                        <Camera size={14} />
                                                        <span>{row.details.odoStartImg ? 'Start ODO Captured' : 'Capture Start ODO'}</span>
                                                    </button>
                                                    <button type="button" className="incidental-upload-btn" onClick={() => handleOdoCapture(row.id, 'odoEnd')}>
                                                        <Camera size={14} />
                                                        <span>{row.details.odoEndImg ? 'End ODO Captured' : 'Capture End ODO'}</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <div className="input-with-label-mini">
                                        <label>Selfie Proof Upload</label>
                                        <div className="local-selfie-list">
                                            {(row.details.selfies || []).map((selfie, idx) => (
                                                <div key={idx} className="local-selfie-item">
                                                    <button type="button" className="incidental-upload-preview" onClick={() => previewBill(selfie)}>
                                                        <FileText size={14} />
                                                        <span>Selfie {idx + 1}</span>
                                                    </button>
                                                    {!isLocked && (
                                                        <button type="button" className="incidental-upload-remove" onClick={() => removeSelfie(row.id, idx)}>
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {!isLocked && (
                                            <button type="button" className="incidental-upload-btn" onClick={() => handleSelfieCapture(row.id)}>
                                                <Camera size={14} />
                                                <span>Add Selfie Proof</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 8. Upload */}
                            <div className="incidental-form-card incidental-upload-card" style={{ gridRow: '2', gridColumn: '4' }}>
                                <div className="incidental-card-head">
                                    <Upload size={14} />
                                    <span>Upload</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="incidental-upload-top">
                                        {!isLocked && (
                                            <label className="incidental-upload-btn" htmlFor={`local-f-${row.id}`}>
                                                <Upload size={14} />
                                                <span>Upload Bills</span>
                                            </label>
                                        )}
                                        <input
                                            type="file"
                                            id={`local-f-${row.id}`}
                                            hidden
                                            multiple
                                            accept="image/*,.pdf"
                                            onChange={e => {
                                                handleFileUpload(row.id, e.target.files);
                                                e.target.value = '';
                                            }}
                                        />
                                        <span className="incidental-upload-count">
                                            {(row.bills || []).length > 0 ? `${(row.bills || []).length} file(s) attached` : 'No files attached'}
                                        </span>
                                    </div>

                                    {(row.bills || []).length > 0 && (
                                        <div className="incidental-upload-list">
                                            {row.bills.map((bill, idx) => (
                                                <div key={idx} className="incidental-upload-item">
                                                    <button type="button" className="incidental-upload-preview" onClick={() => previewBill(bill)}>
                                                        <FileText size={14} />
                                                        <span>Bill {idx + 1}</span>
                                                    </button>
                                                    {!isLocked && (
                                                        <button type="button" className="incidental-upload-remove" onClick={() => removeBill(row.id, idx)}>
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {(row.bills || []).length > 0 && (
                                        <div className="incidental-invoice-stack">
                                            {localInvoiceNumbers.map((invoice, idx) => (
                                                <div key={idx} className="input-with-label-mini">
                                                    <label>Invoice Number {idx + 1} *</label>
                                                    <input type="text" className="cat-input" placeholder={`Invoice for bill ${idx + 1}`} value={invoice || ''} onChange={e => updateLocalInvoiceNumber(row.id, idx, e.target.value)} disabled={isLocked} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    const renderFoodCard = (row) => {
        const foodInvoiceNumbers = getFoodInvoiceNumbers(row);
        const mealSource = normalizeMealSource(row.details.mealSource);
        const isSelfMeal = row.details.mealCategory === 'Self Meal';
        const showMealSourceFields = isSelfMeal;
        const showProvider = isSelfMeal && mealSource === 'online';
        const showHotelName = isSelfMeal && (mealSource === 'hotel' || mealSource === 'online');
        const showRestaurantName = isSelfMeal && mealSource === 'restaurant';
        const amountDisabled = isLocked || !isSelfMeal;

        return (
            <tr key={row.id} className="category-row-block incidental-card-row">
                <td colSpan={20} className="incidental-td-stretch">
                    <div className="incidental-entry-shell food-entry-shell incidental-entry-shell-full">
                        <div className="incidental-entry-header">
                            <div className="incidental-entry-title">
                                <Coffee size={18} />
                                <div>
                                    <strong>Food & Refreshment Entry</strong>
                                    <span>Card-based meal entry for cleaner capture</span>
                                </div>
                            </div>
                            {!isLocked && (
                                <button type="button" className="row-del-btn" onClick={() => deleteRow(row.id)} title="Delete row">
                                    <Trash2 size={15} />
                                    <span>Delete Entry</span>
                                </button>
                            )}
                        </div>

                        <div className="trip-food-card-grid food-card-grid">
                            <div className="incidental-form-card">
                                <div className="incidental-card-head">
                                    <Calendar size={14} />
                                    <span>Date &amp; Time</span>
                                </div>
                                <div className="incidental-card-body incidental-date-time-stack">
                                    <div className="input-with-label-mini">
                                        <label>Date *</label>
                                        <input type="date" min={minDate} max={maxDate} className="cat-input" value={row.date || ''} onChange={e => updateRow(row.id, 'date', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Time *</label>
                                        <input type="time" className="cat-input" value={row.details.mealTime || ''} onChange={e => updateDetails(row.id, 'mealTime', e.target.value)} disabled={isLocked} />
                                    </div>
                                </div>
                            </div>

                            <div className="incidental-form-card">
                                <div className="incidental-card-head">
                                    <Coffee size={14} />
                                    <span>Meal Info</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Meal Type *</label>
                                        <select className="cat-input" value={row.details.mealType || ''} onChange={e => updateDetails(row.id, 'mealType', e.target.value)} disabled={isLocked}>
                                            <option value="">Select Meal Type</option>
                                            {mealTypes.map(option => <option key={option} value={option}>{option}</option>)}
                                        </select>
                                    </div>
                                    {row.details.mealType && (
                                        <div className="input-with-label-mini">
                                            <label>Meal Time *</label>
                                            <input type="time" className="cat-input" value={row.details.mealTime || ''} onChange={e => updateDetails(row.id, 'mealTime', e.target.value)} disabled={isLocked} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="incidental-form-card">
                                <div className="incidental-card-head">
                                    <Receipt size={14} />
                                    <span>Meal Category &amp; Source</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Meal Category *</label>
                                        <select className="cat-input" value={row.details.mealCategory || ''} onChange={e => updateDetails(row.id, 'mealCategory', e.target.value)} disabled={isLocked}>
                                            <option value="">Select Meal Category</option>
                                            {mealCategories.map(option => <option key={option} value={option}>{option}</option>)}
                                        </select>
                                    </div>
                                    {showMealSourceFields && (
                                        <div className="input-with-label-mini">
                                            <label>Meal Source *</label>
                                            <select className="cat-input" value={row.details.mealSource || ''} onChange={e => updateDetails(row.id, 'mealSource', e.target.value)} disabled={isLocked}>
                                                <option value="">Select Meal Source</option>
                                                {mealSources.map(option => <option key={option} value={option}>{option}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {showProvider && (
                                        <div className="input-with-label-mini">
                                            <label>Provider *</label>
                                            <select className="cat-input" value={row.details.provider || ''} onChange={e => updateDetails(row.id, 'provider', e.target.value)} disabled={isLocked || mealProviders.length === 0}>
                                                <option value="">{mealProviders.length === 0 ? 'No Provider Masters' : 'Select Provider'}</option>
                                                {mealProviders.map(option => <option key={option} value={option}>{option}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {showHotelName && (
                                        <div className="input-with-label-mini">
                                            <label>{mealSource === 'online' ? 'Hotel/Outlet Name *' : 'Hotel Name *'}</label>
                                            <input type="text" className="cat-input" placeholder={mealSource === 'online' ? 'Enter hotel or outlet name' : 'Enter hotel name'} value={row.details.hotelName || ''} onChange={e => updateDetails(row.id, 'hotelName', e.target.value)} disabled={isLocked || (mealSource === 'online' && !row.details.provider)} />
                                        </div>
                                    )}
                                    {showRestaurantName && (
                                        <div className="input-with-label-mini">
                                            <label>Restaurant Name *</label>
                                            <input type="text" className="cat-input" placeholder="Enter restaurant name" value={row.details.restaurant || ''} onChange={e => updateDetails(row.id, 'restaurant', e.target.value)} disabled={isLocked} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="incidental-form-card incidental-amount-card">
                                <div className="incidental-card-head">
                                    <IndianRupee size={14} />
                                    <span>Expense</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Amount *</label>
                                        <div className="amount-with-currency">
                                            <span className="currency-symbol">₹</span>
                                            <input
                                                type="text"
                                                className="cat-input"
                                                placeholder="0.00"
                                                value={!isSelfMeal ? '0.00' : (row.amount || '')}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                    if (!/^\d*\.?\d{0,2}$/.test(val)) return;
                                                    updateRow(row.id, 'amount', val);
                                                }}
                                                disabled={amountDisabled}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="incidental-form-card incidental-upload-card">
                                <div className="incidental-card-head">
                                    <Upload size={14} />
                                    <span>Upload</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="incidental-upload-top">
                                        {!isLocked && (
                                            <label className="incidental-upload-btn" htmlFor={`food-f-${row.id}`}>
                                                <Upload size={14} />
                                                <span>Upload Bills</span>
                                            </label>
                                        )}
                                        <input
                                            type="file"
                                            id={`food-f-${row.id}`}
                                            hidden
                                            multiple
                                            accept="image/*,.pdf"
                                            onChange={e => {
                                                handleFileUpload(row.id, e.target.files);
                                                e.target.value = '';
                                            }}
                                        />
                                        <span className="incidental-upload-count">
                                            {(row.bills || []).length > 0 ? `${(row.bills || []).length} file(s) attached` : 'No files attached'}
                                        </span>
                                    </div>

                                    {(row.bills || []).length > 0 && (
                                        <div className="incidental-upload-list">
                                            {row.bills.map((bill, idx) => (
                                                <div key={idx} className="incidental-upload-item">
                                                    <button type="button" className="incidental-upload-preview" onClick={() => previewBill(bill)}>
                                                        <FileText size={14} />
                                                        <span>Bill {idx + 1}</span>
                                                    </button>
                                                    {!isLocked && (
                                                        <button type="button" className="incidental-upload-remove" onClick={() => removeBill(row.id, idx)}>
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {(row.bills || []).length > 0 && (
                                        <div className="incidental-invoice-stack">
                                            {foodInvoiceNumbers.map((invoice, idx) => (
                                                <div key={idx} className="input-with-label-mini">
                                                    <label>Invoice Number {idx + 1} *</label>
                                                    <input type="text" className="cat-input" placeholder={`Invoice for bill ${idx + 1}`} value={invoice || ''} onChange={e => updateFoodInvoiceNumber(row.id, idx, e.target.value)} disabled={isLocked} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    const renderAccommodationCard = (row) => {
        const accommodationInvoiceNumbers = getAccommodationInvoiceNumbers(row);
        const stayBookingTypesLocal = ['Company Booking', 'Walk-in', 'Self Booking (Offline)', 'Online Booking'];
        const stayBookingSourcesLocal = ['Agoda', 'Booking.com', 'OYO'];
        const stayTypesLocal = ['Hotel Stay', 'Guest House', 'Client Provided', 'Self Stay'];
        const roomTypesLocal = ['Standard', 'Deluxe', 'Executive', 'Suite'];
        const numberOfNights = row.details.nights || 0;
        const scheduledCheckInDate = row.details.scheduledCheckInDate || row.details.checkIn || '';
        const scheduledCheckInTime = row.details.scheduledCheckInTime || row.details.checkInTime || '';
        const scheduledCheckOutDate = row.details.scheduledCheckOutDate || row.details.checkOut || '';
        const scheduledCheckOutTime = row.details.scheduledCheckOutTime || row.details.checkOutTime || '';
        const actualCheckInDate = row.details.actualCheckInDate || row.details.checkIn || '';
        const actualCheckInTime = row.details.actualCheckInTime || row.details.checkInTime || '';
        const actualCheckOutDate = row.details.actualCheckOutDate || row.details.checkOut || '';
        const actualCheckOutTime = row.details.actualCheckOutTime || row.details.checkOutTime || '';

        return (
            <tr key={row.id} className="category-row-block incidental-card-row">
                <td colSpan={20} className="incidental-td-stretch">
                    <div className="incidental-entry-shell accommodation-entry-shell incidental-entry-shell-full">
                        <div className="incidental-entry-header">
                            <div className="incidental-entry-title">
                                <Hotel size={18} />
                                <div>
                                    <strong>Stay & Lodging Entry</strong>
                                    <span>Card-based stay entry with grouped scheduling and billing</span>
                                </div>
                            </div>
                            {!isLocked && (
                                <button type="button" className="row-del-btn" onClick={() => deleteRow(row.id)} title="Delete row">
                                    <Trash2 size={15} />
                                    <span>Delete Entry</span>
                                </button>
                            )}
                        </div>

                        <div className="incidental-card-grid accommodation-card-grid trip-accommodation-card-grid">
                            <div className="incidental-form-card accommodation-schedule-card">
                                <div className="incidental-card-head">
                                    <Calendar size={14} />
                                    <span>Stay Schedule</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="accommodation-schedule-grid">
                                        <div className="input-with-label-mini">
                                            <label>Scheduled Check-in Date *</label>
                                            <input type="date" min={minDate} max={maxDate} className="cat-input" value={scheduledCheckInDate} onChange={e => updateDetails(row.id, 'scheduledCheckInDate', e.target.value)} disabled={isLocked} />
                                        </div>
                                        <div className="input-with-label-mini">
                                            <label>Scheduled Check-in Time *</label>
                                            <input type="time" className="cat-input" value={scheduledCheckInTime} onChange={e => updateDetails(row.id, 'scheduledCheckInTime', e.target.value)} disabled={isLocked} />
                                        </div>
                                        <div className="input-with-label-mini">
                                            <label>Scheduled Check-out Date *</label>
                                            <input type="date" min={minDate} max={maxDate} className="cat-input" value={scheduledCheckOutDate} onChange={e => updateDetails(row.id, 'scheduledCheckOutDate', e.target.value)} disabled={isLocked} />
                                        </div>
                                        <div className="input-with-label-mini">
                                            <label>Scheduled Check-out Time *</label>
                                            <input type="time" className="cat-input" value={scheduledCheckOutTime} onChange={e => updateDetails(row.id, 'scheduledCheckOutTime', e.target.value)} disabled={isLocked} />
                                        </div>
                                        <div className="input-with-label-mini">
                                            <label>Actual Check-in Date *</label>
                                            <input type="date" min={minDate} max={maxDate} className="cat-input" value={actualCheckInDate} onChange={e => updateDetails(row.id, 'actualCheckInDate', e.target.value)} disabled={isLocked} />
                                        </div>
                                        <div className="input-with-label-mini">
                                            <label>Actual Check-in Time *</label>
                                            <input type="time" className="cat-input" value={actualCheckInTime} onChange={e => updateDetails(row.id, 'actualCheckInTime', e.target.value)} disabled={isLocked} />
                                        </div>
                                        <div className="input-with-label-mini">
                                            <label>Actual Check-out Date *</label>
                                            <input type="date" min={minDate} max={maxDate} className="cat-input" value={actualCheckOutDate} onChange={e => updateDetails(row.id, 'actualCheckOutDate', e.target.value)} disabled={isLocked} />
                                        </div>
                                        <div className="input-with-label-mini">
                                            <label>Actual Check-out Time *</label>
                                            <input type="time" className="cat-input" value={actualCheckOutTime} onChange={e => updateDetails(row.id, 'actualCheckOutTime', e.target.value)} disabled={isLocked} />
                                        </div>
                                    </div>
                                    <div className="accommodation-nights-chip">
                                        <span>Nights</span>
                                        <strong>{numberOfNights}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="incidental-form-card">
                                <div className="incidental-card-head">
                                    <Receipt size={14} />
                                    <span>Booking Details</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Booking Type *</label>
                                        <select className="cat-input" value={row.details.bookingType || ''} onChange={e => {
                                            const val = e.target.value;
                                            updateDetails(row.id, 'bookingType', val);
                                            if (val === 'Company Booking') {
                                                updateRow(row.id, 'amount', '0.00');
                                            } else if (val === 'Online Booking') {
                                                updateDetails(row.id, 'accomType', 'Hotel Stay');
                                            }
                                        }} disabled={isLocked}>
                                            <option value="">Select Booking Type</option>
                                            {stayBookingTypesLocal.map(option => <option key={option} value={option}>{option}</option>)}
                                        </select>
                                    </div>
                                    {row.details.bookingType === 'Online Booking' && (
                                        <>
                                            <div className="input-with-label-mini">
                                                <label>Booking Source *</label>
                                                <select className="cat-input" value={row.details.bookingSource || ''} onChange={e => updateDetails(row.id, 'bookingSource', e.target.value)} disabled={isLocked}>
                                                    <option value="">Select Booking Source</option>
                                                    {stayBookingSourcesLocal.map(option => <option key={option} value={option}>{option}</option>)}
                                                </select>
                                            </div>
                                            <div className="input-with-label-mini">
                                                <label>Booking ID *</label>
                                                <input type="text" className="cat-input" placeholder="Enter Booking ID" value={row.details.bookingId || ''} onChange={e => updateDetails(row.id, 'bookingId', e.target.value)} disabled={isLocked} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="incidental-form-card">
                                <div className="incidental-card-head">
                                    <Home size={14} />
                                    <span>Lodging Info</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Stay Type *</label>
                                        <select className="cat-input" value={row.details.accomType || ''} onChange={e => updateDetails(row.id, 'accomType', e.target.value)} disabled={isLocked}>
                                            <option value="">Select Stay Type</option>
                                            {stayTypesLocal.map(option => <option key={option} value={option}>{option}</option>)}
                                        </select>
                                    </div>
                                    {['Hotel Stay', 'Guest House'].includes(row.details.accomType) && (
                                        <div className="input-with-label-mini">
                                            <label>{row.details.accomType === 'Guest House' ? 'Guest House Name *' : 'Hotel Name *'}</label>
                                            <input type="text" className="cat-input" placeholder={row.details.accomType === 'Guest House' ? 'Enter guest house name' : 'Enter hotel name'} value={row.details.hotelName || ''} onChange={e => updateDetails(row.id, 'hotelName', e.target.value)} disabled={isLocked} />
                                        </div>
                                    )}
                                    {row.details.accomType === 'Hotel Stay' && (
                                        <div className="input-with-label-mini">
                                            <label>Room Type *</label>
                                            <select className="cat-input" value={row.details.roomType || ''} onChange={e => updateDetails(row.id, 'roomType', e.target.value)} disabled={isLocked}>
                                                <option value="">Select Room Type</option>
                                                {roomTypesLocal.map(option => <option key={option} value={option}>{option}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div className="input-with-label-mini">
                                        <label>{['Client Provided', 'Self Stay'].includes(row.details.accomType) ? 'Remarks *' : 'Remarks'}</label>
                                        <textarea className="cat-input" placeholder="Enter remarks" value={row.details.remarks || ''} onChange={e => updateDetails(row.id, 'remarks', e.target.value)} disabled={isLocked} rows={2} style={{ resize: 'vertical' }} />
                                    </div>
                                </div>
                            </div>

                            <div className="incidental-form-card incidental-amount-card">
                                <div className="incidental-card-head">
                                    <IndianRupee size={14} />
                                    <span>Expense</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="input-with-label-mini">
                                        <label>Amount *</label>
                                        <div className="amount-with-currency">
                                            <span className="currency-symbol">₹</span>
                                            <input
                                                type="text"
                                                className="cat-input"
                                                placeholder="0.00"
                                                value={row.amount || ''}
                                                onChange={e => updateRow(row.id, 'amount', e.target.value)}
                                                disabled={isLocked || row.details.bookingType === 'Company Booking'}
                                                onBlur={e => {
                                                    if (row.details.accomType === 'Self Stay' && e.target.value) {
                                                        const reduced = (parseFloat(e.target.value) * 0.5).toFixed(2);
                                                        updateRow(row.id, 'amount', reduced);
                                                    }
                                                }}
                                            />
                                        </div>
                                        {row.details.accomType === 'Self Stay' && row.amount && (
                                            <div style={{ color: '#0369a1', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
                                                💡 50% Reimbursement Applied: {row.amount ? `₹${(parseFloat(row.amount) * 0.5).toFixed(2)}` : '₹0.00'} will be stored on leave.
                                            </div>
                                        )}
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Early Check-in Charges</label>
                                        <input type="number" className="cat-input" placeholder="0.00" value={row.details.earlyCheckInCharges || ''} onChange={e => updateDetails(row.id, 'earlyCheckInCharges', e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="input-with-label-mini">
                                        <label>Late Check-out Charges</label>
                                        <input type="number" className="cat-input" placeholder="0.00" value={row.details.lateCheckOutCharges || ''} onChange={e => updateDetails(row.id, 'lateCheckOutCharges', e.target.value)} disabled={isLocked} />
                                    </div>
                                </div>
                            </div>

                            <div className="incidental-form-card incidental-upload-card">
                                <div className="incidental-card-head">
                                    <Upload size={14} />
                                    <span>Upload</span>
                                </div>
                                <div className="incidental-card-body">
                                    <div className="incidental-upload-top">
                                        {!isLocked && (
                                            <label className="incidental-upload-btn" htmlFor={`accom-f-${row.id}`}>
                                                <Upload size={14} />
                                                <span>Upload Bills</span>
                                            </label>
                                        )}
                                        <input
                                            type="file"
                                            id={`accom-f-${row.id}`}
                                            hidden
                                            multiple
                                            accept="image/*,.pdf"
                                            onChange={e => {
                                                handleFileUpload(row.id, e.target.files);
                                                e.target.value = '';
                                            }}
                                        />
                                        <span className="incidental-upload-count">
                                            {(row.bills || []).length > 0 ? `${(row.bills || []).length} file(s) attached` : 'No files attached'}
                                        </span>
                                    </div>

                                    {(row.bills || []).length > 0 && (
                                        <div className="incidental-upload-list">
                                            {row.bills.map((bill, idx) => (
                                                <div key={idx} className="incidental-upload-item">
                                                    <button type="button" className="incidental-upload-preview" onClick={() => previewBill(bill)}>
                                                        <FileText size={14} />
                                                        <span>Bill {idx + 1}</span>
                                                    </button>
                                                    {!isLocked && (
                                                        <button type="button" className="incidental-upload-remove" onClick={() => removeBill(row.id, idx)}>
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {(row.bills || []).length > 0 && (
                                        <div className="incidental-invoice-stack">
                                            {accommodationInvoiceNumbers.map((invoice, idx) => (
                                                <div key={idx} className="input-with-label-mini">
                                                    <label>Invoice Number {idx + 1} *</label>
                                                    <input type="text" className="cat-input" placeholder={`Invoice for bill ${idx + 1}`} value={invoice || ''} onChange={e => updateAccommodationInvoiceNumber(row.id, idx, e.target.value)} disabled={isLocked} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    const handleSelfieCapture = (id) => {
        activeRowRef.current = id;
        activeFieldRef.current = 'selfie';
        fileInputRef.current?.click();
    };

    const removeSelfie = (rowId, index) => {
        setRows(prevRows => prevRows.map(row => {
            if (row.id === rowId) {
                const newSelfies = [...(row.details.selfies || [])];
                newSelfies.splice(index, 1);
                return { ...row, details: { ...row.details, selfies: newSelfies }, isSaved: false };
            }
            return row;
        }));
    };

    // --- BULK UPLOAD HANDLERS ---
    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/api/bulk-activities/template/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'bulk_local_travel_template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error('Download error:', error);
            showToast("Failed to download template. Please try again.", "error");
        }
    };

    const handleBulkUpload = async () => {
        if (!bulkModal.file) {
            showToast("Please select a file first", "error");
            return;
        }

        setBulkModal(prev => ({ ...prev, uploading: true }));
        const formData = new FormData();
        formData.append('file', bulkModal.file);
        formData.append('trip_id', tripId);

        try {
            await api.post('/api/bulk-activities/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast("Bulk activities submitted for batch approval successfully!", "success");
            setBulkModal({ visible: false, file: null, uploading: false });
            // Let the main window know of update 
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Upload error:', error);
            showToast(error.response?.data?.error || "Error uploading file", "error");
            setBulkModal(prev => ({ ...prev, uploading: false }));
        }
    };

    const isLocked = claimStatus && !['Draft', 'Rejected'].includes(claimStatus);

    const renderCategoryTable = (nature, title, icon) => {
        const categoryRows = displayRows.filter(r => r.nature === nature);

        const gridTemplateColumns = (() => {
            switch (nature) {
                case 'Travel': return '1fr';
                case 'Local Travel': return '1fr';
                case 'Food': return '1fr';
                case 'Accommodation': return '1fr';
                case 'Incidental': return '1fr';
                default: return '1fr';
            }
        })();

        return (
            <div className={`category-section-container ${nature.toLowerCase().replace(' ', '-')} ${isLocked ? 'is-locked' : ''}`}>
                <div className="category-section-header">
                    <div className="cat-title">
                        {icon}
                        <h4>{title}</h4>
                        <span className="cat-count">{categoryRows.length} Items</span>
                    </div>
                    {!isLocked && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="add-cat-row-btn" onClick={() => addRow(nature)}>
                                <Plus size={14} />
                                <span>Add {title}</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="category-table-wrapper" style={{ margin: '0 -24px' }}>
                    <table className="category-table" style={{ width: 'calc(100% + 48px)' }}>
                        <thead>
                            {nature === 'Travel' && null}
                            {nature === 'Local Travel' && null}
                            {nature === 'Food' && null}
                            {nature === 'Accommodation' && null}
                            {nature === 'Incidental' && (
                                <tr className="category-grid-row" style={{ gridTemplateColumns }}>
                                    <th>Incidental Expense Cards</th>
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
                                (false) ? ( // Card view disabled for TripStory to use Table View instead
                                    (() => {
                                        const grouped = categoryRows.reduce((acc, r) => {
                                            const d = r.date || 'Pending';
                                            if (!acc[d]) acc[d] = [];
                                            acc[d].push(r);
                                            return acc;
                                        }, {});
                                        const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
                                        return sortedDates.map(date => (
                                            <React.Fragment key={date}>
                                                <tr className="date-group-header-row">
                                                    <td colSpan="1">
                                                        <div className="date-group-header">
                                                            <Calendar size={18} />
                                                            <span>{date === 'Pending' ? 'Date Not Set' : new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {grouped[date].map(row => (
                                                    <tr key={row.id} className="category-row-block">
                                                        <td style={{ padding: '0' }}>
                                                            <div style={{ margin: '0.5rem 0.75rem 1rem', padding: '1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                                                                {/* CARD HEADER */}
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <div style={{ width: '8px', height: '28px', background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', borderRadius: '4px' }} />
                                                                        <div>
                                                                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location &amp; Odometer Logs</div>
                                                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>{nature === 'Local Travel' ? 'Local Conveyance Entry' : 'Travel Entry'}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        {row.details.travelStatus && row.details.travelStatus !== 'Completed' && (
                                                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: row.details.travelStatus === 'Cancelled' ? '#fee2e2' : '#fef3c7', color: row.details.travelStatus === 'Cancelled' ? '#dc2626' : '#d97706' }}>
                                                                                {row.details.travelStatus}
                                                                            </span>
                                                                        )}
                                                                        {!isLocked && (
                                                                            <button type="button" style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '6px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }} onClick={() => deleteRow(row.id)} title="Remove entry">
                                                                                <Trash2 size={15} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* START ROW */}
                                                                <div style={{ background: '#f8faff', borderRadius: '10px', padding: '12px 14px' }}>
                                                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>▶ Start</div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '150px 110px 1fr 110px 110px', gap: '12px', alignItems: 'end' }}>
                                                                        <div className="input-with-label-mini">
                                                                            <label>Date</label>
                                                                            <input type="date" min={minDate} max={maxDate} value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)} className="cat-input" disabled={isLocked} />
                                                                        </div>
                                                                        <div className="input-with-label-mini">
                                                                            <label>Time</label>
                                                                            <input type="time" value={row.timeDetails?.boardingTime || ''} onChange={e => updateTimeDetails(row.id, 'boardingTime', e.target.value)} className="cat-input" disabled={isLocked} />
                                                                        </div>
                                                                        <div className="input-with-label-mini">
                                                                            <label>Location</label>
                                                                            <input type="text" placeholder="Start location / Origin" value={row.details.origin || ''} onChange={e => updateDetails(row.id, 'origin', e.target.value)} className="cat-input" disabled={isLocked} />
                                                                        </div>
                                                                        <div className="input-with-label-mini">
                                                                            <label>Odo Reading</label>
                                                                            <input type="number" placeholder="0" value={row.details.odoStart || ''} onChange={e => updateDetails(row.id, 'odoStart', e.target.value)} className="cat-input" disabled={isLocked} />
                                                                        </div>
                                                                        <div className="input-with-label-mini">
                                                                            <label>Odo Photo</label>
                                                                            {!isLocked ? (
                                                                                <button type="button" className="odo-capture-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleOdoCapture(row.id, 'odoStart')}>
                                                                                    {row.details.odoStartImg ? <Check size={13} style={{ color: '#16a34a' }} /> : <Camera size={13} />}
                                                                                    <span>{row.details.odoStartImg ? 'Captured' : 'Odo Pic'}</span>
                                                                                </button>
                                                                            ) : (
                                                                                <div style={{ fontSize: '0.7rem', color: row.details.odoStartImg ? '#16a34a' : '#94a3b8' }}>{row.details.odoStartImg ? '✓ Captured' : 'N/A'}</div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* END ROW */}
                                                                <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px 14px' }}>
                                                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>■ End</div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '150px 110px 1fr 110px 110px', gap: '12px', alignItems: 'end' }}>
                                                                        <div className="input-with-label-mini">
                                                                            <label>Date</label>
                                                                            <input type="date" min={minDate} max={maxDate} value={row.details.endDate || row.date} onChange={e => updateDetails(row.id, 'endDate', e.target.value)} className="cat-input" disabled={isLocked} />
                                                                        </div>
                                                                        <div className="input-with-label-mini">
                                                                            <label>Time</label>
                                                                            <input type="time" value={row.timeDetails?.actualTime || ''} onChange={e => updateTimeDetails(row.id, 'actualTime', e.target.value)} className="cat-input" disabled={isLocked} />
                                                                        </div>
                                                                        <div className="input-with-label-mini">
                                                                            <label>Location</label>
                                                                            <input type="text" placeholder="End location / Destination" value={row.details.destination || ''} onChange={e => updateDetails(row.id, 'destination', e.target.value)} className="cat-input" disabled={isLocked} />
                                                                        </div>
                                                                        <div className="input-with-label-mini">
                                                                            <label>Odo Reading</label>
                                                                            <input type="number" placeholder="0" value={row.details.odoEnd || ''} onChange={e => updateDetails(row.id, 'odoEnd', e.target.value)} className="cat-input" disabled={isLocked} />
                                                                        </div>
                                                                        <div className="input-with-label-mini">
                                                                            <label>Odo Photo</label>
                                                                            {!isLocked ? (
                                                                                <button type="button" className="odo-capture-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleOdoCapture(row.id, 'odoEnd')}>
                                                                                    {row.details.odoEndImg ? <Check size={13} style={{ color: '#16a34a' }} /> : <Camera size={13} />}
                                                                                    <span>{row.details.odoEndImg ? 'Captured' : 'Odo Pic'}</span>
                                                                                </button>
                                                                            ) : (
                                                                                <div style={{ fontSize: '0.7rem', color: row.details.odoEndImg ? '#16a34a' : '#94a3b8' }}>{row.details.odoEndImg ? '✓ Captured' : 'N/A'}</div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* CALC + INLINE JOB REPORT */}
                                                                <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                                                    {/* Calc bar */}
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: jobReportOpen[row.id] || row.details.jobReport ? '1px solid #e2e8f0' : 'none' }}>
                                                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                                                                            Calc. Odo Expense:&nbsp;
                                                                            <span style={{ color: '#4f46e5', fontWeight: 800, fontSize: '0.9rem' }}>₹{formatIndianCurrency(parseFloat(row.amount || 0).toFixed(2))}</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                            {row.details.jobReport && !jobReportOpen[row.id] && (
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '4px 12px' }}>
                                                                                    <FileText size={13} style={{ color: '#16a34a' }} />
                                                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d' }}>Job Report Saved</span>
                                                                                </div>
                                                                            )}
                                                                            {!isLocked && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="job-report-btn"
                                                                                    style={{ background: row.details.jobReport ? '#f0fdf4' : undefined, color: row.details.jobReport ? '#15803d' : undefined, border: row.details.jobReport ? '1px solid #bbf7d0' : undefined }}
                                                                                    onClick={() => {
                                                                                        setJobReportOpen(prev => ({ ...prev, [row.id]: !prev[row.id] }));
                                                                                        if (!jobReportOpen[row.id]) {
                                                                                            setJobReportDraft(prev => ({ ...prev, [row.id]: row.details.jobReport || '' }));
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <FileText size={14} />
                                                                                    {row.details.jobReport ? (jobReportOpen[row.id] ? 'Close Report' : 'Edit Report') : (jobReportOpen[row.id] ? 'Close' : 'Write Job Report')}
                                                                                </button>
                                                                            )}
                                                                            {isLocked && row.details.jobReport && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="job-report-btn"
                                                                                    onClick={() => setJobReportOpen(prev => ({ ...prev, [row.id]: !prev[row.id] }))}
                                                                                >
                                                                                    <FileText size={14} />
                                                                                    {jobReportOpen[row.id] ? 'Hide Report' : 'View Job Report'}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Inline composer / viewer */}
                                                                    {jobReportOpen[row.id] && (
                                                                        isLocked ? (
                                                                            /* ── VIEW MODE ── */
                                                                            <div style={{ borderTop: '1px solid #e2e8f0', background: 'white' }}>
                                                                                <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                                                                    <span style={{ color: '#94a3b8', marginRight: '8px' }}>Subject</span>
                                                                                    {tripId} — Job / Activity Report
                                                                                </div>
                                                                                <div style={{ padding: '16px', fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: '80px' }}>
                                                                                    {row.details.jobReport}
                                                                                </div>
                                                                                {row.details.jobReportFiles && row.details.jobReportFiles.length > 0 && (
                                                                                    <div style={{ padding: '8px 16px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                                        {row.details.jobReportFiles.map((f, fi) => (
                                                                                            <a key={fi} href={f.data} download={f.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f1f5f9', borderRadius: '8px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: '#334155', textDecoration: 'none' }}>
                                                                                                <FileText size={13} /> {f.name}
                                                                                            </a>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            /* ── COMPOSE MODE — email-style ── */
                                                                            <div style={{ borderTop: '1px solid #e2e8f0', background: 'white', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px' }}>
                                                                                {/* Dark header */}
                                                                                <div style={{ background: '#1e293b', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
                                                                                        {row.details.jobReport ? 'Edit Job Report' : 'New Job Report'}
                                                                                    </span>
                                                                                    <button type="button" onClick={() => setJobReportOpen(prev => ({ ...prev, [row.id]: false }))} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                        <X size={14} />
                                                                                    </button>
                                                                                </div>

                                                                                {/* Subject line */}
                                                                                <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', gap: '10px' }}>
                                                                                    <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500, minWidth: '55px' }}>Subject</span>
                                                                                    <span style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 500 }}>
                                                                                        {tripId} — Job / Activity Report
                                                                                    </span>
                                                                                </div>

                                                                                {/* Body */}
                                                                                <textarea
                                                                                    rows={7}
                                                                                    style={{ width: '100%', border: 'none', borderBottom: '1px solid #f1f5f9', padding: '14px 16px', fontSize: '0.88rem', color: '#1e293b', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.7, background: 'white', display: 'block', boxSizing: 'border-box' }}
                                                                                    placeholder="Write your detailed job/activity report here..."
                                                                                    value={jobReportDraft[row.id] ?? row.details.jobReport ?? ''}
                                                                                    onChange={e => setJobReportDraft(prev => ({ ...prev, [row.id]: e.target.value }))}
                                                                                    autoFocus
                                                                                />

                                                                                {/* Attached files preview */}
                                                                                {(jobReportDraft[`${row.id}_files`] || []).length > 0 && (
                                                                                    <div style={{ padding: '6px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9' }}>
                                                                                        {(jobReportDraft[`${row.id}_files`] || []).map((f, fi) => (
                                                                                            <div key={fi} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f1f5f9', borderRadius: '8px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                                                                                                <FileText size={13} /> {f.name}
                                                                                                <button type="button" onClick={() => { setJobReportDraft(prev => { const files = (prev[`${row.id}_files`] || []).filter((_, i) => i !== fi); return { ...prev, [`${row.id}_files`]: files }; }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, marginLeft: '2px', lineHeight: 1 }}>
                                                                                                    <X size={11} />
                                                                                                </button>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}

                                                                                {/* Bottom bar */}
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f8fafc', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px' }}>
                                                                                    {/* Send button */}
                                                                                    <button
                                                                                        type="button"
                                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '22px', border: 'none', background: 'linear-gradient(135deg, #4f83cc, #6ba3e0)', fontSize: '0.85rem', fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 2px 6px rgba(79,131,204,0.4)' }}
                                                                                        onClick={() => {
                                                                                            const text = jobReportDraft[row.id] ?? '';
                                                                                            const files = jobReportDraft[`${row.id}_files`] ?? [];
                                                                                            updateDetails(row.id, 'jobReport', text);
                                                                                            updateDetails(row.id, 'jobReportFiles', files);
                                                                                            setJobReportOpen(prev => ({ ...prev, [row.id]: false }));
                                                                                            showToast('Job report saved to this entry.', 'success');
                                                                                        }}
                                                                                    >
                                                                                        Save
                                                                                        <ChevronDown size={15} />
                                                                                    </button>

                                                                                    {/* Right: Attach + Discard */}
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                                        {/* Attach file */}
                                                                                        <button type="button" title="Attach file" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '4px' }}
                                                                                            onClick={() => document.getElementById(`jr-file-${row.id}`).click()}>
                                                                                            <Upload size={17} />
                                                                                        </button>
                                                                                        <input type="file" id={`jr-file-${row.id}`} hidden multiple accept="image/*,.pdf,.doc,.docx"
                                                                                            onChange={e => {
                                                                                                const newFiles = Array.from(e.target.files).map(file => {
                                                                                                    return new Promise(resolve => {
                                                                                                        const reader = new FileReader();
                                                                                                        reader.onload = ev => resolve({ name: file.name, data: ev.target.result });
                                                                                                        reader.readAsDataURL(file);
                                                                                                    });
                                                                                                });
                                                                                                Promise.all(newFiles).then(resolved => {
                                                                                                    setJobReportDraft(prev => ({ ...prev, [`${row.id}_files`]: [...(prev[`${row.id}_files`] || []), ...resolved] }));
                                                                                                });
                                                                                                e.target.value = '';
                                                                                            }}
                                                                                        />
                                                                                        {/* Discard */}
                                                                                        <button type="button" title="Discard" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '4px' }}
                                                                                            onClick={() => {
                                                                                                setJobReportOpen(prev => ({ ...prev, [row.id]: false }));
                                                                                                setJobReportDraft(prev => { const n = { ...prev }; delete n[row.id]; delete n[`${row.id}_files`]; return n; });
                                                                                            }}>
                                                                                            <X size={17} />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>

                                                                {/* INCIDENTAL + DAY TOTAL */}
                                                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                                                                    <div style={{ flex: 1, minWidth: '300px' }}>
                                                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Incidental Expenses (Optional)</div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                                            <select className="cat-input" style={{ width: '175px', flexShrink: 0 }} value={row.details.incidentalCategory || ''} onChange={e => updateDetails(row.id, 'incidentalCategory', e.target.value)} disabled={isLocked}>
                                                                                <option value="">Select Category</option>
                                                                                {incidentalTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                                            </select>
                                                                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc', height: '34px', flexShrink: 0 }}>
                                                                                <span style={{ padding: '0 10px', fontSize: '0.85rem', color: '#94a3b8', borderRight: '1px solid #e2e8f0', lineHeight: '34px' }}>₹</span>
                                                                                <input type="number" placeholder="Cost" style={{ border: 'none', background: 'transparent', width: '90px', padding: '0 10px', fontSize: '0.85rem', outline: 'none', height: '100%' }} value={row.details.incidentalAmount || ''} onChange={e => updateDetails(row.id, 'incidentalAmount', e.target.value)} disabled={isLocked} />
                                                                            </div>
                                                                            {!isLocked && (
                                                                                <button className="add-bill-btn-mini" onClick={() => document.getElementById(`table-f-${row.id}`).click()} title="Add Bill">
                                                                                    <Plus size={14} />
                                                                                    <input type="file" id={`table-f-${row.id}`} hidden onChange={e => { handleFileUpload(row.id, e.target.files); e.target.value = ''; }} accept="image/*,.pdf" />
                                                                                </button>
                                                                            )}
                                                                            {(row.bills || []).length > 0 && (
                                                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                                    {row.bills.map((b, i) => (
                                                                                        <div key={i} style={{ position: 'relative', display: 'inline-flex', cursor: 'pointer', background: '#e0f2fe', borderRadius: '6px', padding: '4px 8px', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#0369a1', fontWeight: 600 }} onClick={() => previewBill(b)}>
                                                                                            <FileText size={12} /> Bill {i + 1}
                                                                                            {!isLocked && (
                                                                                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, lineHeight: 1, marginLeft: '2px' }} onClick={e => { e.stopPropagation(); removeBill(row.id, i); }}>
                                                                                                    <X size={10} />
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', borderRadius: '12px', padding: '10px 20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Day Total</span>
                                                                        <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', lineHeight: 1.1 }}>
                                                                            ₹{formatIndianCurrency((parseFloat(row.amount || 0) + parseFloat(row.details.incidentalAmount || 0)).toFixed(2))}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ));
                                    })()
                                ) : (
                                    categoryRows.map(row => (
                                        <React.Fragment key={row.id}>
                                            {nature === 'Travel' ? renderTravelCard(row) : nature === 'Local Travel' ? renderLocalTravelCard(row) : nature === 'Incidental' ? renderIncidentalCard(row) : nature === 'Accommodation' ? renderAccommodationCard(row) : nature === 'Food' ? renderFoodCard(row) : (
                                                <tr className={`category-row category-grid-row ${row.details.travelStatus && row.details.travelStatus !== 'Completed' ? 'status-row-' + row.details.travelStatus.toLowerCase() : ''}`} style={{ gridTemplateColumns }}>
                                                    {/* DATE COLUMN */}
                                                    <td>
                                                        {nature === 'Travel' ? (
                                                            <div className="row-fields">
                                                                <div className="input-with-label-mini">
                                                                    <label>BOOKING DATE & TIME</label>
                                                                    <div className="field-group">
                                                                        <input type="date" min={minDate} max={maxDate} value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)} style={{ flex: 1.5 }} />
                                                                        <input type="time" value={row.details.bookingTime || ''} onChange={e => updateDetails(row.id, 'bookingTime', e.target.value)} style={{ flex: 1 }} />
                                                                    </div>
                                                                    {errors[row.id]?.date && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].date}</div>}
                                                                </div>
                                                                {['Flight', 'Train', 'Intercity Bus', 'Intercity Cab'].includes(row.details.mode) && row.date && row.details.depDate && new Date(row.date) > new Date(row.details.depDate) && (
                                                                    <div className="text-danger" style={{ fontSize: '0.55rem', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase' }}>⚠️ Booking Date &gt; Departure Date</div>
                                                                )}
                                                                {['Flight', 'Train', 'Intercity Bus', 'Intercity Cab'].includes(row.details.mode) && row.details.depDate && row.details.arrDate && new Date(row.details.depDate) > new Date(row.details.arrDate) && (
                                                                    <div className="text-danger" style={{ fontSize: '0.55rem', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase' }}>⚠️ Dep Date &gt; Arr Date</div>
                                                                )}
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
                                                                <div className="row-fields">
                                                                    <div style={{ flex: 1 }}>
                                                                        <select className="cat-input" value={row.details.mode || ''} onChange={e => {
                                                                            updateDetails(row.id, 'mode', e.target.value);
                                                                            if (e.target.value === 'Intercity Cab') {
                                                                                updateDetails(row.id, 'cancellationDate', null);
                                                                                updateDetails(row.id, 'refundAmount', 0);
                                                                            }
                                                                        }}>
                                                                            <option value="">Mode</option>
                                                                            {travelModes.map(m => <option key={m} value={m}>{m}</option>)}
                                                                        </select>
                                                                        {errors[row.id]?.mode && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].mode}</div>}
                                                                    </div>
                                                                    <select className="cat-input mt-1" value={row.details.bookedBy || 'Self Booked'} onChange={e => updateDetails(row.id, 'bookedBy', e.target.value)}>
                                                                        {bookedByOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                                                    </select>
                                                                </div>
                                                            </td>


                                                            {/* ROUTE & CARRIER INFO (Matches Header: Route & Carrier Info) */}
                                                            <td>
                                                                <div className="row-fields">
                                                                    {row.details.mode === 'Flight' ? (
                                                                        <>
                                                                            <div className="field-group">
                                                                                <div style={{ flex: 1 }}>
                                                                                    <input type="text" placeholder="From Airport" value={row.details.origin || ''} onChange={e => updateDetails(row.id, 'origin', e.target.value)} style={{ flex: 1 }} />
                                                                                    {errors[row.id]?.origin && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].origin}</div>}
                                                                                </div>
                                                                                <div style={{ flex: 1 }}>
                                                                                    <input type="text" placeholder="To Airport" value={row.details.destination || ''} onChange={e => updateDetails(row.id, 'destination', e.target.value)} style={{ flex: 1 }} />
                                                                                    {errors[row.id]?.destination && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].destination}</div>}
                                                                                </div>
                                                                            </div>
                                                                            <div className="field-group mt-1">
                                                                                <div style={{ flex: 1.5 }}>
                                                                                    <input type="text" placeholder="Airline Name" value={row.details.provider || ''} onChange={e => updateDetails(row.id, 'provider', e.target.value)} style={{ flex: 1.5 }} />
                                                                                    {errors[row.id]?.provider && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].provider}</div>}
                                                                                </div>
                                                                                <div style={{ flex: 1 }}>
                                                                                    <input type="text" placeholder="Flight No." value={row.details.travelNo || ''} onChange={e => updateDetails(row.id, 'travelNo', e.target.value)} style={{ flex: 1 }} />
                                                                                    {errors[row.id]?.travelNo && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].travelNo}</div>}
                                                                                </div>
                                                                            </div>
                                                                            <div className="field-group mt-1">
                                                                                <div style={{ flex: 1.5 }}>
                                                                                    <input type="text" placeholder="Ticket Number" value={row.details.ticketNo || ''} onChange={e => updateDetails(row.id, 'ticketNo', e.target.value)} style={{ flex: 1.5 }} />
                                                                                    {errors[row.id]?.ticketNo && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].ticketNo}</div>}
                                                                                </div>
                                                                                <div style={{ flex: 1 }}>
                                                                                    <input type="text" placeholder="PNR" value={row.details.pnr || ''} onChange={e => updateDetails(row.id, 'pnr', e.target.value)} style={{ flex: 1 }} />
                                                                                    {errors[row.id]?.pnr && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].pnr}</div>}
                                                                                </div>
                                                                            </div>
                                                                            <div className="field-group mt-1">
                                                                                <select style={{ width: '100%' }} value={row.details.classType || ''} onChange={e => updateDetails(row.id, 'classType', e.target.value)}>
                                                                                    <option value="">Travel Class</option>
                                                                                    {flightClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                                                                </select>
                                                                            </div>
                                                                        </>
                                                                    ) : row.details.mode === 'Intercity Cab' ? (
                                                                        <>
                                                                            <div className="field-group">
                                                                                <input type="text" placeholder="From Location" value={row.details.origin || ''} onChange={e => updateDetails(row.id, 'origin', e.target.value)} style={{ flex: 1 }} />
                                                                                <input type="text" placeholder="To Location" value={row.details.destination || ''} onChange={e => updateDetails(row.id, 'destination', e.target.value)} style={{ flex: 1 }} />
                                                                            </div>
                                                                            <div className="field-group mt-1">
                                                                                <input type="text" placeholder="Provider / Vendor" value={row.details.provider || ''} onChange={e => updateDetails(row.id, 'provider', e.target.value)} style={{ flex: 1.5 }} />

                                                                            </div>
                                                                            <div className="field-group mt-1">
                                                                                <select value={row.details.vehicleType || ''} onChange={e => updateDetails(row.id, 'vehicleType', e.target.value)} style={{ flex: 1.5 }}>
                                                                                    <option value="">Vehicle Type</option>
                                                                                    {intercityCabVehicleTypes.map(v => <option key={v} value={v}>{v}</option>)}
                                                                                </select>
                                                                                <input type="text" placeholder="Driver Name" value={row.details.driverName || ''} onChange={e => updateDetails(row.id, 'driverName', e.target.value)} style={{ flex: 1 }} />
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {/* Default (Train, Intercity Bus, Intercity Car etc.) */}
                                                                            <div className="field-group">
                                                                                <div style={{ flex: 1 }}>
                                                                                    <input type="text" placeholder="From" value={row.details.origin || ''} onChange={e => updateDetails(row.id, 'origin', e.target.value)} style={{ flex: 1 }} />
                                                                                    {errors[row.id]?.origin && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].origin}</div>}
                                                                                </div>
                                                                                <div style={{ flex: 1 }}>
                                                                                    <input type="text" placeholder="To" value={row.details.destination || ''} onChange={e => updateDetails(row.id, 'destination', e.target.value)} style={{ flex: 1 }} />
                                                                                    {errors[row.id]?.destination && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].destination}</div>}
                                                                                </div>
                                                                                {row.details.mode === 'Intercity Bus' && (
                                                                                    <input type="text" placeholder="Boarding Point" value={row.details.boardingPoint || ''} onChange={e => updateDetails(row.id, 'boardingPoint', e.target.value)} style={{ flex: 1 }} className="ml-1" />
                                                                                )}
                                                                            </div>
                                                                            <div className="field-group mt-1">
                                                                                <input type="text" placeholder={row.details.mode === 'Intercity Bus' ? "Provider / Agent" : "Provider/Agent"} value={row.details.provider || ''} onChange={e => updateDetails(row.id, 'provider', e.target.value)} style={{ flex: 1.5 }} />

                                                                            </div>
                                                                            <div className="field-group mt-1">
                                                                                <input type="text" placeholder="Ticket No." value={row.details.ticketNo || ''} onChange={e => updateDetails(row.id, 'ticketNo', e.target.value)} style={{ flex: 1.5 }} />
                                                                                <input type="text" placeholder="PNR / Ref" value={row.details.pnr || ''} onChange={e => updateDetails(row.id, 'pnr', e.target.value)} style={{ flex: 1 }} />
                                                                            </div>
                                                                            <div className="field-group mt-1">
                                                                                <input type="text" placeholder={row.details.mode === 'Train' ? "Train Name" : (row.details.mode === 'Intercity Bus' ? "Bus Operator" : "Carrier Name")} value={row.details.carrier || ''} onChange={e => updateDetails(row.id, 'carrier', e.target.value)} style={{ flex: 1 }} />
                                                                                {row.details.mode === 'Train' && (
                                                                                    <input type="text" placeholder="Tr No." style={{ width: '60px' }} value={row.details.travelNo || row.details.trainNo || ''} onChange={e => { updateDetails(row.id, 'travelNo', e.target.value); updateDetails(row.id, 'trainNo', e.target.value); }} />
                                                                                )}
                                                                            </div>
                                                                            <div className="field-group mt-1">
                                                                                <select value={row.details.classType || ''} onChange={e => updateDetails(row.id, 'classType', e.target.value)}>
                                                                                    <option value="">{row.details.mode === 'Intercity Bus' ? 'Bus Type' : 'Cls'}</option>
                                                                                    {row.details.mode === 'Train' && trainClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                                                                    {row.details.mode === 'Intercity Bus' && busSeatTypes.map(c => <option key={c} value={c}>{c}</option>)}
                                                                                </select>
                                                                                {row.details.mode === 'Train' && (
                                                                                    <label className="checkbox-item mini ml-2" style={{ whiteSpace: 'nowrap' }}>
                                                                                        <input type="checkbox" checked={row.details.isTatkal === true} onChange={e => updateDetails(row.id, 'isTatkal', e.target.checked)} />
                                                                                        <span>Tatkal?</span>
                                                                                    </label>
                                                                                )}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* JOURNEY SCHEDULE COLUMN */}
                                                            <td>
                                                                <div className="time-fields quad">
                                                                    {/* add departure/arrival dates here */}
                                                                    <div className="field-group">
                                                                        <div className="input-with-label-mini">
                                                                            <label>DEP. DATE</label>
                                                                            <input type="date" min={minDate} max={maxDate} value={row.details.depDate || row.date} onChange={e => updateDetails(row.id, 'depDate', e.target.value)} />
                                                                            {errors[row.id]?.depDate && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].depDate}</div>}
                                                                        </div>
                                                                        <div className="input-with-label-mini">
                                                                            <label>ARR. DATE</label>
                                                                            <input type="date" min={minDate} max={maxDate} value={row.details.arrDate || row.date} onChange={e => updateDetails(row.id, 'arrDate', e.target.value)} />
                                                                            {errors[row.id]?.arrDate && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].arrDate}</div>}
                                                                        </div>
                                                                    </div>
                                                                    {['Flight', 'Intercity Bus', 'Intercity Cab'].includes(row.details.mode) ? (
                                                                        <>
                                                                            <div className="time-row-pair">
                                                                                <div className="input-with-label-mini">
                                                                                    <label>DEP. TIME</label>
                                                                                    <input type="time" value={row.timeDetails.boardingTime || ''} onChange={e => updateTimeDetails(row.id, 'boardingTime', e.target.value)} />
                                                                                </div>
                                                                                <div className="input-with-label-mini">
                                                                                    <label>ARR. TIME</label>
                                                                                    <input type="time" value={row.timeDetails.actualTime || ''} onChange={e => updateTimeDetails(row.id, 'actualTime', e.target.value)} />
                                                                                </div>
                                                                            </div>
                                                                            {row.details.mode === 'Flight' && (
                                                                                <div className="time-row mt-1" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                    <label className="checkbox-item mini">
                                                                                        <input type="checkbox" checked={row.details.mealIncluded === 'Yes' || row.details.mealIncluded === true} onChange={e => updateDetails(row.id, 'mealIncluded', e.target.checked ? 'Yes' : 'No')} />
                                                                                        <span>Meal?</span>
                                                                                    </label>
                                                                                    <label className="checkbox-item mini">
                                                                                        <input type="checkbox" checked={row.details.excessBaggage === 'Yes' || row.details.excessBaggage === true} onChange={e => updateDetails(row.id, 'excessBaggage', e.target.checked ? 'Yes' : 'No')} />
                                                                                        <span>Baggage?</span>
                                                                                    </label>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        // Standard Journey / Train
                                                                        <>
                                                                            <div className="time-row-pair">
                                                                                <div className="input-with-label-mini">
                                                                                    <label>{row.details.mode === 'Train' ? 'DEP. TIME' : 'TIME'}</label>
                                                                                    <input type="time" value={row.timeDetails.boardingTime || ''} onChange={e => updateTimeDetails(row.id, 'boardingTime', e.target.value)} />
                                                                                </div>
                                                                                <div className="input-with-label-mini">
                                                                                    <label>{row.details.mode === 'Train' ? 'ARR. TIME' : 'SCHEDULED'}</label>
                                                                                    <input type="time" value={row.timeDetails.actualTime || ''} onChange={e => updateTimeDetails(row.id, 'actualTime', e.target.value)} />
                                                                                </div>
                                                                            </div>
                                                                            {row.details.mode === 'Train' && (
                                                                                <>
                                                                                    <div className="time-row">
                                                                                        <label>Delay (Min)</label>
                                                                                        <input type="number" readOnly value={row.timeDetails.delay || 0} style={{ width: '60px' }} />
                                                                                    </div>
                                                                                    <div className="time-row mt-1" style={{ gridColumn: '1 / -1' }}>
                                                                                        <label className="checkbox-item mini">
                                                                                            <input type="checkbox" checked={row.details.mealIncluded === 'Yes' || row.details.mealIncluded === true} onChange={e => updateDetails(row.id, 'mealIncluded', e.target.checked ? 'Yes' : 'No')} />
                                                                                            <span>Meal Provided?</span>
                                                                                        </label>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </>
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
                                                                    <select className="cat-input" value={row.details.mode || ''} onChange={e => { if (!isFixedLocal) { updateDetails(row.id, 'mode', e.target.value); updateDetails(row.id, 'subType', ''); } }} disabled={isFixedLocal}>
                                                                        <option value="">Select Mode</option>
                                                                        {localTravelModes.map(m => <option key={m} value={m}>{m}</option>)}
                                                                    </select>

                                                                    {row.details.mode === 'Car' && (
                                                                        <select className="cat-input mt-1" value={row.details.subType || ''} onChange={e => { if (!isFixedLocal) updateDetails(row.id, 'subType', e.target.value); }} disabled={isFixedLocal}>
                                                                            <option value="">Select Sub-Type</option>
                                                                            {localCarSubTypes.map(s => <option key={s} value={s}>{s}</option>)}
                                                                        </select>
                                                                    )}


                                                                    {row.details.mode === 'Bike' && (
                                                                        <select className="cat-input mt-1" value={row.details.subType || ''} onChange={e => { if (!isFixedLocal) updateDetails(row.id, 'subType', e.target.value); }} disabled={isFixedLocal}>
                                                                            <option value="">Select Sub-Type</option>
                                                                            {localBikeSubTypes.map(s => <option key={s} value={s}>{s}</option>)}
                                                                        </select>
                                                                    )}

                                                                    {row.details.mode === 'Public Transport' && (
                                                                        <select className="cat-input mt-1" value={row.details.subType || ''} onChange={e => { if (!isFixedLocal) updateDetails(row.id, 'subType', e.target.value); }} disabled={isFixedLocal}>
                                                                            <option value="">Select Sub-Type</option>
                                                                            {localProviders.map(s => <option key={s} value={s}>{s}</option>)}
                                                                        </select>
                                                                    )}
                                                                    {!['Own Bike', 'Company Bike', 'Own Car', 'Company Car'].includes(row.details.subType) && !['Metro Train', 'Bus'].includes(row.details.mode) && (
                                                                        <select className="cat-input mt-1" value={row.details.bookedBy || 'Self Booked'} onChange={e => { if (!isFixedLocal) updateDetails(row.id, 'bookedBy', e.target.value); }} disabled={isFixedLocal}>
                                                                            {bookedByOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                                                        </select>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="row-fields">
                                                                    <div className="field-group">
                                                                        <input type="text" placeholder="From Location" value={row.details.origin || ''} onChange={e => updateDetails(row.id, 'origin', e.target.value)} style={{ flex: 1 }} />
                                                                        <input type="text" placeholder="To Location" value={row.details.destination || ''} onChange={e => updateDetails(row.id, 'destination', e.target.value)} style={{ flex: 1 }} />
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

                                                                    <div className="odo-tracking mt-2" style={{ gridColumn: '1 / -1' }}>
                                                                        {['Own Car', 'Company Car', 'Own Bike', 'Self Drive Rental'].includes(row.details.subType) && (
                                                                            <>
                                                                                {(() => {
                                                                                    const is4W = row.details.subType.includes('Car');
                                                                                    const rate = fuelRates[is4W ? '4 Wheeler' : '2 Wheeler'];
                                                                                    return (
                                                                                        <div className="mb-1" style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}>
                                                                                            {rate ? (
                                                                                                <span className="text-success" style={{ fontWeight: 600 }}>(₹{rate}/km rate active)</span>
                                                                                            ) : (
                                                                                                <span className="text-muted italic">(Loading local rates...)</span>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                                <div className="odo-row mb-2">
                                                                                    <span className="odo-label">Start</span>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
                                                                                        <input
                                                                                            type="number"
                                                                                            placeholder="0"
                                                                                            value={row.details.odoStart || ''}
                                                                                            onChange={e => updateDetails(row.id, 'odoStart', e.target.value)}
                                                                                            className={errors[row.id]?.odoStart ? 'error' : ''}
                                                                                            style={{ paddingRight: '50px', width: '100%' }}
                                                                                        />
                                                                                        <button type="button" className="odo-cam-btn" onClick={() => handleOdoCapture(row.id, 'odoStart')}>
                                                                                            {row.details.odoStartImg ? <Check size={12} className="text-success" /> : <Camera size={12} />}
                                                                                        </button>
                                                                                    </div>
                                                                                    <span className="odo-label">End</span>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
                                                                                        <input
                                                                                            type="number"
                                                                                            placeholder="0"
                                                                                            value={row.details.odoEnd || ''}
                                                                                            onChange={e => updateDetails(row.id, 'odoEnd', e.target.value)}
                                                                                            className={errors[row.id]?.odoEnd ? 'error' : ''}
                                                                                            style={{ paddingRight: '50px', width: '100%' }}
                                                                                        />
                                                                                        <button type="button" className="odo-cam-btn" onClick={() => handleOdoCapture(row.id, 'odoEnd')}>
                                                                                            {row.details.odoEndImg ? <Check size={12} className="text-success" /> : <Camera size={12} />}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </>
                                                                        )}

                                                                        {/* Selfie Capture Section */}
                                                                        <div className="selfie-capture-section">
                                                                            <label className="odo-label" style={{ display: 'block', marginBottom: '8px' }}>Selfie Proofs ({(row.details.selfies || []).length})</label>
                                                                            <div className="selfie-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                                {(row.details.selfies || []).map((s, idx) => (
                                                                                    <div key={idx} className="selfie-thumb" style={{ position: 'relative', width: '40px', height: '40px', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                                        <img src={(s.startsWith('data:') || s.startsWith('http')) ? s : `data:image/jpeg;base64,${s}`} alt="selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => previewBill(s)} />
                                                                                        <button onClick={() => removeSelfie(row.id, idx)} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(239, 68, 68, 0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                                                            <X size={10} />
                                                                                        </button>
                                                                                    </div>
                                                                                ))}
                                                                                <button className="add-selfie-btn" onClick={() => handleSelfieCapture(row.id)} style={{ width: '40px', height: '40px', border: '1px dashed #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
                                                                                    <Camera size={16} />
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}

                                                    {nature === 'Food' && (
                                                        <>
                                                            <td>
                                                                <input type="date" min={minDate} max={maxDate} className="cat-input" value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)} />
                                                            </td>
                                                            <td>
                                                                <input type="time" className="cat-input" value={row.details.mealTime || ''} onChange={e => updateDetails(row.id, 'mealTime', e.target.value)} />
                                                            </td>
                                                            <td>
                                                                <div className="row-fields">
                                                                    <select className="cat-input" value={row.details.mealCategory || ''} onChange={e => {
                                                                        const val = e.target.value;
                                                                        updateDetails(row.id, 'mealCategory', val);
                                                                        updateDetails(row.id, 'mealType', '');
                                                                        if (val && val !== 'Self Meal') {
                                                                            updateRow(row.id, 'amount', 0);
                                                                            updateDetails(row.id, 'restaurant', '');
                                                                            updateDetails(row.id, 'purpose', '');
                                                                            updateDetails(row.id, 'invoiceNo', '');
                                                                            updateRow(row.id, 'bills', []);
                                                                        }
                                                                    }}>
                                                                        <option value="">Meal Category</option>
                                                                        {mealCategories.map(m => <option key={m} value={m}>{m}</option>)}
                                                                    </select>
                                                                    {row.details.mealCategory && (
                                                                        <>
                                                                            <select className="cat-input mt-1" value={row.details.mealType || ''} onChange={e => updateDetails(row.id, 'mealType', e.target.value)} disabled={row.details.mealCategory !== 'Self Meal'}>
                                                                                <option value="">Meal Type</option>
                                                                                {row.details.mealCategory === 'Self Meal' && mealTypes.map(m => <option key={m} value={m}>{m}</option>)}
                                                                                {row.details.mealCategory === 'Working Meal' && mealTypes.map(m => <option key={m} value={m}>{m}</option>)}
                                                                                {row.details.mealCategory === 'Client Hosted' && mealTypes.map(m => <option key={m} value={m}>{m}</option>)}
                                                                            </select>
                                                                            {row.details.mealCategory === 'Self Meal' && (
                                                                                <div className="input-with-label-mini mt-1">
                                                                                    <label>MEAL TIME</label>
                                                                                    <input type="time" value={row.details.mealTime || ''} onChange={e => updateDetails(row.id, 'mealTime', e.target.value)} />
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    {(row.details.mealCategory === 'Working Meal' || row.details.mealCategory === 'Client Hosted') && (
                                                                        <div className="input-with-label-mini mt-1">
                                                                            <label>PERSONS (PAX)</label>
                                                                            <input type="number" value={row.details.persons || ''} onChange={e => updateDetails(row.id, 'persons', e.target.value)} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="row-fields">
                                                                    <div className="input-with-label-mini">
                                                                        <label>RESTAURANT / HOTEL NAME</label>
                                                                        <input type="text" placeholder="Hotel Name" value={row.details.restaurant || ''} onChange={e => updateDetails(row.id, 'restaurant', e.target.value)} disabled={row.details.mealCategory && row.details.mealCategory !== 'Self Meal'} />
                                                                    </div>
                                                                    <div className="field-group mt-1">
                                                                        <div className="input-with-label-mini" style={{ flex: 2 }}>
                                                                            <label>ADDRESS</label>
                                                                            <input type="text" placeholder="Location Address" value={row.details.purpose || ''} onChange={e => updateDetails(row.id, 'purpose', e.target.value)} disabled={row.details.mealCategory && row.details.mealCategory !== 'Self Meal'} />
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
                                                                            {incidentalTypes.filter(t => t !== 'Porter Charges' || hasAdditionalLuggage).map(t => (
                                                                                <option key={t} value={t}>{t}</option>
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
                                                                        placeholder={(row.nature === 'Travel' || row.nature === 'Local Travel') && row.details.bookedBy === 'Company Booked' ? "Company Paid" : (row.nature === 'Food' && row.details.mealCategory && row.details.mealCategory !== 'Self Meal' ? "N/A" : "")}
                                                                        value={(() => {
                                                                            const rawVal = (row.details.travelStatus === 'Cancelled' || row.details.travelStatus === 'No-Show') ? (row.details.baseFare || row.amount || '') : (row.amount || '');
                                                                            if (focusedInput?.rowId === row.id) return rawVal;
                                                                            return rawVal ? formatIndianCurrency(rawVal) : '';
                                                                        })()}
                                                                        onFocus={() => setFocusedInput({ rowId: row.id, field: 'amount' })}
                                                                        onBlur={() => setFocusedInput(null)}
                                                                        onChange={e => {
                                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                            if (val.split('.').length > 2) return;
                                                                            updateRow(row.id, 'amount', val);
                                                                            if (row.details.isAutoCalculated) {
                                                                                updateDetails(row.id, 'isAutoCalculated', false);
                                                                            }
                                                                        }}
                                                                        disabled={row.details.travelStatus === 'Cancelled' || row.details.travelStatus === 'No-Show' || ((row.nature === 'Travel' || row.nature === 'Local Travel') && row.details.bookedBy === 'Company Booked') || (row.nature === 'Food' && row.details.mealCategory && row.details.mealCategory !== 'Self Meal')}
                                                                    />
                                                                    {row.details.isAutoCalculated && (
                                                                        <div className="text-success" style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                            <Info size={10} /> Auto-Calculated
                                                                        </div>
                                                                    )}
                                                                    {errors[row.id]?.amount && <div className="text-danger" style={{ fontSize: '0.65rem' }}>{errors[row.id].amount}</div>}
                                                                </div>
                                                            </div>

                                                            {row.nature === 'Travel' && (row.details.mode === 'Flight' || row.details.mode === 'Intercity Bus' || row.details.mode === 'Train' || row.details.mode === 'Intercity Cab') && null}

                                                            {row.nature === 'Travel' && row.details.mode === 'Intercity Car' && (
                                                                <div className="car-costs mt-1">
                                                                    {row.details.travelStatus !== 'Cancelled' && row.details.travelStatus !== 'No-Show' ? (
                                                                        <>
                                                                            {(['Rental Car (With Driver)', 'Self Drive Rental'].includes(row.details.vehicleType)) && (
                                                                                <div className="input-with-label-mini mt-1">
                                                                                    <label>Rental Chg</label>
                                                                                    <input type="number" value={row.details.rentalCharge || ''} onChange={e => updateDetails(row.id, 'rentalCharge', e.target.value)} />
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
                                                                    {row.details.mode === 'Walk' ? (
                                                                        <div className="no-cost-badge">No Cost (Walk)</div>
                                                                    ) : (
                                                                        row.details.travelStatus !== 'Cancelled' && row.details.travelStatus !== 'No-Show' ? (
                                                                            <>
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
                                                                                {row.details.mode === 'Public Transport' && (
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
                                                        <div className="bills-collection-zone custom-upload">
                                                            {row.nature === 'Travel' && ['Flight', 'Train', 'Intercity Bus', 'Intercity Cab'].includes(row.details.mode) && row.details.bookedBy === 'Company Booked' && (
                                                                <div className="company-paid-notice">
                                                                    <CheckCircle2 size={12} className="text-secondary" />
                                                                    <span>Booked & paid by company. No reimbursement.</span>
                                                                </div>
                                                            )}
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
                                                            <div className="upload-controls-mini">
                                                                {!isLocked && !(row.nature === 'Food' && row.details.mealCategory && row.details.mealCategory !== 'Self Meal') && (
                                                                    <button className="add-bill-btn-mini" onClick={() => document.getElementById(`table-f-${row.id}`).click()} title="Add Bill">
                                                                        <Plus size={14} />
                                                                        <input type="file" id={`table-f-${row.id}`} hidden onChange={e => { handleFileUpload(row.id, e.target.files); e.target.value = ''; }} accept="image/*,.pdf" />
                                                                    </button>
                                                                )}
                                                                {(row.bills || []).length === 0 && (
                                                                    row.nature === 'Travel' && (row.details.mode === 'Intercity Bus' || row.details.mode === 'Intercity Cab' || row.details.mode === 'Flight') ? (
                                                                        <div className="travel-upload-hint">
                                                                            {['Flight', 'Intercity Bus'].includes(row.details.mode) && <span className="upload-req-label">Upload Ticket</span>}
                                                                            <span className="upload-req-label">Upload Invoice</span>
                                                                        </div>
                                                                    ) : <span className="no-bill-hint">No Bills</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="actions-col">
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                                                            {!isLocked && (
                                                                <button className="row-del-btn" onClick={() => deleteRow(row.id)} title="Delete row">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
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
                                                                    <span>{r.details.origin || r.details.fromLocation || 'Start'} → {r.details.destination || r.details.toLocation || 'End'}</span>
                                                                </>
                                                            )}
                                                            {r.nature === 'Food' && (
                                                                <>
                                                                    <strong>{r.details.mealType || 'Meal'}</strong>
                                                                    <span>{r.details.mealCategory || 'Category'} · {r.details.mealSource || 'Source'} · {r.details.hotelName || r.details.restaurant || r.details.provider || 'Provider'}</span>
                                                                </>
                                                            )}
                                                            {r.nature === 'Accommodation' && (
                                                                <>
                                                                    <strong>{r.details.hotelName || r.details.accomType || 'Stay'}</strong>
                                                                    <span>{r.details.bookingType || 'Booking'} · {r.details.bookingSource || 'Source'} · {r.details.nights || 0} Nights</span>
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
                                                                    disabled={(r.nature === 'Travel' || r.nature === 'Local Travel') && r.details.bookedBy === 'Company Booked'}
                                                                    title={(r.nature === 'Travel' || r.nature === 'Local Travel') && r.details.bookedBy === 'Company Booked' ? "This ticket is booked and paid by the company. Please contact the Travel Desk for any changes." : ""}
                                                                >
                                                                    {availableStatuses.map(s => {
                                                                        const isOwnVehicle = r.details.subType === 'Own Car' || r.details.subType === 'Own Bike';
                                                                        const isDisabled = (isOwnVehicle && (s === 'Cancelled' || s === 'No-Show')) || ((r.nature === 'Travel' || r.nature === 'Local Travel') && r.details.bookedBy === 'Company Booked' && s !== 'Completed');
                                                                        return <option key={s} value={s} disabled={isDisabled}>{s}</option>;
                                                                    })}
                                                                </select>
                                                                {(r.nature === 'Travel' || r.nature === 'Local Travel') && r.details.bookedBy === 'Company Booked' && (
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
                    {!isLocalOnly && (
                        <>
                            <div className="category-tabs-selector mt-2">
                                {NATURE_OPTIONS.filter(opt => enabledNatures.includes(opt.value)).map(opt => (
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
                        </>
                    )}
                </div>
                <div className="m-right">
                    <div className="master-stats">
                        <div className="m-stat">
                            <label>Items</label>
                            <strong>{displayRows.length}</strong>
                        </div>
                        <div className="m-stat">
                            <label>Ledger Total</label>
                            <strong>₹{formatIndianCurrency(displayRows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0))}</strong>
                        </div>
                        <div className="m-stat primary">
                            <label>Projected Wallet</label>
                            <strong style={{ color: (totalAdvance - displayRows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)) >= 0 ? '#10b981' : '#ef4444' }}>
                                ₹{formatIndianCurrency((totalAdvance - displayRows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)))}
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
            <div className="grid-master-footer" style={{ 
                width: '100%', 
                padding: '1rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px', 
                boxSizing: 'border-box' 
            }}>
                <div className="legend" style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    justifyContent: 'center',
                    padding: '10px',
                    background: '#f8fafc',
                    borderRadius: '8px'
                }}>
                    <div className="l-item" style={{ fontSize: '0.75rem', fontWeight: 700 }}><div className="grid-dot t"></div> Travel</div>
                    <div className="l-item" style={{ fontSize: '0.75rem', fontWeight: 700 }}><div className="grid-dot l"></div> Local</div>
                    <div className="l-item" style={{ fontSize: '0.75rem', fontWeight: 700 }}><div className="grid-dot f"></div> Food</div>
                    <div className="l-item" style={{ fontSize: '0.75rem', fontWeight: 700 }}><div className="grid-dot a"></div> Stay</div>
                </div>

                {!isLocked && (
                    <div className="review-action-footer">
                        {/* Always show Commit/Save button on every tab to allow incremental saving */}
                        <button
                            className={`master-save-btn ${(isSaving || (displayRows.length > 0 && displayRows.every(r => r.isSaved))) ? 'loading btn-disabled' : ''}`}
                            onClick={() => saveRegistry(activeCategory === 'Review')}
                            disabled={isSaving || isSubmitting || (displayRows.length > 0 && displayRows.every(r => r.isSaved))}
                            style={{ minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            {isSaving ? <Clock className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                            <span style={{ fontWeight: 800 }}>{isSaving ? 'Saving Progress...' : ((displayRows.length > 0 && displayRows.every(r => r.isSaved)) ? 'Saved' : (activeCategory === 'Review' ? 'Commit All Data' : 'Save ' + activeCategory + ' Data'))}</span>
                        </button>

                        {activeCategory === 'Review' ? (
                            <div className="review-submit-group">
                                <button
                                    className={`master-claim-btn ${isSubmitting ? 'loading' : ''} ${(!rows.every(r => r.isSaved) || !isTripApproved) ? 'btn-disabled' : ''}`}
                                    onClick={handleClaim}
                                    disabled={isSaving || isSubmitting || !rows.every(r => r.isSaved) || rows.length === 0 || !isTripApproved}
                                    title={!isTripApproved ? "Wait for Trip Approval to submit claim" : (!rows.every(r => r.isSaved) ? "Please Commit Registry first" : "")}
                                    style={{ minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    {isSubmitting ? <Clock className="animate-spin" size={18} /> : <IndianRupee size={18} />}
                                    <span style={{ fontWeight: 800 }}>{isSubmitting ? 'Finalizing...' : 'Submit Full Claim'}</span>
                                </button>
                                {!isTripApproved && (
                                    <div className="status-lock-hint" style={{ fontSize: '0.75rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                        <AlertTriangle size={14} />
                                        <span>Submission locked until Trip is Approved</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                className="master-claim-btn secondary"
                                onClick={() => setActiveCategory('Review')}
                                style={{ minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <Navigation size={18} />
                                <span style={{ fontWeight: 800 }}>Go to Final Review</span>
                            </button>
                        )}
                    </div>
                )}

                {isLocked && (
                    <div className="lock-status-notice" style={{ textAlign: 'center', padding: '1.5rem', background: '#f0fdf4', borderRadius: '12px' }}>
                        <CheckCircle2 size={24} className="text-secondary mb-2" style={{ display: 'block', margin: '0 auto' }} />
                        <span style={{ fontWeight: 800, color: '#166534' }}>Claim Reference: {tripId} Submitted for Review</span>
                    </div>
                )}
            </div>

            {/* Bulk Upload Modal */}
            {bulkModal.visible && (
                <div className="modal-overlay">
                    <div className="modal-body bulk-upload-modal">
                        <button className="modal-close" onClick={() => setBulkModal({ visible: false, file: null, uploading: false })}>
                            <X size={24} />
                        </button>
                        <div className="modal-header">
                            <Upload className="modal-icon text-primary" />
                            <h2>Bulk Activity Upload</h2>
                            <p className="text-secondary">Upload multiple daily local travel logs for this trip via Excel.</p>
                        </div>
                        <div className="modal-content">
                            <div className="upload-steps">
                                <div className="step-card">
                                    <div className="step-number">1</div>
                                    <div className="step-details">
                                        <h4>Download Template</h4>
                                        <p>Get the standard Excel format for daily entries.</p>
                                        <button className="btn-outline-primary mt-2" onClick={handleDownloadTemplate} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '4px', border: '1px solid #3b82f6', color: '#3b82f6', background: 'transparent', cursor: 'pointer' }}>
                                            <FileText size={18} /> Download Excel
                                        </button>
                                    </div>
                                </div>
                                <div className="step-card mt-3">
                                    <div className="step-number">2</div>
                                    <div className="step-details">
                                        <h4>Upload Filled File</h4>
                                        <p>Select your completed template for this trip.</p>
                                        <div className="file-upload-wrapper mt-2">
                                            <input
                                                type="file"
                                                accept=".xlsx, .xls"
                                                id="bulkFile"
                                                onChange={(e) => setBulkModal(prev => ({ ...prev, file: e.target.files[0] }))}
                                                style={{ display: 'none' }}
                                            />
                                            <label htmlFor="bulkFile" className={`file-upload-label ${bulkModal.file ? 'has-file' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: bulkModal.file ? '#f0fdf4' : '#f8fafc', color: bulkModal.file ? '#166534' : '#64748b' }}>
                                                <Upload size={24} />
                                                <span>{bulkModal.file ? bulkModal.file.name : 'Click to Browse File'}</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions mt-4" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button className="btn-secondary" onClick={() => setBulkModal({ visible: false, file: null, uploading: false })} style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'transparent', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button
                                    className={`btn-primary ${(!bulkModal.file || bulkModal.uploading) ? 'btn-disabled' : ''}`}
                                    onClick={handleBulkUpload}
                                    disabled={!bulkModal.file || bulkModal.uploading}
                                    style={{ flex: 1, padding: '10px', background: 'var(--magenta)', color: 'white', border: 'none', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: (!bulkModal.file || bulkModal.uploading) ? 'not-allowed' : 'pointer', opacity: (!bulkModal.file || bulkModal.uploading) ? 0.6 : 1 }}
                                >
                                    {bulkModal.uploading ? (
                                        <><Clock className="animate-spin" size={18} /> Uploading...</>
                                    ) : (
                                        <>Submit for Approval</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div 
                    className="image-preview-modal-overlay" 
                    onClick={() => setPreviewImage(null)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                >
                    <div className="image-preview-modal-content" style={{ position: 'relative', width: '80vw', height: '80vh', backgroundColor: 'transparent', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                            <button 
                                className="image-preview-modal-close" 
                                onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
                                style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '36px', height: '36px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ width: '100%', flex: 1, backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                            {(previewImage.includes('application/pdf') || previewImage.endsWith('.pdf')) ? (
                                 <iframe 
                                     src={previewImage} 
                                     title="PDF Preview"
                                     style={{ width: '100%', height: '100%', border: 'none' }} 
                                 />
                            ) : (
                                 <img 
                                     src={previewImage} 
                                     alt="Bill Preview" 
                                     style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                 />
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .incidental-form-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    overflow: hidden;
                    transition: all 0.2s ease;
                    display: flex;
                    flex-direction: column;
                }
                .incidental-form-card:hover {
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    border-color: #cbd5e1;
                    transform: translateY(-2px);
                }
                .incidental-card-head {
                    background: #f8fafc;
                    padding: 10px 16px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #334155;
                    font-weight: 600;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }
                .incidental-card-head svg {
                    color: #64748b;
                }
                .incidental-card-body {
                    padding: 16px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .cat-input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    transition: all 0.2s ease;
                    background: #ffffff;
                }
                .cat-input:focus {
                    outline: none;
                    border-color: #2563eb;
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
                    background: #fff;
                }
                .cat-input:disabled {
                    background: #f8fafc;
                    color: #94a3b8;
                    cursor: not-allowed;
                }
                .input-with-label-mini label {
                    display: block;
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #64748b;
                    margin-bottom: 5px;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }
                .incidental-upload-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 16px;
                    background: #f8fafc;
                    border: 2px dashed #e2e8f0;
                    border-radius: 10px;
                    cursor: pointer;
                    color: #475569;
                    font-weight: 600;
                    font-size: 0.85rem;
                    transition: all 0.2s ease;
                    width: 100%;
                    justify-content: center;
                }
                .incidental-upload-btn:hover {
                    background: #f1f5f9;
                    border-color: #2563eb;
                    color: #2563eb;
                }
                .incidental-upload-count {
                    display: block;
                    font-size: 0.75rem;
                    color: #64748b;
                    margin-top: 8px;
                    text-align: center;
                }

                .incidental-invoice-stack {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
                    gap: 12px;
                    margin-top: 12px;
                }
                
                @media (max-width: 768px) {
                    .incidental-invoice-stack {
                        grid-template-columns: 1fr;
                        gap: 8px;
                    }
                }

                .incidental-td-stretch {
                    width: 100% !important;
                    padding: 12px 0 !important;
                    display: block !important;
                    box-sizing: border-box !important;
                }

                .incidental-entry-shell-full {
                    width: 100% !important;
                    min-width: 100% !important;
                    box-sizing: border-box !important;
                    margin: 0 !important;
                }

                .incidental-entry-shell {
                    width: 100% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 1.5rem !important;
                    padding: 24px !important;
                    background: #fff;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    box-sizing: border-box !important;
                }

                .incidental-entry-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                    border-bottom: 2px solid #f1f5f9;
                    padding-bottom: 15px;
                    margin-bottom: 15px;
                }

                .row-del-btn {
                    padding: 8px 12px;
                    background: #fef2f2;
                    border: 1px solid #fee2e2;
                    border-radius: 8px;
                    color: #ef4444 !important;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .row-del-btn:hover {
                    background: #fee2e2;
                    color: #dc2626 !important;
                    box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.1);
                    transform: translateY(-1px);
                }

                .trip-travel-card-grid, .trip-local-card-grid, .trip-accommodation-card-grid, .trip-food-card-grid, .trip-incidental-card-grid {
                    display: grid !important;
                    width: 100% !important;
                    gap: 20px !important;
                    align-items: stretch !important;
                }

                .trip-local-card-grid {
                    display: grid !important;
                    grid-template-columns: repeat(3, 1fr) !important;
                    gap: 20px !important;
                    align-items: stretch !important;
                }
                .trip-local-card-grid > :nth-child(1) { grid-column: 1 !important; grid-row: 1 !important; }
                .trip-local-card-grid > :nth-child(2) { grid-column: 2 !important; grid-row: 1 !important; }
                .trip-local-card-grid > :nth-child(3) { grid-column: 3 !important; grid-row: 1 !important; }
                .trip-local-card-grid > :nth-child(4) { grid-column: 1 !important; grid-row: 2 !important; }
                .trip-local-card-grid > :nth-child(5) { grid-column: 2 !important; grid-row: 2 !important; }
                .trip-local-card-grid > :nth-child(6) { grid-column: 3 !important; grid-row: 2 !important; }
                
                @media (max-width: 900px) {
                    .trip-local-card-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .trip-local-card-grid > * {
                        grid-column: auto !important;
                        grid-row: auto !important;
                    }
                }
                .trip-accommodation-card-grid {
                    display: grid !important;
                    grid-template-columns: repeat(3, 1fr) !important;
                    gap: 20px !important;
                    align-items: stretch !important;
                }
                .trip-accommodation-card-grid > :nth-child(1) { grid-column: 1 !important; grid-row: 1 / span 2 !important; }
                .trip-accommodation-card-grid > :nth-child(2) { grid-column: 2 !important; grid-row: 1 !important; }
                .trip-accommodation-card-grid > :nth-child(3) { grid-column: 3 !important; grid-row: 1 !important; }
                .trip-accommodation-card-grid > :nth-child(4) { grid-column: 2 !important; grid-row: 2 !important; }
                .trip-accommodation-card-grid > :nth-child(5) { grid-column: 3 !important; grid-row: 2 !important; }

                .trip-food-card-grid, .trip-incidental-card-grid {
                    display: grid !important;
                    grid-template-columns: repeat(4, 1fr) !important;
                    gap: 16px !important;
                    align-items: stretch !important;
                }

                .trip-travel-card-grid {
                    display: grid !important;
                    grid-template-columns: repeat(4, 1fr) !important;
                    gap: 16px !important;
                    align-items: stretch !important;
                }

                @media (max-width: 1100px) {
                    .trip-travel-card-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }

                @media (max-width: 768px) {
                    .trip-accommodation-card-grid, .trip-travel-card-grid, .trip-food-card-grid, .trip-incidental-card-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .trip-accommodation-card-grid > *, .trip-travel-card-grid > *, .trip-food-card-grid > *, .trip-incidental-card-grid > * {
                        grid-column: auto !important;
                        grid-row: auto !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default TripExpenseGrid;
