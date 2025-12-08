const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID;
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE;
const AUTH0_ROLE_CLAIM = import.meta.env.VITE_AUTH0_ROLE_CLAIM || 'https://aqua.example.com/roles';
const REDIRECT_URI = window.location.origin;

const TOKEN_KEY = 'auth0_access_token';
const ID_TOKEN_KEY = 'auth0_id_token';
const EXPIRES_AT_KEY = 'auth0_expires_at';
const STATE_KEY = 'auth0_auth_state';
const NONCE_KEY = 'auth0_auth_nonce';
const CODE_VERIFIER_KEY = 'auth0_pkce_verifier';

const textEncoder = new TextEncoder();

const base64UrlEncode = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const base64UrlDecode = (value) => {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch (_err) {
    return null;
  }
};

const parseJwt = (token) => {
  if (!token) {
    return null;
  }
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }
  const payload = base64UrlDecode(segments[1]);
  if (!payload) {
    return null;
  }
  try {
    return JSON.parse(new TextDecoder().decode(payload));
  } catch (_error) {
    return null;
  }
};

const sha256 = async (text) => {
  const data = textEncoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hashBuffer);
};

const randomString = (length = 32) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((value) => charset[value % charset.length])
    .join('');
};

const requireConfig = () => {
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_AUDIENCE) {
    throw new Error('Auth0 environment variables are not configured.');
  }
};

const buildAuthorizeUrl = async () => {
  requireConfig();
  const verifier = randomString(64);
  const challenge = await sha256(verifier);
  const state = randomString(32);
  const nonce = randomString(32);

  sessionStorage.setItem(CODE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(NONCE_KEY, nonce);

  const params = new URLSearchParams({
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    client_id: AUTH0_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    audience: AUTH0_AUDIENCE,
    scope: 'openid profile email',
    state,
    nonce
  });

  return `https://${AUTH0_DOMAIN}/authorize?${params.toString()}`;
};

const clearStoredSession = () => {
  sessionStorage.removeItem(CODE_VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(NONCE_KEY);
};

const storeTokens = (accessToken, idToken, expiresIn) => {
  const expiresAt = Date.now() + (Number(expiresIn) || 0) * 1000;
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (idToken) {
    localStorage.setItem(ID_TOKEN_KEY, idToken);
  }
  localStorage.setItem(EXPIRES_AT_KEY, `${expiresAt}`);
};

const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
};

const exchangeCodeForToken = async (code) => {
  requireConfig();
  const verifier = sessionStorage.getItem(CODE_VERIFIER_KEY);
  if (!verifier) {
    throw new Error('Missing PKCE verifier. Please try logging in again.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: AUTH0_CLIENT_ID,
    code_verifier: verifier,
    code,
    redirect_uri: REDIRECT_URI,
    audience: AUTH0_AUDIENCE
  });

  const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error_description || 'Authentication failed.');
  }

  const data = await response.json();
  storeTokens(data.access_token, data.id_token, data.expires_in);
};

export const loginWithRedirect = async () => {
  const authorizeUrl = await buildAuthorizeUrl();
  window.location.assign(authorizeUrl);
};

export const handleRedirectCallback = async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');

  if (!code) {
    return false;
  }

  const expectedState = sessionStorage.getItem(STATE_KEY);
  if (expectedState && expectedState !== returnedState) {
    clearStoredSession();
    throw new Error('Authentication response state mismatch.');
  }

  await exchangeCodeForToken(code);
  clearStoredSession();
  window.history.replaceState({}, document.title, window.location.pathname);
  return true;
};

export const isAuthenticated = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = Number.parseInt(localStorage.getItem(EXPIRES_AT_KEY) || '0', 10);
  return Boolean(token) && expiresAt > Date.now();
};

export const getAccessToken = () => {
  if (!isAuthenticated()) {
    throw new Error('Not authenticated.');
  }
  return localStorage.getItem(TOKEN_KEY);
};

export const getUserProfile = () => {
  const idToken = localStorage.getItem(ID_TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  const payload = parseJwt(idToken);
  if (!payload) {
    return { name: '', role: '' };
  }

  const roles = payload[AUTH0_ROLE_CLAIM];
  const resolvedRole = Array.isArray(roles) ? roles[0] : roles;

  const name = payload.name || payload.nickname || payload.email || '';
  return { name, role: resolvedRole || '' };
};

export const logout = () => {
  clearTokens();
  const params = new URLSearchParams({
    client_id: AUTH0_CLIENT_ID,
    returnTo: REDIRECT_URI
  });
  window.location.assign(`https://${AUTH0_DOMAIN}/v2/logout?${params.toString()}`);
};

export const auth0Client = {
  loginWithRedirect,
  handleRedirectCallback,
  isAuthenticated,
  getAccessToken,
  getUserProfile,
  logout
};
