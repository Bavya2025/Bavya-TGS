import { createRoot } from 'react-dom/client'
import './index.css?v=force'
import App from './App.jsx'
import GlobalErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
    <GlobalErrorBoundary>
        <App />
    </GlobalErrorBoundary>
)
