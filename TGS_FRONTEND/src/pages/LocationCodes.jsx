import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    MapPin,
    ChevronRight,
    Globe,
    Building2,
    HelpCircle,
    Info,
    ExternalLink,
    Hash,
    ChevronDown,
    WifiOff,
    AlertCircle
} from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

import SearchableSelect from '../components/SearchableSelect';

const LocationCodes = () => {
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [locations, setLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState(false);

    // Drill-down state
    const [continents, setContinents] = useState([]);
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [mandals, setMandals] = useState([]);
    const [places, setPlaces] = useState([]);

    const [selectedContinent, setSelectedContinent] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedMandal, setSelectedMandal] = useState('');
    const [selectedPlace, setSelectedPlace] = useState('');

    const [fullHierarchy, setFullHierarchy] = useState([]);

    // Fetch the Full Immutable Hierarchy map on page load for immediate offline lookup
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            setFetchError(false);
            try {
                const res = await api.get('/api/geo/hierarchy/');
                const data = res.data.results || res.data.data || res.data;
                const arr = Array.isArray(data) ? data : [];
                setFullHierarchy(arr);
                
                // Set initial continent dropdowns
                if (arr.length > 0) {
                    setContinents(arr.map(c => ({ id: c.id, name: c.name })));
                } else {
                    setContinents([]);
                }
            } catch (error) {
                console.error("Failed to fetch full hierarchy map:", error);
                setFetchError(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // Hierarchy Drill-Down Tree Extractor
    const getChildren = (type, filters) => {
        if (!fullHierarchy || !fullHierarchy.length) return [];
        let data = fullHierarchy;

        if (type === 'continent') return data;

        // Helper to filter out terminal nodes from organizational pools
    const filterTerminal = (arr) => arr.filter(item => {
        const typeStr = String(item.cluster_type || item.location_type || item.type || '').toLowerCase();
        // Strict exclusion for any node classified as a leaf (visiting locations, landmarks, etc)
        const isTerminal = typeStr.includes('visiting location') || 
                          typeStr.includes('landmark') || 
                          typeStr.includes('location') ||
                          typeStr.includes('visiting_location');
        return !isTerminal;
    });

    const continent = data.find(c => String(c.name || '').trim().toLowerCase() === String(filters.continent || '').trim().toLowerCase());
    const countries = continent?.children || continent?.countries || [];
    if (type === 'country') return filterTerminal(countries);

    const country = countries.find(c => String(c.name || '').trim().toLowerCase() === String(filters.country || '').trim().toLowerCase());
    const states = country?.states || country?.state || country?.children || [];
    if (type === 'state') return filterTerminal(states);

    const state = states.find(s => String(s.name || '').trim().toLowerCase() === String(filters.state || '').trim().toLowerCase());
    const districts = state?.districts || state?.district || state?.children || [];
    if (type === 'district') return filterTerminal(districts);

    const district = districts.find(d => String(d.name || '').trim().toLowerCase() === String(filters.district || '').trim().toLowerCase());
    const mandals = district?.mandals || district?.mandal || district?.children || [];
    if (type === 'mandal') return filterTerminal(mandals);

        const mandal = mandals.find(m => String(m.name || '').trim().toLowerCase() === String(filters.mandal || '').trim().toLowerCase());
        
        if (type === 'cluster') {
            const rawClusters = [
                ...(mandal?.clusters || []),
                ...(mandal?.cluster || []),
                ...(mandal?.cities || []), // Cities/Towns are organizational, keep them
                ...(mandal?.metro_polyten_cities || []),
                ...(mandal?.towns || []),
                ...(mandal?.villages || []),
                ...(mandal?.children || [])
            ];
            // Filter out terminal nodes that might be mixed in 'children'
            return filterTerminal(rawClusters).map(c => ({...c, _detectedType: c.cluster_type || 'Cluster'}));
        }

        const clusterList = [
            ...(mandal?.clusters || []),
            ...(mandal?.cluster || []),
            ...(mandal?.cities || []),
            ...(mandal?.metro_polyten_cities || []),
            ...(mandal?.towns || []),
            ...(mandal?.villages || []),
            ...(mandal?.children || [])
        ];

        const cluster = clusterList.find(c => String(c.name || c.location_name || '').trim().toLowerCase() === String(filters.cluster || '').trim().toLowerCase());
        
        if (type === 'visitingLocation') {
            return [
                ...(cluster?.visiting_locations || []),
                ...(cluster?.locations || []),
                ...(cluster?.children || []),
                ...(cluster?.cities || []),
                ...(cluster?.metro_polyten_cities || []),
                ...(cluster?.towns || []),
                ...(cluster?.villages || [])
            ];
        }
        if (type === 'landmark') {
            return cluster?.landmarks || [];
        }

        return [];
    };

    // Propagate Drill-Down Resets dynamically
    useEffect(() => {
        if (fullHierarchy.length === 0) return;
        const ctryList = getChildren('country', { continent: selectedContinent });
        setCountries(ctryList);
        setSelectedCountry('');
        setSelectedState('');
        setSelectedDistrict('');
        setSelectedMandal('');
        setSelectedPlace('');
    }, [selectedContinent, fullHierarchy]);

    useEffect(() => {
        if (fullHierarchy.length === 0) return;
        const stList = getChildren('state', { continent: selectedContinent, country: selectedCountry });
        setStates(stList);
        setSelectedState('');
        setSelectedDistrict('');
        setSelectedMandal('');
        setSelectedPlace('');
    }, [selectedCountry]);

    useEffect(() => {
        if (fullHierarchy.length === 0) return;
        const distList = getChildren('district', { continent: selectedContinent, country: selectedCountry, state: selectedState });
        setDistricts(distList);
        setSelectedDistrict('');
        setSelectedMandal('');
        setSelectedPlace('');
    }, [selectedState]);

    useEffect(() => {
        if (fullHierarchy.length === 0) return;
        const mndlList = getChildren('mandal', { continent: selectedContinent, country: selectedCountry, state: selectedState, district: selectedDistrict });
        setMandals(mndlList);
        setSelectedMandal('');
        setSelectedPlace('');
    }, [selectedDistrict]);

    useEffect(() => {
        if (fullHierarchy.length === 0) return;
        const clsList = getChildren('cluster', { continent: selectedContinent, country: selectedCountry, state: selectedState, district: selectedDistrict, mandal: selectedMandal });
        
        // Pass objects as-is to preserve raw names for comparison while letting SearchableSelect handle type display
        setPlaces(clsList);
        setSelectedPlace('');
    }, [selectedMandal]);

    const flattenNodesTree = (items, level = 'Continent', seenIds = new Set()) => {
        let flat = [];
        if (!Array.isArray(items)) return flat;

        const levelMap = {
            'Continent': { keys: ['countries', 'children'], next: 'Country' },
            'Country': { keys: ['states', 'state', 'children'], next: 'State' },
            'State': { keys: ['districts', 'district', 'children'], next: 'District' },
            'District': { keys: ['mandals', 'mandal', 'children'], next: 'Mandal' },
            'Mandal': { keys: ['clusters', 'cluster', 'cities', 'metro_polyten_cities', 'towns', 'villages', 'children'], next: 'Cluster' },
            'Cluster': { keys: ['locations', 'visiting_locations', 'landmarks', 'children', 'cities', 'metro_polyten_cities', 'towns', 'villages'], next: 'Visiting Location' }
        };

        items.forEach(item => {
            if (!item) return;
            const uniqueKey = `${level}-${item.id}`;
            if (!item.id || seenIds.has(uniqueKey)) return;
            seenIds.add(uniqueKey);

            let explicitType = item.cluster_type || item.location_type || item.type || level;
            flat.push({ ...item, _detectedType: explicitType });

            const config = levelMap[level];
            if (config && config.keys) {
                config.keys.forEach(key => {
                    const nextItems = item[key];
                    if (nextItems && Array.isArray(nextItems)) {
                        let nextLevel = config.next;
                        if (level === 'Mandal') {
                            if (key === 'cities') nextLevel = 'City';
                            else if (key === 'metro_polyten_cities') nextLevel = 'Metro City';
                            else if (key === 'towns') nextLevel = 'Town';
                            else if (key === 'villages') nextLevel = 'Village';
                            else nextLevel = 'Cluster';
                        }
                        flat = flat.concat(flattenNodesTree(nextItems, nextLevel, seenIds));
                    }
                });
            }
        });
        return flat;
    };

    useEffect(() => {
        const updateGlobalPoolFromHierarchy = () => {
            if (!fullHierarchy || fullHierarchy.length === 0) {
                setLocations([]);
                return;
            }

            if (searchQuery.trim().length >= 1) {
                const query = searchQuery.trim().toLowerCase();
                const allNodes = flattenNodesTree(fullHierarchy);
                const matched = allNodes.filter(n => {
                    const name = String(n.name || n.location_name || '').toLowerCase();
                    const code = String(n.code || n.location_code || n.external_id || n.id || '').toLowerCase();
                    return name.startsWith(query) || code.startsWith(query);
                });
                
                // Format matched search results
                const formattedPool = matched.map(node => {
                    let explicitType = node.cluster_type;
                    if (!explicitType && node.type && node.type.toLowerCase() !== 'cluster') explicitType = node.type;
                    if (!explicitType && node.location_type && node.location_type.toLowerCase() !== 'cluster') explicitType = node.location_type;
                    
                    const typeFallback = (explicitType || node.location_type || node._detectedType || 'Unknown').toUpperCase();
                    const actualCode = node.code || node.location_code || '';
                    return {
                        ...node,
                        name: node.name || node.location_name,
                        location_type: typeFallback,
                        code: actualCode,
                        external_id: node.external_id || node.id
                    };
                });
                setLocations(formattedPool.slice(0, 50));
                return;
            }

            let activePool = [];
            
            if (selectedPlace) {
                const hierarchicalFilter = {
                    continent: selectedContinent,
                    country: selectedCountry,
                    state: selectedState,
                    district: selectedDistrict,
                    mandal: selectedMandal,
                    cluster: selectedPlace
                };
                
                const vl = getChildren('visitingLocation', hierarchicalFilter).map(n => ({...n, _detectedType: n.location_type || 'Visiting Location'}));
                const lm = getChildren('landmark', hierarchicalFilter).map(n => ({...n, _detectedType: n.location_type || 'Landmark'}));
                
                if (vl.length === 0 && lm.length === 0) {
                    // Provide the Cluster its self if there are zero child locations
                    const selCluster = getChildren('cluster', hierarchicalFilter).filter(c => String(c.name || c.location_name || '').trim().toLowerCase() === String(selectedPlace).trim().toLowerCase());
                    activePool = selCluster.map(c => ({...c, _detectedType: c.cluster_type || c.location_type || 'Cluster'}));
                } else {
                    activePool = [...vl, ...lm];
                }
            } else if (selectedMandal) {
                activePool = getChildren('cluster', { continent: selectedContinent, country: selectedCountry, state: selectedState, district: selectedDistrict, mandal: selectedMandal });
            } else if (selectedDistrict) {
                activePool = getChildren('mandal', { continent: selectedContinent, country: selectedCountry, state: selectedState, district: selectedDistrict });
            } else if (selectedState) {
                activePool = getChildren('district', { continent: selectedContinent, country: selectedCountry, state: selectedState });
            } else if (selectedCountry) {
                activePool = getChildren('state', { continent: selectedContinent, country: selectedCountry });
            } else if (selectedContinent) {
                activePool = getChildren('country', { continent: selectedContinent });
            } else {
                // Return only Continents when nothing is selected
                activePool = fullHierarchy.filter(n => n.countries || n.children);
            }

            // EXTRA GUARD (RESET GUARD): Filter out terminal nodes if any organization level is being viewed (not a specific Cluster)
            if (!selectedPlace) {
                activePool = activePool.filter(item => {
                    const typeStr = String(item.cluster_type || item.location_type || item.type || '').toLowerCase();
                    return !typeStr.includes('visiting location') && 
                           !typeStr.includes('landmark') && 
                           !typeStr.includes('location');
                });
            }

            // Formats pure immediate children pools
            const formattedPool = activePool.map(node => {
                let detectedType = 'Unknown';
                if (node.countries) detectedType = 'Continent';
                else if (node.states) detectedType = 'Country';
                else if (node.districts) detectedType = 'State';
                else if (node.mandals) detectedType = 'District';
                else if (node.clusters) detectedType = 'Mandal';
                else if (node.visiting_locations || node.landmarks) detectedType = 'Cluster';
                let explicitType = node.cluster_type;
                if (!explicitType && node.type && node.type.toLowerCase() !== 'cluster') explicitType = node.type;
                if (!explicitType && node.location_type && node.location_type.toLowerCase() !== 'cluster') explicitType = node.location_type;
                
                const typeFallback = (explicitType || node.location_type || node._detectedType || detectedType).toUpperCase();
                const actualCode = node.code || node.location_code || '';
                
                return {
                    ...node,
                    name: node.name || node.location_name,
                    location_type: typeFallback,
                    code: actualCode,
                    external_id: node.external_id || node.id
                };
            });
            
            setLocations(formattedPool.slice(0, 50));
        };

        const debounceTimer = setTimeout(() => updateGlobalPoolFromHierarchy(), 150);
        return () => clearTimeout(debounceTimer);
    }, [fullHierarchy, searchQuery, selectedContinent, selectedCountry, selectedState, selectedDistrict, selectedMandal, selectedPlace]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showToast("success", `Code ${text} copied to clipboard!`);
    };

    const handleSync = async () => {
        setIsLoading(true);
        setFetchError(false);
        try {
            const res = await api.get('/api/geo/hierarchy/');
            const data = res.data.results || res.data.data || res.data;
            setFullHierarchy(Array.isArray(data) ? data : []);
            showToast("Hierarchy map successfully synchronized via API", "success");
        } catch (error) {
            console.error("Sync Error:", error);
            setFetchError(true);
            showToast("Failed to verify endpoints. Internal Server Error.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="location-codes-page animate-fade-in">
            <div className="location-header premium-card">
                <div className="header-info">
                    <div className="icon-badge">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <div className="title-row">
                            <h1>Location Codes</h1>
                            <span className={`live-badge ${fetchError ? 'error' : ''}`}>
                                {fetchError ? 'API Connection Failed' : 'Live API Source'}
                            </span>
                        </div>
                        <p>Search and verify destination codes fetched directly from the Geo Master API.</p>
                    </div>
                </div>

                <div className="header-actions">
                    <button className="sync-btn" onClick={handleSync} disabled={isLoading}>
                        <Globe size={16} className={isLoading ? 'animate-spin' : ''} />
                        {isLoading ? 'Syncing...' : 'Refresh Sync'}
                    </button>
                    <div style={{ position: 'relative', width: '400px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            style={{ 
                                width: '100%', 
                                padding: '14px 16px 14px 48px', 
                                borderRadius: '12px', 
                                border: '1px solid #e2e8f0', 
                                fontSize: '0.95rem', 
                                outline: 'none',
                                backgroundColor: 'white'
                            }}
                            placeholder="Search city, airport code, or state..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={(e) => { e.target.style.borderColor = '#b5179e'; e.target.style.boxShadow = '0 0 0 4px rgba(181, 23, 158, 0.1)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                        />
                    </div>
                </div>
            </div>

            <div className="drill-down-container premium-card overflow-visible relative z-[100]">
                <div className="drill-label">
                    <Globe size={18} />
                    <span>Regional Drill-Down</span>
                </div>
                <div className="filter-row-container relative z-[100] mt-2">
                    <div className="geo-filters-row gap-4">
                        <div className="w-full">
                            <SearchableSelect 
                                placeholder="All Continents"
                                options={continents}
                                value={selectedContinent}
                                onChange={(val) => setSelectedContinent(val)}
                            />
                        </div>
                        <div className="w-full">
                            <SearchableSelect 
                                placeholder="All Countries"
                                disabled={!selectedContinent}
                                options={countries}
                                value={selectedCountry}
                                onChange={(val) => setSelectedCountry(val)}
                            />
                        </div>
                        <div className="w-full">
                            <SearchableSelect 
                                placeholder="All States"
                                disabled={!selectedCountry}
                                options={states}
                                value={selectedState}
                                onChange={(val) => setSelectedState(val)}
                            />
                        </div>
                        <div className="w-full">
                            <SearchableSelect 
                                placeholder="All Districts"
                                disabled={!selectedState}
                                options={districts}
                                value={selectedDistrict}
                                onChange={(val) => setSelectedDistrict(val)}
                            />
                        </div>
                        <div className="w-full">
                            <SearchableSelect 
                                placeholder="All Mandals/Places"
                                disabled={!selectedDistrict}
                                options={mandals}
                                value={selectedMandal}
                                onChange={(val) => setSelectedMandal(val)}
                            />
                        </div>
                        <div className="w-full">
                            <SearchableSelect 
                                placeholder="All Clusters"
                                disabled={!selectedMandal}
                                options={places}
                                value={selectedPlace}
                                onChange={(val) => setSelectedPlace(val)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="location-stats">
                <div className="stat-card">
                    <Globe size={18} />
                    <span>{locations.length} Locations Visible</span>
                </div>
                <div className="stat-card">
                    <Info size={18} />
                    <span>Live data from Geo Master</span>
                </div>
            </div>

            <div className="location-grid mt-4">
                {fetchError ? (
                    <div className="no-nodes-container error-state bg-white p-12 rounded-2xl shadow-sm border border-red-100 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                            <WifiOff size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Network Connection Issue</h3>
                        <p className="text-slate-500 max-w-sm mb-6">
                            We cannot reach the Geo Data API at this time. Please check your network connection and try again.
                        </p>
                        <button 
                            className="bg-red-50 text-red-600 font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:bg-red-100 transition-colors"
                            onClick={() => window.location.reload()}
                        >
                            <AlertCircle size={16} /> Retry Connection
                        </button>
                    </div>
                ) : isLoading ? (
                    <div className="loading-state-premium">
                        <div className="spinner-magenta"></div>
                        <p>Updating location directory...</p>
                    </div>
                ) : locations.length > 0 ? (
                    locations.map(loc => (
                        <div key={`${loc.location_type}-${loc.id}-${loc.name}`} className="location-item-card">
                            <div className="loc-card-main">
                                <div className="loc-info">
                                    <div className="city-row">
                                        <h3>{loc.name || loc.location_name || `ID-${loc.id || loc.external_id}`}</h3>
                                        <span className={`type-tag ${ (loc.location_type || '').toLowerCase().replace(/\s+/g, '-') }`}>
                                            {loc.location_type}
                                        </span>
                                    </div>
                                    <p className="state-country">
                                        Level: {loc.location_type}
                                    </p>
                                </div>
                                {loc.code && (
                                    <div className="code-box">
                                        <span className="code-text">{loc.code}</span>
                                    </div>
                                )}
                            </div>
                            {loc.code && (
                                <div className="loc-card-footer" style={{ justifyContent: 'flex-end' }}>
                                    <button className="btn-copy" onClick={() => copyToClipboard(loc.code)}>
                                        Copy Code
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="no-results premium-card">
                        <HelpCircle size={48} />
                        <h3>No matching locations found</h3>
                        <p>Try searching with a different city name or airport code.</p>
                    </div>
                )}
            </div>

            <div className="help-footer-alert">
                <Info size={18} />
                <p>Location codes are mapped to standard IATA airport codes for automated flight integration. For off-network locations, please use regional headquarters codes.</p>
            </div>
        </div>
    );
};

export default LocationCodes;
