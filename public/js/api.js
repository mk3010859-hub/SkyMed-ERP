// ============================================================
// SKYMED API CLIENT - TiDB Backend
// ============================================================

class SkyMedAPI {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('jwt_token');
    }

    // ============================================================
    // AUTH TOKEN MANAGEMENT
    // ============================================================

    setToken(token) {
        this.token = token;
        localStorage.setItem('jwt_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
    }

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    // ============================================================
    // GENERIC REQUEST
    // ============================================================

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                if (!window.location.pathname.includes('login.html') &&
                    !window.location.pathname.includes('register.html')) {
                    window.location.href = 'login.html';
                }
            }
            throw new Error(data.error || 'Request failed');
        }

        return data;
    }

    // ============================================================
    // AUTH API
    // ============================================================

    async login(email, password, twofaCode = null) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: { email, password, twofaCode }
        });

        if (data.token) {
            this.setToken(data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    async register(email, password, username) {
        return this.request('/auth/register', {
            method: 'POST',
            body: { email, password, username }
        });
    }

    async setup2FA() {
        return this.request('/auth/2fa/setup', { method: 'POST' });
    }

    async enable2FA(code) {
        return this.request('/auth/2fa/enable', {
            method: 'POST',
            body: { code }
        });
    }

    async getProfile() {
        return this.request('/auth/profile');
    }

    // ============================================================
    // ADMIN API
    // ============================================================

    async getPendingRequests() {
        return this.request('/admin/requests/pending');
    }

    async approveUser(userId, notes = '') {
        return this.request(`/admin/users/${userId}/approve`, {
            method: 'POST',
            body: { notes }
        });
    }

    async rejectUser(userId, reason = '') {
        return this.request(`/admin/users/${userId}/reject`, {
            method: 'POST',
            body: { reason }
        });
    }

    async getUsers(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.request(`/admin/users?${params}`);
    }

    async getAdminStats() {
        return this.request('/admin/stats');
    }

    // ============================================================
    // LICENSE API
    // ============================================================

    async createTrial(companyName, email, plan = 'starter') {
        return this.request('/license/trial', {
            method: 'POST',
            body: { companyName, email, plan }
        });
    }

    async verifyLicense(licenseKey) {
        return this.request(`/license/verify?licenseKey=${encodeURIComponent(licenseKey)}`);
    }

    async renewLicense(licenseKey, planType, months) {
        return this.request('/license/renew', {
            method: 'POST',
            body: { licenseKey, planType, months }
        });
    }

    // ============================================================
    // DATA API (CRUD)
    // ============================================================

    async getData(table) {
        return this.request(`/data/${table}`);
    }

    async saveData(table, data) {
        return this.request(`/data/${table}`, {
            method: 'PUT',
            body: data
        });
    }

    async deleteData(table, id) {
        return this.request(`/data/${table}/${id}`, {
            method: 'DELETE'
        });
    }

    async clearTable(table) {
        return this.request(`/data/${table}/clear`, {
            method: 'DELETE'
        });
    }

    // ============================================================
    // HEALTH CHECK
    // ============================================================

    async health() {
        return this.request('/health');
    }
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================

const api = new SkyMedAPI();
window.api = api;

console.log('✅ SkyMed API Client loaded');
