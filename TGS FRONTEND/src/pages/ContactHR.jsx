import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, Mail, Building2, Briefcase, MapPin, ClipboardList, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

const ContactHR = () => {
    const [formData, setFormData] = useState({
        employee_id: '',
        name: '',
        department: '',
        section: '',
        project: '',
        office: '',
        contact_number: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validate = () => {
        const { employee_id, name, contact_number, department, section, project, office } = formData;
        
        if (!/^[a-zA-Z0-9_-]+$/.test(employee_id)) {
            return "Employee ID contains invalid characters. Use alphanumeric, hyphen or underscore.";
        }
        if (!/^[a-zA-Z.\s]+$/.test(name)) {
            return "Full Name should only contain letters, dots and spaces.";
        }
        if (!/^\+?[0-9]{10,12}$/.test(contact_number)) {
            return "Please enter a valid contact number (10-12 digits).";
        }
        const otherFields = [
            { name: 'Department', value: department },
            { name: 'Section', value: section },
            { name: 'Project', value: project },
            { name: 'Office', value: office }
        ];

        for (const field of otherFields) {
            if (field.value.trim().length < 2) {
                return `${field.name} must be at least 2 characters long.`;
            }
            if (!/^[a-zA-Z0-9.\s\-/()]+$/.test(field.value)) {
                return `${field.name} contains invalid characters. Use letters, numbers, spaces, dots, hyphens, slashes or parentheses.`;
            }
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Final validation check
        const error = validate();
        if (error) {
            showToast(error, 'error');
            return;
        }

        if (isLoading) return; // Prevent double submit

        setIsLoading(true);
        try {
            await api.post('/api/auth/registration-request', formData);
            setIsSubmitted(true);
            showToast('Request submitted successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to submit request.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fce7f3 0%, #fae8ff 100%)', padding: '20px' }}>
                <div style={{ maxWidth: '500px', width: '100%', background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: '16px', background: '#f0fdf4', borderRadius: '50%', marginBottom: '24px' }}>
                        <CheckCircle2 size={48} color="#22c55e" />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1f2937', marginBottom: '16px' }}>Request Submitted!</h2>
                    <p style={{ color: '#6b7280', fontSize: '16px', lineHeight: '1.6', marginBottom: '32px' }}>
                        Your registration request has been sent to HR for verification. Once approved, the Admin team will create your account and notify you.
                    </p>
                    <button onClick={() => navigate('/login')} style={{ width: '100%', padding: '14px', background: '#d81b60', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fce7f3 0%, #fae8ff 100%)', padding: '40px 20px' }}>
            <div style={{ maxWidth: '600px', width: '100%', background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ marginBottom: '32px' }}>
                    <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6b7280', textDecoration: 'none', fontSize: '14px', marginBottom: '16px' }}>
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                    <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#d81b60', marginBottom: '8px' }}>Contact HR</h1>
                    <p style={{ color: '#6b7280', fontSize: '15px' }}>Don't have an account? Provide your details to request access.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                            Employee ID <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <ClipboardList size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input name="employee_id" value={formData.employee_id} onChange={handleChange} placeholder="e.g. EMP001" required style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
                        </div>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                            Full Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input name="name" value={formData.name} onChange={handleChange} placeholder="As per official records" required style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                            Department <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Building2 size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Engineering" required style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                            Section <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Briefcase size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input name="section" value={formData.section} onChange={handleChange} placeholder="e.g. IT Operations" required style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                            Project <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input name="project" value={formData.project} onChange={handleChange} placeholder="Assigned project" required style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                            Office / Location <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input name="office" value={formData.office} onChange={handleChange} placeholder="e.g. Hyderabad" required style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
                        </div>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                            Contact Number <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input name="contact_number" value={formData.contact_number} onChange={handleChange} placeholder="+91 XXXXXXXXXX" required style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading} 
                        style={{ 
                            gridColumn: 'span 2', 
                            padding: '14px', 
                            background: isLoading ? '#9ca3af' : '#d81b60', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '12px', 
                            fontWeight: '700', 
                            fontSize: '15px', 
                            cursor: isLoading ? 'not-allowed' : 'pointer', 
                            marginTop: '10px',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {isLoading ? 'Processing Request...' : 'Send Request to HR'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ContactHR;
