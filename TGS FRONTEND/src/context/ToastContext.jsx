import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        return id;
    }, []);

    const confirm = useCallback((message) => {
        return new Promise((resolve) => {
            const id = Math.random().toString(36).substr(2, 9);
            const onConfirm = () => {
                removeToast(id);
                resolve(true);
            };
            const onCancel = () => {
                removeToast(id);
                resolve(false);
            };
            setToasts(prev => [...prev, { 
                id, 
                message, 
                type: 'confirm', 
                onConfirm, 
                onCancel,
                autoClose: false // Confirmation shouldn't auto-close
            }]);
        });
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const regularToasts = toasts.filter(t => !['confirm', 'reminder'].includes(t.type));
    const confirmToasts = toasts.filter(t => ['confirm', 'reminder'].includes(t.type));

    const showReminder = useCallback((message, { onStop, onSnooze }) => {
        const id = Math.random().toString(36).substr(2, 9);
        const handleStop = () => {
            removeToast(id);
            if (onStop) onStop();
        };
        const handleSnooze = () => {
            removeToast(id);
            if (onSnooze) onSnooze();
        };
        setToasts(prev => [...prev, { 
            id, 
            message, 
            type: 'reminder', 
            onConfirm: handleStop, // Reuse onConfirm/onCancel props for simplicity
            onCancel: handleSnooze,
            autoClose: false 
        }]);
        return id;
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ showToast, confirm, showReminder }}>
            {children}
            {/* Confirm dialogs rendered as full-screen overlays outside corner container */}
            {confirmToasts.map(toast => (
                <Toast
                    key={toast.id}
                    id={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={removeToast}
                    onConfirm={toast.onConfirm}
                    onCancel={toast.onCancel}
                    autoClose={false}
                />
            ))}
            {/* Regular toasts in corner container */}
            <div className="toast-container">
                {regularToasts.map(toast => (
                    <Toast
                        key={toast.id}
                        id={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={removeToast}
                        onConfirm={toast.onConfirm}
                        onCancel={toast.onCancel}
                        autoClose={toast.autoClose}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
