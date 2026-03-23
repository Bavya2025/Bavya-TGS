import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isIntro, setIsIntro] = useState(true);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const startTimer = setTimeout(() => {
            const timer = setTimeout(() => {
                setIsIntro(false);
            }, 2500);
            return () => clearTimeout(timer);
        }, 100);

        return () => clearTimeout(startTimer);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

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
            setError('Invalid username or password. Please try again.');
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
                    <source src="/logo.mp4" type="video/mp4" />
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
                                    onChange={(e) => setUsername(e.target.value)}
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
                                    onChange={(e) => setPassword(e.target.value)}
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

                        <div className="login-options">
                            <label className="remember-me">
                                <input type="checkbox" />
                                <span>Remember me</span>
                            </label>
                            <a href="#" className="forgot-pwd">Forgot password?</a>
                        </div>

                        <button type="submit" className="login-btn" disabled={isLoading}>
                            {isLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p className="login-contact-text">Don't have an account? <a href="#">Contact HR</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
