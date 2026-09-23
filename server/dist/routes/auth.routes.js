import { Router } from 'express';
import { AuthService } from '../services/auth.service.js';
import { authenticateJWT, requireAuth } from '../middleware/auth.middleware.js';
export const authRouter = Router();
authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await AuthService.authenticate(email, password);
    if (!result) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    return res.json(result);
});
authRouter.get('/me', authenticateJWT, requireAuth, (req, res) => {
    return res.json({ user: req.user });
});
authRouter.get('/users', async (_req, res) => {
    const users = await AuthService.listUsers();
    return res.json(users);
});
