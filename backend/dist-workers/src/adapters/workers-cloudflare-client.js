import { AppError, ErrorType } from '../types.js';
export class WorkersCloudflareClient {
    env;
    baseUrl = 'https://api.cloudflare.com/client/v4';
    headers;
    constructor(env) {
        this.env = env;
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`
        };
    }
    async makeRequest(method, endpoint, data) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const options = {
                method,
                headers: this.headers
            };
            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }
            const response = await fetch(url, options);
            if (!response.ok) {
                await this.handleHttpError(response);
            }
            const cloudflareResponse = await response.json();
            if (!cloudflareResponse.success) {
                const errorMessage = cloudflareResponse.errors?.[0]?.message || 'Cloudflare API request failed';
                throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, errorMessage, response.status, cloudflareResponse.errors);
            }
            return cloudflareResponse.result;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'An unexpected error occurred while calling Cloudflare API.', 500, error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async handleHttpError(response) {
        const status = response.status;
        let data;
        try {
            data = await response.json();
        }
        catch {
            data = { message: response.statusText };
        }
        if (status === 401 || status === 403) {
            throw new AppError(ErrorType.AUTHENTICATION_ERROR, 'Cloudflare API authentication failed. Please check your API token.', status, data);
        }
        if (status >= 400 && status < 500) {
            const errorMessage = data?.errors?.[0]?.message || 'Invalid request to Cloudflare API';
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, errorMessage, status, data);
        }
        if (status >= 500) {
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'Cloudflare API server error. Please try again later.', status, data);
        }
        throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'Unexpected response from Cloudflare API.', status, data);
    }
    async getZones() {
        return this.makeRequest('GET', '/zones');
    }
    async getZone(zoneId) {
        return this.makeRequest('GET', `/zones/${zoneId}`);
    }
    async createZone(name, nameservers) {
        const data = { name };
        if (nameservers && nameservers.length > 0) {
            data.name_servers = nameservers;
        }
        return this.makeRequest('POST', '/zones', data);
    }
    async getDNSRecords(zoneId) {
        return this.makeRequest('GET', `/zones/${zoneId}/dns_records`);
    }
    async getDNSRecord(zoneId, recordId) {
        return this.makeRequest('GET', `/zones/${zoneId}/dns_records/${recordId}`);
    }
    async createDNSRecord(zoneId, record) {
        return this.makeRequest('POST', `/zones/${zoneId}/dns_records`, record);
    }
    async updateDNSRecord(zoneId, recordId, record) {
        return this.makeRequest('PUT', `/zones/${zoneId}/dns_records/${recordId}`, record);
    }
    async deleteDNSRecord(zoneId, recordId) {
        return this.makeRequest('DELETE', `/zones/${zoneId}/dns_records/${recordId}`);
    }
    async getSSLCertificate(zoneId) {
        return this.makeRequest('GET', `/zones/${zoneId}/ssl/certificate_packs`);
    }
    async requestSSLCertificate(zoneId) {
        return this.makeRequest('POST', `/zones/${zoneId}/ssl/certificate_packs`, {
            type: 'advanced',
            hosts: ['*']
        });
    }
    async getPagesProjects(accountId) {
        const endpoint = accountId ? `/accounts/${accountId}/pages/projects` : `/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/pages/projects`;
        return this.makeRequest('GET', endpoint);
    }
    async getPagesProject(accountId, projectName) {
        return this.makeRequest('GET', `/accounts/${accountId}/pages/projects/${projectName}`);
    }
    async createPagesProject(accountId, name, options) {
        const data = { name, ...options };
        return this.makeRequest('POST', `/accounts/${accountId}/pages/projects`, data);
    }
    async createPagesDeploymentUploadJwt(accountId, projectName) {
        return this.makeRequest('GET', `/accounts/${accountId}/pages/projects/${projectName}/upload-token`);
    }
    async createPagesDeploymentWithManifest(accountId, projectName, manifest) {
        const formData = new FormData();
        formData.append('manifest', JSON.stringify(manifest));
        const response = await fetch(`${this.baseUrl}/accounts/${accountId}/pages/projects/${projectName}/deployments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`
            },
            body: formData
        });
        if (!response.ok) {
            await this.handleHttpError(response);
        }
        const cloudflareResponse = await response.json();
        if (!cloudflareResponse.success) {
            const errorMessage = cloudflareResponse.errors?.[0]?.message || 'Pages deployment with manifest failed';
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, errorMessage, response.status, cloudflareResponse.errors);
        }
        return cloudflareResponse.result;
    }
    async getPagesDeployment(accountId, projectName, deploymentId) {
        return this.makeRequest('GET', `/accounts/${accountId}/pages/projects/${projectName}/deployments/${deploymentId}`);
    }
    async getPagesDeployments(accountId, projectName) {
        return this.makeRequest('GET', `/accounts/${accountId}/pages/projects/${projectName}/deployments`);
    }
    async getAccountId() {
        if (this.env.CLOUDFLARE_ACCOUNT_ID) {
            return this.env.CLOUDFLARE_ACCOUNT_ID;
        }
        const accounts = await this.makeRequest('GET', '/accounts');
        if (!accounts || accounts.length === 0) {
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'No Cloudflare accounts found for this API token', 404);
        }
        return accounts[0].id;
    }
    getConfiguredAccountId() {
        if (!this.env.CLOUDFLARE_ACCOUNT_ID) {
            throw new AppError(ErrorType.CONFIGURATION_ERROR, 'Cloudflare Account ID is not configured', 500);
        }
        return this.env.CLOUDFLARE_ACCOUNT_ID;
    }
    getConfiguredEmail() {
        if (!this.env.CLOUDFLARE_EMAIL) {
            throw new AppError(ErrorType.CONFIGURATION_ERROR, 'Cloudflare Email is not configured', 500);
        }
        return this.env.CLOUDFLARE_EMAIL;
    }
    async verifyToken() {
        try {
            await this.makeRequest('GET', '/user/tokens/verify');
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async checkMissingAssets(jwt, hashes) {
        try {
            const response = await fetch(`${this.baseUrl}/pages/assets/check-missing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify({ hashes })
            });
            if (!response.ok) {
                const status = response.status;
                let data;
                try {
                    data = await response.json();
                }
                catch {
                    data = { message: response.statusText };
                }
                if (status === 401 || status === 403) {
                    throw new AppError(ErrorType.AUTHENTICATION_ERROR, 'Invalid or expired JWT token for asset upload', status, data);
                }
                if (status >= 400 && status < 500) {
                    const errorMessage = data?.errors?.[0]?.message || 'Invalid request to Cloudflare Pages assets API';
                    throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, errorMessage, status, data);
                }
                if (status >= 500) {
                    throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'Cloudflare Pages assets API server error. Please try again later.', status, data);
                }
            }
            return await response.json();
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'An unexpected error occurred while checking missing assets.', 500, error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async uploadAssets(jwt, payload) {
        try {
            const response = await fetch(`${this.baseUrl}/pages/assets/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const status = response.status;
                let data;
                try {
                    data = await response.json();
                }
                catch {
                    data = { message: response.statusText };
                }
                if (status === 401 || status === 403) {
                    throw new AppError(ErrorType.AUTHENTICATION_ERROR, 'Invalid or expired JWT token for asset upload', status, data);
                }
                if (status >= 400 && status < 500) {
                    const errorMessage = data?.errors?.[0]?.message || 'Invalid request to Cloudflare Pages assets API';
                    throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, errorMessage, status, data);
                }
                if (status >= 500) {
                    throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'Cloudflare Pages assets API server error. Please try again later.', status, data);
                }
            }
            return await response.json();
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'An unexpected error occurred while uploading assets.', 500, error instanceof Error ? error.message : 'Unknown error');
        }
    }
}
