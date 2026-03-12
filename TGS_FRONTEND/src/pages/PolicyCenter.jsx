import React, { useState, useEffect } from 'react';
import {
    Languages,
    FileText,
    Download,
    Upload,
    Plus,
    X,
    Trash2,
    Eye,
    Pencil
} from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext.jsx';

const PolicyCenter = () => {
    const { user } = useAuth();
    const { showToast, confirm } = useToast();
    const [language, setLanguage] = useState('English');
    const [policies, setPolicies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [editingPolicyId, setEditingPolicyId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [viewContent, setViewContent] = useState(null); // {title: string, content: string}

    // Admin check
    const isAdmin = user?.role?.toLowerCase().includes('admin');

    const [uploadData, setUploadData] = useState({
        title: '',
        category: 'General',
        file_en: null,
        file_te: null,
        file_hi: null
    });

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/policies/');
            const payload = response?.data;
            const list = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.results)
                    ? payload.results
                    : Array.isArray(payload?.value)
                        ? payload.value
                        : [];
            setPolicies(list);
        } catch (error) {
            console.error("Failed to fetch policies:", error);
            showToast("Failed to load policies", "error");
        } finally {
            setIsLoading(false);
        }
    };


    const handleFileChange = (lang, file) => {
        if (file && file.type !== 'application/pdf') {
            showToast("Please upload PDF files only", "error");
            return;
        }
        setUploadData(prev => ({ ...prev, [`file_${lang}`]: file }));
    };

    const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        
        if (!uploadData.title) {
            showToast("Please provide a title", "error");
            return;
        }

        if (!uploadData.file_en && !uploadData.file_te && !uploadData.file_hi) {
            showToast("Please upload at least one PDF file", "error");
            return;
        }

        setIsUploading(true);
        try {
            const finalData = {
                title: uploadData.title,
                category: uploadData.category
            };

            // Process all selected files to Base64
            const languages = ['en', 'te', 'hi'];
            for (const lang of languages) {
                if (uploadData[`file_${lang}`]) {
                    const base64 = await readFileAsBase64(uploadData[`file_${lang}`]);
                    finalData[`file_content_${lang}`] = base64;
                    finalData[`file_name_${lang}`] = uploadData[`file_${lang}`].name;
                    finalData[`file_size_${lang}`] = (uploadData[`file_${lang}`].size / 1024).toFixed(2) + " KB";
                }
            }

            if (editingPolicyId) {
                await api.put(`/api/policies/${editingPolicyId}/`, finalData);
                showToast("Policy updated successfully", "success");
            } else {
                await api.post('/api/policies/', finalData);
                showToast("Policy published successfully", "success");
            }

            setShowUploadModal(false);
            setEditingPolicyId(null);
            setUploadData({
                title: '', category: 'General',
                file_en: null, file_te: null, file_hi: null
            });
            fetchPolicies();
        } catch (error) {
            console.error("Operation failed:", error);
            showToast(editingPolicyId ? "Failed to update policy" : "Failed to upload policy", "error");
        } finally {
            setIsUploading(false);
        }
    };

    const handleEdit = (policy) => {
        setEditingPolicyId(policy.id);
        setUploadData({
            title: policy.title,
            category: policy.category || 'General',
            file_en: null,
            file_te: null,
            file_hi: null
        });
        setShowUploadModal(true);
    };

    const handleView = async (policy) => {
        const langMap = {
            'English': 'en',
            'Telugu (తెలుగు)': 'te',
            'Hindi (हिन्दी)': 'hi'
        };
        const suffix = langMap[language];

        if (!policy[`file_content_${suffix}`]) {
            showToast(`This policy is not available in ${language}`, "warning");
            return;
        }

        try {
            const response = await api.get(`/api/policies/${policy.id}/`);
            const content = response.data[`file_content_${suffix}`];
            if (!content) {
                showToast("Content not found", "error");
                return;
            }
            setViewContent({ 
                title: policy.title, 
                content: content 
            });
        } catch (error) {
            showToast("Failed to load document", "error");
        }
    };


    const handleDelete = async (id) => {
        const confirmed = await confirm("Are you sure you want to delete this policy?");
        if (!confirmed) return;
        try {
            await api.delete(`/api/policies/${id}/`);
            showToast("Policy deleted", "success");
            fetchPolicies();
        } catch (error) {
            showToast("Failed to delete", "error");
        }
    };

    const normalized = (v) => (v || '').toString().trim().toLowerCase();

    const categories = ['HR Policy', 'Travel Guide', 'General'];
    const uncategorizedPolicies = policies.filter(
        p => !categories.some(cat => normalized(cat) === normalized(p.category))
    );

    return (
        <div className="policy-page">
            <div className="policy-header">
                <div>
                    <h1>Policy Center</h1>
                    <p>Access the latest corporate travel guidelines and compliance rules.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    {isAdmin && (
                        <button className="add-policy-btn premium-card" onClick={() => setShowUploadModal(true)}>
                            <Plus size={18} />
                            <span>Upload New Policy</span>
                        </button>
                    )}
                    <div className="language-selector premium-card">
                        <Languages size={18} />
                        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                            <option>English</option>
                            <option>Telugu (తెలుగు)</option>
                            <option>Hindi (हिन्दी)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="policy-content" style={{ width: '100%' }}>
                {isLoading ? (
                    <div className="loading-container">Loading policies...</div>
                ) : (
                    <div className="policy-list">
                        {[...categories, 'Other'].map(cat => {
                            const isOther = cat === 'Other';
                            const catPolicies = isOther
                                ? uncategorizedPolicies
                                : policies.filter(p => normalized(p.category) === normalized(cat));

                            if (catPolicies.length === 0) return null;
                            return (
                                <div key={cat} className="policy-category-group">
                                    <h2 className="category-title">{cat}</h2>
                                    {catPolicies.map((p) => (
                                        <div key={p.id} className="policy-card-item premium-card">
                                            <div className="p-icon">
                                                <FileText size={24} />
                                            </div>
                                            <div className="p-info">
                                                <h3>{p.title}</h3>
                                                <div className="p-meta">
                                                    <span>Updated {new Date(p.created_at).toLocaleDateString()}</span>
                                                    <span className="dot">•</span>
                                                    {/* Show size based on selected language */}
                                                    <span>
                                                        {language === 'English' ? p.file_size_en :
                                                            language === 'Telugu (తెలుగు)' ? p.file_size_te :
                                                                p.file_size_hi || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="card-actions">
                                                <button className="view-btn" onClick={() => handleView(p)} title="View Content">
                                                    <Eye size={20} />
                                                </button>
                                                {isAdmin && (
                                                    <>
                                                        <button className="edit-btn" onClick={() => handleEdit(p)} title="Edit Policy" style={{ color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button className="delete-btn" onClick={() => handleDelete(p.id)} title="Delete Policy">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="modal-overlay">
                    <div className="upload-modal premium-card animate-slide-up" style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h3>{editingPolicyId ? 'Edit Policy' : 'Add Management Policy'}</h3>
                            <button className="close-btn" onClick={() => {
                                setShowUploadModal(false);
                                setEditingPolicyId(null);
                                setUploadData({ title: '', category: 'General', file_en: null, file_te: null, file_hi: null });
                            }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpload}>
                            <div className="modal-scroll-area">
                                <div className="form-group">
                                    <label>Document Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Travel Policy 2026"
                                        value={uploadData.title}
                                        onChange={e => setUploadData({ ...uploadData, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        value={uploadData.category}
                                        onChange={e => setUploadData({ ...uploadData, category: e.target.value })}
                                    >
                                        <option>General</option>
                                        <option>HR Policy</option>
                                        <option>Travel Guide</option>
                                    </select>
                                </div>

                                <div className="multi-lang-flex" style={{ flexDirection: 'column', gap: '20px' }}>
                                    {['en', 'te', 'hi'].map(lang => (
                                        <div key={lang} className="lang-field-group" style={{ width: '100%' }}>
                                            <label style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 800, color: '#bb0633', marginBottom: '8px', display: 'block' }}>
                                                {lang === 'en' ? 'English' : lang === 'te' ? 'Telugu' : 'Hindi'} PDF Document
                                            </label>
                                            <div className="file-upload-zone" style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center', background: '#f8fafc' }}>
                                                <input 
                                                    type="file" 
                                                    id={`file-${lang}`}
                                                    accept="application/pdf"
                                                    onChange={e => handleFileChange(lang, e.target.files[0])}
                                                    style={{ display: 'none' }}
                                                />
                                                <label htmlFor={`file-${lang}`} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                    <Upload size={24} color="#64748b" />
                                                    <span style={{ fontSize: '14px', color: '#64748b' }}>
                                                        {uploadData[`file_${lang}`] ? uploadData[`file_${lang}`].name : `Select ${lang === 'en' ? 'English' : lang === 'te' ? 'Telugu' : 'Hindi'} PDF`}
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="secondary-btn" onClick={() => {
                                    setShowUploadModal(false);
                                    setEditingPolicyId(null);
                                    setUploadData({ title: '', category: 'General', file_en: null, file_te: null, file_hi: null });
                                }}>Cancel</button>
                                <button type="submit" className="primary-btn" disabled={isUploading}>
                                    {isUploading ? (editingPolicyId ? 'Updating...' : 'Publishing...') : (editingPolicyId ? 'Update Policy' : 'Publish Policy')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewContent && (
                <div className="modal-overlay">
                    <div className="view-modal modal-xl premium-card animate-scale-in">
                        <div className="modal-header">
                            <h3>{viewContent.title}</h3>
                            <button className="close-btn" onClick={() => setViewContent(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                            <div className="pdf-viewer-outer" style={{ 
                                background: '#ffffff', 
                                borderRadius: '0 0 12px 12px',
                                overflow: 'hidden',
                                position: 'relative',
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div className="pdf-deep-clean-container" style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    overflow: 'hidden',
                                    position: 'relative',
                                    flex: 1
                                }}>
                                    <iframe
                                        src={`${viewContent.content}#toolbar=0&navpanes=0&scrollbar=0`}
                                        width="100%"
                                        height="calc(100% + 70px)"
                                        frameBorder="0"
                                        style={{ 
                                            border: 'none', 
                                            display: 'block',
                                            marginTop: '-70px', 
                                            position: 'relative'
                                        }}
                                        title="Policy PDF"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default PolicyCenter;
