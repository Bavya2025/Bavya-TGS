import React from 'react';
import { NavLink } from 'react-router-dom';
import { AlertCircle, RefreshCcw, Mail, Home } from 'lucide-react';

const Error500 = () => {
    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#fff1f2', // Soft red background
            textAlign: 'center',
            padding: '20px',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                fontSize: '150px',
                fontWeight: '900',
                color: '#fee2e2',
                position: 'relative',
                lineHeight: '1'
            }}>
                500
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#e11d48',
                    fontSize: '80px',
                }}>
                    <AlertCircle size={80} />
                </div>
            </div>
            
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#9f1239', marginTop: '20px' }}>
                System Turbulence!
            </h1>
            <p style={{ color: '#be123c', maxWidth: '500px', fontSize: '18px', margin: '15px 0 30px' }}>
                Something went wrong on our end. Our diagnostic bots have already logged this issue and our team is looking into it.
            </p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px' }}>
                <button 
                    onClick={() => window.location.reload()}
                    className="btn btn-primary"
                    style={{ background: '#e11d48', borderColor: '#e11d48', padding: '12px 25px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <RefreshCcw size={18} />
                    Try Again
                </button>
                <NavLink 
                    to="/" 
                    className="btn btn-secondary"
                    style={{ padding: '12px 25px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Home size={18} />
                    Dashboard
                </NavLink>
                <NavLink 
                    to="/help" 
                    style={{ padding: '12px 25px', display: 'flex', alignItems: 'center', gap: '8px', color: '#e11d48', fontWeight: '600', textDecoration: 'none' }}
                >
                    <Mail size={18} />
                    Contact HR/Support
                </NavLink>
            </div>
            
            <div style={{ marginTop: '50px', color: '#f43f5e', fontSize: '12px', fontWeight: 'bold' }}>
                AUTO-REPORT GENERATED & LOGGED
            </div>
        </div>
    );
};

export default Error500;
