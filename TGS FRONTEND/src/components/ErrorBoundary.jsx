import React from 'react';
import api from '../api/api';
import Error500 from '../pages/Error500';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("UI CRASH DETECTED:", error, errorInfo);
        
        // Use our custom reporting API (silent fails)
        try {
            const payload = {
                level: 'ERROR',
                message: error.message || 'React UI Crash',
                traceback: error.stack + "\n\nCOMPONENT INFO:\n" + errorInfo.componentStack,
                path: window.location.pathname
            };
            
            // Sending directly via our api.js report method logic
            // Note: If user isn't logged in, this view will 403 because we set it to IsCustomAuthenticated
            // but for UI crashes inside the app, it will work.
            api.post('/api/system-logs/report-frontend/', payload).catch(() => {});
        } catch (e) {}
    }

    render() {
        if (this.state.hasError) {
            // Render the professional 500 error page instead of a white screen
            return <Error500 />;
        }

        return this.props.children; 
    }
}

export default GlobalErrorBoundary;
