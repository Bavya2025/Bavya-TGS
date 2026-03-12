import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal';
import { encodeId } from '../utils/idEncoder';
import { 
    Upload, 
    CheckCircle2, 
    Clock, 
    Download,
    User,
    Calendar,
    Briefcase,
    Navigation,
    Info,
    FileSpreadsheet,
    AlertCircle,
    Check,
    X,
    FileText,
    ArrowLeft
} from 'lucide-react';

const TravelCreation = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [file, setFile] = useState(null);
    const [policyAccepted, setPolicyAccepted] = useState(false);
    const [reportingInfo, setReportingInfo] = useState({ name: 'Loading...', id: null });
    
    const [formData, setFormData] = useState({
        purpose: '',
        month: new Date().toISOString().slice(0, 7), // YYYY-MM
        project: 'General',
        reportingManager: null
    });

    const [submitting, setSubmitting] = useState(false);
    const [modalState, setModalState] = useState({
        isOpen: false,
        type: 'success',
        title: '',
        message: '',
        actions: null
    });

    useEffect(() => {
        const detectManager = async () => {
            if (!user?.employee_id) return;
            try {
                // Same logic as CreateTrip
                const empRes = await api.get(`/api/employees/?employee_code=${user.employee_id}`);
                const employeesData = Array.isArray(empRes.data) ? empRes.data : (empRes.data.results || []);
                const me = employeesData.find(e =>
                    String(e.employee?.employee_code || e.employee_code).toLowerCase().includes(String(user.employee_id).toLowerCase())
                );

                // ── Auto-fill project code from employee HR profile ──
                if (me) {
                    const projectName = me.project?.name || '';
                    if (projectName) {
                        // '104 Project' → 'PROJ-104', otherwise use first 6 chars uppercased
                        const numMatch = projectName.match(/(\d+)/);
                        const derivedCode = numMatch
                            ? `PROJ-${numMatch[1]}`
                            : projectName.slice(0, 6).toUpperCase();
                        setFormData(prev => ({ ...prev, project: derivedCode }));
                    }
                }

                if (me && me.position?.reporting_to?.length > 0) {
                    const managerInfo = me.position.reporting_to[0];
                    const managerCode = managerInfo.employee_code || managerInfo.employee_id;
                    const managerName = managerInfo.name || managerInfo.employee_name || 'Assigned Manager';

                    const userRes = await api.get('/api/users/?all_pages=true');
                    const systemUsers = Array.isArray(userRes.data) ? userRes.data : (userRes.data.results || []);
                    const systemMgr = systemUsers.find(u =>
                        String(u.employee_id).toLowerCase() === String(managerCode).toLowerCase()
                    );

                    if (systemMgr) {
                        setFormData(prev => ({ ...prev, reportingManager: systemMgr.id }));
                        setReportingInfo({ name: systemMgr.name, id: systemMgr.id });
                    } else {
                        setReportingInfo({
                            name: managerName,
                            id: null,
                            warning: "Manager not registered. Routed automatically."
                        });
                    }
                } else {
                    setReportingInfo({ name: "Routing Automatically", id: null });
                }
            } catch (error) {
                console.error("Manager detection failed", error);
                setReportingInfo({ name: 'Assigned Manager', id: null });
            }
        };
        detectManager();
    }, [user]);

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/api/bulk-activities/template/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'travel_activities_template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            showToast("Template downloaded successfully", "success");
        } catch (error) {
            console.error('Download error:', error);
            showToast("Failed to download template", "error");
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
                setFile(selectedFile);
            } else {
                showToast("Please select a valid Excel file (.xlsx or .xls)", "error");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!file) {
            showToast("Please upload the activities file", "error");
            return;
        }

        if (!formData.purpose) {
            showToast("Please provide a purpose for this travel request", "error");
            return;
        }

        if (!policyAccepted) {
            showToast("You must accept the travel policy to proceed", "error");
            return;
        }

        setSubmitting(true);

        try {
            const [year, month] = formData.month.split('-');
            const startDate = `${year}-${month}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${month}-${lastDay}`;

            const tripPayload = {
                source: 'Various (Local)',
                destination: 'Various (Local)',
                consider_as_local: true,
                start_date: startDate,
                end_date: endDate,
                composition: 'Solo',
                purpose: formData.purpose,
                travel_mode: 'Car / Cab',
                project_code: formData.project,
                reporting_manager: formData.reportingManager
            };

            const tripRes = await api.post('/api/trips/', tripPayload);
            const tripId = tripRes.data.trip_id;

            const bulkFormData = new FormData();
            bulkFormData.append('file', file);
            bulkFormData.append('trip_id', tripId);

            await api.post('/api/bulk-activities/upload/', bulkFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setModalState({
                isOpen: true,
                type: 'success',
                title: 'Travel Request Created!',
                message: (
                    <div className="text-center p-4">
                        <p className="text-slate-600 mb-6">Your local travel request and activity logs have been submitted successfully for approval.</p>
                        <div className="flex flex-col gap-2 items-center bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Travel Request ID</span>
                            <span className="text-3xl font-black text-primary tracking-tight">{tripId}</span>
                        </div>
                    </div>
                ),
                actions: [
                    { label: 'Back to Trips', onClick: () => navigate('/trips'), variant: 'secondary' },
                    { label: 'View Request', onClick: () => navigate(`/trip-story/${encodeId(tripId)}`), variant: 'primary' }
                ]
            });
        } catch (error) {
            console.error("Submission failed", error);
            showToast(error.response?.data?.error || "Failed to create travel request", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="create-trip-page">
            <div className="page-header">
                <div>
                    <button className="back-btn-simple" onClick={() => navigate('/trips')}>
                        <span className="ct-back-arrow">←</span> Back to Trips
                    </button>
                    <h1>New Travel Request</h1>
                    <p>Provide details for your monthly local travel settlement.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="trip-form">
                <div className="form-grid">
                    
                    {/* TRAVEL CONTEXT */}
                    <div className="form-section premium-card">
                        <div className="section-title">
                            <Briefcase size={20} className="title-icon" />
                            <h3>Travel Context</h3>
                        </div>

                        <div className="input-field" style={{ gridColumn: '1 / -1' }}>
                            <label>Traveler Detail (Auto-Filled)</label>
                            <div className="flex items-center gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 group hover:border-primary/20 transition-all duration-300">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <User size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-base font-bold text-slate-800">{user?.name || 'Loading...'}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider shadow-sm">ID: {user?.employee_id || 'U-0000'}</span>
                                        <span className="text-[10px] font-bold text-slate-300">•</span>
                                        <span className="text-xs font-medium text-slate-400 italic">Self Service Mode</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="date-row" style={{ gridColumn: '1 / -1' }}>
                            <div className="input-field">
                                <label>Settlement Month <span className="required">*</span></label>
                                <div className="input-with-icon">
                                    <Calendar size={18} className="field-icon" />
                                    <input 
                                        type="month" 
                                        value={formData.month} 
                                        onChange={(e) => setFormData({...formData, month: e.target.value})}
                                        required 
                                        className="h-[48px]"
                                    />
                                </div>
                            </div>

                            <div className="input-field">
                                <label>Project Code</label>
                                <div className="input-with-icon">
                                    <Briefcase size={18} className="field-icon" />
                                    <input 
                                        type="text" 
                                        value={formData.project} 
                                        onChange={(e) => setFormData({...formData, project: e.target.value})}
                                        placeholder="Enter Project Code"
                                        className="h-[48px]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="input-field" style={{ gridColumn: '1 / -1' }}>
                            <label>Business Objective / Purpose <span className="required">*</span></label>
                            <textarea 
                                value={formData.purpose} 
                                onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                                placeholder="State the business objective for this month's travel..."
                                rows={4}
                                required
                            />
                        </div>

                        {reportingInfo.id ? (
                            <div className="service-alert info mt-2">
                                <Check size={16} />
                                <p>Reported to: <strong>{reportingInfo.name}</strong></p>
                            </div>
                        ) : reportingInfo.warning ? (
                            <div className="service-alert warning mt-2">
                                <AlertCircle size={16} />
                                <p>{reportingInfo.warning}</p>
                            </div>
                        ) : null}
                    </div>

                    {/* BULK UPLOAD SECTION */}
                    <div className="form-section premium-card">
                        <div className="section-title">
                            <FileSpreadsheet size={20} className="title-icon" />
                            <h3>Activity Log Selection</h3>
                        </div>

                        <div className="service-alert info animate-fade-in mb-4">
                            <Info size={18} />
                            <p>Monthly travel requires a validated bulk upload of daily activities.</p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <button type="button" className="btn-secondary w-full group hover:bg-slate-50 transition-colors" onClick={handleDownloadTemplate} style={{ border: '1.5px solid #f1f5f9' }}>
                                <div className="flex items-center justify-center gap-3">
                                    <Download size={18} className="group-hover:translate-y-1 transition-transform" />
                                    <span>Download Excel Template</span>
                                </div>
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-slate-100"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-3 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Then</span>
                                </div>
                            </div>

                            <div className={`file-upload-zone ${file ? 'active' : ''}`} style={{ border: '2px dashed #f1f5f9', borderRadius: '24px', padding: '1.5rem', background: file ? '#f0fdf4' : '#fafafa', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                <input 
                                    type="file" 
                                    id="bulkFile" 
                                    accept=".xlsx, .xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label htmlFor="bulkFile" className="cursor-pointer flex flex-col items-center gap-4 py-4">
                                    {file ? (
                                        <>
                                            <div className="w-16 h-16 rounded-2xl bg-emerald-100/50 flex items-center justify-center text-emerald-600 shadow-sm">
                                                <CheckCircle2 size={32} />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-slate-700 text-sm max-w-[200px] truncate">{file.name}</p>
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter mt-1">Ready to Upload • {(file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm group-hover:bg-slate-50">
                                                <Upload size={32} />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-slate-600 text-sm">Upload Log File</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">XLSX or XLS Only</p>
                                            </div>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className="ct-alert-card warning mt-4 shadow-none border-dashed border-2 flex items-start gap-4 p-4 !bg-transparent" style={{ borderColor: '#fef3c7' }}>
                            <AlertCircle size={24} className="text-warning flex-shrink-0" />
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Compliance Reminder</span>
                                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                                    Activity dates must fall within the selected settlement month. Any out-of-range dates will be automatically flagged for manual review.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* POLICY ACCEPTANCE */}
                <div className="policy-acceptance-section premium-card mt-8">
                    <label className="flex items-center gap-4 cursor-pointer select-none group">
                        <div className={`w-7 h-7 rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${policyAccepted ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'border-slate-200 bg-white group-hover:border-primary'}`}>
                            {policyAccepted && <Check size={18} className="text-white" />}
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={policyAccepted}
                                onChange={(e) => setPolicyAccepted(e.target.checked)}
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-800 font-bold text-sm tracking-tight">
                                I confirm the authenticity of the travel logs provided above.
                            </span>
                            <span className="text-slate-400 text-xs font-medium">
                                I have read and accepted the <button type="button" className="text-primary hover:underline font-extrabold ml-1">Travel Governance Policy</button>
                            </span>
                        </div>
                    </label>
                </div>

                <div className="form-actions">
                    <button 
                        type="submit" 
                        className={`btn-primary shadow-xl ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        disabled={submitting}
                        style={{ height: '56px', minWidth: '240px' }}
                    >
                        {submitting ? (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <FileText size={20} />
                                <span>Initiate Travel Settlement</span>
                            </div>
                        )}
                    </button>
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

export default TravelCreation;
