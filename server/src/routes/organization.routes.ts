import { Router, Response } from 'express';
import { OrganizationService } from '../services/organization.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const organizationRouter = Router();

const p = (val: string | string[] | undefined): string => Array.isArray(val) ? val[0] : (val || '');

// List all organizations
organizationRouter.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await OrganizationService.listOrganizations();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get organization details with users and expeditions
organizationRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const org = await OrganizationService.getOrganization(p(req.params.id));
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get organization executive overview & resource pools
organizationRouter.get('/:id/overview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const overview = await OrganizationService.getOrganizationOverview(p(req.params.id));
    res.json(overview);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create organization (Admin only)
organizationRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const org = await OrganizationService.createOrganization(req.body, req.user);
    res.status(201).json(org);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
