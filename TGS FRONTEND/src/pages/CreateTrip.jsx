import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext';
import {
    Plane,
    MapPin,
    Calendar,
    Users,
    Award,
    Briefcase,
    Info,
    Plus,
    X,
    Navigation,
    Camera,
    Gauge,
    Hotel,
    Check
} from 'lucide-react';

const CreateTrip = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        from: '',
        to: '',
        enRoute: '',
        startDate: '',
        endDate: '',
        composition: 'Solo',
        purpose: '',
        travelMode: 'Airways',
        vehicleType: 'Own',
        reportingManager: '',
        members: [],
        tripLeader: 'Self (Creator)',
        accommodationRequests: []
    });
    const [reportingInfo, setReportingInfo] = useState({ name: 'Loading...', id: null });
    const [newMember, setNewMember] = useState('');
    const [modalState, setModalState] = useState({
        isOpen: false,
        type: 'info',
        title: '',
        message: '',
        actions: null
    });
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [errors, setErrors] = useState({});

    const dropdownRef = useRef(null);

    useEffect(() => {
        const setupAuthData = async () => {
            if (user) {
                const userName = (user.first_name && user.last_name)
                    ? `${user.first_name} ${user.last_name}`
                    : (user.name || user.username || user.employee_id || 'Self (Creator)');

                setFormData(prev => ({
                    ...prev,
                    tripLeader: userName
                }));

                try {
                    const normalizeId = (id) => {
                        if (!id) return '';
                        return String(id).toLowerCase().trim()
                            .replace(/^[a-z]+-?/i, '')
                            .replace(/^0+/, '');
                    };

                    const empRes = await api.get('/api/employees/');
                    const employeesData = empRes.data.results || [];

                    const userCodeNormal = normalizeId(user.employee_id || user.username);
                    const me = employeesData.find(e => normalizeId(e.employee.employee_code) === userCodeNormal);

                    if (me && me.position?.reporting_to?.length > 0) {
                        const managerInfo = me.position.reporting_to[0];
                        const managerCode = managerInfo.employee_code || managerInfo.employee_id || managerInfo.id;
                        const managerName = managerInfo.name || managerInfo.employee_name || 'Assigned Manager';

                        const userRes = await api.get('/api/users/');
                        const systemUsers = userRes.data || [];
                        const systemMgr = systemUsers.find(u =>
                            normalizeId(u.employee_id) === normalizeId(managerCode) ||
                            normalizeId(u.username) === normalizeId(managerCode)
                        );

                        if (systemMgr) {
                            setFormData(prev => ({ ...prev, reportingManager: systemMgr.id }));
                            setReportingInfo({ name: systemMgr.name, id: systemMgr.id, code: managerCode });
                        } else {
                            const systemAdmin = systemUsers.find(u =>
                                ['Admin', 'IT-Admin', 'Superuser'].includes(u.role)
                            );

                            if (systemAdmin) {
                                setFormData(prev => ({ ...prev, reportingManager: systemAdmin.id }));
                                setReportingInfo({
                                    name: `System Admin fallback (for ${managerName})`,
                                    id: systemAdmin.id,
                                    code: managerCode,
                                    warning: `${managerName} not in system. Routing to Admin.`
                                });
                            } else {
                                setFormData(prev => ({ ...prev, reportingManager: null }));
                                setReportingInfo({
                                    name: `${managerName}`,
                                    id: null,
                                    code: managerCode,
                                    warning: "Not registered. No Admin fallback found."
                                });
                            }
                        }
                    } else {
                        const userRes = await api.get('/api/users/');
                        const systemUsers = userRes.data || [];
                        const systemAdmin = systemUsers.find(u =>
                            ['Admin', 'IT-Admin', 'Superuser'].includes(u.role)
                        );

                        if (systemAdmin) {
                            setFormData(prev => ({ ...prev, reportingManager: systemAdmin.id }));
                            setReportingInfo({
                                name: `${systemAdmin.name} (Default)`,
                                id: systemAdmin.id,
                                warning: "No manager in HR profile. Routing to Admin by default."
                            });
                        } else {
                            setFormData(prev => ({ ...prev, reportingManager: null }));
                            setReportingInfo({ name: 'System Administrator (Default)', id: null, warning: "No reporting manager found in HR profile." });
                        }
                    }
                } catch (error) {
                    console.error("Failed to detect reporting manager:", error);
                    setReportingInfo({ name: 'Error detecting manager', id: null });
                }
            }
        };

        setupAuthData();
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await api.get('/api/employees/');
                if (response.data && response.data.results) {
                    const mappedEmployees = response.data.results.map(item => ({
                        first_name: item.employee.name,
                        last_name: '',
                        employee_id: item.employee.employee_code
                    }));
                    setEmployees(mappedEmployees);
                    setFilteredEmployees(mappedEmployees);
                }
            } catch (error) {
                console.error("Failed to fetch employees:", error);
            }
        };
        fetchEmployees();
    }, []);

    useEffect(() => {
        if (newMember) {
            const lowerQuery = newMember.toLowerCase();
            const filtered = employees.filter(emp => {
                const fullName = (emp.first_name || '') + ' ' + (emp.last_name || '');
                const empId = emp.employee_id || '';
                return fullName.toLowerCase().includes(lowerQuery) ||
                    empId.toLowerCase().includes(lowerQuery);
            });
            setFilteredEmployees(filtered);
            setShowDropdown(true);
        } else {
            setFilteredEmployees(employees);
        }
    }, [newMember, employees]);



    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'composition' && value === 'Group') {
            const userName = user && (user.first_name && user.last_name)
                ? `${user.first_name} ${user.last_name}`
                : (user?.name || user?.username || user?.employee_id || 'Self (Creator)');

            setFormData(prev => ({ ...prev, composition: value, tripLeader: userName }));
            return;
        }

        if (['from', 'to'].includes(name) && !/^[a-zA-Z\s]*$/.test(value)) {
            return;
        }

        if (name === 'enRoute' && !/^[a-zA-Z\s,]*$/.test(value)) {
            return;
        }

        const newFormData = { ...formData, [name]: value };
        setFormData(newFormData);

        if (errors[name]) {
            const newErrors = { ...errors };
            delete newErrors[name];
            setErrors(newErrors);
        }

        if (name === 'endDate' && newFormData.startDate && new Date(value) < new Date(newFormData.startDate)) {
            setErrors(prev => ({ ...prev, endDate: "End Date cannot be before Start Date." }));
        }
    };

    const toggleRequest = (item) => {
        setFormData(prev => {
            const current = prev.accommodationRequests;
            const updated = current.includes(item)
                ? current.filter(i => i !== item)
                : [...current, item];
            return { ...prev, accommodationRequests: updated };
        });
    };

    const addMember = (employee) => {
        const memberString = `${employee.first_name} ${employee.last_name} (${employee.employee_id})`;
        if (!formData.members.includes(memberString)) {
            setFormData(prev => ({ ...prev, members: [...prev.members, memberString] }));
            setNewMember('');
            setShowDropdown(false);
            setErrors(prev => ({ ...prev, members: '' }));
        }
    };

    const removeMember = (member) => {
        setFormData(prev => ({ ...prev, members: prev.members.filter(m => m !== member) }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.from) newErrors.from = "Origin is required.";
        if (!formData.to) newErrors.to = "Destination is required.";
        if (!formData.startDate) newErrors.startDate = "Start Date is required.";
        if (!formData.endDate) newErrors.endDate = "End Date is required.";
        if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
            newErrors.endDate = "End Date cannot be before Start Date.";
        }
        if (!formData.purpose) newErrors.purpose = "Purpose of trip is required.";

        if (formData.composition === 'Mutual' && formData.members.length < 1) {
            newErrors.members = "Mutual travel requires at least 1 additional member.";
        }
        if (formData.composition === 'Group' && formData.members.length < 2) {
            newErrors.members = "Group travel requires at least 2 additional members.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showToast("Please correct the errors in the form.", "error");
            return;
        }

        const payload = {
            source: formData.from,
            destination: formData.to,
            en_route: formData.enRoute,
            start_date: formData.startDate,
            end_date: formData.endDate,
            composition: formData.composition,
            purpose: formData.purpose,
            travel_mode: formData.travelMode,
            vehicle_type: formData.vehicleType === 'Own' ? 'Own' : (formData.vehicleType === 'Service' ? 'Service' : null),
            start_odometer: formData.startOdometer,
            project_code: formData.project,
            reporting_manager: formData.reportingManager,
            members: formData.members,
            trip_leader: formData.tripLeader,
            accommodation_requests: formData.accommodationRequests
        };

        try {
            const response = await api.post('/api/trips/', payload);
            console.log('Trip Created:', response.data);

            setModalState({
                isOpen: true,
                type: 'success',
                actions: (
                    <button className="btn-primary" onClick={() => navigate('/trips')}>
                        Go to My Trips
                    </button>
                )
            });

        } catch (error) {
            console.error("Error creating trip:", error);
            const errorMessage = error.response?.data?.detail || 'Failed to submit trip request. Please try again.';
            showToast(errorMessage, 'error');
            setModalState({
                isOpen: true,
                type: 'error',
                title: 'Submission Failed',
                message: errorMessage,
                actions: null
            });
        }
    };

    const needsOdometer = ['2 Wheeler', '3 Wheeler', '4 Wheeler'].includes(formData.travelMode);

    return (
        <div className="create-trip-page">
            <div className="page-header">
                <div>
                     <button className="back-btn-simple" onClick={() => navigate('/trips')}>
                        <span className="ct-back-arrow">←</span> Back to Trips
                    </button>
                    <h1>Create New Trip</h1>
                    <p>Provide your travel details to initiate the approval lifecycle.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="trip-form">
                <div className="form-grid">

                    {/* JOURNEY LOGISTICS */}
                    <div className="form-section premium-card">
                        <div className="section-title">
                            <Navigation size={20} className="title-icon" />
                            <h3>Journey Logistics</h3>
                        </div>

                        <div className="input-field">
                            <label>Origin (From) <span className="required">*</span></label>
                            <div className={`input-with-icon ${errors.from ? 'error-border' : ''}`}>
                                <MapPin size={18} className="field-icon" />
                                <input name="from" placeholder="Starting location" value={formData.from} onChange={handleChange} />
                            </div>
                            {errors.from && <span className="error-text">{errors.from}</span>}
                        </div>

                        <div className="input-field">
                            <label>Destination (To) <span className="required">*</span></label>
                            <div className={`input-with-icon ${errors.to ? 'error-border' : ''}`}>
                                <MapPin size={18} className="field-icon" />
                                <input name="to" placeholder="Final destination" value={formData.to} onChange={handleChange} />
                            </div>
                            {errors.to && <span className="error-text">{errors.to}</span>}
                        </div>

                        <div className="input-field">
                            <label>En Route (Stops)</label>
                            <input name="enRoute" placeholder="e.g. Hyderabad, Vijayawada" value={formData.enRoute} onChange={handleChange} />
                        </div>

                        <div className="date-row">
                            <div className="input-field">
                                <label>From Date <span className="required">*</span></label>
                                <div className={`input-with-icon ${errors.startDate ? 'error-border' : ''}`}>
                                    <Calendar size={18} className="field-icon" />
                                    <input
                                        name="startDate"
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={formData.startDate}
                                        onChange={handleChange}
                                    />
                                </div>
                                {errors.startDate && <span className="error-text">{errors.startDate}</span>}
                            </div>
                            <div className="input-field">
                                <label>To Date <span className="required">*</span></label>
                                <div className={`input-with-icon ${errors.endDate ? 'error-border' : ''}`}>
                                    <Calendar size={18} className="field-icon" />
                                    <input
                                        name="endDate"
                                        type="date"
                                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                                        value={formData.endDate}
                                        onChange={handleChange}
                                    />
                                </div>
                                {errors.endDate && <span className="error-text">{errors.endDate}</span>}
                            </div>
                        </div>
                    </div>

                    {/* COMPOSITION & PURPOSE */}
                    <div className="form-section premium-card">
                        <div className="section-title">
                            <Users size={20} className="title-icon" />
                            <h3>Composition & Purpose</h3>
                        </div>

                        <div className="input-field">
                            <label>Travel Composition</label>
                            <select name="composition" value={formData.composition} onChange={handleChange}>
                                <option value="Solo">Solo Travel</option>
                                <option value="Mutual">Mutual (2 Teams)</option>
                                <option value="Group">Group Travel (3+)</option>
                            </select>
                        </div>

                        {formData.composition !== 'Solo' && (
                            <div className="input-field">
                                <label>Trip Leader</label>
                                <div className="input-with-icon">
                                    <Award size={18} className="field-icon" />
                                    <input
                                        name="tripLeader"
                                        placeholder="Assign leader"
                                        value={formData.tripLeader}
                                        onChange={handleChange}
                                        disabled={formData.composition === 'Group'}
                                    />
                                </div>
                                {formData.composition === 'Group' && <p className="helper-text">Group trips are automatically led by the creator.</p>}
                            </div>
                        )}

                        <div className="input-field">
                            <label>Purpose of Trip <span className="required">*</span></label>
                            <textarea
                                name="purpose"
                                className={errors.purpose ? 'error-border' : ''}
                                placeholder="State the business objective..."
                                value={formData.purpose}
                                onChange={handleChange}
                                rows={4}
                            />
                            {errors.purpose && <span className="error-text">{errors.purpose}</span>}
                        </div>

                    </div>

                    {/* TRAVEL MODE & CAPTURE */}
                    <div className="form-section premium-card full-width overflow-visible">
                        <div className="section-title">
                            <Gauge size={20} className="title-icon" />
                            <h3>Travel Mode & Verification</h3>
                        </div>

                        <div className="mode-selection-grid">
                            <div className="input-field">
                                <label>Primary Mode of Travel</label>
                                <select name="travelMode" value={formData.travelMode} onChange={handleChange}>
                                    <option value="Airways">Airways</option>
                                    <option value="Train">Train</option>
                                    <option value="Bus">Bus</option>
                                    <option value="2 Wheeler">2 Wheeler</option>
                                    <option value="3 Wheeler">3 Wheeler</option>
                                    <option value="4 Wheeler">4 Wheeler</option>
                                </select>
                            </div>

                            {needsOdometer && (
                                <>
                                    <div className="input-field">
                                        <label>Vehicle Type</label>
                                        <select name="vehicleType" value={formData.vehicleType} onChange={handleChange}>
                                            <option value="Own">Own Vehicle</option>
                                            <option value="Service">Service / Outsourced</option>
                                        </select>
                                    </div>

                                    {formData.vehicleType === 'Own' ? (
                                        <div className="service-alert warning">
                                            <Camera size={18} />
                                            <p>Odometer capture is <strong>not required</strong> during the request phase. You will be prompted to record the starting reading via the <strong>Mileage Capture</strong> module once the trip commences.</p>
                                        </div>
                                    ) : (
                                        <div className="service-alert">
                                            <Info size={18} />
                                            <p>For service vehicles, please apply for fuel/maintenance reimbursements via the <strong>Expense Entry</strong> page after travel.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {formData.composition !== 'Solo' && (
                            <div className="members-section">
                                <label>Additional Team Members <span className="required">*</span></label>
                                <div className="add-member-row relative" ref={dropdownRef}>
                                    <input
                                        placeholder="Search by name or ID..."
                                        value={newMember}
                                        onChange={(e) => setNewMember(e.target.value)}
                                        onFocus={() => setShowDropdown(true)}
                                        className={errors.members ? 'error-border' : ''}
                                    />
                                    {showDropdown && filteredEmployees.length > 0 && (
                                        <div className="member-dropdown">
                                            {filteredEmployees.map(emp => (
                                                <div
                                                    key={emp.employee_id}
                                                    className="dropdown-item"
                                                    onClick={() => addMember(emp)}
                                                >
                                                    <span className="emp-name">{emp.first_name} {emp.last_name}</span>
                                                    <span className="emp-id">{emp.employee_id}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {errors.members && <span className="error-text">{errors.members}</span>}
                                <div className="members-chips">
                                    {formData.members.map((m, i) => (
                                        <div key={i} className="member-chip">
                                            <span>{m}</span>
                                            <button type="button" onClick={() => removeMember(m)}><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* LOGISTICS & STAY CHECKLIST */}
                    <div className="form-section premium-card full-width">
                        <div className="section-title">
                            <Hotel size={20} className="title-icon" />
                            <h3>Logistics & Stay Checklist</h3>
                        </div>

                        <div className="checklist-container">
                            <div
                                className={`checklist-item ${formData.accommodationRequests.includes('Request for Room') ? 'active' : ''}`}
                                onClick={() => toggleRequest('Request for Room')}
                            >
                                <div className="checkbox-box">
                                    {formData.accommodationRequests.includes('Request for Room') && <Check size={16} />}
                                </div>
                                <div className="checklist-text">
                                    <label>Request for Room</label>
                                    <p>Forwarded to manager for booking coordination.</p>
                                </div>
                            </div>

                            {/* Optional: Add more checklist items here in the future */}
                        </div>

                        {formData.accommodationRequests.length > 0 && (
                            <div className="service-alert info full-width ct-alert-margin">
                                <Info size={18} />
                                <p>Selected requests will be visible to your Approving Manager for further forwarding to the booking teams.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-primary">Initiate Trip Request</button>
                </div>
            </form>

            <Modal
                isOpen={modalState.isOpen}
                onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                title={modalState.title}
                type={modalState.type}
                actions={modalState.actions}
            >
                {modalState.message}
            </Modal>


        </div>
    );
};

export default CreateTrip;
