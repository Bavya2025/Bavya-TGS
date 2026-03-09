import React, { useState, useEffect, useRef } from 'react';
import {
    FolderPlus,
    ShieldCheck,
    FileText,
    Building2,
    Upload,
    Eye,
    Trash2,
    CheckCircle2,
    AlertCircle,
    CreditCard,
    Briefcase,
    Globe,
    Car,
    Info,
    Camera,
    Ticket,
    PlusCircle,
    X
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';



const DocumentCard = ({
    id, label, icon, placeholder,
    type = 'mandatory', showInput = false, isTripDoc = false,
    doc, isAdmin,
    onTextChange, onFileChange, onRemoveFile,
    onUpdateTripTitle, onDeleteTripDoc, onViewDoc
}) => {
    const isVerified = !!doc?.file;
    const fileInputRef = useRef(null);

    return (
        <div className={`doc-premium-card ${isVerified ? 'has-content' : ''} ${type}`}>
            {isTripDoc && (
                <button className="delete-card-btn" onClick={() => onDeleteTripDoc(id)}>
                    <X size={14} />
                </button>
            )}
            <div className="card-badge">
                {isVerified
                    ? <CheckCircle2 size={14} />
                    : (type === 'mandatory' ? <AlertCircle size={14} /> : <Info size={14} />)
                }
                <span>{isVerified ? 'Verified' : (type === 'mandatory' ? 'Required' : 'Optional')}</span>
            </div>

            <div className="card-header">
                <div className="icon-box" style={{ color: '#A50021' }}>{icon}</div>
                <div className="title-box">
                    {isTripDoc ? (
                        <input
                            className="dynamic-title-input"
                            placeholder="Enter Title (e.g. Flight Ticket)"
                            value={doc?.title || ''}
                            onChange={(e) => onUpdateTripTitle(id, e.target.value)}
                        />
                    ) : (
                        <h4>{label}{type === 'mandatory' && <span className="star-mark">*</span>}</h4>
                    )}
                    <p>{doc?.fileName || 'No file uploaded'}</p>
                </div>
            </div>

            <div className="card-body">
                {!doc?.file ? (
                    <div className="upload-container">
                        {showInput && (
                            <div className="input-group-premium" style={{ marginBottom: '1rem' }}>
                                <label>{label} Number</label>
                                <input
                                    type="text"
                                    placeholder={placeholder}
                                    value={doc?.val || ''}
                                    onChange={(e) => onTextChange(id, e.target.value)}
                                />
                            </div>
                        )}
                        {(!isTripDoc && id === 'gstNo' && !isAdmin) ? (
                            <div className="upload-zone disabled">
                                <ShieldCheck size={20} />
                                <span>Only Admin can upload GSTIN</span>
                            </div>
                        ) : (
                            <div className="upload-zone" onClick={() => fileInputRef.current.click()}>
                                <input
                                    type="file"
                                    hidden
                                    ref={fileInputRef}
                                    onChange={(e) => onFileChange(id, e, isTripDoc)}
                                />
                                <Upload size={20} />
                                <span>Upload Document Scan</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="uploaded-success-body">
                        {(doc.val || (isTripDoc && doc.title)) && (
                            <div className="doc-number-preview-group">
                                <span className="doc-number-label">
                                    {isTripDoc ? (doc.title || 'Document') : label}
                                </span>
                                {doc.val && <div className="doc-number-value">{doc.val}</div>}
                            </div>
                        )}
                        <div className="preview-container">
                            {doc.file.startsWith('data:image/')
                                ? <img src={doc.file} alt="Preview" />
                                : <iframe src={doc.file} title="Preview" />
                            }
                        </div>
                        <div className="file-actions">
                            <button className="btn-preview" onClick={() =>
                                onViewDoc({ file: doc.file, title: isTripDoc ? (doc.title || 'Document') : label })
                            }>
                                <Eye size={16} /> View
                            </button>
                            {(!(!isTripDoc && id === 'gstNo' && !isAdmin)) && (
                                <button className="btn-remove" onClick={() => onRemoveFile(id, isTripDoc)}>
                                    <Trash2 size={16} /> Remove
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


const DocumentOrganizerPage = () => {
    const { showToast, confirm } = useToast();
    const { user } = useAuth();

    const isAdmin = ['admin', 'it-admin', 'superuser', 'it admin', 'system administrator', 'system-admin', 'system setup admin']
        .includes(user?.role?.toLowerCase());

    const [docs, setDocs] = useState({
        aadharId:       { val: '', file: null, fileName: '' },
        companyId:      { val: '', file: null, fileName: '' },
        drivingLicense: { val: '', file: null, fileName: '' },
        pan:            { val: '', file: null, fileName: '' },
        passport:       { val: '', file: null, fileName: '' },
        gstNo:          { val: '', file: null, fileName: '' }
    });
    const [tripDocs, setTripDocs] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [viewingDoc, setViewingDoc] = useState(null);

    useEffect(() => {
        if (!user?.employee_id) return;
        const userKey = `user_documents_${user.employee_id}`;
        const tripKey = `user_trip_documents_${user.employee_id}`;
        const savedDocs = sessionStorage.getItem(userKey);
        const savedTripDocs = sessionStorage.getItem(tripKey);

        if (savedDocs) {
            try { setDocs(JSON.parse(savedDocs)); } catch (e) { console.error(e); }
        } else {
            setDocs({
                aadharId:       { val: '', file: null, fileName: '' },
                companyId:      { val: '', file: null, fileName: '' },
                drivingLicense: { val: '', file: null, fileName: '' },
                pan:            { val: '', file: null, fileName: '' },
                passport:       { val: '', file: null, fileName: '' },
                gstNo:          { val: '', file: null, fileName: '' }
            });
        }

        if (savedTripDocs) {
            try { setTripDocs(JSON.parse(savedTripDocs)); } catch (e) { console.error(e); }
        } else {
            setTripDocs([]);
        }
    }, [user?.employee_id]);

    const handleTextChange = (key, value) => {
        setDocs(prev => {
            const next = { ...prev, [key]: { ...prev[key], val: value } };
            if (user?.employee_id) {
                sessionStorage.setItem(`user_documents_${user.employee_id}`, JSON.stringify(next));
            }
            return next;
        });
    };

    const handleFileChange = (key, e, isTripDoc = false) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (isTripDoc) {
                setTripDocs(prev => {
                    const next = prev.map(d => d.id === key ? { ...d, file: reader.result, fileName: file.name } : d);
                    if (user?.employee_id) {
                        sessionStorage.setItem(`user_trip_documents_${user.employee_id}`, JSON.stringify(next));
                    }
                    return next;
                });
            } else {
                setDocs(prev => {
                    const next = { ...prev, [key]: { ...prev[key], file: reader.result, fileName: file.name } };
                    if (user?.employee_id) {
                        sessionStorage.setItem(`user_documents_${user.employee_id}`, JSON.stringify(next));
                    }
                    return next;
                });
            }
            showToast(`${file.name} uploaded successfully`, 'success');
        };
        reader.readAsDataURL(file);
    };

    const removeFile = async (key, isTripDoc = false) => {
        const confirmed = await confirm('Are you sure you want to remove this document?');
        if (!confirmed) return;

        if (isTripDoc) {
            setTripDocs(prev => {
                const next = prev.map(d => d.id === key ? { ...d, file: null, fileName: '' } : d);
                if (user?.employee_id) {
                    sessionStorage.setItem(`user_trip_documents_${user.employee_id}`, JSON.stringify(next));
                }
                return next;
            });
        } else {
            setDocs(prev => {
                const next = { ...prev, [key]: { ...prev[key], file: null, fileName: '' } };
                if (user?.employee_id) {
                    sessionStorage.setItem(`user_documents_${user.employee_id}`, JSON.stringify(next));
                }
                return next;
            });
        }
    };

    const addTripDoc = () => {
        const newDoc = { id: Date.now(), title: '', val: '', file: null, fileName: '' };
        setTripDocs(prev => [...prev, newDoc]);
    };

    const updateTripTitle = (id, title) => {
        setTripDocs(prev => {
            const next = prev.map(d => d.id === id ? { ...d, title } : d);
            if (user?.employee_id) {
                sessionStorage.setItem(`user_trip_documents_${user.employee_id}`, JSON.stringify(next));
            }
            return next;
        });
    };

    const deleteTripDoc = async (id) => {
        const confirmed = await confirm('Are you sure you want to delete this trip document?');
        if (!confirmed) return;

        setTripDocs(prev => {
            const next = prev.filter(d => d.id !== id);
            if (user?.employee_id) {
                sessionStorage.setItem(`user_trip_documents_${user.employee_id}`, JSON.stringify(next));
            }
            return next;
        });
    };

    const handleSave = () => {
        if (!user?.employee_id) {
            showToast('User session not found. Please log in again.', 'error');
            return;
        }
        setIsSaving(true);
        setTimeout(() => {
            sessionStorage.setItem(`user_documents_${user.employee_id}`, JSON.stringify(docs));
            sessionStorage.setItem(`user_trip_documents_${user.employee_id}`, JSON.stringify(tripDocs));
            setIsSaving(false);
            showToast('Repository synchronized!', 'success');
        }, 1200);
    };

    // Shared props passed to every DocumentCard
    const cardProps = {
        isAdmin,
        onTextChange: handleTextChange,
        onFileChange: handleFileChange,
        onRemoveFile: removeFile,
        onUpdateTripTitle: updateTripTitle,
        onDeleteTripDoc: deleteTripDoc,
        onViewDoc: setViewingDoc,
    };

    return (
        <div className="doc-page-container animate-fade-in">
            <div className="doc-page-header">
                <div className="header-content">
                    <FolderPlus size={32} style={{ color: '#A50021' }} />
                    <div className="title-area"><h1>Document Organizer</h1></div>
                </div>
                <button className={`sync-btn ${isSaving ? 'loading' : ''}`} onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Synchronizing...' : 'Save & Sync Repository'}
                    {!isSaving && <CheckCircle2 size={18} />}
                </button>
            </div>

            <div className="doc-sections-grid">
                <div className="doc-grid-section">
                    <div className="section-title"><ShieldCheck className="icon-green" size={20} /><h3>Identity Documents</h3></div>
                    <div className="cards-wrapper">
                        <DocumentCard id="aadharId"  label="Aadhar ID"       icon={<CreditCard size={20} />} placeholder="12-digit UIDAI Number" doc={docs.aadharId}  {...cardProps} />
                        <DocumentCard id="companyId" label="Company ID Card" icon={<Briefcase size={20} />} placeholder="Employee Code"          doc={docs.companyId} {...cardProps} />
                    </div>
                </div>

                <div className="doc-grid-section">
                    <div className="section-title"><FileText className="icon-blue" size={20} /><h3>Additional Documents</h3></div>
                    <div className="cards-wrapper triple">
                        <DocumentCard id="drivingLicense" label="Driving License" icon={<Car size={20} />}        placeholder="License Number"  type="optional" doc={docs.drivingLicense} {...cardProps} />
                        <DocumentCard id="pan"            label="PAN Card"        icon={<CreditCard size={20} />} placeholder="Alphanumeric PAN" type="optional" doc={docs.pan}            {...cardProps} />
                        <DocumentCard id="passport"       label="Passport"        icon={<Globe size={20} />}      placeholder="Passport Number"  type="optional" doc={docs.passport}       {...cardProps} />
                    </div>
                </div>

                <div className="doc-grid-section">
                    <div className="section-title"><Ticket size={20} style={{ color: '#A50021' }} /><h3>Trip Documents</h3></div>
                    <div className="cards-wrapper">
                        {tripDocs.map(td => (
                            <DocumentCard
                                key={td.id}
                                id={td.id}
                                label={td.title}
                                icon={<Ticket size={20} />}
                                isTripDoc={true}
                                type="optional"
                                doc={td}
                                {...cardProps}
                            />
                        ))}
                        <div className="add-doc-card-placeholder" onClick={addTripDoc}>
                            <div className="add-doc-circle"><PlusCircle size={32} /></div>
                            <span>Add New Trip Document</span>
                        </div>
                    </div>
                </div>

                <div className="doc-grid-section mb-5">
                    <div className="section-title"><Building2 className="icon-orange" size={20} /><h3>Company GST</h3></div>
                    <div className="cards-wrapper">
                        <DocumentCard
                            id="gstNo" label="Personal GSTIN"
                            icon={<Building2 size={20} />}
                            placeholder="GST Identification Number"
                            type="optional" showInput={true}
                            doc={docs.gstNo}
                            {...cardProps}
                        />
                    </div>
                </div>
            </div>

            <Modal
                isOpen={!!viewingDoc}
                onClose={() => setViewingDoc(null)}
                title={viewingDoc?.title || 'Document Viewer'}
                size="xl"
            >
                <div className="doc-viewer-container">
                    {viewingDoc?.file.startsWith('data:image/') ? (
                        <img src={viewingDoc.file} alt="Preview" className="modal-preview-img" />
                    ) : (
                        <iframe src={viewingDoc?.file} title="Preview" className="modal-preview-iframe" />
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default DocumentOrganizerPage;
