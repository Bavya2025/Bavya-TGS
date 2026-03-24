import React from 'react';
import { NavLink } from 'react-router-dom';
import { Ghost, Home, ArrowLeft } from 'lucide-react';

const Error404 = () => {
    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            textAlign: 'center',
            padding: '20px',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                fontSize: '150px',
                fontWeight: '900',
                color: '#e2e8f0',
                position: 'relative',
                lineHeight: '1'
            }}>
                404
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#d81b60',
                    fontSize: '80px',
                }}>
                    <Ghost size={80} />
                </div>
            </div>
            
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', marginTop: '20px' }}>
                Lost in Travel?
            </h1>
            <p style={{ color: '#64748b', maxWidth: '500px', fontSize: '18px', margin: '15px 0 30px' }}>
                The destination you're looking for doesn't exist. It might have been moved or the traveler took a different route.
            </p>
            
            <div style={{ display: 'flex', gap: '15px' }}>
                <button 
                    onClick={() => window.history.back()}
                    className="btn btn-secondary"
                    style={{ padding: '12px 25px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <ArrowLeft size={18} />
                    Go Back
                </button>
                <NavLink 
                    to="/" 
                    className="btn btn-primary"
                    style={{ padding: '12px 25px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Home size={18} />
                    Return Dashboard
                </NavLink>
            </div>
            
            <div style={{ marginTop: '50px', display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '14px' }}>
                <img src="/logo.png" alt="TGS Logo" style={{ height: '30px' }} />
                <span>Bavya TGS Governance System</span>
            </div>
        </div>
    );
};

export default Error404;
