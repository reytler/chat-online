function normalizeApiBaseUrl(apiUrl: string) {
    return apiUrl.replace(/\/$/, '')
}

export function getApiBaseUrl() {
    const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

    if (configuredApiUrl) {
        return normalizeApiBaseUrl(configuredApiUrl)
    }

    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'

    return normalizeApiBaseUrl(`${protocol}//${window.location.hostname}:3001`)
}
