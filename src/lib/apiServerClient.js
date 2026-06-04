const API_SERVER_URL = import.meta.env?.VITE_INTEGRATED_AI_API_URL || '';

const buildUrl = (url) => {
    if (!API_SERVER_URL) {
        throw new Error('VITE_INTEGRATED_AI_API_URL is not configured.');
    }

    return `${API_SERVER_URL}${url}`;
};

const apiServerClient = {
    fetch: async (url, options = {}) => {
        return await window.fetch(buildUrl(url), options);
    }
};

export default apiServerClient;

export { apiServerClient };
