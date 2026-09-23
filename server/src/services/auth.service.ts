import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  stationId?: string | null;
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

  public static async seedDefaultUsers(): Promise<void> {
    const count = await prisma.user.count();
    if (count > 0) return;

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
        email: 'viewer@polarcommand.org',
        name: 'Science Telemetry Observer',
        role: 'VIEWER',
        password: 'password123',
      },
    ];

    for (const u of defaultUsers) {
      const passwordHash = await this.hashPassword(u.password);
      await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash,
        },
      });
    }
    console.log('[AUTH] Seeded default operational users with RBAC roles.');
  }

  public static async authenticate(email: string, password: string): Promise<{ token: string; user: any } | null> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return null;

    const isValid = await this.comparePassword(password, user.passwordHash);
    if (!isValid) return null;

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      stationId: user.stationId,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser };
  }

  public static async listUsers(): Promise<any[]> {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, stationId: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    return users;
  }
}
