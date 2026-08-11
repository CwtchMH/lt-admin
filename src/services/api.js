// API Configuration - Environment-aware
const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
    if (envUrl) {
        return envUrl.replace(/\/$/, '');
    }

    const hostname = window.location.hostname;

    if (hostname === '01102003ducad.luyentu.com') {
        return 'https://luyentu.com';
    }

    if (hostname === '47.84.78.236') {
        return 'https://luyentu.com';
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8080';
    }

    return 'https://luyentu.com';
};

export const API_BASE_URL = getApiBaseUrl();
export const ADMIN_TOKEN_KEY = 'adminToken';
export const ADMIN_USER_KEY = 'adminUser';

const REQUEST_TIMEOUT = 15000;

export const getStoredAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);

export const clearAdminSession = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
};

export const unwrapApiData = (payload) => {
    if (!payload) {
        return null;
    }

    if (typeof payload === 'object' && 'statusCode' in payload && payload.statusCode !== 200) {
        throw new Error(payload.message || 'API request failed');
    }

    return payload.data ?? payload;
};

const fetchWithTimeout = (url, options, timeout = REQUEST_TIMEOUT) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

const buildAuthHeaders = () => {
    const token = getStoredAdminToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const api = {
    getHeaders: buildAuthHeaders,

    async request(method, endpoint, data) {
        const isFormData = data instanceof FormData;
        const headers = this.getHeaders();

        if (isFormData) {
            delete headers['Content-Type'];
        }

        const options = {
            method,
            headers,
        };

        if (data !== undefined) {
            options.body = isFormData ? data : JSON.stringify(data);
        }

        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, options);
            return this.handleResponse(response, endpoint);
        } catch (error) {
            return this.handleNetworkError(error, endpoint);
        }
    },

    async get(endpoint) {
        return this.request('GET', endpoint);
    },

    async post(endpoint, data) {
        return this.request('POST', endpoint, data);
    },

    async put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    },

    async patch(endpoint, data) {
        return this.request('PATCH', endpoint, data);
    },

    async delete(endpoint) {
        return this.request('DELETE', endpoint);
    },

    handleNetworkError(error, endpoint) {
        if (error.name === 'AbortError') {
            console.warn(`[API] Request timeout: ${endpoint}`);
            throw new Error('Request timeout');
        }

        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            console.warn(`[API] Network error: ${endpoint}`);
            throw new Error('Network error');
        }

        throw error;
    },

    async handleResponse(response, endpoint = '') {
        if (response.status === 401) {
            if (endpoint.startsWith('/api/admin/') && !endpoint.startsWith('/api/admin/login')) {
                clearAdminSession();
                window.location.href = '/login';
                return null;
            }

            throw new Error('Session expired');
        }

        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.message || 'API request failed');
        }

        return payload;
    },

    async download(endpoint, filename) {
        const token = getStoredAdminToken();
        if (!token) {
            throw new Error('Missing admin session');
        }

        const response = await fetchWithTimeout(
            `${API_BASE_URL}${endpoint}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            30000,
        );

        if (response.status === 401) {
            clearAdminSession();
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            throw new Error('Download failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },
};

export default api;
