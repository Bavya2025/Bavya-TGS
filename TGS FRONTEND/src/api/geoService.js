import api from './api';

export const fetchGeoHierarchy = async () => {
    try {
        const response = await api.get('/api/geo/hierarchy/');
        return response.data;
    } catch (error) {
        console.error("Error fetching geo hierarchy:", error);
        throw error;
    }
};
