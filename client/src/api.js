const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

const jsonHeaders = {
  'Content-Type': 'application/json'
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || 'Request failed';
    throw new Error(message);
  }
  return data;
};

export const getSites = () => fetch(`${API_ROOT}/sites`).then(handleResponse);

export const createSite = (payload) =>
  fetch(`${API_ROOT}/sites`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const getSiteDetail = (siteId) => fetch(`${API_ROOT}/sites/${siteId}`).then(handleResponse);

export const addWell = (siteId, payload) =>
  fetch(`${API_ROOT}/sites/${siteId}/wells`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const addTank = (siteId, payload) =>
  fetch(`${API_ROOT}/sites/${siteId}/tanks`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const addFlowmeter = (siteId, payload) =>
  fetch(`${API_ROOT}/sites/${siteId}/flowmeters`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const recordTankLevel = (tankId, payload) =>
  fetch(`${API_ROOT}/tanks/${tankId}/readings`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const recordFlowmeterReading = (flowmeterId, payload) =>
  fetch(`${API_ROOT}/flowmeters/${flowmeterId}/readings`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const recordWellMeasurement = (wellId, payload) =>
  fetch(`${API_ROOT}/wells/${wellId}/measurements`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  }).then(handleResponse);
