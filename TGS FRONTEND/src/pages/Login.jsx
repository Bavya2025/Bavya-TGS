import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/api';
import { Lock, User, Eye, EyeOff, ShieldCheck, Wifi, WifiOff } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isIntro, setIsIntro] = useState(true);
    const [isBackendDown, setIsBackendDown] = useState(false);
    const [isCheckingConnection, setIsCheckingConnection] = useState(true);
    const { login } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const checkConnection = async (silent = false) => {
        if (!silent) setIsCheckingConnection(true);
        try {
            await api.get('/api/health');
            setIsBackendDown(false);
            if (!silent) showToast('Backend connected successfully', 'success');
        } catch (err) {
            setIsBackendDown(true);
            if (!silent) showToast('Backend server is unreachable. Please ensure the backend is running.', 'error');
        } finally {
            setIsCheckingConnection(false);
        }
    };

    useEffect(() => {
        checkConnection(true); // check on mount
        
        const pollInterval = setInterval(() => {
            checkConnection(true);
        }, 30000);

        const startTimer = setTimeout(() => {
            const timer = setTimeout(() => {
                setIsIntro(false);
            }, 2500);
            return () => clearTimeout(timer);
        }, 100);

        return () => {
            clearTimeout(startTimer);
            clearInterval(pollInterval);
        };
    }, []);

    const validateInputs = () => {
        // Username: letters, numbers, @, -
        const userRegex = /^[a-zA-Z0-9@-]*$/;
        if (!userRegex.test(username)) {
            setError('Username allows only letters, numbers, @, and - characters.');
            return false;
        }

        // Password: 8 to 12 chars
        if (password.length < 8 || password.length > 12) {
            setError('Password must be exactly 8 to 12 characters.');
            return false;
        }

        // Password: letters, numbers, specific special characters only (no spaces)
        const passRegex = /^[a-zA-Z0-9@#$%^&*.]*$/;
        if (!passRegex.test(password)) {
            setError('Password can only contain letters, numbers, and @#$%^&*.');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please enter both username and password.');
            return;
        }

        if (!validateInputs()) return;

        setIsLoading(true);
        try {
            const user = await login(username, password);

            switch (user.role) {
                case 'admin':
                    navigate('/');
                    break;
                case 'finance':
                    navigate('/finance');
                    break;
                case 'reporting_authority':
                    navigate('/approvals');
                    break;
                case 'cfo':
                    navigate('/cfo-war-room');
                    break;
                default:
                    navigate('/');
            }
        } catch (err) {
            console.error('Submit Login error:', err);
            const status = err.response?.status;
            const message = err.response?.data?.error || 'Authentication failed. Please try again.';
            
            if (status === 403) {
                // Server-side lockout
                setError(message);
                showToast(message, 'error');
            } else if (status === 401) {
                setError(message);
            } else {
                setError(err.response?.data?.error || 'Invalid credentials.');
                handleLoginFailure(); // Count as failure for any bad credentials error
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`login-container ${isIntro ? 'intro-mode' : ''}`}>
            <div className="login-visual">
                <video
                    className="login-video"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                >
                    <source src="/logo_video.mp4" type="video/mp4" />
                </video>
                <div className="visual-overlay"></div>
                <div className="visual-content">
                    <h1>TGS</h1>
                    <h2>Travel & Expense</h2>
                </div>
            </div>
            <div className="login-form-area">
                <div className="login-card">
                    <div className="login-header">
                        <div className="app-logo">
                            <img src="/bavya.png" alt="Logo" className="login-logo-img" />
                        </div>
                        <div className="connection-status-area" style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                            {isCheckingConnection ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#fef9c3', color: '#854d0e', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                                    <div className="status-animate-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308' }}></div>
                                    <span>Checking Backend Presence...</span>
                                </div>
                            ) : isBackendDown ? (
                                <div onClick={() => checkConnection()} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                                    <WifiOff size={16} />
                                    <span>Backend Offline - Click to Retry</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                                    <Wifi size={16} />
                                    <span>Server Connected</span>
                                </div>
                            )}
                        </div>
                        <h3>Welcome Back</h3>
                        <p>Sign in to your corporate account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && <div className="login-error">{error}</div>}

                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <div className="input-with-icon">
                                <User size={18} className="field-icon" />
                                <input
                                    type="text"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const filtered = val.replace(/[^a-zA-Z0-9@-]/g, '');
                                        setUsername(filtered);
                                    }}
                                    maxLength={20}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="input-with-icon">
                                <Lock size={18} className="field-icon" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        // Allow letters, numbers, and specific special chars (@#$%^&*.)
                                        const filtered = val.replace(/[^a-zA-Z0-9@#$%^&*.]/g, '');
                                        setPassword(filtered);
                                    }}
                                    onPaste={(e) => e.preventDefault()}
                                    maxLength={12}
                                    required
                                />
                                <button
                                    type="button"
                                    className="eye-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="login-options" style={{ marginTop: '10px' }}>
                            <Link to="/forgot-password" className="forgot-pwd" style={{ color: '#d81b60', fontWeight: '500', textDecoration: 'none', fontSize: '14px' }}>Forgot password?</Link>
                        </div>

                        <button type="submit" className="login-btn" disabled={isLoading}>
                            {isLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p className="login-contact-text">Don't have an account? <Link to="/contact-hr" style={{ color: '#d81b60', fontWeight: 'bold' }}>Contact HR</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
