import { createRoot } from 'react-dom/client'
import './index.css?v=force'
import App from './App.jsx'
import GlobalErrorBoundary from './components/ErrorBoundary.jsx'

import { BrowserRouter as Router } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
    <Router>
        <GlobalErrorBoundary>
            <App />
        </GlobalErrorBoundary>
    </Router>
)
