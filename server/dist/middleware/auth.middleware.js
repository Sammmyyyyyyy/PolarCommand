import { AuthService } from '../services/auth.service.js';
export function authenticateJWT(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = AuthService.verifyToken(token);
        if (payload) {
            req.user = payload;
        }
    }
    next();
}
export function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    next();
}
export function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized: Authentication required' });
        }
        if (!allowedRoles.includes(req.user.role) && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                error: `Forbidden: Operation requires one of the following roles: ${allowedRoles.join(', ')}`,
            });
        }
        next();
    };
}
