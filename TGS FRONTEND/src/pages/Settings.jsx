import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
    Palette, 
    Bell, 
    Lock, 
    User as UserIcon, 
    Monitor, 
    Globe, 
    Shield, 
    Check,
    ChevronRight,
    Smartphone,
    Navigation,
    Loader2,
    RefreshCw
} from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext.jsx';

const Settings = () => {
    const { user } = useAuth();
    const { theme: activeTheme, changeTheme, themes } = useTheme();
    const { showToast } = useToast();

    const [trackingConfig, setTrackingConfig] = React.useState({
        interval_minutes: 15,
        distance_filter: 100,
        is_active: true,
        daily_tracking_active: true,
        latest_version: '1.0.0',
        update_url: ''
    });
    const [loadingConfig, setLoadingConfig] = React.useState(false);

    React.useEffect(() => {
        const isAdmin = ['admin', 'superuser'].includes((user?.role?.name || user?.role || '').toLowerCase());
        if (isAdmin) {
            fetchTrackingConfig();
        }
    }, [user]);

    const fetchTrackingConfig = async () => {
        setLoadingConfig(true);
        try {
            const res = await api.get('/api/tracking-config/');
            if (res.data) setTrackingConfig(res.data);
        } catch (error) {
            console.error('Failed to fetch tracking config:', error);
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleUpdateTrackingConfig = async () => {
        try {
            await api.post('/api/tracking-config/', trackingConfig);
            showToast('Tracking configuration updated successfully', 'success');
        } catch (error) {
            showToast('Failed to update tracking config', 'error');
        }
    };

    const sections = [
        {
            id: 'appearance',
            title: 'Appearance & Themes',
            icon: <Palette size={20} />,
            color: '#8e44ad',
            description: 'Customize how the application looks to you.'
        },
        {
            id: 'notifications',
            title: 'Notifications',
            icon: <Bell size={20} />,
            color: '#f39c12',
            description: 'Manage how you receive alerts and reminders.'
        },
        {
            id: 'security',
            title: 'Security & Privacy',
            icon: <Shield size={20} />,
            color: '#27ae60',
            description: 'Update your password and login preferences.'
        }
    ];

    return (
        <div className="settings-page">
            <div className="page-header">
                <div>
                    <h1>System Settings</h1>
                    <p>Manage your account preferences and application experience.</p>
                </div>
            </div>

            <div className="settings-layout-inner">
                {/* Sidebar Navigation */}
                <div className="settings-nav premium-card">
                    {sections.map(section => (
                        <div key={section.id} className="settings-nav-item">
                            <div className="nav-icon" style={{ backgroundColor: section.color + '20', color: section.color }}>
                                {section.icon}
                            </div>
                            <div className="nav-info">
                                <span className="title">{section.title}</span>
                                <span className="desc">{section.description}</span>
                            </div>
                        </div>
                    ))}
                    
                    <div className="nav-divider" style={{ margin: '1rem 0', height: '1px', background: 'var(--border)' }}></div>
                    
                    <div className="settings-nav-item">
                        <div className="nav-icon" style={{ backgroundColor: '#e74c3c20', color: '#e74c3c' }}>
                            <Monitor size={20} />
                        </div>
                        <div className="nav-info">
                            <span className="title">System Info</span>
                            <span className="desc">Version 1.1.0 (Bavya Edition)</span>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="settings-content">
                    {/* Appearance Section */}
                    <div className="premium-card" style={{ padding: '2rem' }}>
                        <div className="section-header-styled mb-6" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                            <div className="header-icon primary-gradient" style={{ background: 'var(--grad-primary)', padding: '10px', borderRadius: '12px', color: 'white' }}>
                                <Palette size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>Personalized Themes</h3>
                                <p className="text-muted" style={{ margin: 0 }}>Select a visual style that matches your workflow. Changes apply instantly.</p>
                            </div>
                        </div>

                        <div className="theme-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                            {themes.map((t) => (
                                <div 
                                    key={t.id} 
                                    className={`theme-card ${activeTheme === t.id ? 'active' : ''}`}
                                    onClick={() => changeTheme(t.id)}
                                    style={{
                                        cursor: 'pointer',
                                        borderRadius: '16px',
                                        padding: '1.25rem',
                                        border: activeTheme === t.id ? '2px solid var(--primary)' : '2px solid var(--border)',
                                        background: activeTheme === t.id ? 'var(--primary-light)' : 'white',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        boxShadow: activeTheme === t.id ? 'var(--shadow-md)' : 'none'
                                    }}
                                >
                                    <div className="theme-preview" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                        {t.colors.map((color, i) => (
                                            <div 
                                                key={i} 
                                                className="color-blob" 
                                                style={{ 
                                                    width: '28px', 
                                                    height: '28px', 
                                                    borderRadius: '50%', 
                                                    backgroundColor: color,
                                                    border: '2px solid white',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="theme-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="theme-name" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{t.name}</span>
                                        {activeTheme === t.id && (
                                            <div className="active-check" style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', padding: '2px' }}>
                                                <Check size={10} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notification Settings Placeholder */}
                    <div className="premium-card mt-8" style={{ padding: '2rem', marginTop: '2rem' }}>
                         <div className="section-header-styled mb-6" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                            <div className="header-icon" style={{ background: '#f39c12', padding: '10px', borderRadius: '12px', color: 'white' }}>
                                <Bell size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>Notification Preferences</h3>
                                <p className="text-muted" style={{ margin: 0 }}>Configure how you want to be notified about approvals and trip updates.</p>
                            </div>
                        </div>
                        
                        <div className="settings-list">
                            {[
                                { label: 'Push Notifications', desc: 'Receive real-time alerts on your device', icon: <Smartphone size={18} /> },
                                { label: 'Desktop Sounds', desc: 'Play sounds for incoming reminders', icon: <Monitor size={18} /> }
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: i === 2 ? 'none' : '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                                        <div style={{ color: 'var(--text-dim)', backgroundColor: 'var(--bg-main)', padding: '10px', borderRadius: '10px' }}>{item.icon}</div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.label}</div>
                                            <div className="text-muted" style={{ fontSize: '12px' }}>{item.desc}</div>
                                        </div>
                                    </div>
                                    <div className="toggle-switch">
                                        <input type="checkbox" defaultChecked style={{ width: '40px', height: '20px', cursor: 'pointer' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Admin Section: Mobile Tracking Config */}
                    {['admin', 'superuser'].includes((user?.role?.name || user?.role || '').toLowerCase()) && (
                        <div className="premium-card mt-8" style={{ padding: '2rem', marginTop: '2rem', border: '2px solid #3b82f620' }}>
                            <div className="section-header-styled mb-6" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #3b82f6', paddingBottom: '1rem', marginBottom: '2rem' }}>
                                <div className="header-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', padding: '10px', borderRadius: '12px', color: 'white' }}>
                                    <Navigation size={24} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e40af' }}>Global Mobility Configuration</h3>
                                    <p className="text-muted" style={{ margin: 0 }}>Define behavior for stealth mobile GPS tracking and sync intervals.</p>
                                </div>
                                <button 
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleUpdateTrackingConfig()}
                                >
                                    Save Changes
                                </button>
                            </div>

                            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                                <div className="config-item">
                                    <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: '#334155' }}>Sync Interval (Minutes)</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={trackingConfig.interval_minutes}
                                        onChange={(e) => setTrackingConfig({...trackingConfig, interval_minutes: e.target.value})}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '5px' }}>How often background GPS points are synced to the cloud.</p>
                                </div>
                                <div className="config-item">
                                    <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: '#334155' }}>Distance Filter (Meters)</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={trackingConfig.distance_filter}
                                        onChange={(e) => setTrackingConfig({...trackingConfig, distance_filter: e.target.value})}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '5px' }}>Minimum movement required to trigger a new location capture.</p>
                                </div>
                                <div className="config-item">
                                    <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: '#334155' }}>Current App Version</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={trackingConfig.latest_version}
                                            onChange={(e) => setTrackingConfig({...trackingConfig, latest_version: e.target.value})}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                                            <RefreshCw size={14} />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '5px' }}>The version currently available for download.</p>
                                </div>
                                <div className="config-item">
                                    <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: '#334155' }}>Update URL (APK/Bundle)</label>
                                    <input 
                                        type="url" 
                                        className="form-control" 
                                        value={trackingConfig.update_url}
                                        onChange={(e) => setTrackingConfig({...trackingConfig, update_url: e.target.value})}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        placeholder="https://your-server.com/app.apk"
                                    />
                                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '5px' }}>Direct link to the new version file.</p>
                                </div>
                            </div>

                            <div className="toggle-group mt-6" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>Global Tracking Active</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Master switch to enable/disable background tracking system-wide.</div>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={trackingConfig.is_active}
                                        onChange={(e) => setTrackingConfig({...trackingConfig, is_active: e.target.checked})}
                                        style={{ width: '20px', height: '20px' }} 
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>Daily Stealth Monitoring</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Keeps tracking alive on non-trip days (Generic "Smart Hub Sync" mode).</div>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={trackingConfig.daily_tracking_active}
                                        onChange={(e) => setTrackingConfig({...trackingConfig, daily_tracking_active: e.target.checked})}
                                        style={{ width: '20px', height: '20px' }} 
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .settings-nav-item {
                    display: flex;
                    gap: 1rem;
                    padding: 1rem;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-bottom: 0.5rem;
                }
                .settings-nav-item:hover {
                    background: var(--primary-light);
                }
                .nav-icon {
                    padding: 10px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: fit-content;
                }
                .nav-info .title {
                    display: block;
                    font-weight: 700;
                    font-size: 0.95rem;
                    color: var(--text-main);
                }
                .nav-info .desc {
                    font-size: 11px;
                    color: var(--text-dim);
                }
                .settings-nav {
                    height: fit-content;
                    padding: 1.5rem;
                }
            `}</style>
        </div>
    );
};

export default Settings;
