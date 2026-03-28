import React, { useState, useEffect, useMemo } from 'react';
import { 
    Map as MapIcon, 
    Calendar, 
    User, 
    Search, 
    Navigation, 
    History, 
    Play, 
    Square, 
    ChevronRight,
    Loader2,
    CalendarDays,
    Info,
    AlertCircle,
    Activity,
    Users,
    MapPin
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/api';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import SearchableSelect from '../components/SearchableSelect';

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Start/End Markers
const StartIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const EndIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to recenter map
function MapController({ points }) {
    const map = useMap();
    useEffect(() => {
        if (points && points.length > 0) {
            const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [points, map]);
    return null;
}

const AdminTracking = () => {
    const { showToast } = useToast();
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [users, setUsers] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [trackingPoints, setTrackingPoints] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingActive, setIsLoadingActive] = useState(false);
    const [trackingType, setTrackingType] = useState('daily');

    useEffect(() => {
        const load = async () => {
            await fetchUsers();
            await fetchActiveUsers();
        };
        load();
        const timer = setInterval(fetchActiveUsers, 30000);
        return () => clearInterval(timer);
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/users/?all_pages=true');
            const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            const formatted = data.map(u => ({
                id: u.id,
                name: u.name || u.username || `User ${u.id}`,
                label: u.name || u.username || `User ${u.id}`,
                employee_id: u.employee_id,
                code: u.employee_id
            }));
            setUsers(formatted);
        } catch (error) {
            console.error('Fetch users failed', error);
        }
    };

    const fetchActiveUsers = async () => {
        setIsLoadingActive(true);
        try {
            const res = await api.get('/api/team/live-tracking/');
            setActiveUsers(res.data || []);
        } catch (error) {
            console.error('Fetch active failed', error);
        } finally {
            setIsLoadingActive(false);
        }
    };

    const fetchTrackingData = async (userToTrack = null) => {
        const user = userToTrack || selectedUser;
        if (!user) return;
        setIsLoading(true);
        try {
            // First attempt with current selected type
            const endpoint = trackingType === 'daily' ? '/api/daily-tracking/' : '/api/field-tracking/';
            console.log('Fetching from:', endpoint, 'for user:', user.id);
            
            let res = await api.get(endpoint, { params: { user: user.id, date: selectedDate } });
            let points = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            
            // AUTOMATIC FALLBACK: If no data, try the other type automatically
            if (points.length === 0) {
                const altEndpoint = trackingType === 'daily' ? '/api/field-tracking/' : '/api/daily-tracking/';
                console.log('No data in primary, trying fallback:', altEndpoint);
                res = await api.get(altEndpoint, { params: { user: user.id, date: selectedDate } });
                points = Array.isArray(res.data) ? res.data : (res.data?.results || []);
                
                if (points.length > 0) {
                    showToast("Found data in " + (trackingType === 'daily' ? "Field" : "Daily") + " log", "info");
                }
            }

            if (points.length === 0) {
                setTrackingPoints([]);
                showToast("No path points found for this date", "info");
                return;
            }
            
            const sorted = [...points].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            setTrackingPoints(sorted);
            showToast(`Loaded ${sorted.length} path points`, "success");
        } catch (error) {
            console.error('Tracking fetch failed:', error);
            showToast("Sync Error", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const stats = useMemo(() => {
        if (trackingPoints.length === 0) return null;
        let distance = 0;
        for (let i = 0; i < trackingPoints.length - 1; i++) {
            const p1 = L.latLng(trackingPoints[i].latitude, trackingPoints[i].longitude);
            const p2 = L.latLng(trackingPoints[i+1].latitude, trackingPoints[i+1].longitude);
            distance += p1.distanceTo(p2);
        }
        return {
            pointsCount: trackingPoints.length,
            startTime: trackingPoints[0]?.timestamp ? format(new Date(trackingPoints[0].timestamp), 'hh:mm a') : '--',
            endTime: trackingPoints[trackingPoints.length - 1]?.timestamp ? format(new Date(trackingPoints[trackingPoints.length - 1].timestamp), 'hh:mm a') : '--',
            approxDistance: (distance / 1000).toFixed(2) + ' km'
        };
    }, [trackingPoints]);

    const handleSelectActiveUser = (u) => {
        const found = users.find(user => String(user.employee_id) === String(u.employee_id));
        if (found) {
            setSelectedUser(found);
            setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
            fetchTrackingData(found);
        }
    };

    return (
        <div className="admin-tracking-container" style={{ padding: '20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <style>
                {`
                    .override-visible { overflow: visible !important; z-index: 5000 !important; }
                    .searchable-select-dropdown { 
                        max-height: 480px !important; 
                        overflow-y: auto !important; 
                        position: absolute !important;
                        background: #ffffff !important;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2) !important;
                        z-index: 99999 !important;
                        display: block !important;
                    }
                    .searchable-select-item { height: 45px !important; min-height: 45px !important; }
                    .select-name-text { color: #000 !important; font-weight: 800 !important; font-size: 14px !important; }
                `}
            </style>

            <div style={{ background: '#0ea5e9', color: '#fff', padding: '12px 24px', borderRadius: '14px', fontSize: '12px', fontWeight: '900', display: 'flex', gap: '25px', boxShadow: '0 8px 16px rgba(14, 165, 233, 0.15)' }}>
                <span>• TOTAL EMPLOYEES: {users.length}</span>
                <span>• LIVE OPERATIONS: {activeUsers.length}</span>
                <span style={{ marginLeft: 'auto' }}>UPDATED AT: {new Date().toLocaleTimeString()}</span>
            </div>

            <div className="override-visible premium-card" style={{ background: '#fff', padding: '28px', borderRadius: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '25px', alignItems: 'end' }}>
                <div className="control-group">
                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>TRACKING TYPE</label>
                    <select value={trackingType} onChange={(e) => setTrackingType(e.target.value)} className="form-control" style={{ height: '50px', fontWeight: '700' }}>
                        <option value="daily">Common Daily Tracking</option>
                        <option value="field">Field-Force Specific</option>
                    </select>
                </div>

                <div className="control-group" style={{ position: 'relative' }}>
                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>EMPLOYEE NAME</label>
                    <SearchableSelect options={users} value={selectedUser} onChange={setSelectedUser} placeholder="Search Employee..." />
                </div>

                <div className="control-group">
                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>TRACKING DATE</label>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="form-control" style={{ height: '50px', fontWeight: '700' }} />
                </div>

                <button onClick={() => fetchTrackingData()} disabled={isLoading || !selectedUser} className="btn-primary" style={{ height: '50px', borderRadius: '12px', background: '#0d9488', fontSize: '14px' }}>
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />} VISUALIZE TRACK
                </button>
            </div>

            <div style={{ flex: 1, display: 'flex', gap: '25px', overflow: 'visible' }}>
                <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div className="premium-card" style={{ background: '#fff', padding: '24px', borderRadius: '20px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '900', marginBottom: '15px' }}>ACTIVITY STATS</h4>
                        {stats ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <StatRow label="POINTS" value={stats.pointsCount} />
                                <StatRow label="START" value={stats.startTime} />
                                <StatRow label="END" value={stats.endTime} />
                                <StatRow label="DISTANCE" value={stats.approxDistance} color="#0ea5e9" />
                            </div>
                        ) : <p style={{ fontSize: '12px', color: '#94a3b8' }}>Select user to view history.</p>}
                    </div>

                    <div className="premium-card" style={{ flex: 1, background: '#fff', padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '900', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                            LIVE STATUS <span style={{ background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{activeUsers.length}</span>
                        </h4>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {activeUsers.map((u, i) => (
                                <div key={i} onClick={() => handleSelectActiveUser(u)} style={{ 
                                    padding: '18px', borderRadius: '15px', marginBottom: '15px', border: '2px solid #e2e8f0', borderLeft: '8px solid #10b981', 
                                    background: '#ffffff', cursor: 'pointer', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' 
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <b style={{ fontSize: '14px' }}>{u.employee_name || 'Active User'}</b>
                                        <span className="animate-pulse" style={{ color: '#10b981', fontSize: '10px' }}>● LIVE</span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#475569', fontWeight: '700' }}>📍 {u.destination || 'On Route'}</p>
                                    <div style={{ marginTop: 'auto', textAlign: 'right', fontSize: '10px', fontWeight: '800' }}>Updated: {u.last_updated ? format(new Date(u.last_updated), 'HH:mm') : 'Now'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1, borderRadius: '25px', overflow: 'hidden', border: '5px solid #fff', boxShadow: '0 15px 40px rgba(0,0,0,0.1)' }}>
                    <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {trackingPoints.length > 0 && (
                            <>
                                <Polyline positions={trackingPoints.map(p => [p.latitude, p.longitude])} pathOptions={{ color: '#0ea5e9', weight: 4 }} />
                                <MapController points={trackingPoints} />
                            </>
                        )}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

const StatRow = ({ label, value, color = '#1e293b' }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: '900', color }}>{value}</span>
    </div>
);

export default AdminTracking;
