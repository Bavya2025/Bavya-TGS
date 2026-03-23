import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext.jsx';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateTrip from './pages/CreateTrip';
import ExpenseEntry from './pages/ExpenseEntry';
import MileageCapture from './pages/MileageCapture';
import CFOWarRoom from './pages/CFOWarRoom';
import PolicyCenter from './pages/PolicyCenter';
import ApprovalInbox from './pages/ApprovalInbox';
import Inbox from './pages/Inbox';
import Outbox from './pages/Outbox';
import AdvanceRequest from './pages/AdvanceRequest';
import GuestHouse from './pages/GuestHouse';
import TripPlanner from './pages/TripPlanner';
import ClaimReview from './pages/ClaimReview';
import Settlement from './pages/Settlement';
import Disputes from './pages/Disputes';
import VendorSelection from './pages/VendorSelection';
import MyTrips from './pages/MyTrips';
import MyRequests from './pages/MyRequests';
import FinanceDashboard from './pages/FinanceDashboard';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';
import ApiManagement from './pages/ApiManagement';
import TripTimeline from './pages/TripTimeline';
import TripStory from './pages/TripStory';
import TravelStory from './pages/TravelStory';
import LoginHistory from './pages/LoginHistory';
import AuditLogs from './pages/AuditLogs';
import DocumentOrganizerPage from './pages/DocumentOrganizerPage';
import LocationCodes from './pages/LocationCodes';
import HelpSupport from './pages/HelpSupport';
import Fleet from './pages/Fleet';
import RouteManagement from './pages/RouteManagement';
import AdminMasterManagement from './pages/AdminMasterManagement';
import FuelMaster from './pages/FuelMaster';
import JobReport from './pages/JobReport';
import TravelCreation from './pages/TravelCreation';
import TravelTimeline from './pages/TravelTimeline';

import AdminMasters from './pages/AdminMasters';
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return <Layout>{children}</Layout>;
};



function App() {
  console.log("App Component Rendering Layout Tree...");
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/trips" element={<ProtectedRoute><MyTrips /></ProtectedRoute>} />
            <Route path="/my-requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
            <Route path="/outbox" element={<ProtectedRoute><Outbox /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><DocumentOrganizerPage /></ProtectedRoute>} />
            <Route path="/planner" element={<ProtectedRoute><TripPlanner /></ProtectedRoute>} />
            <Route path="/create-trip" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
            <Route path="/approvals" element={<ProtectedRoute><ApprovalInbox /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><ExpenseEntry /></ProtectedRoute>} />
            <Route path="/mileage" element={<ProtectedRoute><MileageCapture /></ProtectedRoute>} />
            <Route path="/advance" element={<ProtectedRoute><AdvanceRequest /></ProtectedRoute>} />
            <Route path="/guesthouse" element={<ProtectedRoute><GuestHouse /></ProtectedRoute>} />
            <Route path="/fleet" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
            <Route path="/claim-review" element={<ProtectedRoute><ClaimReview /></ProtectedRoute>} />
            <Route path="/settlement" element={<ProtectedRoute><Settlement /></ProtectedRoute>} />
            <Route path="/disputes" element={<ProtectedRoute><Disputes /></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute><VendorSelection /></ProtectedRoute>} />
            <Route path="/location-codes" element={<ProtectedRoute><LocationCodes /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute><FinanceDashboard /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/policy" element={<ProtectedRoute><PolicyCenter /></ProtectedRoute>} />
            <Route path="/cfo-war-room" element={<ProtectedRoute><CFOWarRoom /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/api-management" element={<ProtectedRoute><ApiManagement /></ProtectedRoute>} />
            <Route path="/trip-timeline/:id" element={<ProtectedRoute><TripTimeline /></ProtectedRoute>} />
            <Route path="/trip-story/:id" element={<ProtectedRoute><TripStory /></ProtectedRoute>} />
            <Route path="/travel-story/:id" element={<ProtectedRoute><TravelStory /></ProtectedRoute>} />
            <Route path="/login-history" element={<ProtectedRoute><LoginHistory /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
            <Route path="/route-management" element={<ProtectedRoute><RouteManagement /></ProtectedRoute>} />
            <Route path="/master-management" element={<ProtectedRoute><AdminMasterManagement /></ProtectedRoute>} />
            <Route path="/job-report" element={<ProtectedRoute><JobReport /></ProtectedRoute>} />
            <Route path="/fuel-master" element={<ProtectedRoute><FuelMaster /></ProtectedRoute>} />
            <Route path="/travel-creation" element={<ProtectedRoute><TravelCreation /></ProtectedRoute>} />
            <Route path="/travel-timeline/:id" element={<ProtectedRoute><TravelTimeline /></ProtectedRoute>} />
            <Route path="/AdminMasters" element={<ProtectedRoute><AdminMasters /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
