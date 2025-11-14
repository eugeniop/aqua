const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

let authContext = { name: '', role: '' };

export const setAuthContext = ({ name, role }) => {
  authContext = {
    name: name?.trim() || '',
    role: role || ''
  };
};

const jsonHeaders = {
  'Content-Type': 'application/json'
};

const buildHeaders = (base = {}) => {
  const headers = { ...base };
  if (authContext.role) {
    headers['X-User-Role'] = authContext.role;
  }
  if (authContext.name) {
    headers['X-User-Name'] = authContext.name;
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

export const getSites = () =>
  fetch(`${API_ROOT}/sites`, { headers: buildHeaders() }).then(handleResponse);

export const createSite = (payload) =>
  fetch(`${API_ROOT}/sites`, {
    method: 'POST',
    headers: buildHeaders(jsonHeaders),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const getSiteDetail = (siteId) =>
  fetch(`${API_ROOT}/sites/${siteId}`, { headers: buildHeaders() }).then(handleResponse);

export const addWell = (siteId, payload) =>
  fetch(`${API_ROOT}/sites/${siteId}/wells`, {
    method: 'POST',
    headers: buildHeaders(jsonHeaders),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const addTank = (siteId, payload) =>
  fetch(`${API_ROOT}/sites/${siteId}/tanks`, {
    method: 'POST',
    headers: buildHeaders(jsonHeaders),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const addFlowmeter = (siteId, payload) =>
  fetch(`${API_ROOT}/sites/${siteId}/flowmeters`, {
    method: 'POST',
    headers: buildHeaders(jsonHeaders),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const recordTankLevel = (tankId, payload) =>
  fetch(`${API_ROOT}/tanks/${tankId}/readings`, {
    method: 'POST',
    headers: buildHeaders(jsonHeaders),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const recordFlowmeterReading = (flowmeterId, payload) =>
  fetch(`${API_ROOT}/flowmeters/${flowmeterId}/readings`, {
    method: 'POST',
    headers: buildHeaders(jsonHeaders),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const recordWellMeasurement = (wellId, payload) =>
  fetch(`${API_ROOT}/wells/${wellId}/measurements`, {
    method: 'POST',
    headers: buildHeaders(jsonHeaders),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const getTankReadings = (tankId, params) =>
  fetch(`${API_ROOT}/tanks/${tankId}/readings${toQueryString(params)}`, {
    headers: buildHeaders()
  }).then(handleResponse);

export const getFlowmeterReadings = (flowmeterId, params) =>
  fetch(`${API_ROOT}/flowmeters/${flowmeterId}/readings${toQueryString(params)}`, {
    headers: buildHeaders()
  }).then(handleResponse);

export const getWellMeasurements = (wellId, params) =>
  fetch(`${API_ROOT}/wells/${wellId}/measurements${toQueryString(params)}`, {
    headers: buildHeaders()
  }).then(handleResponse);

export const deleteTankReading = (tankId, readingId) =>
  fetch(`${API_ROOT}/tanks/${tankId}/readings/${readingId}`, {
    method: 'DELETE',
    headers: buildHeaders()
  }).then(handleResponse);

export const deleteFlowmeterReading = (flowmeterId, readingId) =>
  fetch(`${API_ROOT}/flowmeters/${flowmeterId}/readings/${readingId}`, {
    method: 'DELETE',
    headers: buildHeaders()
  }).then(handleResponse);

export const deleteWellMeasurement = (wellId, measurementId) =>
  fetch(`${API_ROOT}/wells/${wellId}/measurements/${measurementId}`, {
    method: 'DELETE',
    headers: buildHeaders()
  }).then(handleResponse);
