import axios from 'axios';
import { config } from '../config/index.js';
import { AppError, ErrorType } from '../types.js';
export class CloudflareClient {
    client;
    constructor() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (config.cloudflareApiKey && config.cloudflareEmail) {
            headers['X-Auth-Email'] = config.cloudflareEmail;
            headers['X-Auth-Key'] = config.cloudflareApiKey;
        }
        else {
            headers['Authorization'] = `Bearer ${config.cloudflareApiToken}`;
        }
        this.client = axios.create({
            baseURL: config.cloudflareApiBaseUrl,
            headers,
            timeout: 30000
        });
        this.client.interceptors.response.use((response) => response, (error) => this.handleError(error));
    }
    handleError(error) {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
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
        else if (error.request) {
            throw new AppError(ErrorType.NETWORK_ERROR, 'Unable to connect to Cloudflare API. Please check your internet connection.', 0, error.message);
        }
        else {
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'An unexpected error occurred while calling Cloudflare API.', 500, error.message);
        }
    }
    async makeRequest(method, endpoint, data) {
        try {
            const response = await this.client.request({
                method,
                url: endpoint,
                data
            });
            const cloudflareResponse = response.data;
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
            throw this.handleError(error);
        }
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
    async getSSLCertificates(zoneId) {
        return this.makeRequest('GET', `/zones/${zoneId}/ssl/certificate_packs`);
    }
    async getSSLCertificate(zoneId) {
        try {
            const certificatePacks = await this.getSSLCertificates(zoneId);
            if (!certificatePacks || certificatePacks.length === 0) {
                return null;
            }
            const activePack = certificatePacks.find(pack => pack.status === 'active');
            if (!activePack) {
                return null;
            }
            const primaryCert = activePack.certificates?.find((cert) => cert.id === activePack.primary_certificate) || activePack.certificates?.[0];
            if (!primaryCert) {
                return null;
            }
            return {
                id: primaryCert.id,
                status: primaryCert.status,
                issuer: primaryCert.issuer || activePack.certificate_authority || 'Unknown',
                expires_on: primaryCert.expires_on,
                hosts: activePack.hosts || [],
                type: activePack.type || 'universal',
                validation_method: activePack.validation_method || 'txt',
                validity_days: activePack.validity_days || 90
            };
        }
        catch (error) {
            return null;
        }
    }
    async requestSSLCertificate(zoneId) {
        try {
            const existingCert = await this.getSSLCertificate(zoneId);
            if (existingCert && existingCert.status === 'active') {
                return existingCert;
            }
            const result = await this.makeRequest('POST', `/zones/${zoneId}/ssl/certificate_packs`, {
                type: 'universal',
                hosts: []
            });
            return {
                id: result.id || result.certificates?.[0]?.id || 'pending',
                status: result.status || 'pending',
                issuer: result.certificate_authority || 'Cloudflare',
                expires_on: result.certificates?.[0]?.expires_on || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                hosts: result.hosts || [],
                type: result.type || 'universal',
                validation_method: result.validation_method || 'txt',
                validity_days: result.validity_days || 90
            };
        }
        catch (error) {
            const existingCert = await this.getSSLCertificate(zoneId);
            if (existingCert) {
                return existingCert;
            }
            throw error;
        }
    }
    async getPagesProjects(accountId) {
        const endpoint = accountId ? `/accounts/${accountId}/pages/projects` : '/accounts/pages/projects';
        return this.makeRequest('GET', endpoint);
    }
    async getPagesProject(accountId, projectName) {
        return this.makeRequest('GET', `/accounts/${accountId}/pages/projects/${projectName}`);
    }
    async createPagesProject(accountId, name, options) {
        const data = {
            name,
            ...options
        };
        return this.makeRequest('POST', `/accounts/${accountId}/pages/projects`, data);
    }
    async createPagesDeploymentUploadJwt(accountId, projectName) {
        return this.makeRequest('GET', `/accounts/${accountId}/pages/projects/${projectName}/upload-token`);
    }
    async createPagesDeployment(accountId, projectName) {
        try {
            const response = await this.client.post(`/accounts/${accountId}/pages/projects/${projectName}/deployments`, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            const cloudflareResponse = response.data;
            if (!cloudflareResponse.success) {
                const errorMessage = cloudflareResponse.errors?.[0]?.message || 'Pages deployment failed';
                throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, errorMessage, response.status, cloudflareResponse.errors);
            }
            return cloudflareResponse.result;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw this.handleError(error);
        }
    }
    async createPagesDeploymentWithManifest(accountId, projectName, manifest) {
        try {
            const formData = new FormData();
            formData.append('manifest', JSON.stringify(manifest));
            const response = await this.client.post(`/accounts/${accountId}/pages/projects/${projectName}/deployments`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            const cloudflareResponse = response.data;
            if (!cloudflareResponse.success) {
                const errorMessage = cloudflareResponse.errors?.[0]?.message || 'Pages deployment with manifest failed';
                throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, errorMessage, response.status, cloudflareResponse.errors);
            }
            return cloudflareResponse.result;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw this.handleError(error);
        }
    }
    async getPagesDeployment(accountId, projectName, deploymentId) {
        return this.makeRequest('GET', `/accounts/${accountId}/pages/projects/${projectName}/deployments/${deploymentId}`);
    }
    async getPagesDeployments(accountId, projectName) {
        return this.makeRequest('GET', `/accounts/${accountId}/pages/projects/${projectName}/deployments`);
    }
    async getAccountId() {
        if (config.cloudflareAccountId) {
            return config.cloudflareAccountId;
        }
        const accounts = await this.makeRequest('GET', '/accounts');
        if (!accounts || accounts.length === 0) {
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'No Cloudflare accounts found for this API token', 404);
        }
        const firstAccount = accounts[0];
        if (!firstAccount || !firstAccount.id) {
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'Invalid account data received from Cloudflare API', 500);
        }
        return firstAccount.id;
    }
    getConfiguredAccountId() {
        if (!config.cloudflareAccountId) {
            throw new AppError(ErrorType.CONFIGURATION_ERROR, 'Cloudflare Account ID is not configured', 500);
        }
        return config.cloudflareAccountId;
    }
    getConfiguredEmail() {
        if (!config.cloudflareEmail) {
            throw new AppError(ErrorType.CONFIGURATION_ERROR, 'Cloudflare Email is not configured', 500);
        }
        return config.cloudflareEmail;
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
            const jwtClient = axios.create({
                baseURL: config.cloudflareApiBaseUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                timeout: 30000
            });
            const response = await jwtClient.post('/pages/assets/check-missing', { hashes });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    const status = error.response.status;
                    const data = error.response.data;
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
                else if (error.request) {
                    throw new AppError(ErrorType.NETWORK_ERROR, 'Unable to connect to Cloudflare Pages assets API. Please check your internet connection.', 0, error.message);
                }
            }
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'An unexpected error occurred while checking missing assets.', 500, error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async uploadAssets(jwt, payload) {
        try {
            const jwtClient = axios.create({
                baseURL: config.cloudflareApiBaseUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                timeout: 60000
            });
            const response = await jwtClient.post('/pages/assets/upload', payload);
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    const status = error.response.status;
                    const data = error.response.data;
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
                else if (error.request) {
                    throw new AppError(ErrorType.NETWORK_ERROR, 'Unable to connect to Cloudflare Pages assets API. Please check your internet connection.', 0, error.message);
                }
            }
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'An unexpected error occurred while uploading assets.', 500, error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async getPagesProjectDomains(accountId, projectName) {
        try {
            const response = await this.client.get(`/accounts/${accountId}/pages/projects/${projectName}/domains`);
            if (response.data.success && response.data.result) {
                return response.data.result;
            }
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'Failed to retrieve project domains', 500, response.data);
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    const status = error.response.status;
                    const data = error.response.data;
                    if (status === 404) {
                        throw new AppError(ErrorType.NOT_FOUND_ERROR, 'Project not found', status, data);
                    }
                    if (status >= 400 && status < 500) {
                        const errorMessage = data?.errors?.[0]?.message || 'Invalid request to Cloudflare Pages API';
                        throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, errorMessage, status, data);
                    }
                    if (status >= 500) {
                        throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'Cloudflare Pages API server error. Please try again later.', status, data);
                    }
                }
                else if (error.request) {
                    throw new AppError(ErrorType.NETWORK_ERROR, 'Unable to connect to Cloudflare Pages API. Please check your internet connection.', 0, error.message);
                }
            }
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'An unexpected error occurred while retrieving project domains.', 500, error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async addPagesProjectDomain(accountId, projectName, domainName) {
        try {
            const response = await this.client.post(`/accounts/${accountId}/pages/projects/${projectName}/domains`, { name: domainName });
            if (response.data.success && response.data.result) {
                return response.data.result;
            }
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'Failed to add domain to project', 500, response.data);
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    const status = error.response.status;
                    const data = error.response.data;
                    if (status === 409) {
                        throw new AppError(ErrorType.CONFLICT_ERROR, 'Domain already exists for this project', status, data);
                    }
                    if (status >= 400 && status < 500) {
                        const errorMessage = data?.errors?.[0]?.message || 'Invalid request to Cloudflare Pages API';
                        throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, errorMessage, status, data);
                    }
                    if (status >= 500) {
                        throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'Cloudflare Pages API server error. Please try again later.', status, data);
                    }
                }
                else if (error.request) {
                    throw new AppError(ErrorType.NETWORK_ERROR, 'Unable to connect to Cloudflare Pages API. Please check your internet connection.', 0, error.message);
                }
            }
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'An unexpected error occurred while adding domain to project.', 500, error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async deletePagesProjectDomain(accountId, projectName, domainName) {
        try {
            await this.client.delete(`/accounts/${accountId}/pages/projects/${projectName}/domains/${domainName}`);
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    const status = error.response.status;
                    const data = error.response.data;
                    if (status === 404) {
                        throw new AppError(ErrorType.NOT_FOUND_ERROR, 'Domain not found', status, data);
                    }
                    if (status >= 400 && status < 500) {
                        const errorMessage = data?.errors?.[0]?.message || 'Invalid request to Cloudflare Pages API';
                        throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, errorMessage, status, data);
                    }
                    if (status >= 500) {
                        throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'Cloudflare Pages API server error. Please try again later.', status, data);
                    }
                }
                else if (error.request) {
                    throw new AppError(ErrorType.NETWORK_ERROR, 'Unable to connect to Cloudflare Pages API. Please check your internet connection.', 0, error.message);
                }
            }
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'An unexpected error occurred while deleting domain from project.', 500, error instanceof Error ? error.message : 'Unknown error');
        }
    }
}
export const cloudflareClient = new CloudflareClient();
