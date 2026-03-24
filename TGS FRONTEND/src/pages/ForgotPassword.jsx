import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../api/api';
import { User, Lock, ArrowLeft, CheckCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const QUESTIONS = [
    "In what city were you born?",
    "What is the name of your first pet?",
    "What is your mother's maiden name?",
    "What high school did you attend?",
    "What was the make of your first car?"
];

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [answers, setAnswers] = useState(['', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetToken, setResetToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isFirstSetup, setIsFirstSetup] = useState(false);
    const [showConfirmSetup, setShowConfirmSetup] = useState(false);
    const [randomIndices, setRandomIndices] = useState([]);
    const [randomAnswers, setRandomAnswers] = useState({}); // { index: answer }

    const { showToast } = useToast();
    const navigate = useNavigate();

    // Password validation logic
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(newPassword);
    const isLengthValid = newPassword.length >= 8 && newPassword.length <= 12;
    const isMatch = newPassword && newPassword === confirmPassword;

    const isPasswordValid = hasLower && hasUpper && hasNumber && hasSpecial && isLengthValid && isMatch;

    const handleVerifyUser = async (e) => {
        e.preventDefault();
        if (!username) return showToast('Please enter your username', 'error');
        
        setIsLoading(true);
        try {
            const res = await api.post('/api/auth/forgot-password/verify-user', { employee_id: username });
            setStep(2);
            setIsFirstSetup(false);
            setRandomIndices(res.data.indices || [0, 1]); // Default backup
            setRandomAnswers({});
            showToast('User verified. Please answer 2 random security questions.', 'success');
        } catch (err) {
            if (err.response?.data?.code === 'NO_SECURITY_SETUP') {
                setShowConfirmSetup(true);
            } else {
                showToast(err.response?.data?.error || 'Verification failed.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleProceedToSetup = () => {
        setShowConfirmSetup(false);
        setIsFirstSetup(true);
        setStep(2);
        showToast('Please set your security questions to proceed.', 'info');
    };

    const handleVerifyAnswers = async (e) => {
        e.preventDefault();
        
        if (isFirstSetup) {
            if (answers.some(a => !a.trim())) return showToast('Please answer all 5 security questions', 'error');
        } else {
            if (randomIndices.some(idx => !randomAnswers[idx]?.trim())) return showToast('Please answer all security questions', 'error');
        }

        setIsLoading(true);
        try {
            let res;
            if (isFirstSetup) {
                // For first time setup, we still send all 5
                res = await api.post('/api/auth/forgot-password/setup-manual', { 
                    employee_id: username,
                    answers: answers 
                });
            } else {
                // For reset, we only send the 2 random answers
                res = await api.post('/api/auth/forgot-password/verify-answers', { 
                    employee_id: username,
                    answers: randomAnswers
                });
            }
            setResetToken(res.data.reset_token);
            setStep(3);
            showToast(isFirstSetup ? 'Security questions set! Now create your password.' : 'Answers verified! Now create your password.', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Verification failed.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!isPasswordValid) return showToast('Please fulfill all password requirements', 'error');

        setIsLoading(true);
        try {
            await api.post('/api/auth/forgot-password/reset', { 
                reset_token: resetToken,
                new_password: newPassword 
            });
            setStep(4);
            showToast('Password reset successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Password reset failed.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-visual" style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '40px' }}>
                <ShieldCheck size={100} style={{ marginBottom: '20px', opacity: 0.8 }} />
                <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '10px' }}>Secure Recovery</h1>
                <p style={{ fontSize: '18px', textAlign: 'center', opacity: 0.8 }}>Verify your identity to regain access to your corporate account.</p>
            </div>
            
            <div className="login-form-area" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="login-card" style={{ maxWidth: '500px', width: '100%', margin: '0 auto' }}>
                    
                    <div className="login-header" style={{ marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 'bold' }}>
                            {step === 1 && 'Forgot Password'}
                            {step === 2 && 'Security Questions'}
                            {step === 3 && 'Create New Password'}
                            {step === 4 && 'Complete'}
                        </h3>
                        {step !== 4 && <p>Step {step} of 3 {(!isFirstSetup && step === 2) && '(2 Questions)'}</p>}
                    </div>

                    {showConfirmSetup && (
                        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                            <p style={{ color: '#9a3412', fontSize: '14px', marginBottom: '12px' }}>
                                You haven't set up security questions yet. Do you want to set them up now to reset your password?
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={handleProceedToSetup} style={{ flex: 1, padding: '8px', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    Yes, Setup Now
                                </button>
                                <button onClick={() => setShowConfirmSetup(false)} style={{ flex: 1, padding: '8px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleVerifyUser} className="login-form">
                            <div className="form-group">
                                <label className="form-label">Employee Username</label>
                                <div className="input-with-icon">
                                    <User size={18} className="field-icon" />
                                    <input
                                        type="text"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>
                            </div>
                            
                            <button type="submit" className="login-btn" disabled={isLoading} style={{ width: '100%', padding: '12px', background: '#d81b60', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                                {isLoading ? 'Verifying...' : 'Continue'}
                            </button>
                            
                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <Link to="/login" style={{ color: '#666', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                    <ArrowLeft size={16} /> Back to Login
                                </Link>
                            </div>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyAnswers} className="login-form">
                            {isFirstSetup ? (
                                // ALL 5 for setup
                                QUESTIONS.map((q, idx) => (
                                    <div className="form-group" style={{ marginBottom: '15px' }} key={idx}>
                                        <label className="form-label" style={{ fontSize: '13px', color: '#555', marginBottom: '5px', display: 'block' }}>Q{idx + 1}: {q}</label>
                                        <input
                                            type="password"
                                            placeholder="Min 5 characters"
                                            value={answers[idx]}
                                            onChange={(e) => {
                                                const newAns = [...answers];
                                                newAns[idx] = e.target.value;
                                                setAnswers(newAns);
                                            }}
                                            required
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: answers[idx].length > 0 && answers[idx].length < 5 ? '1px solid #ef4444' : '1px solid #ddd' }}
                                        />
                                        {answers[idx].length > 0 && answers[idx].length < 5 && (
                                            <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>Answer must be at least 5 characters</div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                // RANDOM 2 for reset
                                randomIndices.map((qIdx) => (
                                    <div className="form-group" style={{ marginBottom: '15px' }} key={qIdx}>
                                        <label className="form-label" style={{ fontSize: '13px', color: '#555', marginBottom: '5px', display: 'block' }}>Question {qIdx + 1}: {QUESTIONS[qIdx]}</label>
                                        <input
                                            type="password"
                                            placeholder="Your answer"
                                            value={randomAnswers[qIdx] || ''}
                                            onChange={(e) => {
                                                setRandomAnswers({ ...randomAnswers, [qIdx]: e.target.value });
                                            }}
                                            required
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: randomAnswers[qIdx]?.length > 0 && randomAnswers[qIdx]?.length < 5 ? '1px solid #ef4444' : '1px solid #ddd' }}
                                        />
                                        {randomAnswers[qIdx]?.length > 0 && randomAnswers[qIdx]?.length < 5 && (
                                            <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>Answer must be at least 5 characters</div>
                                        )}
                                    </div>
                                ))
                            )}
                            
                            {isFirstSetup && answers.every(a => a.trim().length >= 5) && new Set(answers.map(a => a.toLowerCase().trim())).size < 5 && (
                                <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '10px', textAlign: 'center' }}>
                                    All answers must be unique across all 5 questions.
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="button" onClick={() => { setStep(1); setIsFirstSetup(false); }} className="btn btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '8px' }}>
                                    Back
                                </button>
                                <button 
                                    type="submit" 
                                    className="login-btn" 
                                    disabled={
                                        isLoading || 
                                        (isFirstSetup ? (answers.some(a => a.trim().length < 5) || new Set(answers.map(a => a.toLowerCase().trim())).size < 5) : (Object.keys(randomAnswers).length < 2 || Object.values(randomAnswers).some(a => a.trim().length < 5)))
                                    } 
                                    style={{ 
                                        flex: 2, 
                                        padding: '12px', 
                                        background: (isFirstSetup ? (answers.every(a => a.trim().length >= 5) && new Set(answers.map(a => a.toLowerCase().trim())).size === 5) : (Object.keys(randomAnswers).length === 2 && Object.values(randomAnswers).every(a => a.trim().length >= 5))) ? '#d81b60' : '#cbd5e1', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '8px', 
                                        fontWeight: 'bold', 
                                        cursor: 'pointer' 
                                    }}
                                >
                                    {isLoading ? 'Processing...' : (isFirstSetup ? 'Set Security Questions' : 'Verify Answers')}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword} className="login-form">
                            
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="form-label">New Password</label>
                                <div className="input-with-icon" style={{ position: 'relative' }}>
                                    <Lock size={18} className="field-icon" style={{ position: 'absolute', left: '12px', top: '12px', color: '#888' }} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '12px 40px', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                    <button
                                        type="button"
                                        style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label">Confirm Password</label>
                                <div className="input-with-icon" style={{ position: 'relative' }}>
                                    <Lock size={18} className="field-icon" style={{ position: 'absolute', left: '12px', top: '12px', color: '#888' }} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '12px 40px', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div style={{ color: isLengthValid ? '#16a34a' : '#64748b' }}><CheckCircle size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }}/> 8-12 chars</div>
                                    <div style={{ color: hasLower ? '#16a34a' : '#64748b' }}><CheckCircle size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }}/> Lowercase</div>
                                    <div style={{ color: hasUpper ? '#16a34a' : '#64748b' }}><CheckCircle size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }}/> Uppercase</div>
                                    <div style={{ color: hasNumber ? '#16a34a' : '#64748b' }}><CheckCircle size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }}/> Numeric (0-9)</div>
                                    <div style={{ color: hasSpecial ? '#16a34a' : '#64748b' }}><CheckCircle size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }}/> Special char</div>
                                    <div style={{ color: isMatch && confirmPassword ? '#16a34a' : '#64748b' }}><CheckCircle size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }}/> Passwords Match</div>
                                </div>
                            </div>

                            <button type="submit" className="login-btn" disabled={isLoading || !isPasswordValid} style={{ width: '100%', padding: '12px', background: isPasswordValid ? '#d81b60' : '#cbd5e1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isPasswordValid ? 'pointer' : 'not-allowed' }}>
                                {isLoading ? 'Processing...' : 'Reset Password'}
                            </button>
                        </form>
                    )}

                    {step === 4 && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <CheckCircle size={60} color="#16a34a" style={{ marginBottom: '20px' }} />
                            <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Success!</h2>
                            <p style={{ color: '#64748b', marginBottom: '30px' }}>Your password has been reset securely. You can now login with your new credentials.</p>
                            <Link to="/login" className="login-btn" style={{ display: 'inline-block', width: '100%', padding: '12px', background: '#d81b60', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                                Return to Login
                            </Link>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
