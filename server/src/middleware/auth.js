const VALID_ROLES = ['admin', 'field-operator', 'analyst'];

export const requireAuth = (req, res, next) => {
  const role = (req.header('x-user-role') || '').toLowerCase();
  const name = (req.header('x-user-name') || '').trim();

  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(401).json({ message: 'Invalid or missing role' });
  }

  req.user = { role, name };
  next();
};

export const isAdmin = (req) => req.user?.role === 'admin';
export const isFieldOperator = (req) => req.user?.role === 'field-operator';

export const ensureRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You are not authorised to perform this action' });
  }
  next();
};
