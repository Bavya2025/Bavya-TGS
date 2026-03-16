import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
    Route as RouteIcon,
    MapPin,
    Milestone,
    Plus,
    Search,
    Trash2,
    Edit,
    Edit2,
    Save,
    X,
    ChevronRight,
    IndianRupee,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    PlusCircle,
    Box,
    ChevronDown,
    Layers,
    Zap,
    ArrowRight,
    Navigation,
    Activity,
    Database,
    MoveHorizontal,
    GitCommit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/api';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { formatIndianCurrency } from '../utils/formatters';
import IndianCurrencyInput from '../components/IndianCurrencyInput';

import SearchableSelect from '../components/SearchableSelect';

const findHierarchyPath = (data, targetId) => {
    if (!data || !targetId) return null;
    
    // We want to match the exact external_id if possible (e.g. Mandal-12)
    // If we only have an integer (fallback), we will match the first item with that ID.
    const searchStr = String(targetId);

    const levelMap = {
        'Continent': { key: 'countries', next: 'Country' },
        'Country': { key: 'states', next: 'State' },
        'State': { key: 'districts', next: 'District' },
        'District': { key: 'mandals', next: 'Mandal' },
        'Mandal': { key: 'clusters', next: 'Cluster' },
        'Cluster': null // Handled below
    };

    const traverse = (items, path = [], level = 'Continent') => {
        if (!items || !Array.isArray(items)) return null;
        for (const item of items) {
            if (!item) continue;
            
            const currentPath = [...path, item.name];
            const currentExtId = `${level}-${item.id}`;
            const isMatch = (currentExtId === searchStr) || (String(item.id) === searchStr);
            
            if (isMatch) return currentPath;

            // Traverse mapped children
            const config = levelMap[level];
            if (config && item[config.key] && Array.isArray(item[config.key])) {
                const found = traverse(item[config.key], currentPath, config.next);
                if (found) return found;
            }

            // Fallback for types that might use 'cities' or other keys
            if (level === 'Mandal' && item.cities && Array.isArray(item.cities)) {
                const found = traverse(item.cities, currentPath, 'Cluster');
                if (found) return found;
            }
            
            // Special traversal for Cluster children
            if (level === 'Cluster' || level === 'Mandal') {
                if (item.visiting_locations && Array.isArray(item.visiting_locations)) {
                    const found = traverse(item.visiting_locations, currentPath, 'Visiting Location');
                    if (found) return found;
                }
                if (item.locations && Array.isArray(item.locations)) {
                    const found = traverse(item.locations, currentPath, 'Site');
                    if (found) return found;
                }
                if (item.landmarks && Array.isArray(item.landmarks)) {
                    const found = traverse(item.landmarks, currentPath, 'Landmark');
                    if (found) return found;
                }
                if (item.children && Array.isArray(item.children)) {
                    const found = traverse(item.children, currentPath, 'Cluster');
                    if (found) return found;
                }
            }
        }
        return null;
    };

    return traverse(data);
};

const VEHICLE_CATEGORIES = [
    'Car / Jeep / Van',
    'LCV (Light Commercial Vehicle)',
    'Bus / Truck (2 Axle)',
    '3-Axle Commercial',
    'MAV (Multi-Axle Vehicle 4-6)',
    'Oversized Vehicle (7+ Axle)'
];
const JOURNEY_TYPES = ['UP', 'DOWN', 'TO_AND_FRO'];

