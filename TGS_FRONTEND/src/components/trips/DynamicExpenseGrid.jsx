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

const DynamicExpenseGrid = ({ tripId, startDate, endDate, initialExpenses = [], totalAdvance = 0, onUpdate, tripStatus, claimStatus }) => {
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
    const [localProviders, setLocalProviders] = useState([]);

    // Stay Masters
    const [stayTypes, setStayTypes] = useState(FALLBACK_ACCOM_TYPES);
    const [roomTypes, setRoomTypes] = useState(FALLBACK_ROOM_TYPES);

    // Food Masters
    const [mealCategories, setMealCategories] = useState(['Self Meal', 'Working Meal', 'Client Hosted']);
    const [mealTypes, setMealTypes] = useState([]);

    // Incidental Masters
    const [incidentalTypes, setIncidentalTypes] = useState(FALLBACK_INCIDENTAL_TYPES);

    const [rows, setRows] = useState([]);
    const [errors, setErrors] = useState({}); // { rowId: { fieldKey: message } }
    const [activeCategory, setActiveCategory] = useState('Travel'); // Default selection
    const prevCategoryRef = useRef('Travel'); // keep last known category across syncs
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [carryingLuggage, setCarryingLuggage] = useState(false);
    const [luggageWeight, setLuggageWeight] = useState('');
    const { showToast, confirm } = useToast();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const activeRowRef = useRef(null);
    const activeFieldRef = useRef(null);
    const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'warning' });
    const [reviewFilter, setReviewFilter] = useState('All');
    const [focusedInput, setFocusedInput] = useState(null); // { rowId: string, field: 'amount' }

    // Bulk Upload State
    const [bulkModal, setBulkModal] = useState({ visible: false, file: null, uploading: false });

    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const [
                    modesRes, bookedByRes, fClassesRes, tClassesRes, busTypesRes,
                    cabVehiclesRes, airlinesRes, busOpsRes, travProvRes,
                    locModesRes, carSubRes, bikeSubRes, locProvRes,
                    stayTypeRes, roomTypeRes,
                    mealCatRes, mealTypeRes,
                    incTypeRes,
                    trainProvRes, busProvRes, cabProvRes
                ] = await Promise.all([
                    api.get('/api/travel-mode-masters/'),
                    api.get('/api/booking-type-masters/'),
                    api.get('/api/flight-class-masters/'),
                    api.get('/api/train-class-masters/'),
                    api.get('/api/bus-type-masters/'),
                    api.get('/api/intercity-cab-vehicle-masters/'),
                    api.get('/api/airline-masters/'),
                    api.get('/api/bus-operator-masters/'),
                    api.get('/api/travel-provider-masters/'),
                    api.get('/api/local-travel-mode-masters/'),
                    api.get('/api/local-car-subtype-masters/'),
                    api.get('/api/local-bike-subtype-masters/'),
                    api.get('/api/local-provider-masters/'),
                    api.get('/api/stay-type-masters/'),
                    api.get('/api/room-type-masters/'),
                    api.get('/api/meal-category-masters/'),
                    api.get('/api/meal-type-masters/'),
                    api.get('/api/incidental-type-masters/'),
                    api.get('/api/train-provider-masters/'),
                    api.get('/api/bus-provider-masters/'),
                    api.get('/api/intercity-cab-provider-masters/')
                ]);

                // Populate Travel
                if (modesRes.data.length > 0) setTravelModes(modesRes.data.filter(m => m.status).map(m => m.mode_name));
                if (bookedByRes.data.length > 0) setBookedByOptions(bookedByRes.data.filter(m => m.status).map(m => m.booking_type));
                if (fClassesRes.data.length > 0) setFlightClasses(fClassesRes.data.filter(m => m.status).map(m => m.class_name));
                if (tClassesRes.data.length > 0) setTrainClasses(tClassesRes.data.filter(m => m.status).map(m => m.class_name));
                if (busTypesRes.data.length > 0) setBusSeatTypes(busTypesRes.data.filter(m => m.status).map(m => m.bus_type));
                if (cabVehiclesRes.data.length > 0) setIntercityCabVehicleTypes(cabVehiclesRes.data.filter(m => m.status).map(m => m.vehicle_type));
                if (airlinesRes.data.length > 0) setAirlines(airlinesRes.data.filter(m => m.status).map(m => m.airline_name));
                if (busOpsRes.data.length > 0) setBusOperators(busOpsRes.data.filter(m => m.status).map(m => m.operator_name));
                if (travProvRes.data.length > 0) setTravelProviders(travProvRes.data.filter(m => m.status).map(m => m.provider_name));
                if (trainProvRes.data.length > 0) setTrainProviders(trainProvRes.data.filter(m => m.status).map(m => m.provider_name));
                if (busProvRes.data.length > 0) setBusProviders(busProvRes.data.filter(m => m.status).map(m => m.provider_name));
                if (cabProvRes.data.length > 0) setCabProviders(cabProvRes.data.map(m => m.provider_name));

                // Populate Local
                if (locModesRes.data.length > 0) setLocalTravelModes(locModesRes.data.filter(m => m.status).map(m => m.mode_name));
                if (carSubRes.data.length > 0) setLocalCarSubTypes(carSubRes.data.filter(m => m.status).map(m => m.sub_type));
                if (bikeSubRes.data.length > 0) setLocalBikeSubTypes(bikeSubRes.data.filter(m => m.status).map(m => m.sub_type));
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
                key = `Local|${row.date}|${row.details.mode || ''}|${row.details.subType || ''}|${row.details.origin || ''}|${row.details.destination || ''}`;
            } else if (row.nature === 'Food') {
                key = `Food|${row.date}|${row.details.mealType}|${row.details.restaurant}`;
            } else if (row.nature === 'Accommodation') {
                key = `Hotel|${row.date}|${row.details.hotelName}|${row.details.city}`;
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
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 1;

            // DATE RANGE VALIDATION
            if (minDate && maxDate) {
                if (row.date < minDate || row.date > maxDate) {
                    showToast(`Item #${rowNum}: Selected date (${row.date}) is outside trip range. Only trip dates +/- 1 day grace allowed.`, "error");
                    return false;
                }
                if (row.nature === 'Accommodation') {
                    if (row.details.checkIn && (row.details.checkIn < minDate || row.details.checkIn > maxDate)) {
                        showToast(`Item #${rowNum}: Check-In date is outside trip range.`, "error");
                        return false;
                    }
                    if (row.details.checkOut && (row.details.checkOut < minDate || row.details.checkOut > maxDate)) {
                        showToast(`Item #${rowNum}: Check-Out date is outside trip range.`, "error");
                        return false;
                    }
                }
            }

            // AMOUNT
            if (row.amount === '' || row.amount === null || row.amount === undefined || isNaN(parseFloat(row.amount))) {
                showToast(`Item #${rowNum}: Please enter a valid numeric amount.`, "error");
                return false;
            }
            // require bill if any charge present
            if (parseFloat(row.amount) > 0 && (!row.bills || row.bills.length === 0)) {
                showToast(`Item #${rowNum}: Please upload a bill as amount is entered.`, "error");
                return false;
            }
            const amt = parseFloat(row.amount);
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
                const { mode, origin, destination, travelStatus, bookedBy, provider, ticketNo, pnr, travelNo, depDate, arrDate } = row.details;
                const isSelfBooked = bookedBy !== 'Company Booked';

                // Booking date must always be present
                if (!row.date) {
                    showToast(`Item #${rowNum}: Booking Date is required.`, "error");
                    return false;
                }

                // COMMON MANDATORY FIELDS
                if (!mode) {
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
                    if (row.timeDetails.boardingTime >= row.timeDetails.actualTime) {
                        showToast(`Item #${rowNum}: Arrival time must be later than Departure time.`, "error");
                        return false;
                    }
                }

                if (mode === 'Flight') {
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
                } else if (mode === 'Train') {
                    if (!ticketNo) { setRowError(row.id, 'ticketNo', 'Ticket Number is mandatory for Train.'); return false; }
                    if (!pnr) { setRowError(row.id, 'pnr', 'PNR is mandatory for Train.'); return false; }
                    if (!row.details.carrier) { setRowError(row.id, 'carrier', 'Train Name is mandatory.'); return false; }
                    if (!row.details.classType) { setRowError(row.id, 'classType', 'Class is mandatory for Train.'); return false; }
                    const alnum = /^[A-Za-z0-9]+$/;
                    if (!alnum.test(ticketNo)) { setRowError(row.id, 'ticketNo', 'Ticket Number may only contain letters and numbers.'); return false; }
                    if (ticketNo.length > 25) { setRowError(row.id, 'ticketNo', 'Ticket Number cannot exceed 25 characters.'); return false; }
                    if (!alnum.test(pnr)) { setRowError(row.id, 'pnr', 'PNR may only contain letters and numbers.'); return false; }
                    if (pnr.length < 5 || pnr.length > 15) { setRowError(row.id, 'pnr', 'PNR must be 5-15 characters long.'); return false; }
                } else if (mode === 'Intercity Bus') {
                    if (!row.details.carrier) { setRowError(row.id, 'carrier', 'Bus Operator is mandatory.'); return false; }
                } else if (mode === 'Intercity Cab') {
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
                    if (mode === 'Flight' || mode === 'Intercity Bus' || mode === 'Intercity Cab') {
                        // Ticket/Invoice requirements
                        if (!row.bills || row.bills.length < (mode === 'Intercity Cab' ? 1 : 2)) {
                            showToast(`Item #${rowNum}: Please upload ${mode === 'Intercity Cab' ? 'Invoice' : 'Ticket and Invoice'} for self-booked ${mode.toLowerCase()}.`, "warning");
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
                if (isSelfBooked || mode !== 'Flight') {
                    if (!row.bills || row.bills.length === 0) {
                        showToast(`Item #${rowNum}: Please upload your ticket/invoice. This is mandatory for all travel.`, "error");
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
                                showToast(`Item #${rowNum}: Cannot record local conveyance during active long-distance travel period.`, "error");
                                return false;
                            }
                        }
                    }
                }

                if (!mode) {
                    showToast(`Item #${rowNum}: Please select a Mode for Local Travel.`, "error");
                    return false;
                }

                if (mode !== 'Walk' && !subType) {
                    showToast(`Item #${rowNum}: Please select a Sub-Type for ${mode}.`, "error");
                    return false;
                }

                // date range validation for local travel
                if (row.date && row.endDate) {
                    if (new Date(row.date) > new Date(row.endDate)) {
                        showToast(`Item #${rowNum}: End Date should be after Start Date.`, "error");
                        return false;
                    }
                    // optionally block future dates if needed
                    const today = new Date();
                    if (new Date(row.date) > today || new Date(row.endDate) > today) {
                        showToast(`Item #${rowNum}: Travel dates cannot be in the future.`, "error");
                        return false;
                    }
                }

                // location cross-check
                if (origin && destination && origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
                    showToast(`Item #${rowNum}: From and To locations cannot be the same.`, "error");
                    return false;
                }
                // time validations for local travel
                if ((row.timeDetails.boardingTime && !row.timeDetails.actualTime) || (!row.timeDetails.boardingTime && row.timeDetails.actualTime)) {
                    showToast(`Item #${rowNum}: Both start and end times are required for Local Travel.`, "error");
                    return false;
                }
                if (row.timeDetails.boardingTime && row.timeDetails.actualTime) {
                    if (row.timeDetails.boardingTime >= row.timeDetails.actualTime) {
                        showToast(`Item #${rowNum}: End Time must be greater than Start Time.`, "error");
                        return false;
                    }
                }

                if (mode === 'Walk') {
                    if (parseFloat(row.amount) > 0) {
                        showToast(`Item #${rowNum}: Walk mode cannot have an associated cost.`, "error");
                        return false;
                    }
                    if (!origin || !destination) {
                        showToast(`Item #${rowNum}: From and To locations are required for Walk entries.`, "error");
                        return false;
                    }
                }

                if (subType === 'Own Car') {
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
                        showToast(`Item #${rowNum}: Please capture both start and end odometer photos.`, "error");
                        if (!row.details.odoStartImg) setRowError(row.id, 'odoStartImg', 'Start odometer photo required.');
                        if (!row.details.odoEndImg) setRowError(row.id, 'odoEndImg', 'End odometer photo required.');
                        return false;
                    }
                } else if (['Self Drive Rental', 'Own Bike'].includes(subType)) {
                    if (odoStart && odoEnd && parseFloat(odoEnd) <= parseFloat(odoStart)) {
                        showToast(`Item #${rowNum}: ODO End must be greater than ODO Start.`, "error");
                        return false;
                    }
                }
            }

            if (row.nature === 'Food') {
                if (!row.details.mealCategory) {
                    showToast(`Item #${rowNum}: Please select Meal Category.`, "error");
                    return false;
                }

                // meal time mandatory regardless of category
                if (!row.details.mealTime) { showToast(`Item #${rowNum}: Meal Time is required.`, "error"); return false; }
                if (row.details.mealCategory === 'Self Meal') {
                    if (!row.details.mealType) { showToast(`Item #${rowNum}: Please select Meal Type.`, "error"); return false; }
                    if (!row.details.restaurant) { showToast(`Item #${rowNum}: Restaurant / Hotel Name is required.`, "error"); return false; }
                    if (!row.details.purpose) { showToast(`Item #${rowNum}: Address is required.`, "error"); return false; }
                    if (!row.details.invoiceNo) { showToast(`Item #${rowNum}: Invoice Number is required.`, "error"); return false; }
                    if (!row.amount || parseFloat(row.amount) <= 0) { showToast(`Item #${rowNum}: Amount must be > 0 for Self Meal.`, "error"); return false; }
                    if (!row.bills || row.bills.length === 0) { showToast(`Item #${rowNum}: Bill upload is mandatory for Self Meal.`, "error"); return false; }

                    const sameDaySelfMeals = rows.filter(r => r.nature === 'Food' && r.date === row.date && r.details.mealCategory === 'Self Meal' && r.details.mealType === row.details.mealType);
                    if (sameDaySelfMeals.length > 1 && ['Breakfast', 'Lunch', 'Dinner'].includes(row.details.mealType)) {
                        showToast(`Item #${rowNum}: Only one ${row.details.mealType} per day is allowed.`, "error");
                        return false;
                    }
                }
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
                if (!['No Stay'].includes(row.details.accomType) && (!row.details.checkIn || !row.details.checkOut)) {
                    showToast(`Item #${rowNum}: Check-In and Check-Out dates are required for stays.`, "error");
                    return false;
                }
                if (row.details.checkIn && row.details.checkOut && new Date(row.details.checkIn) > new Date(row.details.checkOut)) {
                    showToast(`Item #${rowNum}: Check-Out date cannot be before Check-In date.`, "error");
                    return false;
                }
                if (row.details.checkIn && !row.details.checkInTime) {
                    showToast(`Item #${rowNum}: Check-In time is required for stays.`, "error");
                    return false;
                }
                if (row.details.checkOut && !row.details.checkOutTime) {
                    showToast(`Item #${rowNum}: Check-Out time is required for stays.`, "error");
                    return false;
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
                    const { mode, subType } = row.details;
                    // Remove fields not applicable for current mode/subtype
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

                const payload = {
                    trip: tripId,
                    date: row.date,
                    category: categoryMap[row.nature] || 'Others',
                    amount: parseFloat(row.amount || 0),
                    // New Database Fields
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

                if (!isNaN(Number(row.id))) {
                    await api.patch(`/api/expenses/${row.id}/`, payload);
                } else {
                    const res = await api.post('/api/expenses/', payload);
                    if (res.data && res.data.id) {
                        row.id = res.data.id; // Update the ID to the real database ID
                    }
                }
            }

            showToast("Registry committed successfully!", "success");
            if (onUpdate) onUpdate();

            setRows(rows.map(r => ({ ...r, isSaved: true })));
            return true;

        } catch (error) {
            console.error("Save error:", error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || "Failed to commit registry due to a server error.";
            showToast(errorMsg, "error");
            return false;
        } finally {
            setIsSaving(true);
            setTimeout(() => setIsSaving(false), 500);
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

    const seedMockData = () => {
        setRows(MOCK_DATA);
    };

    const addRow = (nature = '') => {
        const targetNature = nature || activeCategory;
        const newRow = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
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

                // Rule: If switching to Company Booked, force amount to 0
                if (detailField === 'bookedBy' && value === 'Company Booked' && row.nature === 'Travel') {
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

                if (detailField === 'checkIn' || detailField === 'checkOut') {
                    if (newDetails.checkIn && newDetails.checkOut) {
                        const start = new Date(newDetails.checkIn);
                        const end = new Date(newDetails.checkOut);
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
                    if (value === 'Company Booked') {
                        newDetails.reimbursement_eligible = false;
                        updatedAmount = '0';
                    } else {
                        newDetails.reimbursement_eligible = true;
                    }
                }

                return { ...row, details: newDetails, amount: updatedAmount, isSaved: false };
            }
            return row;
        }));
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

    const handleFileUpload = (id, file) => {
        if (!file) return;
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
        const categoryRows = rows.filter(r => r.nature === nature);

        const gridTemplateColumns = (() => {
            switch (nature) {
                case 'Travel': return '260px 180px 1fr 300px 240px 100px 50px';
                case 'Local Travel': return '240px 160px 1fr 280px 230px 100px 50px';
                case 'Food': return '140px 80px 180px 1fr 180px 100px 50px';
                case 'Accommodation': return '220px 220px 1fr 180px 100px 50px';
                case 'Incidental': return '140px 220px 1fr 180px 100px 50px';
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

                        {nature === 'Incidental' && (
                            <div className="header-actions-extra ml-4" style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center' }}>
                                <label className="toggle-switch-mini">
                                    <input type="checkbox" checked={carryingLuggage} onChange={e => setCarryingLuggage(e.target.checked)} />
                                    <span className="slider-mini"></span>
                                    <span className="label-text" style={{ marginLeft: '8px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Carrying Luggage</span>
                                </label>
                            </div>
                        )}
                    </div>
                    {!isLocked && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {nature === 'Local Travel' && (
                                <button className="add-cat-row-btn" style={{ background: '#10b981', color: 'white', borderColor: '#10b981' }} onClick={() => setBulkModal(prev => ({ ...prev, visible: true }))}>
                                    <Upload size={14} />
                                    <span>Bulk Upload (Excel)</span>
                                </button>
                            )}
                            <button className="add-cat-row-btn" onClick={() => addRow(nature)}>
                                <Plus size={14} />
                                <span>Add {title}</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="category-table-wrapper">
                    <table className="category-table">
                        <thead>
                            {nature === 'Travel' && (
                                <tr className="category-grid-row" style={{ gridTemplateColumns }}>
                                    <th>Dates (Book - Journey)</th>
                                    <th>Mode & Booking</th>
                                    <th>Route & Carrier Info</th>
                                    <th>
                                        {categoryRows.some(r => r.details.mode === 'Flight') ? 'Flight Schedule' : 'Journey Schedule'}
                                    </th>
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
                                    <th>Time</th>
                                    <th>Meal Info</th>
                                    <th>Restaurant & Purpose</th>
                                    <th>Expense</th>
                                    <th>Upload</th>
                                    <th></th>
                                </tr>
                            )}
                            {nature === 'Accommodation' && (
                                <tr className="category-grid-row" style={{ gridTemplateColumns }}>
                                    <th>Dates (In - Out)</th>
                                    <th>Lodging Info</th>
                                    <th>City & Reason</th>
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
                                categoryRows.map(row => (
                                    <React.Fragment key={row.id}>
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
                                                ) : nature === 'Accommodation' ? (
                                                    <div className="field-group">
                                                        <div className="input-with-label-mini">
                                                            <label>CHECK-IN</label>
                                                            <input type="date" min={minDate} max={maxDate} value={row.details.checkIn || ''} onChange={e => updateDetails(row.id, 'checkIn', e.target.value)} />
                                                            <input type="time" value={row.details.checkInTime || ''} onChange={e => updateDetails(row.id, 'checkInTime', e.target.value)} />
                                                        </div>
                                                        <div className="input-with-label-mini">
                                                            <label>CHECK-OUT</label>
                                                            <input type="date" min={minDate} max={maxDate} value={row.details.checkOut || ''} onChange={e => updateDetails(row.id, 'checkOut', e.target.value)} />
                                                            <input type="time" value={row.details.checkOutTime || ''} onChange={e => updateDetails(row.id, 'checkOutTime', e.target.value)} />
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
                                                            <select className="cat-input" value={row.details.mode || ''} onChange={e => { updateDetails(row.id, 'mode', e.target.value); updateDetails(row.id, 'subType', ''); }}>
                                                                <option value="">Select Mode</option>
                                                                {localTravelModes.map(m => <option key={m} value={m}>{m}</option>)}
                                                            </select>

                                                            {row.details.mode === 'Car / Cab' && (
                                                                <select className="cat-input mt-1" value={row.details.subType || ''} onChange={e => updateDetails(row.id, 'subType', e.target.value)}>
                                                                    <option value="">Select Sub-Type</option>
                                                                    {localCarSubTypes.map(s => <option key={s} value={s}>{s}</option>)}
                                                                </select>
                                                            )}

                                                            {row.details.mode === 'Bike' && (
                                                                <select className="cat-input mt-1" value={row.details.subType || ''} onChange={e => updateDetails(row.id, 'subType', e.target.value)}>
                                                                    <option value="">Select Sub-Type</option>
                                                                    {localBikeSubTypes.map(s => <option key={s} value={s}>{s}</option>)}
                                                                </select>
                                                            )}

                                                            {row.details.mode === 'Public Transport' && (
                                                                <select className="cat-input mt-1" value={row.details.subType || ''} onChange={e => updateDetails(row.id, 'subType', e.target.value)}>
                                                                    <option value="">Select Sub-Type</option>
                                                                    {localProviders.map(s => <option key={s} value={s}>{s}</option>)}
                                                                </select>
                                                            )}
                                                            <select className="cat-input mt-1" value={row.details.bookedBy || 'Self Booked'} onChange={e => updateDetails(row.id, 'bookedBy', e.target.value)}>
                                                                {bookedByOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                                            </select>
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
                                                                )}

                                                                {/* Selfie Capture Section */}
                                                                <div className="selfie-capture-section">
                                                                    <label className="odo-label" style={{ display: 'block', marginBottom: '8px' }}>Selfie Proofs ({(row.details.selfies || []).length})</label>
                                                                    <div className="selfie-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                        {(row.details.selfies || []).map((s, idx) => (
                                                                            <div key={idx} className="selfie-thumb" style={{ position: 'relative', width: '40px', height: '40px', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                                <img src={s} alt="selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => previewBill(s)} />
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

                                                                {/* Remarks Field for Local Travel */}
                                                                <div className="mt-2">
                                                                    <textarea
                                                                        className="cat-input"
                                                                        placeholder="Job Description / Remarks"
                                                                        style={{ width: '100%', fontSize: '0.7rem', minHeight: '40px' }}
                                                                        value={row.remarks || ''}
                                                                        onChange={e => updateRow(row.id, 'remarks', e.target.value)}
                                                                    />
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

                                            {nature === 'Accommodation' && (
                                                <>
                                                    <td>
                                                        <div className="row-fields">
                                                            <select
                                                                className={`cat-input mb-1 ${isSameDayTrip() ? "opacity-50" : ""}`}
                                                                value={row.details.accomType || ''}
                                                                onChange={e => updateDetails(row.id, 'accomType', e.target.value)}
                                                                disabled={isSameDayTrip()}
                                                            >
                                                                <option value="">Stay Type</option>
                                                                {stayTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                            </select>
                                                            <input
                                                                type="text"
                                                                className={`cat-input ${isSameDayTrip() ? "opacity-50" : ""}`}
                                                                placeholder="Hotel Name"
                                                                value={row.details.hotelName || ''}
                                                                onChange={e => updateDetails(row.id, 'hotelName', e.target.value)}
                                                                disabled={isSameDayTrip()}
                                                            />
                                                            <div className="field-group mt-1">
                                                                {(!row.details.accomType || !['No Stay', 'Self Stay', 'Client Provided'].includes(row.details.accomType)) && (
                                                                    <select
                                                                        value={row.details.roomType || ''}
                                                                        onChange={e => updateDetails(row.id, 'roomType', e.target.value)}
                                                                        disabled={isSameDayTrip()}
                                                                        className={isSameDayTrip() ? "opacity-50" : ""}
                                                                    >
                                                                        <option value="">Room</option>
                                                                        {roomTypes.map(r => <option key={r} value={r}>{r}</option>)}
                                                                    </select>
                                                                )}
                                                                <div className="nights-badge ml-auto">{row.details.nights || 0}N</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="row-fields">
                                                            <input type="text" className="cat-input mb-1" placeholder="City" value={row.details.city || ''} onChange={e => updateDetails(row.id, 'city', e.target.value)} />
                                                            <div className="field-group mt-1">
                                                                <input type="text" className="cat-input" placeholder="Purpose" value={row.details.purpose || ''} onChange={e => updateDetails(row.id, 'purpose', e.target.value)} style={{ flex: 1 }} />
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
                                                                    {incidentalTypes.filter(t => t !== 'Porter Charges' || carryingLuggage).map(t => (
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
                                                                }}
                                                                disabled={row.details.travelStatus === 'Cancelled' || row.details.travelStatus === 'No-Show' || ((row.nature === 'Travel' || row.nature === 'Local Travel') && row.details.bookedBy === 'Company Booked') || (row.nature === 'Food' && row.details.mealCategory && row.details.mealCategory !== 'Self Meal')}
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
                                                        <div className="field-group mt-1">
                                                            <div className="input-with-label-mini">
                                                                <label>Early Chk-In</label>
                                                                <input type="number" value={row.details.earlyCheckInCharges || ''} onChange={e => updateDetails(row.id, 'earlyCheckInCharges', e.target.value)} disabled={isSameDayTrip()} />
                                                            </div>
                                                            <div className="input-with-label-mini">
                                                                <label>Late Chk-Out</label>
                                                                <input type="number" value={row.details.lateCheckOutCharges || ''} onChange={e => updateDetails(row.id, 'lateCheckOutCharges', e.target.value)} disabled={isSameDayTrip()} />
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
                                                            {row.details.mode === 'Walk' ? (
                                                                <div className="no-cost-badge">No Cost (Walk)</div>
                                                            ) : (
                                                                row.details.travelStatus !== 'Cancelled' && row.details.travelStatus !== 'No-Show' ? (
                                                                    <>
                                                                        {(['Own Car', 'Self Drive Rental', 'Own Bike', 'Company Car', 'Rented Car (With Driver)', 'Pool Vehicle'].includes(row.details.subType)) && (
                                                                            <div className="field-group">
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
                                                                        {(['Own Car', 'Self Drive Rental', 'Own Bike'].includes(row.details.subType)) && (
                                                                            <div className="input-with-label-mini mt-1">
                                                                                <label>Fuel</label>
                                                                                <input type="number" value={row.details.fuel || ''} onChange={e => updateDetails(row.id, 'fuel', e.target.value)} />
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
                                                            <button className="add-bill-btn-mini" onClick={() => document.getElementById(`f-${row.id}`).click()} title="Add Bill">
                                                                <Plus size={14} />
                                                                <input type="file" id={`f-${row.id}`} hidden onChange={e => handleFileUpload(row.id, e.target.files[0])} accept="image/*,.pdf" />
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
                                                {!isLocked && (
                                                    <button className="row-del-btn" onClick={() => deleteRow(row.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))
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
                                                                    <span>{r.details.restaurant || 'Refreshments'}</span>
                                                                </>
                                                            )}
                                                            {r.nature === 'Accommodation' && (
                                                                <>
                                                                    <strong>{r.details.hotelName || 'Stay'}</strong>
                                                                    <span>{r.details.city} ({r.details.nights} Nights)</span>
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
                        {!isLocked && (
                            <div className="luggage-toggle-zone">
                                <label className="luggage-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={carryingLuggage}
                                        onChange={(e) => {
                                            setCarryingLuggage(e.target.checked);
                                            if (!e.target.checked) setLuggageWeight('');
                                        }}
                                    />
                                    <span>Carrying Luggage?</span>
                                </label>
                                {carryingLuggage && (
                                    <div className="weight-input-mini animate-pop-in">
                                        <label>Weight (Kg)</label>
                                        <input
                                            type="number"
                                            value={luggageWeight}
                                            onChange={(e) => setLuggageWeight(e.target.value)}
                                            placeholder="00"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
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
        </div>
    );
};

export default DynamicExpenseGrid;
