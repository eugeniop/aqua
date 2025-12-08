const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

let authContext = { name: '', role: '', getToken: null };

export const setAuthContext = ({ name, role, getToken }) => {
  authContext = {
    name: name?.trim() || '',
    role: role || '',
    getToken: getToken || null
  };
};

const jsonHeaders = {
  'Content-Type': 'application/json'
};

const buildHeaders = async (base = {}) => {
  const headers = { ...base };
  if (typeof authContext.getToken === 'function') {
    try {
      const token = await authContext.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to retrieve access token', error);
    }
  }
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || 'Request failed';
    throw new Error(message);
  }
  return data;
};

const toQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') {
      return;
    }
    searchParams.append(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const request = async (path, options = {}) => {
  const headers = await buildHeaders(options.headers);
  return fetch(`${API_ROOT}${path}`, {
    ...options,
    headers
  }).then(handleResponse);
};

export const getSites = () => request('/sites');

export const createSite = (payload) =>
  request('/sites', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

export const getSiteDetail = (siteId) => request(`/sites/${siteId}`);

export const addWell = (siteId, payload) =>
  request(`/sites/${siteId}/wells`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

export const addTank = (siteId, payload) =>
  request(`/sites/${siteId}/tanks`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

export const addFlowmeter = (siteId, payload) =>
  request(`/sites/${siteId}/flowmeters`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

export const recordTankLevel = (tankId, payload) =>
  request(`/tanks/${tankId}/readings`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

export const recordFlowmeterReading = (flowmeterId, payload) =>
  request(`/flowmeters/${flowmeterId}/readings`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

export const recordWellMeasurement = (wellId, payload) =>
  request(`/wells/${wellId}/measurements`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

export const recordWellMeasurementsBulk = (wellId, payload) =>
  request(`/wells/${wellId}/measurements/bulk`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

export const getTankReadings = (tankId, params) =>
  request(`/tanks/${tankId}/readings${toQueryString(params)}`);

export const getFlowmeterReadings = (flowmeterId, params) =>
  request(`/flowmeters/${flowmeterId}/readings${toQueryString(params)}`);

export const getWellMeasurements = (wellId, params) =>
  request(`/wells/${wellId}/measurements${toQueryString(params)}`);

export const deleteTankReading = (tankId, readingId) =>
  request(`/tanks/${tankId}/readings/${readingId}`, {
    method: 'DELETE'
  });

export const deleteFlowmeterReading = (flowmeterId, readingId) =>
  request(`/flowmeters/${flowmeterId}/readings/${readingId}`, {
    method: 'DELETE'
  });

export const deleteWellMeasurement = (wellId, measurementId) =>
  request(`/wells/${wellId}/measurements/${measurementId}`, {
    method: 'DELETE'
  });
