import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';
import { OrganizationService } from './organization.service.js';
import { normalizeRole, getRolePermissions } from '../middleware/authorization.js';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  stationId?: string | null;
  organizationId?: string | null;
  assignedPersonnelId?: string | null;
  assignedExpeditionId?: string | null;
  permissions?: string[];
}

export class AuthService {
  public static generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '7d' });
  }

  public static verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  public static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static async createUser(data: {
    email: string;
    name: string;
    role: string;
    password?: string;
    organizationId?: string | null;
    stationId?: string | null;
    assignedExpeditionId?: string | null;
    assignedPersonnelId?: string | null;
  }) {
    const role = normalizeRole(data.role);
    const passwordHash = await this.hashPassword(data.password || 'password123');
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        role,
        passwordHash,
        organizationId: data.organizationId || null,
        stationId: data.stationId || null,
        assignedExpeditionId: data.assignedExpeditionId || null,
        assignedPersonnelId: data.assignedPersonnelId || null,
      },
      include: { organization: true },
    });
  }

  public static async login(email: string, password: string) {
    const res = await this.authenticate(email, password);
    if (!res) throw new Error('Invalid credentials');
    return res;
  }

  public static async seedDefaultUsers(): Promise<void> {
    const defaultOrg = await OrganizationService.getOrCreateDefaultOrganization();

    // Find default expedition and stations if available
    const rootExpedition = await prisma.expedition.findFirst();
    const maitriStation = await prisma.station.findFirst({ where: { code: 'MAITRI' } });
    const bharatiStation = await prisma.station.findFirst({ where: { code: 'BHARATI' } });
    const rahulPersonnel = await prisma.personnel.findFirst({ where: { name: { contains: 'Rahul Sharma' } } });
    const arjunPersonnel = await prisma.personnel.findFirst({ where: { name: { contains: 'Arjun Das' } } });

    const defaultUsers = [
      {
        email: 'admin@polarcommand.org',
        name: 'Samyak Trivedi',
        role: 'ADMIN',
        password: 'password123',
        stationId: null,
        assignedExpeditionId: rootExpedition?.id || null,
      },
      {
        email: 'maitri.manager@polarcommand.org',
        name: 'Dr. Suresh Sen',
        role: 'STATION_MANAGER',
        password: 'password123',
        stationId: maitriStation?.id || null,
        assignedExpeditionId: rootExpedition?.id || null,
      },
      {
        email: 'bharati.manager@polarcommand.org',
        name: 'Dr. Anita Singh',
        role: 'STATION_MANAGER',
        password: 'password123',
        stationId: bharatiStation?.id || null,
        assignedExpeditionId: rootExpedition?.id || null,
      },
      {
        email: 'leader@polarcommand.org',
        name: 'Dr. Rajesh Nair',
        role: 'EXPEDITION_LEADER',
        password: 'password123',
        stationId: bharatiStation?.id || null,
        assignedExpeditionId: rootExpedition?.id || null,
      },
      {
        email: 'commander@polarcommand.org',
        name: 'Dr. Rajesh Nair',
        role: 'EXPEDITION_LEADER',
        password: 'password123',
        stationId: bharatiStation?.id || null,
        assignedExpeditionId: rootExpedition?.id || null,
      },
      {
        email: 'member@polarcommand.org',
        name: 'Rahul Sharma',
        role: 'TEAM_MEMBER',
        password: 'password123',
        stationId: bharatiStation?.id || null,
        assignedExpeditionId: rootExpedition?.id || null,
        assignedPersonnelId: rahulPersonnel?.id || null,
      },
      {
        email: 'field1@polarcommand.org',
        name: 'Field Member Alpha',
        role: 'TEAM_MEMBER',
        password: 'password123',
        stationId: bharatiStation?.id || null,
        assignedExpeditionId: rootExpedition?.id || null,
        assignedPersonnelId: null,
      },
      {
        email: 'field2@polarcommand.org',
        name: 'Arjun Das',
        role: 'TEAM_MEMBER',
        password: 'password123',
        stationId: maitriStation?.id || null,
        assignedExpeditionId: rootExpedition?.id || null,
        assignedPersonnelId: arjunPersonnel?.id || null,
      },
    ];

    for (const u of defaultUsers) {
      const existing = await prisma.user.findUnique({ where: { email: u.email.toLowerCase() } });
      const passwordHash = await this.hashPassword(u.password);
      if (!existing) {
        await prisma.user.create({
          data: {
            email: u.email.toLowerCase(),
            name: u.name,
            role: normalizeRole(u.role),
            organizationId: defaultOrg.id,
            stationId: u.stationId,
            assignedExpeditionId: u.assignedExpeditionId,
            assignedPersonnelId: u.assignedPersonnelId,
            passwordHash,
          },
        });
      } else {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: u.name,
            role: normalizeRole(u.role),
            organizationId: defaultOrg.id,
            stationId: u.stationId || existing.stationId,
            assignedExpeditionId: u.assignedExpeditionId || existing.assignedExpeditionId,
            assignedPersonnelId: u.assignedPersonnelId ?? null,
            passwordHash,
          },
        });
      }
    }
    console.log('[AUTH] Seeded default operational users with RBAC roles and organization scoping.');
  }

  public static async authenticate(email: string, password: string): Promise<{ token: string; user: any } | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organization: true,
        assignedPersonnel: true,
        assignedExpedition: {
          select: { id: true, code: true, title: true, status: true },
        },
      },
    });
    if (!user) return null;

    const isValid = await this.comparePassword(password, user.passwordHash);
    if (!isValid) return null;

    const normalized = normalizeRole(user.role);
    const permissions = getRolePermissions(normalized);

    // If expedition is not set on user, fallback to first active expedition
    let assignedExpId = user.assignedExpeditionId;
    if (!assignedExpId && user.assignedPersonnel?.expeditionId) {
      assignedExpId = user.assignedPersonnel.expeditionId;
    }
    if (!assignedExpId) {
      const defaultExp = await prisma.expedition.findFirst();
      assignedExpId = defaultExp?.id || null;
    }

    // If stationId is not set on user, fallback to personnel station if available
    let stationId = user.stationId;
    if (!stationId && user.assignedPersonnel?.assignedStationId) {
      stationId = user.assignedPersonnel.assignedStationId;
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: normalized,
      stationId,
      organizationId: user.organizationId,
      assignedPersonnelId: user.assignedPersonnelId,
      assignedExpeditionId: assignedExpId,
      permissions,
    };

    const token = this.generateToken(payload);
    const { passwordHash: _, ...safeUser } = user;

    return {
      token,
      user: {
        ...safeUser,
        role: normalized,
        permissions,
        stationId,
        assignedExpeditionId: assignedExpId,
      },
    };
  }

  public static async listUsers(organizationId?: string): Promise<any[]> {
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        stationId: true,
        organizationId: true,
        assignedPersonnelId: true,
        assignedExpeditionId: true,
        organization: { select: { id: true, name: true, code: true } },
        assignedPersonnel: { select: { id: true, name: true, role: true, currentLocation: true } },
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
    return users.map((u) => ({
      ...u,
      role: normalizeRole(u.role),
      permissions: getRolePermissions(normalizeRole(u.role)),
    }));
  }
}
