import { Router, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { authenticateJWT, requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { normalizeRole } from '../middleware/authorization.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const {
    email,
    password,
    identifier,
    adminId,
    stationManagerId,
    expeditionLeaderId,
    memberId,
    logisticsCommanderId,
    role,
    stationName,
    expeditionId,
    expeditionSecretKey,
  } = req.body;

  const resolvedIdentifier =
    identifier || adminId || stationManagerId || expeditionLeaderId || memberId || logisticsCommanderId || email;

  const normalizedRole = role ? normalizeRole(role) : undefined;
  const requiresExpeditionCredentials = normalizedRole === 'EXPEDITION_LEADER' || normalizedRole === 'TEAM_MEMBER';
  if (!resolvedIdentifier || (!password && normalizedRole !== 'TEAM_MEMBER')) {
    return res.status(400).json({ error: 'Identification and password are required' });
  }
  if (requiresExpeditionCredentials && (!expeditionId || !expeditionSecretKey || String(expeditionSecretKey).trim().length < 8)) {
    return res.status(400).json({ error: 'Expedition ID and an Expedition Secret Key of at least 8 characters are required' });
  }

  const result = await AuthService.authenticate(
    resolvedIdentifier,
    password,
    role,
    stationName,
    expeditionId,
    expeditionSecretKey
  );
  if (!result) {
    return res.status(401).json({ error: 'Invalid mission credentials or password' });
  }

  return res.json(result);
});

authRouter.get('/stations', async (_req, res) => {
  try {
    const stations = await AuthService.listPublicStations();
    return res.json(stations);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list stations' });
  }
});

authRouter.get('/me', authenticateJWT, requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

authRouter.get('/users', async (_req, res) => {
  const users = await AuthService.listUsers();
  return res.json(users);
});
