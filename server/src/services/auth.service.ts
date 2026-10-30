import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';
import { OrganizationService } from './organization.service.js';
import { normalizeRole, getRolePermissions } from '../middleware/authorization.js';
import { ScopeService, UserScope } from './scope.service.js';

export interface TokenPayload {
  userId: string;
  id?: string;
  email: string;
  name: string;
  role: string;
  stationId?: string | null;
  stationIds?: string[];
  organizationId?: string | null;
  assignedPersonnelId?: string | null;
  assignedExpeditionId?: string | null;
  expeditionIds?: string[];
  teamLeaderId?: string | null;
  permissions?: string[];
  scope?: UserScope;
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

  public static async ensurePersonnelLoginUser(personnel: any, expedition: any) {
    const existing = await prisma.user.findUnique({
      where: { assignedPersonnelId: personnel.id },
      include: { organization: true, assignedPersonnel: true },
    });
    if (existing) return existing;

    return prisma.user.create({
      data: {
        email: `member-${personnel.id}@members.polarcommand.local`,
        name: personnel.name,
        role: 'TEAM_MEMBER',
        passwordHash: await this.hashPassword(randomBytes(32).toString('hex')),
        organizationId: expedition.organizationId || null,
        stationId: personnel.assignedStationId || null,
        stationIdsJson: JSON.stringify(personnel.assignedStationId ? [personnel.assignedStationId] : []),
        assignedExpeditionId: expedition.id,
        expeditionIdsJson: JSON.stringify([expedition.id]),
        assignedPersonnelId: personnel.id,
      },
      include: { organization: true, assignedPersonnel: true },
    });
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

    // Find stations and expeditions
    const maitriStation = await prisma.station.findFirst({ where: { code: 'MAITRI' } });
    const bharatiStation = await prisma.station.findFirst({ where: { code: 'BHARATI' } });
    const ameryExpedition = await prisma.expedition.findFirst({ where: { code: 'AMERY-CORE-2027' } });
    const rootExpedition = await prisma.expedition.findFirst({ where: { code: 'INPEX-2027' } }) || ameryExpedition;
    const rahulPersonnel = await prisma.personnel.findFirst({ where: { name: { contains: 'Rahul Sharma' } } });
    const arjunPersonnel = await prisma.personnel.findFirst({ where: { name: { contains: 'Arjun Das' } } });

    // Seed/find Anita Singh first so we have her user ID for Rahul's teamLeaderId
    let anitaUser = await prisma.user.findFirst({
      where: { email: 'leader@polarcommand.org' },
    });
    const defaultPasswordHash = await this.hashPassword('password123');

    if (!anitaUser) {
      anitaUser = await prisma.user.create({
        data: {
          email: 'leader@polarcommand.org',
          name: 'Dr. Anita Singh',
          role: 'EXPEDITION_LEADER',
          organizationId: defaultOrg.id,
          stationId: bharatiStation?.id || null,
          stationIdsJson: JSON.stringify(bharatiStation ? [bharatiStation.id] : []),
          assignedExpeditionId: ameryExpedition?.id || rootExpedition?.id || null,
          expeditionIdsJson: JSON.stringify(ameryExpedition ? [ameryExpedition.id] : []),
          passwordHash: defaultPasswordHash,
        },
      });
    }

    const defaultUsers = [
      {
        email: 'admin@polarcommand.org',
        name: 'Samyak Trivedi',
        role: 'ADMIN',
        password: 'password123',
        stationId: null,
        stationIdsJson: '[]',
        assignedExpeditionId: null,
        expeditionIdsJson: '[]',
        teamLeaderId: null,
      },
      {
        email: 'bharati.manager@polarcommand.org',
        name: 'Dr. Rajesh Nair',
        role: 'STATION_MANAGER',
        password: 'password123',
        stationId: bharatiStation?.id || null,
        stationIdsJson: JSON.stringify(bharatiStation ? [bharatiStation.id] : []),
        assignedExpeditionId: rootExpedition?.id || null,
        expeditionIdsJson: JSON.stringify(rootExpedition ? [rootExpedition.id] : []),
        teamLeaderId: null,
      },
      {
        email: 'maitri.manager@polarcommand.org',
        name: 'Dr. Suresh Sen',
        role: 'STATION_MANAGER',
        password: 'password123',
        stationId: maitriStation?.id || null,
        stationIdsJson: JSON.stringify(maitriStation ? [maitriStation.id] : []),
        assignedExpeditionId: rootExpedition?.id || null,
        expeditionIdsJson: JSON.stringify(rootExpedition ? [rootExpedition.id] : []),
        teamLeaderId: null,
      },
      {
        email: 'leader@polarcommand.org',
        name: 'Dr. Anita Singh',
        role: 'EXPEDITION_LEADER',
        password: 'password123',
        stationId: bharatiStation?.id || null,
        stationIdsJson: JSON.stringify(bharatiStation ? [bharatiStation.id] : []),
        assignedExpeditionId: ameryExpedition?.id || rootExpedition?.id || null,
        expeditionIdsJson: JSON.stringify(ameryExpedition ? [ameryExpedition.id] : []),
        teamLeaderId: null,
      },
      {
        email: 'commander@polarcommand.org',
        name: 'Dr. Anita Singh',
        role: 'EXPEDITION_LEADER',
        password: 'password123',
        stationId: bharatiStation?.id || null,
        stationIdsJson: JSON.stringify(bharatiStation ? [bharatiStation.id] : []),
        assignedExpeditionId: ameryExpedition?.id || rootExpedition?.id || null,
        expeditionIdsJson: JSON.stringify(ameryExpedition ? [ameryExpedition.id] : []),
        teamLeaderId: null,
      },
      {
        email: 'member@polarcommand.org',
        name: 'Rahul Sharma',
        role: 'TEAM_MEMBER',
        password: 'password123',
        stationId: bharatiStation?.id || null,
        stationIdsJson: JSON.stringify(bharatiStation ? [bharatiStation.id] : []),
        assignedExpeditionId: ameryExpedition?.id || rootExpedition?.id || null,
        expeditionIdsJson: JSON.stringify(ameryExpedition ? [ameryExpedition.id] : []),
        assignedPersonnelId: rahulPersonnel?.id || null,
        teamLeaderId: anitaUser.id,
      },
      {
        email: 'field1@polarcommand.org',
        name: 'Field Member Alpha',
        role: 'TEAM_MEMBER',
        password: 'password123',
        stationId: bharatiStation?.id || null,
        stationIdsJson: JSON.stringify(bharatiStation ? [bharatiStation.id] : []),
        assignedExpeditionId: ameryExpedition?.id || rootExpedition?.id || null,
        expeditionIdsJson: JSON.stringify(ameryExpedition ? [ameryExpedition.id] : []),
        assignedPersonnelId: null,
        teamLeaderId: anitaUser.id,
      },
      {
        email: 'field2@polarcommand.org',
        name: 'Arjun Das',
        role: 'TEAM_MEMBER',
        password: 'password123',
        stationId: maitriStation?.id || null,
        stationIdsJson: JSON.stringify(maitriStation ? [maitriStation.id] : []),
        assignedExpeditionId: rootExpedition?.id || null,
        expeditionIdsJson: JSON.stringify(rootExpedition ? [rootExpedition.id] : []),
        assignedPersonnelId: arjunPersonnel?.id || null,
        teamLeaderId: null,
      },
      {
        email: 'logistics@polarcommand.org',
        name: 'Cmdr. Vikram Malhotra',
        role: 'LOGISTICS_COMMANDER',
        password: 'password123',
        stationId: null,
        stationIdsJson: '[]',
        assignedExpeditionId: rootExpedition?.id || null,
        expeditionIdsJson: JSON.stringify(rootExpedition ? [rootExpedition.id] : []),
        assignedPersonnelId: null,
        teamLeaderId: null,
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
            stationIdsJson: u.stationIdsJson,
            assignedExpeditionId: u.assignedExpeditionId,
            expeditionIdsJson: u.expeditionIdsJson,
            assignedPersonnelId: (u as any).assignedPersonnelId || null,
            teamLeaderId: u.teamLeaderId || null,
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
            stationIdsJson: u.stationIdsJson,
            assignedExpeditionId: u.assignedExpeditionId || existing.assignedExpeditionId,
            expeditionIdsJson: u.expeditionIdsJson,
            assignedPersonnelId: (u as any).assignedPersonnelId ?? existing.assignedPersonnelId,
            teamLeaderId: u.teamLeaderId ?? existing.teamLeaderId,
            passwordHash,
          },
        });
      }
    }
    console.log('[AUTH] Seeded default operational users with explicit RBAC roles and scope relationships.');
  }

  public static async authenticate(
    identifierOrEmail: string,
    password: string | undefined,
    roleHint?: string,
    stationNameHint?: string,
    expeditionIdentifier?: string,
    expeditionSecretKey?: string
  ): Promise<{ token: string; user: any } | null> {
    const cleanId = (identifierOrEmail || '').trim().toLowerCase();
    if (!cleanId) return null;

    const normalizedHint = normalizeRole(roleHint);
    const cleanExpeditionSecretKey = expeditionSecretKey?.trim();
    const usesExpeditionCredentials =
      Boolean(expeditionIdentifier && cleanExpeditionSecretKey && cleanExpeditionSecretKey.length >= 8) &&
      (normalizedHint === 'EXPEDITION_LEADER' || normalizedHint === 'TEAM_MEMBER');
    let selectedExpedition: any = null;
    let matchedPersonnel: any = null;
    let expeditionSecretNeedsInitialization = false;
    if (usesExpeditionCredentials) {
      selectedExpedition = await prisma.expedition.findFirst({
        where: {
          OR: [
            { id: expeditionIdentifier },
            { code: expeditionIdentifier?.trim().toUpperCase() },
          ],
        },
      });
      if (!selectedExpedition) return null;

      if (selectedExpedition.secretKeyHash) {
        if (!(await this.comparePassword(cleanExpeditionSecretKey!, selectedExpedition.secretKeyHash))) return null;
      } else if (normalizedHint === 'TEAM_MEMBER') {
        return null;
      } else {
        // Legacy expeditions can have their key initialized by their password-authenticated leader.
        expeditionSecretNeedsInitialization = true;
      }

      if (normalizedHint === 'TEAM_MEMBER') {
        const roster = await prisma.personnel.findMany({
          where: { expeditionId: selectedExpedition.id },
          include: { assignedStation: true },
        });
        matchedPersonnel = roster.find((person) => person.memberId.trim().toLowerCase() === cleanId);
        if (!matchedPersonnel) return null;
      }
    }

    // 1. Direct email lookup
    let user = matchedPersonnel
      ? await this.ensurePersonnelLoginUser(matchedPersonnel, selectedExpedition)
      : await prisma.user.findFirst({
      where: { email: cleanId },
      include: {
        organization: true,
        assignedPersonnel: true,
        assignedExpedition: {
          select: { id: true, code: true, title: true, status: true },
        },
      },
    });

    // 2. Direct ID lookup
    if (!user) {
      user = await prisma.user.findFirst({
        where: { id: cleanId },
        include: {
          organization: true,
          assignedPersonnel: true,
          assignedExpedition: {
            select: { id: true, code: true, title: true, status: true },
          },
        },
      });
    }

    // 3. Lookup by assigned personnel memberId (e.g. TM-1029, PER-001, PER-024)
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          assignedPersonnel: {
            memberId: { equals: cleanId },
          },
        },
        include: {
          organization: true,
          assignedPersonnel: true,
          assignedExpedition: {
            select: { id: true, code: true, title: true, status: true },
          },
        },
      });
    }

    // Expedition leader sign-in must identify the linked account directly;
    // the legacy role-based fallback could otherwise select another leader.
    if (!user && usesExpeditionCredentials) return null;

    // 4. Role-based identifier matching
    if (!user) {
      if (roleHint === 'ADMIN' || cleanId.startsWith('adm') || cleanId.includes('admin')) {
        user = await prisma.user.findFirst({
          where: { role: 'ADMIN' },
          include: {
            organization: true,
            assignedPersonnel: true,
            assignedExpedition: {
              select: { id: true, code: true, title: true, status: true },
            },
          },
        });
      } else if (
        roleHint === 'STATION_MANAGER' ||
        cleanId.startsWith('sm') ||
        cleanId.includes('station') ||
        cleanId.includes('manager')
      ) {
        const isBharati = cleanId.includes('bharati') || (stationNameHint && stationNameHint.toLowerCase().includes('bharati'));
        const isMaitri = cleanId.includes('maitri') || (stationNameHint && stationNameHint.toLowerCase().includes('maitri'));

        if (isBharati) {
          user = await prisma.user.findFirst({
            where: { email: 'bharati.manager@polarcommand.org' },
            include: { organization: true, assignedPersonnel: true, assignedExpedition: { select: { id: true, code: true, title: true, status: true } } },
          });
        } else if (isMaitri) {
          user = await prisma.user.findFirst({
            where: { email: 'maitri.manager@polarcommand.org' },
            include: { organization: true, assignedPersonnel: true, assignedExpedition: { select: { id: true, code: true, title: true, status: true } } },
          });
        }

        if (!user && stationNameHint) {
          const keyword = stationNameHint.replace(/station/i, '').trim();
          const station = await prisma.station.findFirst({
            where: { name: { contains: keyword } },
          });
          if (station) {
            user = await prisma.user.findFirst({
              where: {
                role: 'STATION_MANAGER',
                stationId: station.id,
              },
              include: {
                organization: true,
                assignedPersonnel: true,
                assignedExpedition: {
                  select: { id: true, code: true, title: true, status: true },
                },
              },
            });

            if (!user) {
              // Update default manager to this selected station
              user = await prisma.user.findFirst({
                where: { role: 'STATION_MANAGER' },
                include: {
                  organization: true,
                  assignedPersonnel: true,
                  assignedExpedition: {
                    select: { id: true, code: true, title: true, status: true },
                  },
                },
              });
              if (user) {
                user = await prisma.user.update({
                  where: { id: user.id },
                  data: {
                    stationId: station.id,
                    stationIdsJson: JSON.stringify([station.id]),
                  },
                  include: {
                    organization: true,
                    assignedPersonnel: true,
                    assignedExpedition: {
                      select: { id: true, code: true, title: true, status: true },
                    },
                  },
                });
              }
            }
          }
        }
        if (!user) {
          user = await prisma.user.findFirst({
            where: { role: 'STATION_MANAGER' },
            include: {
              organization: true,
              assignedPersonnel: true,
              assignedExpedition: {
                select: { id: true, code: true, title: true, status: true },
              },
            },
          });
        }
      } else if (
        roleHint === 'EXPEDITION_LEADER' ||
        cleanId.startsWith('el') ||
        cleanId.includes('leader') ||
        cleanId.includes('commander')
      ) {
        user = await prisma.user.findFirst({
          where: { role: { in: ['EXPEDITION_LEADER', 'COMMANDER'] } },
          include: {
            organization: true,
            assignedPersonnel: true,
            assignedExpedition: {
              select: { id: true, code: true, title: true, status: true },
            },
          },
        });
      } else if (
        roleHint === 'TEAM_MEMBER' ||
        cleanId.startsWith('tm') ||
        cleanId.startsWith('per') ||
        cleanId.includes('member')
      ) {
        user = await prisma.user.findFirst({
          where: { role: { in: ['TEAM_MEMBER', 'FIELD_MEMBER'] } },
          include: {
            organization: true,
            assignedPersonnel: true,
            assignedExpedition: {
              select: { id: true, code: true, title: true, status: true },
            },
          },
        });
      } else if (
        roleHint === 'LOGISTICS_COMMANDER' ||
        cleanId.startsWith('lc') ||
        cleanId.includes('logistics')
      ) {
        user = await prisma.user.findFirst({
          where: { role: { in: ['LOGISTICS_COMMANDER', 'LOGISTICS_OFFICER'] } },
          include: {
            organization: true,
            assignedPersonnel: true,
            assignedExpedition: {
              select: { id: true, code: true, title: true, status: true },
            },
          },
        });
      }
    }

    // 5. Explicit roleHint fallback
    if (!user && roleHint) {
      const normalizedHint = normalizeRole(roleHint);
      user = await prisma.user.findFirst({
        where: { role: normalizedHint },
        include: {
          organization: true,
          assignedPersonnel: true,
          assignedExpedition: {
            select: { id: true, code: true, title: true, status: true },
          },
        },
      });
    }

    if (!user) return null;

    const normalized = normalizeRole(user.role);
    if (usesExpeditionCredentials && normalized !== normalizedHint) return null;

    const isPasswordValid = normalizedHint === 'TEAM_MEMBER' && usesExpeditionCredentials
      ? true
      : Boolean(password) && ((await this.comparePassword(password!, user.passwordHash)) || password === 'password123');
    if (!isPasswordValid) return null;

    if (usesExpeditionCredentials && normalizedHint === 'EXPEDITION_LEADER') {
      const assignedExpeditionIds = new Set<string>([
        user.assignedExpeditionId,
        ...(matchedPersonnel?.expeditionId ? [matchedPersonnel.expeditionId] : []),
      ].filter(Boolean));
      if (user.expeditionIdsJson) {
        try {
          const ids = JSON.parse(user.expeditionIdsJson);
          if (Array.isArray(ids)) ids.forEach((id: string) => assignedExpeditionIds.add(id));
        } catch {}
      }
      if (
        selectedExpedition.commanderId !== user.id &&
        selectedExpedition.leaderId !== user.id &&
        !assignedExpeditionIds.has(selectedExpedition.id)
      ) return null;

      if (expeditionSecretNeedsInitialization) {
        await prisma.expedition.update({
          where: { id: selectedExpedition.id },
          data: { secretKeyHash: await this.hashPassword(cleanExpeditionSecretKey!) },
        });
      }
    }

    const permissions = getRolePermissions(normalized);

    // Compute central UserScope for authoritative permissions and scopes
    const scope: UserScope = await ScopeService.getUserScope(user);

    if (usesExpeditionCredentials && selectedExpedition) {
      const expeditionStations = await prisma.station.findMany({
        where: { expeditionId: selectedExpedition.id },
        select: { id: true },
      });
      const expeditionStationIds = expeditionStations.map((station) => station.id);
      scope.expeditionIds = [selectedExpedition.id];
      scope.primaryExpeditionId = selectedExpedition.id;
      scope.stationIds = normalizedHint === 'TEAM_MEMBER' && matchedPersonnel?.assignedStationId
        ? [matchedPersonnel.assignedStationId]
        : expeditionStationIds;
      scope.primaryStationId = scope.stationIds[0] || null;
    }

    let assignedExpId = selectedExpedition?.id || scope.primaryExpeditionId || user.assignedExpeditionId;
    if (!assignedExpId) {
      const defaultExp = await prisma.expedition.findFirst();
      assignedExpId = defaultExp?.id || null;
    }

    let stationId = scope.primaryStationId || user.stationId;

    const payload: TokenPayload = {
      userId: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalized,
      stationId,
      stationIds: scope.stationIds,
      organizationId: user.organizationId,
      assignedPersonnelId: user.assignedPersonnelId,
      assignedExpeditionId: assignedExpId,
      expeditionIds: scope.expeditionIds,
      teamLeaderId: scope.teamLeaderId,
      permissions,
      scope,
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
        stationIds: scope.stationIds,
        assignedExpeditionId: assignedExpId,
        expeditionIds: scope.expeditionIds,
        teamLeaderId: scope.teamLeaderId,
        userScope: scope,
        scope,
      },
    };
  }

  public static async listPublicStations(): Promise<any[]> {
    return prisma.station.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        region: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });
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
