import axios from 'axios';

<<<<<<< HEAD
const BASE_URL = 'http://192.168.1.144:4567/';
=======
const BASE_URL = 'http://192.168.1.135:4567/';
>>>>>>> e3f171bfe2c6ffb1ef87126a6db92bc726dc505c


const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    try {
        const storedUser = sessionStorage.getItem('tgs_user');
        if (storedUser && storedUser !== 'undefined') {
            const user = JSON.parse(storedUser);
            if (user && user.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
            }
        }
    } catch (error) {
        console.error("Error parsing user from sessionStorage:", error);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        if (!error.config.url.includes('/auth/login')) {
            console.warn("Session expired or unauthorized. Logging out...");
            sessionStorage.removeItem('tgs_user');
            if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
                window.location.href = '/';
            }
        }
    }
    return Promise.reject(error);
});

export default api;
