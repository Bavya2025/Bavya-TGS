import React, { useState } from 'react';
import {
    HelpCircle,
    MessageCircle,
    FileText,
    Phone,
    Search,
    ChevronRight,
    ExternalLink,
    Mail,
    User,
    ShieldCheck,
    AlertCircle,
    Settings,
    Wallet,
    MapPin,
    X,
    Send,
    Download,
    FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useToast } from '../context/ToastContext';


const HelpSupport = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const handleOpenChat = () => {
        window.dispatchEvent(new CustomEvent('open-tgs-chat'));
    };

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

    const faqs = [
        {
            category: 'Getting Started',
            icon: <FileText size={20} />,
            questions: [
                'How do I create a new trip request?',
                'What is the approval workflow?',
                'How to set up my profile properly?'
            ]
        },
        {
            category: 'Expenses & Claims',
            icon: <ShieldCheck size={20} />,
            questions: [
                'How to claim mileage for local travel?',
                'What receipts are mandatory for reimbursement?',
                'How long does it take for settlement?'
            ]
        },
        {
            category: 'Guest House Booking',
            icon: <AlertCircle size={20} />,
            questions: [
                'How to book a room in a company guest house?',
                'Can I cancel a booking after approval?',
                'What are the guest house rules?'
            ]
        }
    ];

    const contactMethods = [
        {
            title: 'Technical Support',
            description: 'For issues with the application or login problems.',
            email: 'it.support@tgs.com',
            phone: '+91 800-456-7890',
            icon: <Settings className="method-icon" size={24} />
        },
        {
            title: 'HR & Policy',
            description: 'For queries related to travel policy and eligibility.',
            email: 'hr.travel@tgs.com',
            phone: '+91 800-456-7891',
            icon: <User className="method-icon" size={24} />
        },
        {
            title: 'Finance & Claims',
            description: 'For questions about payments and settlements.',
            email: 'finance.claims@tgs.com',
            phone: '+91 800-456-7892',
            icon: <Wallet className="method-icon" size={24} />
        }
    ];

    return (
        <div className="help-container">
            <div className="help-hero">
                <h1>How can we help you?</h1>
                <p>Search our knowledge base or contact our support teams directly.</p>
                <div className="help-search">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search for articles, guides, policies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="help-content">
                <div className="help-quick-actions">
                    <div className="action-card">
                        <div className="action-icon"><FileText /></div>
                        <h3>User Guides</h3>
                        <p>Complete documentation on system features.</p>
                        <button className="btn-link" onClick={() => navigate('/policy')}>Browse Guides <ChevronRight size={16} /></button>
                    </div>
                    <div className="action-card">
                        <div className="action-icon"><MessageCircle /></div>
                        <h3>Live Chat</h3>
                        <p>Talk to our support agents in real-time.</p>
                        <button className="btn-link" onClick={handleOpenChat}>Start Chat <ChevronRight size={16} /></button>
                    </div>
                    <div className="action-card">
                        <div className="action-icon"><MapPin /></div>
                        <h3>Location Codes</h3>
                        <p>Find ISO and project-specific location codes.</p>
                        <button className="btn-link" onClick={() => navigate('/location-codes')}>View Codes <ChevronRight size={16} /></button>
                    </div>
                    <div className="action-card">
                        <div className="action-icon"><FileSpreadsheet /></div>
                        <h3>Download data template</h3>

                        <button className="btn-link" onClick={handleDownloadTemplate}>Inspection Tour Schedule Template <Download size={16} style={{ marginLeft: '4px' }} /></button>
                    </div>
                </div>

                <div className="faq-section">
                    <div className="section-header">
                        <h2>Frequently Asked Questions</h2>
                        <button className="btn-view-all">View All FAQ</button>
                    </div>
                    <div className="faq-grid">
                        {faqs.map((group, idx) => (
                            <div key={idx} className="faq-group">
                                <div className="group-header">
                                    {group.icon}
                                    <h3>{group.category}</h3>
                                </div>
                                <ul className="question-list">
                                    {group.questions.map((q, qIdx) => (
                                        <li key={qIdx}>
                                            <a href="#">{q}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="support-contact-section">
                    <h2>Contact Support Teams</h2>
                    <div className="contact-grid">
                        {contactMethods.map((method, idx) => (
                            <div key={idx} className="contact-card">
                                <div className="card-header">
                                    {method.icon}
                                    <h3>{method.title}</h3>
                                </div>
                                <p>{method.description}</p>
                                <div className="contact-details">
                                    <div className="detail-item">
                                        <Mail size={16} />
                                        <span>{method.email}</span>
                                    </div>
                                    <div className="detail-item">
                                        <Phone size={16} />
                                        <span>{method.phone}</span>
                                    </div>
                                </div>
                                <button className="contact-btn">Send Message</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <footer className="help-footer">
                <p>&copy; 2026 TGS Governance. All rights reserved.</p>
                <div className="footer-links">
                    <a href="#">Privacy Policy</a>
                    <a href="#">Terms of Service</a>
                    <a href="#">System Status <div className="status-dot green"></div></a>
                </div>
            </footer>

        </div>
    );
};

export default HelpSupport;
