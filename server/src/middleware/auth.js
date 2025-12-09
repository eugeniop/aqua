import crypto from 'crypto';

import dotenv from 'dotenv';
dotenv.config();

const VALID_ROLES = ['admin', 'field-operator', 'analyst'];
const ISSUER_BASE_URL = (process.env.AUTH0_ISSUER_BASE_URL || '').replace(/\/$/, '');
const AUDIENCE = process.env.AUTH0_AUDIENCE || '';
const ROLE_CLAIM = process.env.AUTH0_ROLE_CLAIM || 'https://aqua.example.com/roles';
const JWKS_TTL_MS = 1000 * 60 * 15; // 15 minutes

let jwksCache = { keys: [], fetchedAt: 0 };

const textEncoder = new TextEncoder();

const base64UrlDecode = (segment) => {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return Buffer.from(padded, 'base64');
  } catch (error) {
    throw new Error('Invalid token encoding');
  }
};

const parseJwt = (token) => {
  const segments = token.split('.');
  if (segments.length !== 3) {
    throw new Error('Malformed token');
  }

  const header = JSON.parse(base64UrlDecode(segments[0]).toString('utf8'));
  const payload = JSON.parse(base64UrlDecode(segments[1]).toString('utf8'));
  const signature = base64UrlDecode(segments[2]);

  return { header, payload, signature, signingInput: `${segments[0]}.${segments[1]}` };
};

const fetchJwks = async () => {
  if (jwksCache.keys.length && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }

  if (!ISSUER_BASE_URL) {
    throw new Error('Auth0 issuer is not configured');
  }

  const response = await fetch(`${ISSUER_BASE_URL}/.well-known/jwks.json`);
  if (!response.ok) {
    throw new Error('Unable to load JWKS from issuer');
  }

  const { keys = [] } = await response.json();
  jwksCache = { keys, fetchedAt: Date.now() };
  return keys;
};

const getSigningKey = async (kid) => {
  const keys = await fetchJwks();
  return keys.find((key) => key.kid === kid && key.kty === 'RSA' && key.use === 'sig');
};

const verifySignature = async (jwk, signingInput, signature) => {
  const key = await crypto.webcrypto.subtle.importKey(
    'jwk',
    { ...jwk, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  return crypto.webcrypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signature,
    textEncoder.encode(signingInput)
  );
};

const validateClaims = (payload) => {
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (payload.exp && nowSeconds >= payload.exp) {
    throw new Error('Token has expired');
  }

  if (payload.nbf && nowSeconds < payload.nbf) {
    throw new Error('Token not yet valid');
  }

  if (ISSUER_BASE_URL) {
    const normalizedIssuer = (payload.iss || '').replace(/\/$/, '');
    if (normalizedIssuer !== ISSUER_BASE_URL) {
      throw new Error('Invalid token issuer');
    }
  }

  if (AUDIENCE) {
    const aud = payload.aud;
    const validAudience = Array.isArray(aud) ? aud.includes(AUDIENCE) : aud === AUDIENCE;
    if (!validAudience) {
      throw new Error('Invalid token audience');
    }
  }
};

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!token) {
      return res.status(401).json({ message: 'Missing bearer token' });
    }

    const { header, payload, signature, signingInput } = parseJwt(token);

    if (header.alg !== 'RS256') {
      return res.status(401).json({ message: 'Unsupported token algorithm' });
    }

    const jwk = await getSigningKey(header.kid);
    if (!jwk) {
      return res.status(401).json({ message: 'Unable to verify token signature' });
    }

    const isValid = await verifySignature(jwk, signingInput, signature);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid token signature' });
    }

    validateClaims(payload);

    const roles = payload[ROLE_CLAIM];
    const role = Array.isArray(roles) ? roles[0] : roles;

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(403).json({ message: 'Invalid or missing role' });
    }

    req.user = { role, name: payload.name || payload.nickname || payload.email || '' };
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message || 'Unauthorized' });
  }
};

export const isAdmin = (req) => req.user?.role === 'admin';
export const isFieldOperator = (req) => req.user?.role === 'field-operator';

export const ensureRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You are not authorised to perform this action' });
  }
  next();
};
