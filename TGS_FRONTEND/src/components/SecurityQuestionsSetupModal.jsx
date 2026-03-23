import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/api';
import { ShieldAlert } from 'lucide-react';

const QUESTIONS = [
    "In what city were you born?",
    "What is the name of your first pet?",
    "What is your mother's maiden name?",
    "What high school did you attend?",
    "What was the make of your first car?"
];

const SecurityQuestionsSetupModal = () => {
    const { user, updateUser } = useAuth();
    const { showToast } = useToast();
    const [answers, setAnswers] = useState(['', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);

    // Only show if user exists, and explicitly has_setup_security is false
    if (!user || user.has_setup_security !== false) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (answers.some(a => !a.trim())) {
            return showToast('Please answer all 5 security questions to proceed.', 'error');
        }

        setIsLoading(true);
        try {
            await api.post('/api/auth/security-questions', { answers });
            showToast('Security questions saved successfully!', 'success');
            if (updateUser) {
                updateUser({ has_setup_security: true });
            } else {
                window.location.reload(); // Fallback if updateUser isn't available
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to save security questions.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <ShieldAlert size={48} color="#d81b60" style={{ marginBottom: '10px' }} />
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>Action Required</h2>
                    <p style={{ color: '#64748b', fontSize: '14px' }}>Please set up your security questions to continue using the application. These will be used for password recovery.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {QUESTIONS.map((q, idx) => (
                        <div key={idx} style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>
                                Q{idx + 1}: {q}
                            </label>
                            <input
                                type="text"
                                placeholder="Min 5 characters"
                                value={answers[idx]}
                                onChange={(e) => {
                                    const newAns = [...answers];
                                    newAns[idx] = e.target.value;
                                    setAnswers(newAns);
                                }}
                                required
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: answers[idx].length > 0 && answers[idx].length < 5 ? '1px solid #ef4444' : '1px solid #cbd5e1', fontSize: '14px' }}
                            />
                            {answers[idx].length > 0 && answers[idx].length < 5 && (
                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>Min 5 characters required</div>
                            )}
                        </div>
                    ))}

                    {answers.every(a => a.trim().length >= 5) && new Set(answers.map(a => a.toLowerCase().trim())).size < 5 && (
                        <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '10px', textAlign: 'center' }}>
                            All answers must be unique.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || answers.some(a => a.trim().length < 5) || new Set(answers.map(a => a.toLowerCase().trim())).size < 5}
                        style={{ width: '100%', padding: '12px', marginTop: '10px', backgroundColor: (answers.every(a => a.trim().length >= 5) && new Set(answers.map(a => a.toLowerCase().trim())).size === 5) ? '#d81b60' : '#cbd5e1', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: (isLoading || answers.some(a => a.trim().length < 5) || new Set(answers.map(a => a.toLowerCase().trim())).size < 5) ? 'not-allowed' : 'pointer', fontSize: '16px' }}
                    >
                        {isLoading ? 'Saving...' : 'Save & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SecurityQuestionsSetupModal;
