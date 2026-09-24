import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';
import { OrganizationService } from './organization.service.js';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  stationId?: string | null;
  organizationId?: string | null;
  assignedPersonnelId?: string | null;
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
  }) {
    const passwordHash = await this.hashPassword(data.password || 'password123');
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        role: data.role,
        passwordHash,
        organizationId: data.organizationId || null,
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

    const defaultUsers = [
      {
        email: 'commander@polarcommand.org',
        name: 'Dr. Rajesh Nair',
        role: 'COMMANDER',
        password: 'password123',
      },
      {
        email: 'admin@polarcommand.org',
        name: 'Mission Control Admin',
        role: 'ADMIN',
        password: 'password123',
      },
      {
        email: 'logistics@polarcommand.org',
        name: 'Vikram Sethi',
        role: 'LOGISTICS_OFFICER',
        password: 'password123',
      },
      {
        email: 'bharati.manager@polarcommand.org',
        name: 'Dr. Anita Singh',
        role: 'STATION_MANAGER',
        password: 'password123',
      },
      {
        email: 'field1@polarcommand.org',
        name: 'Dr. Maya Lin',
        role: 'FIELD_MEMBER',
        password: 'password123',
      },
      {
        email: 'field2@polarcommand.org',
        name: 'Tenzing Norgay Jr.',
        role: 'FIELD_MEMBER',
        password: 'password123',
      },
      {
        email: 'viewer@polarcommand.org',
        name: 'Science Telemetry Observer',
        role: 'VIEWER',
        password: 'password123',
      },
    ];

    for (const u of defaultUsers) {
      const existing = await prisma.user.findUnique({ where: { email: u.email.toLowerCase() } });
      if (!existing) {
        const passwordHash = await this.hashPassword(u.password);
        await prisma.user.create({
          data: {
            email: u.email.toLowerCase(),
            name: u.name,
            role: u.role,
            organizationId: defaultOrg.id,
            passwordHash,
          },
        });
      } else if (!existing.organizationId) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { organizationId: defaultOrg.id },
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
      },
    });
    if (!user) return null;

    const isValid = await this.comparePassword(password, user.passwordHash);
    if (!isValid) return null;

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      stationId: user.stationId,
      organizationId: user.organizationId,
      assignedPersonnelId: user.assignedPersonnelId,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser };
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
        organization: { select: { id: true, name: true, code: true } },
        assignedPersonnel: { select: { id: true, name: true, role: true, currentLocation: true } },
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
    return users;
  }
}