const RouteManagement = () => {
    const { showToast, confirm } = useToast();
    const [activeTab, setActiveTab] = useState('routes');
    const [loading, setLoading] = useState(false);
    const [routes, setRoutes] = useState([]);
    const [locations, setLocations] = useState([]);
    const [discoveryNodes, setDiscoveryNodes] = useState([]); // ISOLATED: Hierarchy specific state
    const [tollGates, setTollGates] = useState([]);
    const [routeSearch, setRouteSearch] = useState('');
    const [tollSearch, setTollSearch] = useState('');
    const [geoSearch, setGeoSearch] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingPathId, setEditingPathId] = useState(null);
    const [routePage, setRoutePage] = useState(1);
    const [tollPage, setTollPage] = useState(1);
    const [routeMetadata, setRouteMetadata] = useState({ count: 0, totalPages: 1 });
    const [tollMetadata, setTollMetadata] = useState({ count: 0, totalPages: 1 });
    const [isPathViewerOpen, setIsPathViewerOpen] = useState(false);
    const [viewingRoute, setViewingRoute] = useState(null);
    const [activePathIndex, setActivePathIndex] = useState(0);
    const [diagramStyle, setDiagramStyle] = useState('curved'); // 'straight' | 'curved'

    const [hierarchicalFilter, setHierarchicalFilter] = useState({
        continent: '',
        country: '',
        state: '',
        district: '',
        mandal: '',
        cluster: '',
        local: ''
    });
    const [selectionMode, setSelectionMode] = useState(''); // Empty initially for sequential flow
    const [continents, setContinents] = useState([]);
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [mandals, setMandals] = useState([]);
    const [locals, setLocals] = useState([]);

    const [logisticsType, setLogisticsType] = useState(''); // Empty initially for sequential flow
    const [fullHierarchy, setFullHierarchy] = useState([]);
    const [fetchError, setFetchError] = useState(null);
    const API_URL = "/api/geo/hierarchy/";

    // Independent pools for Route Creation
    const [sourcePool, setSourcePool] = useState([]);
    const [destPool, setDestPool] = useState([]);
    const [sourceFilter, setSourceFilter] = useState({ continent: 'Asia', country: 'India', state: '', district: '', mandal: '', cluster: '', point: '' });
    const [destFilter, setDestFilter] = useState({ continent: 'Asia', country: 'India', state: '', district: '', mandal: '', cluster: '', point: '' });


    // Independent hierarchy lists for Source and Destination picks
    const [sourceLists, setSourceLists] = useState({ countries: [], states: [], districts: [], mandals: [], locals: [] });
    const [destLists, setDestLists] = useState({ countries: [], states: [], districts: [], mandals: [], locals: [] });
    const [tollFilter, setTollFilter] = useState({ continent: '', country: '', state: '', district: '', mandal: '', cluster: '', local: '' });
    const [tollPool, setTollPool] = useState([]);
    const [tollLists, setTollLists] = useState({ countries: [], states: [], districts: [], mandals: [], locals: [] });

    // Modals
    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
    const [isTollModalOpen, setIsTollModalOpen] = useState(false);
    const [isPathModalOpen, setIsPathModalOpen] = useState(false);
    const [isPathTollModalOpen, setIsPathTollModalOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [selectedPath, setSelectedPath] = useState(null);
    const [routePaths, setRoutePaths] = useState([]);
    const [pathTolls, setPathTolls] = useState([]);
    const [viaDetails, setViaDetails] = useState({}); // New state to persist hub detail
    const [registrySearch, setRegistrySearch] = useState(''); // Search for global inventorys for display

    // Form States
    const [newRoute, setNewRoute] = useState({ source: '', destination: '' });
    const [newToll, setNewToll] = useState({
        name: '', gate_code: '', registered_id: '', location: '', rates: 
            VEHICLE_CATEGORIES.flatMap(vc => 
                JOURNEY_TYPES.map(jt => ({ travel_mode: vc, journey_type: jt, rate: 0 }))
            )
    });
    const [newPath, setNewPath] = useState({
        path_name: '',
        distance_km: '',
        via_id: '',
        via_locations: [],
        segment_distances: {} // Keyed by segment index: 0, 1, 2...
    });

    const prevSearch = useRef({ routes: '', tolls: '', locations: '' });

    useEffect(() => {
        const currentSearch = activeTab === 'routes' ? routeSearch : activeTab === 'tolls' ? tollSearch : geoSearch;
        
        // If search query for active tab is actually changing, debounce
        if (currentSearch !== prevSearch.current[activeTab]) {
            prevSearch.current[activeTab] = currentSearch;
            const timer = setTimeout(() => {
                if (activeTab === 'routes') { setRoutePage(1); fetchRoutes(1, routeSearch); }
                else if (activeTab === 'tolls') { setTollPage(1); fetchTolls(1, tollSearch); }
            }, 500);
            return () => clearTimeout(timer);
        } else {
            // Initial load or tab change (no search debounce needed)
            if (activeTab === 'routes') fetchRoutes(routePage, routeSearch);
            else if (activeTab === 'tolls') fetchTolls(tollPage, tollSearch);
        }
    }, [activeTab, routePage, tollPage, routeSearch, tollSearch, geoSearch]);

    const fetchRoutes = async (targetPage = routePage, targetSearch = routeSearch) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/masters/routes/?page=${targetPage}&search=${targetSearch}`);
            const data = res.data.results || res.data;
            setRoutes(Array.isArray(data) ? data : []);
            setRouteMetadata({
                count: res.data.count || (Array.isArray(data) ? data.length : 0),
                totalPages: Math.ceil((res.data.count || 0) / 10) || 1
            });
        } catch (error) {
            console.error("Error fetching routes:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTolls = async (targetPage = tollPage, targetSearch = tollSearch) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/masters/toll-gates/?page=${targetPage}&search=${targetSearch}`);
            const data = res.data.results || res.data;
            setTollGates(Array.isArray(data) ? data : []);
            setTollMetadata({
                count: res.data.count || (Array.isArray(data) ? data.length : 0),
                totalPages: Math.ceil((res.data.count || 0) / 10) || 1
            });
        } catch (error) {
            console.error("Error fetching tolls:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLocations = async () => {
        if (activeTab === 'locations') return; // BLOCK: Geo Hierarchy must use pure Hierarchy Data
        setLoading(true);
        try {
            const locsRes = await api.get('/api/masters/locations/?type=City');
            setLocations(locsRes.data.results || locsRes.data);
        } catch (error) {
            console.error("Error fetching locations:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        // Legacy multi-fetch replaced by tab-specific fetchers
        if (activeTab === 'routes') fetchRoutes();
        else if (activeTab === 'tolls') fetchTolls();
        else if (activeTab !== 'locations') fetchLocations(); // Only fetch legacy locations if NOT on Geo Hierarchy tab
    };

    const fetchChildren = async (parentId, type, setOptions) => {
        if (!parentId) {
            setOptions([]);
            return;
        }
        try {
            const res = await api.get(`/api/masters/locations/?parent=${parentId}`);
            setOptions(res.data.results || res.data);
        } catch (err) { console.error(`Error fetching ${type}:`, err); }
    };

    const fetchFullHierarchy = async (forceRefetch = false) => {
        const needsHierarchy = isRouteModalOpen || isPathModalOpen || isTollModalOpen || activeTab === 'locations';
        if (!needsHierarchy && !forceRefetch) return;
        if (fullHierarchy.length > 0 && activeTab !== 'locations' && !fetchError && !forceRefetch) return;

        setLoading(true);
        setFetchError(null);
        try {
            if (!navigator.onLine) throw new Error("Connection Lost. Please check your internet.");
            const res = await api.get(API_URL);
            const data = res.data.results || res.data.data || res.data;
            if (res.data.error) throw new Error(res.data.error);
            setFullHierarchy(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching full hierarchy:", err);
            setFetchError(err.message || "Unable to connect to Geocoding Server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFullHierarchy();
    }, [isRouteModalOpen, isPathModalOpen, isTollModalOpen, activeTab]);

    // Automatically populate continents from fullHierarchy
    useEffect(() => {
        if (fullHierarchy.length > 0) {
            setContinents(fullHierarchy.map(c => ({ id: c.id, name: c.name })));
        }
    }, [fullHierarchy]);

    // Helper to safely extract string name from a filter value (which could be an object or string)
    const getFilterName = (val) => {
        if (!val) return '';
        if (typeof val === 'object') return (val.name || '').trim().toLowerCase();
        return String(val).trim().toLowerCase();
    };

    const getChildren = (type, filters) => {
        if (!fullHierarchy || !fullHierarchy.length) return [];
        let data = fullHierarchy;

        if (type === 'continent') return data;

        // Defensive find with type-safe name extraction
        const continent = data.find(c => (c.name || '').trim().toLowerCase() === getFilterName(filters.continent));
        const countries = continent?.children || continent?.countries || [];
        if (type === 'country') return countries;

        const country = countries.find(c => (c.name || '').trim().toLowerCase() === getFilterName(filters.country));
        const states = country?.states || country?.state || country?.children || [];
        if (type === 'state') return states;

        const state = states.find(s => (s.name || '').trim().toLowerCase() === getFilterName(filters.state));
        const districts = state?.districts || state?.district || state?.children || [];
        if (type === 'district') return districts;

        const district = districts.find(d => (d.name || '').trim().toLowerCase() === getFilterName(filters.district));
        const mandals = district?.mandals || district?.mandal || district?.children || [];
        if (type === 'mandal') return mandals;

        const mandal = mandals.find(m => (m.name || '').trim().toLowerCase() === getFilterName(filters.mandal));
        const clusters = [
            ...(mandal?.clusters || []), 
            ...(mandal?.metro_polyten_cities || []),
            ...(mandal?.cities || []),
            ...(mandal?.towns || []),
            ...(mandal?.villages || []),
            ...(mandal?.children || [])
        ];
        if (type === 'cluster') return clusters;

        const cluster = clusters.find(c => (c.name || '').trim().toLowerCase() === getFilterName(filters.cluster));
        const visitingLocations = cluster?.visiting_locations || cluster?.locations || [];
        if (type === 'visitingLocation') return visitingLocations;

        const landmarks = cluster?.landmarks || [];
        if (type === 'landmark') return landmarks;

        return [];
    };

    const getFinalPoints = (filters, mode, pointType = 'any') => {
        if (!fullHierarchy || !fullHierarchy.length) return [];
        let data = fullHierarchy;

        const continent = data.find(c => (c.name || '').trim().toLowerCase() === getFilterName(filters.continent));
        const countries = continent?.children || continent?.countries || [];
        const country = countries.find(c => (c.name || '').trim().toLowerCase() === getFilterName(filters.country));
        const states = country?.states || country?.state || country?.children || [];
        const state = states.find(s => (s.name || '').trim().toLowerCase() === getFilterName(filters.state));
        const districts = state?.districts || state?.district || state?.children || [];
        const district = districts.find(d => (d.name || '').trim().toLowerCase() === getFilterName(filters.district));
        const mandals = district?.mandals || district?.mandal || district?.children || [];
        const mandal = mandals.find(m => (m.name || '').trim().toLowerCase() === getFilterName(filters.mandal));

        const extractPoints = (c) => {
            const sites = c.visiting_locations || c.locations || [];
            const landmarks = c.landmarks || [];
            if (pointType === 'visiting') return sites;
            if (pointType === 'landmark') return landmarks;
            // 'any' or 'terminal' should include both sites and landmarks
            return [...sites, ...landmarks];
        };

        const clusters = mandal ? [
            ...(mandal?.clusters || []), 
            ...(mandal?.metro_polyten_cities || []),
            ...(mandal?.cities || []),
            ...(mandal?.towns || []),
            ...(mandal?.villages || []),
            ...(mandal?.children || [])
        ] : [];

        if (mode === 'normal') {
            // LONG ROUTE: Return Clusters only
            if (!mandal) return [];
            if (filters.cluster) {
                const cluster = clusters.find(c => (c.name || '').trim().toLowerCase() === getFilterName(filters.cluster));
                return cluster ? [{ ...cluster, id: `Cluster-${cluster.id}` }] : [];
            }
            return clusters.map(c => ({ ...c, id: `Cluster-${c.id}` }));
        } else {
            // LOCAL ROUTE: Return Sites/Landmarks only
            if (!mandal) return [];
            if (filters.cluster) {
                const cluster = clusters.find(c => (c.name || '').trim().toLowerCase() === getFilterName(filters.cluster));
                const points = cluster ? extractPoints(cluster) : [];
                return points.map(p => ({ ...p, id: `Site-${p.id}` }));
            }
            
            let allPoints = [];
            clusters.forEach(c => { allPoints = [...allPoints, ...extractPoints(c)]; });
            return allPoints.map(p => ({ ...p, id: `Site-${p.id}` }));
        }
    };

    // Update pools based on filters or Global
    useEffect(() => {
        if (!isRouteModalOpen && !isTollModalOpen) return;
        
        const updatePools = async () => {
            if (selectionMode === 'drilldown') {
                const sPoints = getFinalPoints(sourceFilter, logisticsType, 'visiting');
                const dPoints = getFinalPoints(destFilter, logisticsType, 'visiting');
                setSourcePool(sPoints);
                setDestPool(dPoints);

                // Source Validation & Auto-Select
                if (sPoints.length > 0) {
                    const isValid = newRoute.source && sPoints.some(p => String(p.id) === String(newRoute.source));
                    if (newRoute.source && !isValid) {
                        setNewRoute(prev => ({ ...prev, source: '' }));
                    } else if (!newRoute.source) {
                        const match = sPoints.find(p => p.name?.trim().toLowerCase() === (sourceFilter.cluster || sourceFilter.mandal)?.trim().toLowerCase());
                        if (match) setNewRoute(prev => ({ ...prev, source: match.id }));
                        else if (sPoints.length === 1) setNewRoute(prev => ({ ...prev, source: sPoints[0].id }));
                    }
                } else if (newRoute.source) {
                    setNewRoute(prev => ({ ...prev, source: '' }));
                }

                // Destination Validation & Auto-Select
                if (dPoints.length > 0) {
                    const isValid = newRoute.destination && dPoints.some(p => String(p.id) === String(newRoute.destination));
                    if (newRoute.destination && !isValid) {
                        setNewRoute(prev => ({ ...prev, destination: '' }));
                    } else if (!newRoute.destination) {
                        const match = dPoints.find(p => p.name?.trim().toLowerCase() === (destFilter.cluster || destFilter.mandal)?.trim().toLowerCase());
                        if (match) setNewRoute(prev => ({ ...prev, destination: match.id }));
                        else if (dPoints.length === 1) setNewRoute(prev => ({ ...prev, destination: dPoints[0].id }));
                    }
                } else if (newRoute.destination) {
                    setNewRoute(prev => ({ ...prev, destination: '' }));
                }
            } else if (selectionMode === 'code') {
                // Code Mode: Fetch flat list of locations (Standard Master API)
                try {
                    const type = logisticsType === 'local' ? 'Site' : 'Cluster';
                    const res = await api.get(`/api/masters/locations/?type=${type}`);
                    const results = res.data.results || res.data;
                    const formatted = results.map(r => ({
                        ...r,
                        originalName: r.name,
                        name: r.name
                    }));
                    setSourcePool(formatted);
                    setDestPool(formatted);
                } catch (err) { console.error("Error fetching global locations:", err); }
            }
        };
        updatePools();
    }, [sourceFilter, destFilter, logisticsType, fullHierarchy, selectionMode, isRouteModalOpen, isTollModalOpen]);

    // Pool update logic for Path Management (Via stops)
    useEffect(() => {
        if (!isPathModalOpen) return;

        if (selectionMode === 'drilldown') {
            const results = getFinalPoints(hierarchicalFilter, logisticsType || 'local', 'any');
            setLocations(results);
        } else {
            // Code Mode: Global Search based on Logistics Type
            const fetchEnroutePoints = async () => {
                try {
                    if (logisticsType === 'normal') {
                        // LONG ROUTE: Show Clusters
                        const res = await api.get('/api/masters/locations/?type=Cluster');
                        setLocations(res.data.results || res.data);
                    } else {
                        // LOCAL ROUTE: Show Sites and Landmarks
                        const [sitesRes, landmarksRes] = await Promise.all([
                            api.get('/api/masters/locations/?type=Site'),
                            api.get('/api/masters/locations/?type=Landmark')
                        ]);
                        const sites = sitesRes.data.results || sitesRes.data;
                        const landmarks = landmarksRes.data.results || landmarksRes.data;
                        setLocations([...sites, ...landmarks]);
                    }
                } catch (err) { console.error("Error fetching global enroute points:", err); }
            };
            fetchEnroutePoints();
        }
    }, [isPathModalOpen, selectionMode, logisticsType, fullHierarchy]);

    // Global Hierarchy Logic for main locations tab remains using standard API
    useEffect(() => {
        if (activeTab !== 'locations' || isRouteModalOpen || isTollModalOpen || isPathModalOpen || fullHierarchy.length === 0) return;
        
        const updateGlobalPoolFromHierarchy = () => {
            // Recursive helper to find all nodes matching search with type awareness
            const flattenNodes = (items, level = 'Continent', seenIds = new Set()) => {
                let flat = [];
                const levelMap = {
                    'Continent': { key: 'countries', next: 'Country' },
                    'Country': { key: 'states', next: 'State' },
                    'State': { key: 'districts', next: 'District' },
                    'District': { key: 'mandals', next: 'Mandal' },
                    'Mandal': { key: 'clusters', next: 'Cluster' },
                    'Cluster': { key: 'locations', next: 'Location' }
                };

                items.forEach(item => {
                    const uniqueKey = `${level}-${item.id}`;
                    if (!item.id || seenIds.has(uniqueKey)) return;
                    seenIds.add(uniqueKey);

                    const nodeWithType = { ...item, _detectedType: level };
                    flat.push(nodeWithType);
                    
                    const config = levelMap[level];
                    if (config && item[config.key] && Array.isArray(item[config.key])) {
                        flat = flat.concat(flattenNodes(item[config.key], config.next, seenIds));
                    }
                    
                    // Special extraction for Cluster children to ensure they are searchable
                    if (level === 'Cluster') {
                        if (item.visiting_locations && Array.isArray(item.visiting_locations)) {
                            flat = flat.concat(flattenNodes(item.visiting_locations, 'Visiting Location', seenIds));
                        } else if (item.locations && Array.isArray(item.locations)) {
                            flat = flat.concat(flattenNodes(item.locations, 'Visiting Location', seenIds));
                        }
                        if (item.landmarks && Array.isArray(item.landmarks)) {
                            flat = flat.concat(flattenNodes(item.landmarks, 'Landmark', seenIds));
                        }
                    }
                    
                    // Fallback for types that might use 'cities' or other keys
                    if (level === 'Mandal' && item.cities && Array.isArray(item.cities)) {
                        flat = flat.concat(flattenNodes(item.cities, 'Cluster', seenIds));
                    }
                });
                return flat;
            };

        try {
            let nodes = [];
            const isFilterActive = hierarchicalFilter.continent || hierarchicalFilter.country || hierarchicalFilter.state || hierarchicalFilter.district || hierarchicalFilter.mandal || hierarchicalFilter.cluster;

            if (geoSearch && !isFilterActive) {
                // Global Search Mode + Strict Anchored Filtering
                const allNodes = flattenNodes(fullHierarchy);
                const query = geoSearch.toLowerCase().trim();
                nodes = allNodes.filter(n => {
                    const name = (n.name || "").toLowerCase();
                    const code = (n.code || n.location_code || "").toLowerCase();
                    return name.startsWith(query) || code.startsWith(query);
                });
            } else if (hierarchicalFilter.cluster) {
                const vl = getChildren('visitingLocation', hierarchicalFilter);
                const lm = getChildren('landmark', hierarchicalFilter);
                nodes = [
                    ...vl.map(n => ({...n, _detectedType: 'Visiting Location'})),
                    ...lm.map(n => ({...n, _detectedType: 'Landmark'}))
                ];
            }
            else if (hierarchicalFilter.mandal) nodes = getChildren('cluster', hierarchicalFilter).map(n => ({...n, _detectedType: 'Cluster'}));
            else if (hierarchicalFilter.district) nodes = getChildren('mandal', hierarchicalFilter).map(n => ({...n, _detectedType: 'Mandal'}));
            else if (hierarchicalFilter.state) nodes = getChildren('district', hierarchicalFilter).map(n => ({...n, _detectedType: 'District'}));
            else if (hierarchicalFilter.country) nodes = getChildren('state', hierarchicalFilter).map(n => ({...n, _detectedType: 'State'}));
            else if (hierarchicalFilter.continent) nodes = getChildren('country', hierarchicalFilter).map(n => ({...n, _detectedType: 'Country'}));
            else nodes = fullHierarchy.map(n => ({...n, _detectedType: 'Continent'}));

            // Null-safety filter to prevent crashes from malformed nodes
            const safeNodes = nodes.filter(n => n && n.id != null);

            const mappedNodes = safeNodes.map(n => {
                const inferredType = (
                    n.countries ? 'Continent' :
                    n.states ? 'Country' :
                    n.districts ? 'State' :
                    n.mandals ? 'District' :
                    n.clusters ? 'Mandal' :
                    n.visiting_locations ? 'Cluster' : 
                    n.landmarks ? 'Cluster' :
                    (hierarchicalFilter.cluster ? 'Cluster' : 
                     hierarchicalFilter.mandal ? 'Cluster' : 
                     hierarchicalFilter.district ? 'Mandal' :
                     hierarchicalFilter.state ? 'District' :
                     hierarchicalFilter.country ? 'State' :
                     hierarchicalFilter.continent ? 'Country' : 'Continent')
                );

                // Use explicit API type if available, prioritize non-"cluster" labels
                let explicitType = n.cluster_type;
                if (!explicitType && n.type && n.type.toLowerCase() !== 'cluster') explicitType = n.type;
                if (!explicitType && n.location_type && n.location_type.toLowerCase() !== 'cluster') explicitType = n.location_type;
                
                const nodeType = explicitType || n.cluster_type || n.location_type || n.type || n._detectedType || inferredType;

                const displayId = n.code || n.location_code || (['Continent', 'Country'].includes(inferredType) ? n.name?.toUpperCase() : `ID-${n.id}`);

                const levelOrder = {
                    'Continent': 1,
                    'Country': 2,
                    'State': 3,
                    'District': 4,
                    'Mandal': 5,
                    'Cluster': 6,
                    'Visiting Location': 7,
                    'Landmark': 8
                };

                // Use robust level matching to sort unknown API types appropriately
                const sortLevel = levelOrder[nodeType] || levelOrder[inferredType] || 99;

                return {
                    id: n.id,
                    name: n.name,
                    external_id: displayId,
                    location_type: nodeType,
                    level_order: sortLevel
                };
            });
            setDiscoveryNodes(mappedNodes);
        } catch (err) {
            console.error('[Geo Hierarchy] Error updating nodes:', err);
            setDiscoveryNodes([]); // Graceful empty state, no crash
        }
        };
        updateGlobalPoolFromHierarchy();
    }, [hierarchicalFilter, activeTab, isRouteModalOpen, isTollModalOpen, isPathModalOpen, fullHierarchy, geoSearch]);

    // Cleanup effects for the Route Modal
    useEffect(() => {
        if (!isRouteModalOpen) {
            setSourceFilter({ continent: 'Asia', country: 'India', state: '', district: '', mandal: '', cluster: '', point: '' });
            setDestFilter({ continent: 'Asia', country: 'India', state: '', district: '', mandal: '', cluster: '', point: '' });
            setSourcePool([]);
            setDestPool([]);
        }
    }, [isRouteModalOpen]);

    // Cleanup effect for Toll Modal
    useEffect(() => {
        if (isRouteModalOpen) {
            // Only reset if NOT editing
            if (!editingId) {
                setTollFilter({ continent: '', country: '', state: '', district: '', mandal: '', cluster: '' });
            }
        }
    }, [isRouteModalOpen, editingId]);

    useEffect(() => {
        if (isTollModalOpen) {
            if (!editingId) {
                setLogisticsType('local'); // Default for new toll registration
                setTollFilter({ continent: '', country: '', state: '', district: '', mandal: '', cluster: '' });
                setTollPool([]);
            } else {
                const toll = tollGates.find(t => t.id === editingId);
                if (toll && !tollFilter.continent) {
                    const targetLoc = toll.location_external_id || toll.location;
                    const locPath = findHierarchyPath(fullHierarchy, targetLoc);
                    if (locPath) {
                        setTollFilter({
                            continent: locPath[0] || '',
                            country: locPath[1] || '',
                            state: locPath[2] || '',
                            district: locPath[3] || '',
                            mandal: locPath[4] || '',
                            cluster: locPath[5] || '',
                            point: ''
                        });
                    }
                }
            }
        }
    }, [isTollModalOpen, editingId, fullHierarchy]);



    useEffect(() => {
        if (!isTollModalOpen) return;
        // Toll gates: Final Authority Site must be a landmark (L7)
        const results = getFinalPoints(tollFilter, 'normal', 'landmark');
        setTollPool(results);
    }, [tollFilter, isTollModalOpen, fullHierarchy]);

    // Preview the next gate code for new toll gate registrations
    useEffect(() => {
        if (!isTollModalOpen || editingId) return;
        const maxCode = tollGates.reduce((max, t) => {
            const code = parseInt(t.gate_code || '0', 10);
            return code > max ? code : max;
        }, 1000);
        setNewToll(prev => ({ ...prev, gate_code: String(maxCode + 1).padStart(4, '0') }));
    }, [isTollModalOpen, tollGates, editingId]);

    // Robust Reactive Pre-filling for Edit Modes
    useEffect(() => {
        if (fullHierarchy.length === 0) return;

        if (isTollModalOpen && editingId) {
            const toll = tollGates.find(t => t.id === editingId);
            if (toll && !tollFilter.continent) { // Only pre-fill if empty
                const path = findHierarchyPath(fullHierarchy, toll.location);
                if (path) {
                    setTollFilter({
                        continent: path[0] || '',
                        country: path[1] || '',
                        state: path[2] || '',
                        district: path[3] || '',
                        mandal: path[4] || '',
                        cluster: path[5] || ''
                    });
                    setSelectionMode('drilldown');
                }
            }
        }

        if (isRouteModalOpen && editingId) {
            const route = routes.find(r => r.id === editingId);
            if (route && !sourceFilter.continent && !destFilter.continent) {
                // Pre-fill using the exact external_id from the backend (if available) or the raw source ID
                const targetSource = route.source_external_id || route.source;
                const targetDest = route.destination_external_id || route.destination;

                const sourcePath = findHierarchyPath(fullHierarchy, targetSource);
                const destPath = findHierarchyPath(fullHierarchy, targetDest);
                
                if (sourcePath) {
                    setSourceFilter({
                        continent: sourcePath[0] || '',
                        country: sourcePath[1] || '',
                        state: sourcePath[2] || '',
                        district: sourcePath[3] || '',
                        mandal: sourcePath[4] || '',
                        cluster: sourcePath[5] || '',
                        point: ''
                    });
                }
                if (destPath) {
                    setDestFilter({
                        continent: destPath[0] || '',
                        country: destPath[1] || '',
                        state: destPath[2] || '',
                        district: destPath[3] || '',
                        mandal: destPath[4] || '',
                        cluster: destPath[5] || '',
                        point: ''
                    });
                }
                setSelectionMode('drilldown');
                setLogisticsType(route.logistics_type || 'normal');
            }
        }
    }, [fullHierarchy, isTollModalOpen, isRouteModalOpen, editingId]);

    // Legacy continents fetch removed as it's now handled by fullHierarchy effect


    // Replaced by the unified fetchDashboardData effect above

    const handleManagePaths = async (route, pathToEdit = null) => {
        setSelectedRoute(route);
        setLoading(true);
        try {
            const res = await api.get(`/api/masters/route-paths/?route=${route.id}`);
            const paths = res.data.results || res.data;
            setRoutePaths(paths);
            
            // Build via details map from all paths and the route itself
            const details = {};
            paths.forEach(p => {
                if (p.via_locations_data) {
                    p.via_locations_data.forEach(v => {
                        details[v.id] = v;
                    });
                }
            });
            setViaDetails(prev => ({ ...prev, ...details }));
            
            setLogisticsType(route.logistics_type || 'normal');
            setSelectionMode('code');

            if (pathToEdit) {
                setEditingPathId(pathToEdit.id);
                setNewPath({
                    path_name: pathToEdit.path_name,
                    distance_km: pathToEdit.distance_km,
                    route: route.id,
                    via_id: '',
                    via_locations: pathToEdit.via_locations || [],
                    segment_distances: pathToEdit.segment_data || {}
                });
            } else {
                setEditingPathId(null);
                setNewPath({
                    path_name: '',
                    distance_km: '',
                    route: route.id,
                    via_id: '',
                    via_locations: [],
                    segment_distances: {}
                });
            }
            setIsPathModalOpen(true);
        } catch (error) {
            showToast("Error fetching paths", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEditPath = (path) => {
        setEditingPathId(path.id);
        setNewPath({
            path_name: path.path_name,
            distance_km: path.distance_km,
            route: path.route,
            via_id: '',
            via_locations: path.via_locations || [],
            segment_distances: path.segment_data || {}
        });
    };

    const handleSyncLocations = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            await api.post('/api/masters/locations/sync/');
            showToast("Geo data synchronized successfully!", "success");
            // Navigate to locations tab, then force a fresh hierarchy fetch
            setActiveTab('locations');
            setDiscoveryNodes([]);
            setGeoSearch('');
            setHierarchicalFilter({ continent: '', country: '', state: '', district: '', mandal: '', cluster: '', local: '' });
            await fetchFullHierarchy(true); // Force refetch immediately after sync
        } catch (error) {
            console.error("Sync failed:", error);
            showToast("Location sync failed. Please check the API connection.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEditRoute = (route) => {
        setEditingId(route.id);
        const sourceId = route.source_external_id || String(route.source);
        const destId = route.destination_external_id || String(route.destination);
        setNewRoute({
            name: route.name,
            source: sourceId,
            destination: destId,
            logistics_type: route.logistics_type || 'normal'
        });
        setSourceFilter({ continent: '', country: '', state: '', district: '', mandal: '', cluster: '' });
        setDestFilter({ continent: '', country: '', state: '', district: '', mandal: '', cluster: '' });
        setIsRouteModalOpen(true);
    };

    const handleDeleteRoute = async (routeId) => {
        if (await confirm("Are you sure you want to delete this route?")) {
            try {
                await api.delete(`/api/masters/routes/${routeId}/`);
                fetchRoutes();
                showToast("Route deleted successfully", "success");
            } catch (error) {
                showToast("Failed to delete route", "error");
            }
        }
    };

    const handleCreateRoute = async () => {
        if (!newRoute.source || !newRoute.destination) {
            showToast("Please select both Origin and Destination.", "error");
            return;
        }

        if (String(newRoute.source) === String(newRoute.destination)) {
            showToast("Origin and Destination cannot be the same.", "error");
            return;
        }

        try {
            if (editingId) {
                await api.put(`/api/masters/routes/${editingId}/`, newRoute);
            } else {
                await api.post('/api/masters/routes/', newRoute);
            }
            setIsRouteModalOpen(false);
            setEditingId(null);
            setNewRoute({ source: '', destination: '' });
            fetchData();
            showToast(editingId ? "Route updated successfully!" : "Route created successfully!", "success");
        } catch (error) {
            console.error("Failed to save route:", error.response?.data || error.message);
            const errData = error.response?.data;
            let errMsg = "Failed to save route.";
            
            if (errData) {
                if (typeof errData === 'string') {
                    // Prevent showing huge HTML snippets in toast
                    errMsg = errData.includes('<!DOCTYPE html>') ? "Server error occurred. Please contact admin." : errData;
                } else {
                    // Extract first error message from response data
                    const firstErr = Object.values(errData)[0];
                    errMsg = Array.isArray(firstErr) ? firstErr[0] : (typeof firstErr === 'string' ? firstErr : errMsg);
                }
            }
            showToast(errMsg, "error");
        }
    };

    const handleEditToll = (toll) => {
        setEditingId(toll.id);
        const locId = toll.location_external_id || String(toll.location);
        setNewToll({
            name: toll.name,
            gate_code: toll.gate_code || '',
            registered_id: toll.registered_id || '',
            location: locId,
            rates: VEHICLE_CATEGORIES.flatMap(vc => 
                JOURNEY_TYPES.map(jt => {
                    const existing = toll.rates?.find(r => r.travel_mode === vc && r.journey_type === jt);
                    return existing ? { ...existing } : { travel_mode: vc, journey_type: jt, rate: 0 };
                })
            )
        });
        setTollFilter({ continent: '', country: '', state: '', district: '', mandal: '', cluster: '' });
        setIsTollModalOpen(true);
    };

    const handleDeleteToll = async (tollId) => {
        if (await confirm("Are you sure you want to delete this toll gate?")) {
            try {
                await api.delete(`/api/masters/toll-gates/${tollId}/`);
                fetchTolls();
                showToast("Toll gate deleted successfully", "success");
            } catch (error) {
                showToast("Failed to delete toll gate", "error");
            }
        }
    };

    const handleCreateToll = async () => {
        // ── Client-side duplicate guard ───────────────────────────────────────
        const trimmedName = newToll.name?.trim();
        if (!trimmedName) { showToast('Please enter a Toll Gate name.', 'error'); return; }
        if (!newToll.location) { showToast('Please select a Final Authority Site.', 'error'); return; }

        const nameDupe = tollGates.find(t =>
            t.name?.trim().toLowerCase() === trimmedName.toLowerCase() &&
            (!editingId || t.id !== editingId)
        );
        if (nameDupe) { showToast('A toll gate with this name already exists.', 'error'); return; }

        const locDupe = tollGates.find(t =>
            String(t.location) === String(newToll.location) &&
            (!editingId || t.id !== editingId)
        );
        if (locDupe) { showToast('A toll gate already exists at this location.', 'error'); return; }
        // ─────────────────────────────────────────────────────────────────────
        try {
            let tollId = editingId;
            if (editingId) {
                await api.put(`/api/masters/toll-gates/${editingId}/`, {
                    name: trimmedName,
                    registered_id: newToll.registered_id,
                    location: newToll.location
                });
                const oldRates = (await api.get(`/api/masters/toll-rates/?toll_gate=${editingId}`)).data;
                await Promise.all(oldRates.map(r => api.delete(`/api/masters/toll-rates/${r.id}/`)));
            } else {
                const tollRes = await api.post('/api/masters/toll-gates/', {
                    name: trimmedName,
                    registered_id: newToll.registered_id,
                    location: newToll.location
                });
                tollId = tollRes.data.id;
            }

            // Create/Refresh the rates
            await Promise.all(newToll.rates.map(r =>
                api.post('/api/masters/toll-rates/', {
                    toll_gate: tollId,
                    travel_mode: r.travel_mode,
                    journey_type: r.journey_type,
                    rate: r.rate
                })
            ));

            setIsTollModalOpen(false);
            setEditingId(null);
            setNewToll({
                name: '', gate_code: '', registered_id: '', location: '', rates: 
                    VEHICLE_CATEGORIES.flatMap(vc => 
                        JOURNEY_TYPES.map(jt => ({ travel_mode: vc, journey_type: jt, rate: 0 }))
                    )
            });
            setTollFilter({ continent: '', country: '', state: '', district: '', mandal: '', cluster: '', local: '' });
            fetchData();
            showToast(editingId ? "Toll gate updated successfully!" : "Toll gate and rates created successfully!", "success");
        } catch (error) {
            const errData = error.response?.data;
            let errMsg = 'Failed to save toll gate.';
            if (errData) {
                if (typeof errData === 'string') errMsg = errData;
                else {
                    const msgs = Object.entries(errData)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join(' | ');
                    if (msgs) errMsg = msgs;
                }
            }
            showToast(errMsg, 'error');
        }
    };

    const handleManageTolls = async (path, route) => {
        if (route) setSelectedRoute(route);
        setSelectedPath(path);
        setPathTolls([]); // Clear previous to avoid leakage
        setLoading(true);
        try {
            // Ensure global toll registry is loaded
            const tollsRes = await api.get('/api/masters/toll-gates/?page=1&limit=1000');
            setTollGates(tollsRes.data.results || tollsRes.data);

            const res = await api.get(`/api/masters/route-path-tolls/?path=${path.id}`);
            setPathTolls(res.data.results || res.data);
            setIsPathTollModalOpen(true);
        } catch (error) {
            showToast("Error fetching path tolls", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAssignToll = async (tollId) => {
        try {
            await api.post('/api/masters/route-path-tolls/', {
                path: selectedPath.id,
                toll_gate: tollId,
                order: pathTolls.length + 1
            });
            handleManageTolls(selectedPath, selectedRoute);
            showToast("Toll assigned successfully!", "success");
        } catch (error) {
            console.error("Failed to assign toll:", error.response?.data || error.message);
            showToast("Failed to assign toll to path.", "error");
        }
    };
    const handleAddPath = async () => {
        try {
            // Build name from via points if not manually set
            let pathName = newPath.path_name;
            if (!pathName && newPath.via_locations.length > 0) {
                const stopNames = newPath.via_locations
                    .map(vid => (viaDetails[vid]?.name || locations.find(l => String(l.id) === String(vid))?.name))
                    .filter(n => n);
                pathName = `via ${stopNames.join(', ')}`;
            }
            
            // Final fallback name with variant logic
            if (!pathName) {
                const variantSuffix = String.fromCharCode(97 + routePaths.length); // a, b, c...
                pathName = `${selectedRoute.name}-${variantSuffix}`;
            }

            const data = {
                route: selectedRoute.id,
                path_name: pathName,
                distance_km: newPath.distance_km,
                via_locations: newPath.via_locations,
                segment_data: newPath.segment_distances
            };

            if (editingPathId) {
                await api.put(`/api/masters/route-paths/${editingPathId}/`, data);
                showToast("Enroute path updated successfully!", "success");
            } else {
                await api.post('/api/masters/route-paths/', data);
                showToast("Enroute path created successfully!", "success");
            }
            
            // Refresh main routes to update variant count
            fetchRoutes();

            // Reset state after success
            setNewPath({
                path_name: '',
                distance_km: '',
                via_id: '',
                via_locations: [],
                segment_distances: {}
            });
            setEditingPathId(null);

            handleManagePaths(selectedRoute);
        } catch (error) {
            console.error("Error saving path:", error.response?.data || error.message);
            const errData = error.response?.data;
            let errMsg = `Failed to ${editingPathId ? 'update' : 'create'} enroute path`;
            
            if (errData) {
                if (typeof errData === 'string') {
                    errMsg = errData.includes('<!DOCTYPE html>') ? "Server error occurred. Please contact admin." : errData;
                } else {
                    const firstErr = Object.values(errData)[0];
                    errMsg = Array.isArray(firstErr) ? firstErr[0] : (typeof firstErr === 'string' ? firstErr : errMsg);
                }
            }
            showToast(errMsg, "error");
        }
    };

    const renderRoutes = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center glass p-8 rounded-[2.5rem] shadow-sm mb-12">
                <div className="professional-input-wrapper max-w-2xl">
                    <Search className="professional-input-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Search by Route Name, Source, or Destination Code..."
                        className="professional-input-v2 h-16 text-lg"
                        value={routeSearch}
                        onChange={(e) => setRouteSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-4">
                    <button className="btn-secondary h-16 px-8 flex items-center gap-3 transition-transform hover:rotate-12" onClick={fetchRoutes}>
                        <RefreshCw size={20} />
                    </button>
                    <button className="btn-primary h-16 px-10 flex items-center gap-3" onClick={() => setIsRouteModalOpen(true)}>
                        <PlusCircle size={22} />
                        <span>Define New Route</span>
                    </button>
                </div>
            </div>

            <div className="table-wrapper !bg-white/50 backdrop-blur-md rounded-[3rem] border border-slate-200/60 overflow-x-auto shadow-2xl shadow-slate-200/50 transition-all">
                <table className="admin-table" style={{ minWidth: '1400px', tableLayout: 'fixed', width: '1400px' }}>
                    <colgroup>
                        <col style={{ width: '320px' }} />
                        <col style={{ width: '200px' }} />
                        <col style={{ width: '200px' }} />
                        <col style={{ width: '140px' }} />
                        <col style={{ width: '140px' }} />
                        <col style={{ width: '400px' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="!pl-10">Route Identity</th>
                            <th>Source Point</th>
                            <th>Final Destination</th>
                            <th className="text-center">Variants</th>
                            <th className="text-center">Tracking</th>
                            <th className="text-right !pr-10">Operations</th>
                        </tr>
                    </thead>
                    <tbody>
                        {routes.map(route => (
                            <React.Fragment key={route.id}>
                                <tr className="group hover:bg-slate-50/80 transition-all border-b border-slate-50 last:border-none">
                                    <td className="py-6 !pl-10">
                                        <div className="flex items-center gap-4">
                                            <div className="card-icon-wrapper !w-10 !h-10 !mb-0 !bg-slate-100 transition-all shrink-0">
                                                <RouteIcon size={18} className="text-slate-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 text-base">{route.route_code}</span>
                                                {route.name && (
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase">{route.name}</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500"></div>
                                            <span className="text-sm font-black text-slate-700">{route.source_name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full border-2 border-primary"></div>
                                            <span className="text-sm font-black text-slate-700">{route.destination_name}</span>
                                        </div>
                                    </td>
                                    <td className="text-center py-6">
                                        <div className="flex items-center justify-center">
                                            <button 
                                                onClick={() => {
                                                    setViewingRoute(route);
                                                    setActivePathIndex(0);
                                                    setIsPathViewerOpen(true);
                                                }}
                                                className="inline-flex items-center justify-center rounded-xl shadow-lg transition-all hover:scale-110 active:scale-95"
                                                style={{ 
                                                    flex: 'none', 
                                                    width: '36px', 
                                                    height: '36px',
                                                    minWidth: '36px',
                                                    minHeight: '36px',
                                                    backgroundColor: '#0f172a',
                                                    color: '#ffffff',
                                                    fontSize: '11px',
                                                    fontWeight: '900',
                                                    border: 'none',
                                                    padding: 0
                                                }}
                                            >
                                                {route.variant_count || 0}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className="badge-pill badge-live !inline-flex !py-1.5 !px-3 font-black text-[9px] mx-auto border border-red-100">
                                            <span className="live-pulse"></span>
                                            CONNECTED
                                        </div>
                                    </td>
                                    <td className="!pr-10">
                                        <div className="flex justify-end items-center gap-4">
                                            <div className="flex gap-2 mr-4 pr-4 border-r border-slate-100 shrink-0">
                                                <button
                                                    className="h-10 px-4 !text-[10px] font-black uppercase flex items-center gap-2.5 bg-slate-100/50 text-slate-600 rounded-xl hover:bg-primary hover:text-white transition-all group/btn whitespace-nowrap"
                                                    onClick={() => handleManagePaths(route)}
                                                >
                                                    <Plus size={14} strokeWidth={3} className="text-primary group-hover/btn:text-white shrink-0" />
                                                    <span>Config Via</span>
                                                </button>
                                                <button
                                                    className="h-10 px-4 !text-[10px] font-black uppercase flex items-center gap-2.5 bg-slate-100/50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all whitespace-nowrap"
                                                    onClick={async () => {
                                                        try {
                                                            const res = await api.get(`/api/masters/route-paths/?route=${route.id}`);
                                                            const paths = res.data.results || res.data;
                                                            if (paths.length > 0) {
                                                                handleManageTolls(paths[0], route);
                                                            } else {
                                                                showToast("Please configure a Path Variant (Config Via) before assigning tolls.", "error");
                                                            }
                                                        } catch (e) {
                                                            console.error(e);
                                                        }
                                                    }}
                                                >
                                                    <Milestone size={14} strokeWidth={3} className="shrink-0" />
                                                    <span>Set Tolls</span>
                                                </button>
                                            </div>
                                            <div className="flex gap-1.5 shrink-0">
                                                <button 
                                                    title="Edit Route" 
                                                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
                                                    onClick={() => handleEditRoute(route)}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    title="Delete Route" 
                                                    className="w-10 h-10 flex items-center justify-center hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                                                    onClick={() => handleDeleteRoute(route.id)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                        {routes.length === 0 && !loading && (
                            <tr>
                                <td colSpan="6" className="py-20 text-center">
                                    <div className="no-nodes-container !py-10">
                                        <div className="mb-6 relative">
                                            <Search className="text-slate-300" size={64} strokeWidth={1} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-widest">No Routes Found</h3>
                                        <p className="text-[14px] font-medium text-slate-500 max-w-sm mx-auto leading-relaxed">
                                            Adjust your search or add a new route to get started.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination UI */}
            <div className="mt-12 flex justify-between items-center py-8 border-t border-slate-100">
                <div className="flex items-center gap-4">
                    <p className="text-sm font-bold text-slate-500">
                        Showing <span className="text-slate-900">{routes.length}</span> of <span className="text-primary">{routeMetadata.count}</span> Routes
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        disabled={routePage === 1}
                        onClick={() => setRoutePage(p => Math.max(1, p - 1))}
                        className={`h-12 w-12 flex items-center justify-center rounded-2xl border transition-all ${routePage === 1 ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary shadow-sm hover:-translate-y-0.5'}`}
                    >
                        <ChevronRight size={20} className="rotate-180" />
                    </button>
                    <div className="flex items-center gap-3 px-6 bg-slate-100 rounded-2xl h-12">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Page</span>
                        <span className="text-sm font-black text-primary">{routePage}</span>
                        <span className="text-sm font-black text-slate-400">/ {routeMetadata.totalPages}</span>
                    </div>
                    <button
                        disabled={routePage >= routeMetadata.totalPages}
                        onClick={() => setRoutePage(p => p + 1)}
                        className={`h-12 w-12 flex items-center justify-center rounded-2xl border transition-all ${routePage >= routeMetadata.totalPages ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary shadow-sm hover:-translate-y-0.5'}`}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderTollGates = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center glass p-8 rounded-[2.5rem] shadow-sm mb-12">
                <div className="professional-input-wrapper max-w-xl">
                    <Search className="professional-input-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Search toll gates..."
                        className="professional-input-v2 h-14"
                        value={tollSearch}
                        onChange={(e) => setTollSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-4">
                    <button className="btn-secondary h-14 px-6 flex items-center justify-center transition-transform hover:rotate-12" onClick={fetchTolls}>
                        <RefreshCw size={20} />
                    </button>
                    <button className="btn-primary flex items-center gap-3 h-14 px-8" onClick={() => {
                        setEditingId(null);
                        setNewToll({
                            name: '',
                            location: '',
                            rates: VEHICLE_CATEGORIES.flatMap(vc => 
                                JOURNEY_TYPES.map(jt => ({ travel_mode: vc, journey_type: jt, rate: 0 }))
                            )
                        });
                        setTollFilter({ continent: '', country: '', state: '', district: '', mandal: '', cluster: '' });
                        setIsTollModalOpen(true);
                    }}>
                        <Milestone size={24} strokeWidth={2.5} />
                        <span>Register New Toll Gate</span>
                    </button>
                </div>
            </div>

            <div className="table-wrapper">                <table className="admin-table">
                    <thead>
                        <tr>
                            <th className="!pl-10">Gate Code</th>
                            <th>Registered ID</th>
                            <th>Toll Gate Identity</th>
                            <th>Site Location</th>
                            <th>Vehicle Category</th>
                            <th>Journey Type</th>
                            <th>Trip Fare</th>
                            <th className="text-right !pr-10">Manage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tollGates.map(toll => (
                            <React.Fragment key={toll.id}>
                                {toll.rates?.map((rate, rIdx) => (
                                    <tr key={`${toll.id}-${rIdx}`} className={rIdx > 0 ? 'border-t-0 bg-slate-50/30' : ''}>
                                        {rIdx === 0 && (
                                            <>
                                                <td rowSpan={toll.rates.length} className="!pl-10">
                                                    <span className="text-[11px] font-black text-slate-400 font-mono tracking-tighter uppercase">{toll.gate_code}</span>
                                                </td>
                                                <td rowSpan={toll.rates.length}>
                                                    <span className="text-[11px] font-black text-primary font-mono tracking-tighter uppercase">{toll.registered_id || '---'}</span>
                                                </td>
                                                <td rowSpan={toll.rates.length}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10">
                                                            <Milestone size={18} className="text-primary" />
                                                        </div>
                                                        <span className="font-black text-slate-900 text-base">{toll.name}</span>
                                                    </div>
                                                </td>
                                                <td rowSpan={toll.rates.length}>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={14} className="text-primary/60" />
                                                        <span className="text-slate-600 text-sm font-black">{toll.location_name || 'Global Terminal'}</span>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                        <td>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{rate.travel_mode}</span>
                                        </td>
                                        <td>
                                            <span className="text-[10px] font-black text-primary/70 uppercase tracking-tighter">{rate.journey_type?.replace(/_/g, ' ') || 'UP'}</span>
                                        </td>
                                        <td>
                                            <span className="text-base font-black text-primary">₹{formatIndianCurrency(rate.rate)}</span>
                                        </td>
                                        {rIdx === 0 && (
                                            <td rowSpan={toll.rates.length} className="!pr-10">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl text-slate-400 hover:text-primary transition-all border border-transparent hover:border-slate-200 shadow-none hover:shadow-sm"
                                                        onClick={() => handleEditToll(toll)}
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button 
                                                        className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl text-slate-400 hover:text-red-500 transition-all border border-transparent hover:border-red-100 shadow-none hover:shadow-sm"
                                                        onClick={() => handleDeleteToll(toll.id)}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {(!toll.rates || toll.rates.length === 0) && (
                                    <tr>
                                        <td className="!pl-10">
                                            <span className="text-[11px] font-black text-slate-400 font-mono tracking-tighter uppercase">{toll.gate_code}</span>
                                        </td>
                                        <td>
                                            <span className="text-[11px] font-black text-primary font-mono tracking-tighter uppercase">{toll.registered_id || '---'}</span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10">
                                                    <Milestone size={18} className="text-primary" />
                                                </div>
                                                <span className="font-black text-slate-900 text-base">{toll.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} className="text-primary/60" />
                                                <span className="text-slate-600 text-sm font-black">{toll.location_name || 'Global Terminal'}</span>
                                            </div>
                                        </td>
                                        <td colSpan={3}>
                                            <span className="text-slate-400 text-xs italic">No rates configured</span>
                                        </td>
                                        <td className="!pr-10 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl text-slate-400 hover:text-primary transition-all border border-transparent hover:border-slate-200 shadow-none hover:shadow-sm"
                                                    onClick={() => handleEditToll(toll)}
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button 
                                                    className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl text-slate-400 hover:text-red-500 transition-all border border-transparent hover:border-red-100 shadow-none hover:shadow-sm"
                                                    onClick={() => handleDeleteToll(toll.id)}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {tollGates.length === 0 && !loading && (
                            <tr>
                                <td colSpan="6" className="py-20 text-center">
                                    <div className="no-nodes-container !py-10">
                                        <div className="mb-6 relative">
                                            <Search className="text-slate-300" size={64} strokeWidth={1} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-widest">No Toll Gates Found</h3>
                                        <p className="text-[14px] font-medium text-slate-500 max-w-sm mx-auto leading-relaxed">
                                            Adjust your search or add a new toll gate.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination UI for Tolls */}
            <div className="mt-12 flex justify-between items-center py-6 border-t border-slate-100">
                <p className="text-sm font-bold text-slate-500">
                    Showing <span className="text-slate-900">{tollGates.length}</span> of <span className="text-primary">{tollMetadata.count}</span> Toll Gates
                </p>
                <div className="flex gap-2">
                    <button
                        disabled={tollPage === 1}
                        onClick={() => setTollPage(p => Math.max(1, p - 1))}
                        className={`h-12 w-12 flex items-center justify-center rounded-2xl border transition-all ${tollPage === 1 ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary shadow-sm'}`}
                    >
                        <ChevronRight size={20} className="rotate-180" />
                    </button>
                    <div className="flex items-center gap-2 px-4 bg-slate-100 rounded-2xl">
                        <span className="text-sm font-black text-slate-600">PAGE</span>
                        <span className="text-sm font-black text-primary">{tollPage}</span>
                        <span className="text-sm font-black text-slate-400">/ {tollMetadata.totalPages}</span>
                    </div>
                    <button
                        disabled={tollPage >= tollMetadata.totalPages}
                        onClick={() => setTollPage(p => p + 1)}
                        className={`h-12 w-12 flex items-center justify-center rounded-2xl border transition-all ${tollPage >= tollMetadata.totalPages ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary shadow-sm'}`}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderLocations = () => {
        const filteredLocations = [...discoveryNodes]; // Isolated State Source

        return (
            <div className="space-y-8 animate-fade-in overflow-visible">
                {/* SINGLE ROW FOR EVERYTHING */}
                <div className="geo-filters-row">
                    {/* Search Bar */}
                    <div className="professional-input-wrapper">
                        <Search className="professional-input-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Search Nodes..."
                            className="professional-input-v2"
                            value={geoSearch}
                            onChange={(e) => setGeoSearch(e.target.value)}
                        />
                    </div>
                    
                    {/* All Dropdowns */}
                    <SearchableSelect 
                        placeholder="Continent"
                        options={continents}
                        value={hierarchicalFilter.continent}
                        onChange={(val) => setHierarchicalFilter({ ...hierarchicalFilter, continent: val, country: '', state: '', district: '', mandal: '', cluster: '' })}
                    />
                    <SearchableSelect 
                        placeholder="Country"
                        disabled={!hierarchicalFilter.continent}
                        options={getChildren('country', hierarchicalFilter)}
                        value={hierarchicalFilter.country}
                        onChange={(val) => setHierarchicalFilter({ ...hierarchicalFilter, country: val, state: '', district: '', mandal: '', cluster: '' })}
                    />
                    <SearchableSelect 
                        placeholder="State"
                        disabled={!hierarchicalFilter.country}
                        options={getChildren('state', hierarchicalFilter)}
                        value={hierarchicalFilter.state}
                        onChange={(val) => setHierarchicalFilter({ ...hierarchicalFilter, state: val, district: '', mandal: '', cluster: '' })}
                    />
                    <SearchableSelect 
                        placeholder="District"
                        disabled={!hierarchicalFilter.state}
                        options={getChildren('district', hierarchicalFilter)}
                        value={hierarchicalFilter.district}
                        onChange={(val) => setHierarchicalFilter({ ...hierarchicalFilter, district: val, mandal: '', cluster: '' })}
                    />
                    <SearchableSelect 
                        placeholder="Mandal"
                        disabled={!hierarchicalFilter.district}
                        options={getChildren('mandal', hierarchicalFilter)}
                        value={hierarchicalFilter.mandal}
                        onChange={(val) => setHierarchicalFilter({ ...hierarchicalFilter, mandal: val, cluster: '' })}
                    />
                    <SearchableSelect 
                        placeholder="Cluster"
                        disabled={!hierarchicalFilter.mandal}
                        options={getChildren('cluster', hierarchicalFilter)}
                        value={hierarchicalFilter.cluster}
                        onChange={(val) => setHierarchicalFilter({ ...hierarchicalFilter, cluster: val })}
                    />
                    
                    {/* Sync Button */}
                    <button 
                        className="h-11 w-11 flex items-center justify-center btn-secondary rounded-xl transition-all shadow-sm shrink-0"
                        onClick={handleSyncLocations}
                        title="Sync Hierarchy Data"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="discovery-section">
                    <div className="flex justify-between items-end mb-6 px-2">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-[19px] font-bold text-slate-900 leading-none">Discovery Stream</h2>
                        <p className="text-[13px] font-bold text-slate-700">Global Distribution Analysis</p>
                    </div>
                    
                    <div>
                        <span className="text-[13px] text-slate-500">
                            Found {discoveryNodes.length} Global Nodes
                        </span>
                    </div>
                </div>

                <div className="discovery-grid">
                    {loading ? (
                        <div className="no-nodes-container">
                            <div className="mb-6 relative">
                                <RefreshCw className="text-primary animate-spin" size={64} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Syncing Global Data...</h3>
                            <p className="text-[14px] font-medium text-slate-500 max-w-sm mx-auto leading-relaxed">
                                Curating hierarchy nodes from the Geocoding engine. <br/> This will only take a moment.
                            </p>
                        </div>
                    ) : fetchError ? (
                        <div className="no-nodes-container group">
                            <div className="mb-6 relative">
                                <AlertCircle className="text-red-500 group-hover:scale-110 transition-transform" size={64} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Network Connection Issue</h3>
                            <p className="text-[14px] font-medium text-slate-500 max-w-sm mx-auto leading-relaxed mb-8">
                                {fetchError} <br/> Verification of external API endpoints failed.
                            </p>
                            <button 
                                className="px-8 py-3 bg-red-600 text-white rounded-xl text-[12px] font-bold hover:bg-red-700 transition-all tracking-widest uppercase shadow-lg shadow-red-200" 
                                onClick={handleSyncLocations}
                            >
                                RETRY CONNECTION
                            </button>
                        </div>
                    ) : discoveryNodes.length > 0 ? (
                        discoveryNodes
                            .slice() // Non-mutating copy BEFORE sort
                            .sort((a, b) => {
                                if (a.level_order !== b.level_order) {
                                    return a.level_order - b.level_order;
                                }
                                return (a.name || "").localeCompare(b.name || "");
                            })
                            .slice(0, 48)
                            .map(loc => (
                            <div key={`${loc.location_type}-${loc.id}`} className="geo-node-card">
                                <div className="flex justify-between items-start">
                                    <span className="node-id">{loc.external_id}</span>
                                    <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                                        <MapPin size={16} />
                                    </div>
                                </div>
                                <h4 className="node-name line-clamp-2">{loc.name}</h4>
                                <div className="mt-auto">
                                    <span className="node-type-badge">{loc.location_type}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-nodes-container">
                            <div className="mb-6 relative">
                                <Search className="text-slate-400" size={64} strokeWidth={1} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No Nodes Discovered</h3>
                            <p className="text-[14px] font-medium text-slate-500 max-w-sm mx-auto leading-relaxed mb-8">
                                The global hierarchy stream returned zero matches. <br/> Filter parameters may be too restrictive.
                            </p>
                            <button 
                                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[12px] font-bold hover:bg-primary transition-all tracking-widest uppercase" 
                                onClick={() => { setGeoSearch(''); setHierarchicalFilter({ continent: '', country: '', state: '', district: '', mandal: '', cluster: '', local: '' }); }}

                            >
                                CLEAR PARAMETERS
                            </button>
                        </div>
                    )}
                </div>
                </div>
            </div>
        );
    };

    return (
        <div className="dashboard-page animate-fade-in">
            <div className="dashboard-header-row">
                <div>
                    <h1 className="welcome-text">Route & Toll Master</h1>
                </div>
                <div className="flex gap-4">

                    {activeTab === 'locations' && (
                        <button className="btn-secondary" onClick={handleSyncLocations}>
                            <RefreshCw size={22} className={loading ? 'animate-spin' : ''} /> Sync API
                        </button>
                    )}
                </div>
            </div>

            <div className="tabs-container">
                <button
                    className={`tab-btn ${activeTab === 'routes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('routes')}
                >
                    <RouteIcon size={18} /> Master Routes
                </button>
                <button
                    className={`tab-btn ${activeTab === 'tolls' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tolls')}
                >
                    <Milestone size={18} /> Toll Gates
                </button>
                <button
                    className={`tab-btn ${activeTab === 'locations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('locations')}
                >
                    <MapPin size={18} /> Geo Hierarchy
                </button>
            </div>

            {activeTab === 'routes' && renderRoutes()}
            {activeTab === 'tolls' && renderTollGates()}
            {activeTab === 'locations' && renderLocations()}

            {/* Path Management Modal */}
            <Modal
                isOpen={isPathModalOpen}
                onClose={() => setIsPathModalOpen(false)}
                title={editingPathId ? `Update Enroute: ${selectedRoute?.name}` : `Enroute Creation: ${selectedRoute?.name}`}
                size="xl"
                actions={
                    <button className="btn-premium-action btn-premium-secondary" onClick={() => setIsPathModalOpen(false)}>Close Config</button>
                }
            >
                <div className="premium-grid-2">
                    {/* Configuration Panel */}
                    <div className="premium-modal-container">
                        <div className="premium-card-section">
                            <div className="premium-card-header">
                                <div className="premium-icon-box accent">
                                    {editingPathId ? <Edit size={24} /> : <RouteIcon size={24} />}
                                </div>
                                <div>
                                    <h4 className="premium-card-title">{editingPathId ? 'Modify Enroute Point' : 'Add Enroute Point'}</h4>
                                    <p className="premium-card-subtitle">{editingPathId ? 'Update sequence or distances' : 'Define sequence and segment distances'}</p>
                                </div>
                            </div>

                                {/* Framework and Methodology removed for Enroute Creation per user request - Auto-determined by route type */}
                                <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div className="text-[10px] font-black px-3 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-tighter">
                                                {logisticsType === 'normal' ? 'Long Route Mode' : 'Local Route Mode'}
                                            </div>
                                            <div className="text-[10px] font-black px-3 py-1 bg-slate-200 text-slate-500 rounded-full uppercase tracking-tighter">
                                                Global Inventory Active
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ paddingTop: '0.5rem' }}>
                                    <label className="premium-field-label" style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>Search & Add Enroute Point</label>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <SearchableSelect
                                                placeholder="Enroute Point"
                                                options={locations.map(l => ({ 
                                                    id: l.id, 
                                                    label: l.name,
                                                    name: l.name, 
                                                    value: l.id,
                                                    code: l.code || 'HUB', 
                                                    cluster_type: l.cluster_type || 'POINT' 
                                                }))}
                                                value={newPath.via_id}
                                                onChange={(opt) => {
                                                    const val = typeof opt === 'object' ? opt.id : opt;
                                                    setNewPath({ ...newPath, via_id: val });
                                                }}
                                            />
                                        </div>
                                        <button
                                            className="btn-premium-action btn-premium-primary"
                                            style={{ padding: '0 1.5rem', height: '48px' }}
                                            onClick={() => {
                                                if (newPath.via_id && !newPath.via_locations.includes(newPath.via_id)) {
                                                    const loc = locations.find(l => String(l.id) === String(newPath.via_id));
                                                    if (loc) {
                                                        setViaDetails(prev => ({ ...prev, [loc.id]: loc }));
                                                    }
                                                    setNewPath({ ...newPath, via_locations: [...newPath.via_locations, newPath.via_id], via_id: '' });
                                                }
                                            }}
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                        </div>

                        <div className="premium-card-section" style={{ marginTop: '2rem', borderTop: '2px solid var(--border)' }}>
                            <div className="premium-card-header">
                                <div className="premium-icon-box" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                                    <IndianRupee size={20} />
                                </div>
                                <h4 className="premium-card-title">Pricing & Metrics</h4>
                            </div>

                            <div className="premium-input-grid">
                                <div className="premium-field-group">
                                    <label className="premium-field-label">Segment KM</label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            min="0"
                                            className="premium-select-input pr-12"
                                            placeholder="0"
                                            value={newPath.distance_km}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || parseFloat(val) >= 0) {
                                                    setNewPath({ ...newPath, distance_km: val });
                                                }
                                            }}
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">KM</div>
                                    </div>
                                </div>
                                <div className="premium-field-group">
                                    <label className="premium-field-label">Variant Name</label>
                                    <input
                                        type="text"
                                        className="premium-select-input"
                                        placeholder="e.g. Express Route"
                                        value={newPath.path_name}
                                        onChange={(e) => setNewPath({ ...newPath, path_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                className="btn-premium-action btn-premium-primary"
                                style={{ width: '100%', marginTop: '2rem', height: '56px', fontSize: '14px' }}
                                onClick={handleAddPath}
                            >
                                {editingPathId ? 'Update Enroute Path' : 'Create Enroute Path'}
                            </button>
                            {editingPathId && (
                                <button
                                    className="btn-premium-action btn-premium-secondary"
                                    style={{ width: '100%', marginTop: '0.75rem', height: '48px', fontSize: '13px' }}
                                    onClick={() => {
                                        setEditingPathId(null);
                                        setNewPath({
                                            path_name: '',
                                            distance_km: '',
                                            route: selectedRoute.id,
                                            via_id: '',
                                            via_locations: [],
                                            segment_distances: {}
                                        });
                                    }}
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active Registry */}
                    <div className="premium-card-section" style={{ background: '#f8fafc', border: '2px dashed #e2e8f0' }}>
                        <div className="premium-card-header">
                            <div className="premium-icon-box" style={{ background: 'var(--primary)', color: 'white' }}>
                                <Layers size={24} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 className="premium-card-title">Active Registry</h4>
                                <p className="premium-card-subtitle">{newPath.via_locations.length} STOPS IDENTIFIED</p>
                            </div>
                            <div className="flex gap-2">
                                {(routePaths || []).map((path, pidx) => (
                                    <button
                                        key={path.id}
                                        onClick={() => handleEditPath(path)}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${editingPathId === path.id ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                        title={`Edit Variant ${String.fromCharCode(65 + pidx)}`}
                                    >
                                        {String.fromCharCode(65 + pidx)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {newPath.via_locations.length === 0 ? (
                                <div style={{ padding: '4rem 0', textAlign: 'center', opacity: 0.3, fontStyle: 'italic', fontSize: '13px' }}>
                                    Add enroute points to sequence.
                                </div>
                            ) : (
                                newPath.via_locations.map((vid, i) => {
                                    const loc = viaDetails[vid] || locations.find(l => String(l.id) === String(vid));
                                    const prevLoc = i === 0 ? selectedRoute?.source_name : (viaDetails[newPath.via_locations[i-1]]?.name || locations.find(l => String(l.id) === String(newPath.via_locations[i-1]))?.name);
                                    
                                    return (
                                        <div key={i} className="space-y-4">
                                            {/* Segment Distance Input (To this point) */}
                                            <div className="flex items-center gap-4 px-4 py-3 bg-white/50 border border-dashed border-slate-200 rounded-2xl">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter w-24">
                                                    {prevLoc || 'Origin'} → {loc?.name || 'Point'}
                                                </div>
                                                <div className="relative flex-1">
                                                    <input 
                                                        type="number"
                                                        min="0"
                                                        className="h-9 w-full bg-white border border-slate-200 rounded-xl px-4 pr-10 text-[11px] font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                        placeholder="0.00"
                                                        value={newPath.segment_distances[i] || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === '' || parseFloat(val) >= 0) {
                                                                const dists = { ...newPath.segment_distances, [i]: val };
                                                                const total = Object.values(dists).reduce((sum, d) => sum + (parseFloat(d) || 0), 0);
                                                                setNewPath({ ...newPath, segment_distances: dists, distance_km: total.toFixed(2) });
                                                            }
                                                        }}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300">KM</span>
                                                </div>
                                            </div>

                                            <div className="premium-card-section" style={{ padding: '1rem 1.5rem', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div className="premium-number-badge" style={{ width: '32px', height: '32px', fontSize: '11px', background: '#f1f5f9', color: '#64748b' }}>{i + 1}</div>
                                                        <div>
                                                            <h5 style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{loc?.name || `POINT-${vid}`}</h5>
                                                            <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', fontFamily: 'monospace' }}>[{loc?.code || 'STP'}]</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef2f2', color: '#ef4444' }}
                                                        onClick={() => {
                                                            const newVias = newPath.via_locations.filter(v => v !== vid);
                                                            const newDists = {};
                                                            // Re-index distances on delete
                                                            newVias.forEach((v, idx) => {
                                                                if (newPath.segment_distances[idx]) newDists[idx] = newPath.segment_distances[idx];
                                                            });
                                                            const total = Object.values(newDists).reduce((sum, d) => sum + (parseFloat(d) || 0), 0);
                                                            setNewPath({ ...newPath, via_locations: newVias, segment_distances: newDists, distance_km: total.toFixed(2) });
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Final Segment (If last point) */}
                                            {i === newPath.via_locations.length - 1 && (
                                                <div className="flex items-center gap-4 px-4 py-3 bg-white/50 border border-dashed border-slate-200 rounded-2xl">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter w-24">
                                                        {loc?.name || 'Point'} → {selectedRoute?.destination_name || 'Destination'}
                                                    </div>
                                                    <div className="relative flex-1">
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            className="h-9 w-full bg-white border border-slate-200 rounded-xl px-4 pr-10 text-[11px] font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                            placeholder="0.00"
                                                            value={newPath.segment_distances[i + 1] || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '' || parseFloat(val) >= 0) {
                                                                    const dists = { ...newPath.segment_distances, [i + 1]: val };
                                                                    const total = Object.values(dists).reduce((sum, d) => sum + (parseFloat(d) || 0), 0);
                                                                    setNewPath({ ...newPath, segment_distances: dists, distance_km: total.toFixed(2) });
                                                                }
                                                            }}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300">KM</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            
                            {newPath.via_locations.length > 0 && (
                                <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'var(--primary)', borderRadius: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 20px -5px rgba(216, 0, 115, 0.3)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <Navigation size={20} className="animate-pulse" />
                                        <span style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cumulative Route Path</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '24px', fontWeight: '900', lineHeight: 1 }}>{newPath.distance_km || '0.00'}</div>
                                        <div style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8 }}>TOTAL KM</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Path Tolls Modal */}
            <Modal
                isOpen={isPathTollModalOpen}
                onClose={() => {
                    setIsPathTollModalOpen(false);
                    setPathTolls([]);
                    setSelectedPath(null);
                    setSelectedRoute(null);
                }}
                title={`Toll Config: ${selectedPath?.source_name || selectedRoute?.source_name} → ${selectedPath?.destination_name || selectedRoute?.destination_name}`}
                size="lg"
                actions={
                    <button className="btn-premium-action btn-premium-secondary" onClick={() => setIsPathTollModalOpen(false)}>Close Config</button>
                }
            >
                <div className="premium-modal-container">
                    {/* Phase 1: Assigned Tolls */}
                    <div className="premium-card-section">
                        <div className="premium-card-header">
                            <div className="premium-icon-box accent">
                                <Milestone size={24} />
                            </div>
                            <div>
                                <h4 className="premium-card-title">Assigned Hub Tolls</h4>
                                <p className="premium-card-subtitle">Active tariff points on this variant</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '120px' }}>
                            {pathTolls.length === 0 ? (
                                <div style={{ padding: '3rem 0', textAlign: 'center', opacity: 0.3, fontStyle: 'italic', fontSize: '13px', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
                                    No toll gates registered for this segment.
                                </div>
                            ) : (
                                pathTolls.map((pt, idx) => (
                                    <div key={pt.id} className="premium-card-section" style={{ padding: '1rem 1.5rem', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div className="premium-number-badge" style={{ width: '32px', height: '32px', fontSize: '11px', background: 'var(--primary-light)', color: 'var(--primary)' }}>{idx + 1}</div>
                                                <div>
                                                    <h5 style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                        <span style={{ color: 'var(--primary)', marginRight: '8px' }}>[{pt.gate_code || pt.toll_gate_code || 'GATE'}]</span>
                                                        {pt.toll_gate_name}
                                                    </h5>
                                                    <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', fontFamily: 'monospace' }}>[{pt.location_name || 'MASTER_HUB'}]</p>
                                                </div>
                                            </div>
                                            <button
                                                style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                                                onClick={async () => {
                                                    const confirmed = await confirm("Remove this toll gate from the path?");
                                                    if (confirmed) {
                                                        try {
                                                            await api.delete(`/api/masters/route-path-tolls/${pt.id}/`);
                                                            handleManageTolls(selectedPath, selectedRoute);
                                                            showToast("Toll gate removed", "success");
                                                        } catch (err) { showToast("Failed to remove toll", "error"); }
                                                    }
                                                }}
                                            >
                                                <Trash2 size={16} style={{ margin: 'auto' }} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Phase 2: Global Registry Additions */}
                    <div className="premium-card-section" style={{ marginTop: '2rem', background: '#f8fafc', border: '2px dashed #e2e8f0' }}>
                        <div className="premium-card-header">
                            <div className="premium-icon-box" style={{ background: 'var(--primary)', color: 'white' }}>
                                <Database size={24} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 className="premium-card-title">Global Hub Registry</h4>
                                <p className="premium-card-subtitle">Available gates for assignment</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="Search Registry..."
                                        value={registrySearch}
                                        onChange={(e) => setRegistrySearch(e.target.value)}
                                        className="h-9 w-48 pl-9 pr-4 bg-white border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <button
                                    className="h-9 px-4 bg-white text-primary border border-slate-200 rounded-xl text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all transform flex items-center gap-2 shadow-sm"
                                    onClick={() => setIsTollModalOpen(true)}
                                >
                                    <Plus size={14} /> New Registry
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {tollGates
                                .filter(tg => !pathTolls.some(pt => pt.toll_gate === tg.id))
                                .filter(tg => 
                                    !registrySearch || 
                                    tg.name.toLowerCase().includes(registrySearch.toLowerCase()) || 
                                    (tg.gate_code && tg.gate_code.toLowerCase().includes(registrySearch.toLowerCase()))
                                )
                                .map(tg => (
                                <button
                                    key={tg.id}
                                    style={{ padding: '1.25rem', background: 'white', border: '1px solid #f1f5f9', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' }}
                                    className="hover:border-primary/40 hover:shadow-md group"
                                    onClick={() => handleAssignToll(tg.id)}
                                >
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
                                            <span style={{ color: 'var(--primary)', marginRight: '8px' }}>[{tg.gate_code || 'GATE'}]</span>
                                            {tg.name}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', marginTop: '4px' }}>{tg.location_name}</div>
                                    </div>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Plus size={18} />
                                    </div>
                                </button>
                            ))}
                            {tollGates.filter(tg => !pathTolls.some(pt => pt.toll_gate === tg.id)).length === 0 && (
                                <div style={{ padding: '2rem 0', textAlign: 'center', opacity: 0.3, fontSize: '12px', fontWeight: '600' }}>
                                    Hub registry is currently empty or all gates assigned.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>



            <Modal
                isOpen={isRouteModalOpen}
                onClose={() => { setIsRouteModalOpen(false); setEditingId(null); }}
                title={editingId ? "Modify Route" : "Define New Route"}
                size="xl"
                actions={
                    <>
                        <button className="btn-premium-action btn-premium-secondary" onClick={() => { setIsRouteModalOpen(false); setEditingId(null); }}>Cancel</button>
                        <button
                            className="btn-premium-action btn-premium-primary"
                            onClick={handleCreateRoute}
                            disabled={!newRoute.source || !newRoute.destination || newRoute.source === newRoute.destination}
                        >
                            {editingId ? "Update Route" : "Define New Route"}
                        </button>
                    </>
                }
            >
                <div className="premium-modal-container">
                    {/* Phase 1: Strategic Architecture */}
                    <div className="modal-stack-section modal-stack-1">
                        <div className="premium-grid-2" style={{ borderBottom: '1px dashed #e2e8f0', paddingBottom: '2rem' }}>
                            <div className="premium-field-group" style={{ zIndex: 2 }}>
                                <div className="premium-headline-step">
                                    <div className="premium-number-badge">1</div>
                                    <label className="premium-label-text">SELECT ROUTE TYPE</label>
                                </div>
                                <SearchableSelect
                                    placeholder="Select Route Type"
                                    options={[
                                        { id: 'normal', name: 'LONG ROUTE' },
                                        { id: 'local', name: 'LOCAL ROUTE' }
                                    ]}
                                    value={logisticsType === 'normal' ? 'LONG ROUTE' : logisticsType === 'local' ? 'LOCAL ROUTE' : ''}
                                    onChange={(val) => {
                                        const name = typeof val === 'object' && val !== null ? (val.name || val.id) : val;
                                        const mode = name === 'LONG ROUTE' ? 'normal' : name === 'LOCAL ROUTE' ? 'local' : '';
                                        setLogisticsType(mode);
                                        if (!mode) setSelectionMode('');
                                    }}
                                />
                            </div>

                            {logisticsType && (
                                <div className="premium-field-group animate-fade-in" style={{ zIndex: 1 }}>
                                    <div className="premium-headline-step">
                                        <div className="premium-number-badge accent">2</div>
                                        <label className="premium-label-text">SELECT MODE</label>
                                    </div>
                                    <SearchableSelect
                                        placeholder="Select Mode"
                                        value={selectionMode === 'drilldown' ? 'SMART HIERARCHY' : selectionMode === 'code' ? 'SMART CODE' : ''}
                                        options={[
                                            { id: 'drilldown', name: 'SMART HIERARCHY' },
                                            { id: 'code', name: 'SMART CODE' }
                                        ]}
                                        onChange={(val) => {
                                            const name = typeof val === 'object' && val !== null ? (val.name || val.id) : val;
                                            const mode = name === 'SMART HIERARCHY' ? 'drilldown' : name === 'SMART CODE' ? 'code' : '';
                                            setSelectionMode(mode);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Phase 2: Location Definition */}
                    <div className="modal-stack-section modal-stack-2">
                        <div style={{ minHeight: selectionMode === 'drilldown' ? '400px' : 'auto', marginBottom: selectionMode === 'code' ? '2rem' : '0' }}>
                            {(!selectionMode || selectionMode === 'code') ? null : selectionMode === 'drilldown' ? (
                                <div className="premium-grid-2 animate-fade-in">
                                    {/* Source Card */}
                                    <div className="premium-card-section">
                                        <div className="premium-card-header">
                                            <div className="premium-icon-box emerald">
                                                <MapPin size={24} />
                                            </div>
                                            <div>
                                                <h4 className="premium-card-title">Origin</h4>
                                                <p className="premium-card-subtitle">Primary Source Region</p>
                                            </div>
                                        </div>

                                        <div className="premium-input-grid">
                                            {[
                                                { label: 'State', key: 'state', depends: 'country' },
                                                { label: 'District', key: 'district', depends: 'state' },
                                                { label: 'Mandal', key: 'mandal', depends: 'district' },
                                                { label: 'Cluster', key: 'cluster', depends: 'mandal' }
                                            ].map((f, i) => (
                                                <div key={i} className="premium-field-group" style={{ zIndex: 10 - i }}>
                                                    <label className="premium-field-label">{f.label}</label>
                                                    <SearchableSelect
                                                        placeholder={f.label}
                                                        disabled={f.depends && !sourceFilter[f.depends]}
                                                        loading={loading && !fullHierarchy.length}
                                                        error={fetchError}
                                                        options={getChildren(f.key, sourceFilter)}
                                                        value={sourceFilter[f.key]}
                                                        onChange={(val) => {
                                                            const optName = typeof val === 'string' ? val : (val.name || '');
                                                            const updates = { ...sourceFilter, [f.key]: optName };
                                                            if (f.key === 'state') { updates.district = ''; updates.mandal = ''; updates.cluster = ''; }
                                                            else if (f.key === 'district') { updates.mandal = ''; updates.cluster = ''; }
                                                            else if (f.key === 'mandal') { updates.cluster = ''; }
                                                            
                                                            // Aggressive Sync for Cluster Pick
                                                            if (f.key === 'cluster' && optName) {
                                                                const pool = getFinalPoints(updates, logisticsType, 'visiting');
                                                                if (pool.length > 0) {
                                                                    const match = pool.find(p => p.name?.trim().toLowerCase() === optName.trim().toLowerCase());
                                                                    const bestId = match ? match.id : pool[0].id;
                                                                    setNewRoute(prev => ({ ...prev, source: bestId }));
                                                                }
                                                            }
                                                            setSourceFilter(updates);
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Destination Card */}
                                    <div className="premium-card-section">
                                        <div className="premium-card-header">
                                            <div className="premium-icon-box">
                                                <Navigation size={24} />
                                            </div>
                                            <div>
                                                <h4 className="premium-card-title">Destination</h4>
                                                <p className="premium-card-subtitle">Final Destination Point</p>
                                            </div>
                                        </div>

                                        <div className="premium-input-grid">
                                            {[
                                                { label: 'State', key: 'state', depends: 'country' },
                                                { label: 'District', key: 'district', depends: 'state' },
                                                { label: 'Mandal', key: 'mandal', depends: 'district' },
                                                { label: 'Cluster', key: 'cluster', depends: 'mandal' }
                                            ].map((f, i) => (
                                                <div key={i} className="premium-field-group" style={{ zIndex: 10 - i }}>
                                                    <label className="premium-field-label">{f.label}</label>
                                                    <SearchableSelect
                                                        placeholder={f.label}
                                                        disabled={f.depends && !destFilter[f.depends]}
                                                        loading={loading && !fullHierarchy.length}
                                                        error={fetchError}
                                                        options={getChildren(f.key, destFilter)}
                                                        value={destFilter[f.key]}
                                                        onChange={(val) => {
                                                            const optName = typeof val === 'string' ? val : (val.name || '');
                                                            const updates = { ...destFilter, [f.key]: optName };
                                                            if (f.key === 'state') { updates.district = ''; updates.mandal = ''; updates.cluster = ''; }
                                                            else if (f.key === 'district') { updates.mandal = ''; updates.cluster = ''; }
                                                            else if (f.key === 'mandal') { updates.cluster = ''; }

                                                            // Aggressive Sync for Cluster Pick
                                                            if (f.key === 'cluster' && optName) {
                                                                const pool = getFinalPoints(updates, logisticsType, 'visiting');
                                                                if (pool.length > 0) {
                                                                    const match = pool.find(p => p.name?.trim().toLowerCase() === optName.trim().toLowerCase());
                                                                    const bestId = match ? match.id : pool[0].id;
                                                                    setNewRoute(prev => ({ ...prev, destination: bestId }));
                                                                }
                                                            }
                                                            setDestFilter(updates);
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Final Authority Selection */}
                    <div className="modal-stack-section modal-stack-3">
                        <div className="pt-2 animate-fade-in" style={{ marginTop: selectionMode === 'code' ? '1rem' : '0' }}>
                            <div className="authority-selection-box">
                                <div className="authority-grid">
                                    {/* Origin Unit */}
                                    <div className="space-y-4">
                                        <div className="authority-point-label">
                                            <div className="authority-point-dot source animate-pulse"></div>
                                            <label className="authority-label-text">Origin</label>
                                        </div>
                                        <div className="relative group/sel">
                                            {newRoute.source ? (
                                                (() => {
                                                    const site = sourcePool.find(p => String(p.id) === String(newRoute.source));
                                                    return (
                                                        <div className="site-selection-card animate-pop-in">
                                                            <div className="site-card-top">
                                                                <span className="site-card-code">
                                                                    {site?.code || site?.location_code || site?.external_id || (typeof site?.id === 'string' && site.id.includes('-') ? site.id.split('-').pop() : site?.id) || 'POINT'}
                                                                </span>
                                                                <span className="site-card-type-badge">{logisticsType || 'ROUTE'}</span>
                                                            </div>
                                                            <div className="site-card-name">{site?.originalName || site?.name || site?.id || 'Selected Point'}</div>
                                                            <div 
                                                                className="site-card-change-btn"
                                                                onClick={() => setNewRoute({ ...newRoute, source: '' })}
                                                            >
                                                                <RefreshCw size={12} />
                                                                <span>Change Origin</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <SearchableSelect
                                                    placeholder={selectionMode === 'drilldown' && !sourceFilter.mandal ? 'Waiting for mode...' : 'Select Origin'}
                                                    disabled={selectionMode === 'drilldown' && !sourceFilter.mandal}
                                                    searchByCodeOnly={selectionMode === 'code'}
                                                    options={sourcePool}
                                                    value=""
                                                    onChange={(val) => {
                                                        const id = typeof val === 'string' ? val : val.id;
                                                        setNewRoute({ ...newRoute, source: id });
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <div className="authority-arrow-box">
                                            <ArrowRight size={28} className="authority-arrow-icon" />
                                        </div>
                                    </div>

                                    {/* Destination Unit */}
                                    <div className="space-y-4">
                                        <div className="authority-point-label" style={{ justifyContent: 'flex-end' }}>
                                            <label className="authority-label-text">Destination</label>
                                            <div className="authority-point-dot dest animate-pulse"></div>
                                        </div>
                                        <div className="relative group/sel">
                                            {newRoute.destination ? (
                                                (() => {
                                                    const site = destPool.find(p => String(p.id) === String(newRoute.destination));
                                                    return (
                                                        <div className="site-selection-card animate-pop-in">
                                                            <div className="site-card-top">
                                                                <span className="site-card-code">
                                                                    {site?.code || site?.location_code || site?.external_id || (typeof site?.id === 'string' && site.id.includes('-') ? site.id.split('-').pop() : site?.id) || 'POINT'}
                                                                </span>
                                                                <span className="site-card-type-badge">{logisticsType || 'ROUTE'}</span>
                                                            </div>
                                                            <div className="site-card-name">{site?.originalName || site?.name || site?.id || 'Selected Point'}</div>
                                                            <div 
                                                                className="site-card-change-btn"
                                                                onClick={() => setNewRoute({ ...newRoute, destination: '' })}
                                                            >
                                                                <RefreshCw size={12} />
                                                                <span>Change Destination</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <SearchableSelect
                                                    placeholder={selectionMode === 'drilldown' && !destFilter.mandal ? 'Waiting for mode...' : 'Select Destination'}
                                                    disabled={selectionMode === 'drilldown' && !destFilter.mandal}
                                                    searchByCodeOnly={selectionMode === 'code'}
                                                    options={destPool}
                                                    value=""
                                                    onChange={(val) => {
                                                        const id = typeof val === 'string' ? val : val.id;
                                                        setNewRoute({ ...newRoute, destination: id });
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Toll Gate Modal */}
            <Modal
                isOpen={isTollModalOpen}
                onClose={() => {
                    setIsTollModalOpen(false);
                    setEditingId(null);
                    setNewToll({ name: '', gate_code: '', registered_id: '', location: '', rates: 
                        VEHICLE_CATEGORIES.flatMap(vc => 
                            JOURNEY_TYPES.map(jt => ({ travel_mode: vc, journey_type: jt, rate: 0 }))
                        )
                    });
                    setTollFilter({ continent: '', country: '', state: '', district: '', mandal: '', cluster: '', local: '' });
                }}
                title={editingId ? "Modify Toll Hub Registration" : "Register New Toll Gate"}
                size="lg"
                actions={
                    <>
                        <button className="btn-premium-action btn-premium-secondary" onClick={() => {
                            setIsTollModalOpen(false);
                            setEditingId(null);
                            setNewToll({ name: '', gate_code: '', registered_id: '', location: '', rates: 
                                VEHICLE_CATEGORIES.flatMap(vc => 
                                    JOURNEY_TYPES.map(jt => ({ travel_mode: vc, journey_type: jt, rate: 0 }))
                                )
                            });
                            setTollFilter({ continent: '', country: '', state: '', district: '', mandal: '', cluster: '', local: '' });
                        }}>Cancel</button>
                        <button
                            className="btn-premium-action btn-premium-primary"
                            onClick={handleCreateToll}
                            disabled={!newToll.location || !newToll.name}
                        >
                            {editingId ? "Update Registration Data" : "Complete Registration"}
                        </button>
                    </>
                }
            >
                <div className="premium-modal-container">
                    <div className="premium-card-section">
                        <div className="premium-card-header">
                            <div className="premium-icon-box">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h4 className="premium-card-title">Infrastructure Identity</h4>
                                <p className="premium-card-subtitle">Official Toll Gate Labeling</p>
                            </div>
                        </div>

                        <div className="premium-input-grid" style={{ marginBottom: '1.5rem' }}>
                            <div className="premium-field-group">
                                <label className="premium-field-label">Gate Code</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="premium-select-input"
                                        style={{ background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', color: '#64748b', cursor: 'not-allowed', fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.15em' }}
                                        value={newToll.gate_code || ''}
                                        placeholder="AUTO"
                                        readOnly
                                        disabled
                                    />
                                    <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        {editingId ? 'LOCKED' : 'AUTO-GEN'}
                                    </span>
                                </div>
                            </div>
                            <div className="premium-field-group">
                                <label className="premium-field-label">Registered ID</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="premium-select-input"
                                        placeholder="Enter Registered ID"
                                        value={newToll.registered_id || ''}
                                        onChange={(e) => setNewToll({ ...newToll, registered_id: e.target.value })}
                                        style={{ fontFamily: 'monospace', fontWeight: 700 }}
                                    />
                                </div>
                            </div>
                            <div className="premium-field-group">
                                <label className="premium-field-label">Registry Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="premium-select-input"
                                        placeholder="e.g. Hyderabad Outer Ring Road - Exit 1"
                                        value={newToll.name}
                                        onChange={(e) => setNewToll({ ...newToll, name: e.target.value })}
                                    />
                                    {newToll.name && tollGates.some(t => t.name?.trim().toLowerCase() === newToll.name.trim().toLowerCase() && (!editingId || t.id !== editingId)) && (
                                        <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                                            TAKEN
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="premium-input-grid" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0' }}>
                            { [
                                { label: 'Continent', key: 'continent' },
                                { label: 'Country', key: 'country', depends: 'continent' },
                                { label: 'State', key: 'state', depends: 'country' },
                                { label: 'District', key: 'district', depends: 'state' },
                                { label: 'Mandal', key: 'mandal', depends: 'district' },
                                { label: 'Cluster', key: 'cluster', depends: 'mandal' }
                            ].map((f, i) => (
                                <div key={i} className="premium-field-group" style={{ zIndex: 100 - i }}>
                                    <label className="premium-field-label">{f.label}</label>
                                    <SearchableSelect
                                        placeholder={f.label}
                                        disabled={f.depends && !tollFilter[f.depends]}
                                        loading={loading && !fullHierarchy.length}
                                        error={fetchError}
                                        options={getChildren(f.key, tollFilter)}
                                        value={tollFilter[f.key]}
                                        onChange={(val) => {
                                            const optName = typeof val === 'string' ? val : (val.name || '');
                                            const updates = { ...tollFilter, [f.key]: optName };
                                            if (f.key === 'continent') { updates.country = ''; updates.state = ''; updates.district = ''; updates.mandal = ''; updates.cluster = ''; }
                                            else if (f.key === 'country') { updates.state = ''; updates.district = ''; updates.mandal = ''; updates.cluster = ''; }
                                            else if (f.key === 'state') { updates.district = ''; updates.mandal = ''; updates.cluster = ''; }
                                            else if (f.key === 'district') { updates.mandal = ''; updates.cluster = ''; }
                                            else if (f.key === 'mandal') { updates.cluster = ''; }
                                            setTollFilter(updates);
                                        }}
                                    />
                                </div>
                            )) }

                            <div className="premium-field-group">
                                <label className="premium-field-label" style={{ color: 'var(--primary)' }}>Final Authority Site</label>
                                <SearchableSelect
                                    placeholder={!tollFilter.cluster ? 'Waiting for Cluster...' : 'Select Mapping Site'}
                                    disabled={!tollFilter.cluster}
                                    options={tollPool}
                                    value={tollPool.find(p => {
                                        const pid = String(p.id);
                                        const sid = String(newToll.location);
                                        return pid === sid;
                                    })?.name || ''}
                                    onChange={(val) => {
                                        const id = typeof val === 'string' ? val : val.id;
                                        setNewToll({ ...newToll, location: String(id) });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="premium-card-section" style={{ marginTop: '2rem', borderTop: '2px solid var(--border)' }}>
                        <div className="premium-card-header">
                            <div className="premium-icon-box" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                                <IndianRupee size={24} />
                            </div>
                            <div>
                                <h4 className="premium-card-title">Rate Configuration</h4>
                                <p className="premium-card-subtitle">Vehicle & Journey specific tariff settings</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-8 mt-6">
                            {VEHICLE_CATEGORIES.map((vc) => (
                                <div key={vc} className="premium-vehicle-group p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-6 bg-primary rounded-full"></div>
                                        <h5 className="font-black text-slate-800 text-sm uppercase tracking-wider">{vc}</h5>
                                    </div>
                                    <div className="premium-grid-3 gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                        {JOURNEY_TYPES.map((jt) => {
                                            const rateObj = newToll.rates.find(r => r.travel_mode === vc && r.journey_type === jt) || { rate: 0, journey_type: jt, travel_mode: vc };
                                            return (
                                                <div key={jt} className="premium-field-group">
                                                    <label className="premium-field-label text-primary/70 font-black" style={{ fontSize: '9px' }}>
                                                        {jt.replace(/_/g, ' ')}
                                                    </label>
                                                    <IndianCurrencyInput
                                                        value={rateObj.rate}
                                                        onChange={(val) => {
                                                            const updatedRates = [...newToll.rates];
                                                            const idx = updatedRates.findIndex(r => r.travel_mode === vc && r.journey_type === jt);
                                                            if (idx !== -1) {
                                                                updatedRates[idx].rate = val;
                                                                setNewToll({ ...newToll, rates: updatedRates });
                                                            } else {
                                                                updatedRates.push({ travel_mode: vc, journey_type: jt, rate: val });
                                                                setNewToll({ ...newToll, rates: updatedRates });
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isPathViewerOpen}
                onClose={() => setIsPathViewerOpen(false)}
                title={`Route Explorer: ${viewingRoute?.name}`}
                maxWidth="1150px"
            >
                {viewingRoute && (
                    <div className="p-2" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {/* Header & Style Toggle Section */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', padding: '0 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px' }}>
                                    <RouteIcon style={{ color: '#3b82f6' }} size={24} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Terminal Registry Explorer</h3>
                                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', margin: '4px 0 0' }}>
                                        Multi-Variant Network Mapping
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', backgroundColor: '#f1f5f9', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <button 
                                    onClick={() => setDiagramStyle('straight')}
                                    style={{ 
                                        height: '36px', padding: '0 20px', borderRadius: '12px', fontSize: '10px', fontWeight: 900, 
                                        textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', gap: '10px', border: 'none', cursor: 'pointer',
                                        backgroundColor: diagramStyle === 'straight' ? '#3b82f6' : 'transparent',
                                        color: diagramStyle === 'straight' ? '#ffffff' : '#64748b',
                                        boxShadow: diagramStyle === 'straight' ? '0 10px 15px -3px rgba(59, 130, 246, 0.25)' : 'none'
                                    }}
                                >
                                    <MoveHorizontal size={14} /> Straight
                                </button>
                                <button 
                                    onClick={() => setDiagramStyle('curved')}
                                    style={{ 
                                        height: '36px', padding: '0 20px', borderRadius: '12px', fontSize: '10px', fontWeight: 900, 
                                        textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', gap: '10px', border: 'none', cursor: 'pointer',
                                        backgroundColor: diagramStyle === 'curved' ? '#3b82f6' : 'transparent',
                                        color: diagramStyle === 'curved' ? '#ffffff' : '#64748b',
                                        boxShadow: diagramStyle === 'curved' ? '0 10px 15px -3px rgba(59, 130, 246, 0.25)' : 'none'
                                    }}
                                >
                                    <GitCommit size={14} style={{ transform: 'rotate(90deg)' }} /> Curved
                                </button>
                            </div>
                        </div>

                        {/* All Paths "Single View" Selection Grid */}
                        <div style={{ padding: '0 16px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Layers size={14} />
                                Available Configurations <span style={{ color: '#cbd5e1', marginLeft: '4px' }}>• SELECT ONE TO INSPECT</span>
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                                {(viewingRoute.paths || []).map((path, idx) => (
                                    <motion.div
                                        key={path.id || idx}
                                        whileHover={{ y: -4 }}
                                        onClick={() => setActivePathIndex(idx)}
                                        style={{ 
                                            position: 'relative', padding: '24px', borderRadius: '28px', border: '2px solid', 
                                            textAlign: 'left', transition: 'all 0.3s', cursor: 'pointer',
                                            backgroundColor: activePathIndex === idx ? '#ffffff' : 'rgba(248, 250, 252, 0.5)',
                                            borderColor: activePathIndex === idx ? '#3b82f6' : '#f1f5f9',
                                            boxShadow: activePathIndex === idx ? '0 20px 25px -5px rgba(59, 130, 246, 0.1)' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <div style={{ 
                                                width: '36px', height: '36px', borderRadius: '12px', display: 'flex', 
                                                alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '12px',
                                                backgroundColor: activePathIndex === idx ? '#3b82f6' : '#e2e8f0',
                                                color: activePathIndex === idx ? '#ffffff' : '#64748b'
                                            }}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsPathViewerOpen(false);
                                                    handleManagePaths(viewingRoute, path);
                                                }}
                                                style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                                                className="hover:bg-slate-200"
                                            >
                                                <Edit size={14} />
                                            </button>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: activePathIndex === idx ? '#3b82f6' : '#94a3b8' }}>Variant</div>
                                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                                                {path.path_name || `Stream ${idx + 1}`}
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Navigation size={10} /> {path.distance_km} KM
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <GitCommit size={10} /> {(path.via_locations || []).length} STOPS
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Detailed Perspective View */}
                        <AnimatePresence mode="wait">
                            {viewingRoute.paths?.[activePathIndex] && (
                                <motion.div 
                                    key={activePathIndex}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    style={{ padding: '0 16px' }}
                                >
                                    {/* Visual SVG Diagram */}
                                    <div style={{ 
                                        position: 'relative', padding: '64px 32px', backgroundColor: '#0f172a', borderRadius: '56px', 
                                        overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)', border: '4px solid #ffffff' 
                                    }}>
                                        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none', backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }} />
                                        
                                        <div style={{ width: '100%', height: '380px', position: 'relative' }}>
                                            <svg viewBox="0 0 1000 400" style={{ width: '100%', height: '100%' }}>
                                                <defs>
                                                    <linearGradient id="pathGradientActive" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#10b981" />
                                                        <stop offset="100%" stopColor="#3b82f6" />
                                                    </linearGradient>
                                                    <filter id="glowActive" x="-20%" y="-20%" width="140%" height="140%">
                                                        <feGaussianBlur stdDeviation="4" result="blur" />
                                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                                    </filter>
                                                </defs>

                                                {(() => {
                                                    const pathCenterY = 220;
                                                    const viaData = viewingRoute.paths[activePathIndex].via_locations_data || [];
                                                    const nodes = [
                                                        { x: 80, y: pathCenterY },
                                                        ...viaData.map((_, i, arr) => ({
                                                            x: 80 + (840 / (arr.length + 1)) * (i + 1),
                                                            y: diagramStyle === 'curved' ? (i % 2 === 0 ? pathCenterY - 40 : pathCenterY + 40) : pathCenterY
                                                        })),
                                                        { x: 920, y: pathCenterY }
                                                    ];

                                                    let pathD = `M ${nodes[0].x} ${nodes[0].y}`;
                                                    if (diagramStyle === 'curved') {
                                                        for (let i = 0; i < nodes.length - 1; i++) {
                                                            const curr = nodes[i];
                                                            const next = nodes[i + 1];
                                                            const cp1x = curr.x + (next.x - curr.x) / 3;
                                                            const cp2x = curr.x + (2 * (next.x - curr.x)) / 3;
                                                            
                                                            // Calculate a bow height. If it's a direct route (no vias), add a standard bow.
                                                            // If there are vias, we already have Y-offset for them, but let's ensure segments curve.
                                                            let cp1y = curr.y;
                                                            let cp2y = next.y;

                                                            if (viaData.length === 0) {
                                                                // Single segment (Origin -> Dest): Bow it upwards
                                                                cp1y = pathCenterY - 60;
                                                                cp2y = pathCenterY - 60;
                                                            } else {
                                                                // Multiple segments: Curve relative to node Y offsets
                                                                const dy = next.y - curr.y;
                                                                if (dy === 0) {
                                                                    // Segment between two points at same level: Bow it
                                                                    cp1y = curr.y - 30;
                                                                    cp2y = next.y - 30;
                                                                } else {
                                                                    // S-curve between different levels
                                                                    cp1y = curr.y;
                                                                    cp2y = next.y;
                                                                }
                                                            }

                                                            pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
                                                        }
                                                    } else {
                                                        nodes.forEach((n, i) => { if (i > 0) pathD += ` L ${n.x} ${n.y}`; });
                                                    }

                                                    return (
                                                        <React.Fragment>
                                                            <motion.path
                                                                initial={false}
                                                                animate={{ d: pathD }}
                                                                transition={{ type: "spring", stiffness: 40, damping: 15 }}
                                                                fill="none"
                                                                stroke="#ffffff"
                                                                strokeWidth="12"
                                                                strokeLinecap="round"
                                                                opacity="0.1"
                                                            />
                                                            <motion.path
                                                                initial={false}
                                                                animate={{ d: pathD }}
                                                                transition={{ type: "spring", stiffness: 40, damping: 15 }}
                                                                fill="none"
                                                                stroke="url(#pathGradientActive)"
                                                                strokeWidth="5"
                                                                strokeLinecap="round"
                                                                strokeDasharray={diagramStyle === 'curved' ? "10,10" : "none"}
                                                                filter="url(#glowActive)"
                                                            />
                                                            
                                                            {nodes.map((node, nidx) => {
                                                                const isEnd = nidx === 0 || nidx === nodes.length - 1;
                                                                const data = nidx === 0 ? { name: viewingRoute.source_name, code: 'SRC' } :
                                                                             nidx === nodes.length - 1 ? { name: viewingRoute.destination_name, code: 'DST' } :
                                                                             (viewingRoute.paths[activePathIndex].via_locations_data[nidx - 1]);

                                                                const labelY = 100; 
                                                                const distY = 340; 

                                                                return (
                                                                    <g key={nidx}>
                                                                        <motion.circle
                                                                            initial={false}
                                                                            animate={{ cx: node.x, cy: node.y }}
                                                                            transition={{ type: "spring", stiffness: 40, damping: 15 }}
                                                                            r={isEnd ? 20 : 14}
                                                                            fill="#ffffff"
                                                                            stroke={nidx === 0 ? "#10b981" : nidx === nodes.length - 1 ? "#3b82f6" : "#475569"}
                                                                            strokeWidth={isEnd ? 8 : 6}
                                                                        />
                                                                        
                                                                        <motion.g
                                                                            initial={false}
                                                                            animate={{ x: node.x, y: labelY }}
                                                                            transition={{ type: "spring", stiffness: 40, damping: 15 }}
                                                                        >
                                                                            <foreignObject x="-120" y="-100" width="240" height="100">
                                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', textAlign: 'center', paddingBottom: '12px' }}>
                                                                                    <div style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: isEnd ? '#ffffff' : '#f8fafc' }}>
                                                                                        {data.name}
                                                                                    </div>
                                                                                    <div style={{ fontSize: '12px', fontWeight: 900, marginTop: '8px', padding: '4px 12px', borderRadius: '100px', border: '1px solid', backgroundColor: isEnd ? 'rgba(255, 255, 255, 0.2)' : '#1e293b', borderColor: isEnd ? 'rgba(255, 255, 255, 0.4)' : '#64748b', color: isEnd ? '#ffffff' : '#cbd5e1' }}>
                                                                                        {data.code || 'HUB'}
                                                                                    </div>
                                                                                    <div style={{ width: '3px', height: '24px', backgroundColor: '#475569', marginTop: '12px', opacity: 0.8 }} />
                                                                                </div>
                                                                            </foreignObject>
                                                                        </motion.g>

                                                                        {nidx < nodes.length - 1 && (
                                                                            <motion.g
                                                                                initial={false}
                                                                                animate={{ x: (node.x + nodes[nidx+1].x) / 2, y: distY }}
                                                                                transition={{ type: "spring", stiffness: 40, damping: 15 }}
                                                                            >
                                                                                <foreignObject x="-65" y="-35" width="130" height="70">
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                                        <div style={{ width: '3px', height: '20px', backgroundColor: '#475569', marginBottom: '12px', opacity: 0.5 }} />
                                                                                        <div style={{ backgroundColor: '#ffffff', color: '#0f172a', padding: '8px 20px', borderRadius: '16px', boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.3)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                            <span style={{ fontSize: '18px', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                                                                                                {viewingRoute.paths[activePathIndex].segment_data?.[nidx] || viewingRoute.paths[activePathIndex].segment_data?.[String(nidx)] || '0'}
                                                                                            </span>
                                                                                            <span style={{ fontSize: '12px', fontWeight: 900, opacity: 0.6 }}>KM</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </foreignObject>
                                                                            </motion.g>
                                                                        )}
                                                                    </g>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    );
                                                })()}
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Detailed Context Cards */}
                                    <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                                        <div style={{ position: 'relative', padding: '32px', borderRadius: '40px', backgroundColor: '#ffffff', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: 0, right: 0, padding: '24px', opacity: 0.05 }}>
                                                <Navigation size={64} />
                                            </div>
                                            <h5 style={{ fontSize: '10px', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Starting Origin</h5>
                                            <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>{viewingRoute.source_name}</div>
                                            <p style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>Main hub where the journey begins.</p>
                                        </div>

                                        <div style={{ position: 'relative', padding: '32px', borderRadius: '40px', backgroundColor: '#ffffff', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: 0, right: 0, padding: '24px', opacity: 0.05 }}>
                                                <MapPin size={64} />
                                            </div>
                                            <h5 style={{ fontSize: '10px', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Target Arrival</h5>
                                            <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>{viewingRoute.destination_name}</div>
                                            <p style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>Final destination point of this route.</p>
                                        </div>

                                        <div style={{ position: 'relative', padding: '32px', borderRadius: '40px', backgroundColor: '#0f172a', color: '#ffffff', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: 0, right: 0, padding: '24px', opacity: 0.1 }}>
                                                <Activity size={64} />
                                            </div>
                                            <h5 style={{ fontSize: '10px', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Stream Metrics</h5>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                                                    <div style={{ fontSize: '40px', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{viewingRoute.paths[activePathIndex].distance_km}</div>
                                                    <div style={{ fontSize: '14px', fontWeight: 900, opacity: 0.4, paddingBottom: '8px' }}>TOTAL KM</div>
                                                </div>
                                                <button 
                                                    onClick={() => handleManagePaths(viewingRoute, viewingRoute.paths[activePathIndex])}
                                                    className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-lg hover:shadow-primary/40 active:scale-95"
                                                    title="Edit this path"
                                                >
                                                    <Edit2 size={20} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                                                <Zap size={14} style={{ color: '#eab308' }} />
                                                Verified Network Mapping
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '32px', marginTop: '40px', borderTop: '1px solid #f1f5f9' }}>
                    <button 
                        style={{ height: '56px', padding: '0 40px', borderRadius: '16px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b' }} 
                        onClick={() => setIsPathViewerOpen(false)}
                    >
                        Dismiss
                    </button>
                    {viewingRoute && !(viewingRoute.paths && viewingRoute.paths.length > 0) && (
                        <button 
                            className="btn-primary"
                            style={{ height: '56px', padding: '0 40px', borderRadius: '16px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.2)' }}
                            onClick={() => {
                                setIsPathViewerOpen(false);
                                handleManagePaths(viewingRoute);
                            }}
                        >
                            Create Sequence Registry
                        </button>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default RouteManagement;

