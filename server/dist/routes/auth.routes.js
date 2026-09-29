import { Router } from 'express';
import { AuthService } from '../services/auth.service.js';
import { authenticateJWT, requireAuth } from '../middleware/auth.middleware.js';
export const authRouter = Router();
authRouter.post('/login', async (req, res) => {
    const { email, password, identifier, adminId, stationManagerId, expeditionLeaderId, memberId, logisticsCommanderId, role, stationName, } = req.body;
    const resolvedIdentifier = identifier || adminId || stationManagerId || expeditionLeaderId || memberId || logisticsCommanderId || email;
    if (!resolvedIdentifier || !password) {
        return res.status(400).json({ error: 'Identification and password are required' });
    }
    const result = await AuthService.authenticate(resolvedIdentifier, password, role, stationName);
    if (!result) {
        return res.status(401).json({ error: 'Invalid mission credentials or password' });
    }
    return res.json(result);
});
authRouter.get('/stations', async (_req, res) => {
    try {
        const stations = await AuthService.listPublicStations();
        return res.json(stations);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to list stations' });
    }
});
authRouter.get('/me', authenticateJWT, requireAuth, (req, res) => {
    return res.json({ user: req.user });
});
authRouter.get('/users', async (_req, res) => {
    const users = await AuthService.listUsers();
    return res.json(users);
});
