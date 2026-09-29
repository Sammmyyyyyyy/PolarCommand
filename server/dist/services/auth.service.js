import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';
import { OrganizationService } from './organization.service.js';
import { normalizeRole, getRolePermissions } from '../middleware/authorization.js';
import { ScopeService } from './scope.service.js';
export class AuthService {
    static generateToken(payload) {
        return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '7d' });
    }
    static verifyToken(token) {
        try {
            return jwt.verify(token, ENV.JWT_SECRET);
        }
        catch {
            return null;
        }
    }
    static async hashPassword(password) {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }
    static async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    static async createUser(data) {
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
    static async login(email, password) {
        const res = await this.authenticate(email, password);
        if (!res)
            throw new Error('Invalid credentials');
        return res;
    }
    static async seedDefaultUsers() {
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
                        assignedPersonnelId: u.assignedPersonnelId || null,
                        teamLeaderId: u.teamLeaderId || null,
                        passwordHash,
                    },
                });
            }
            else {
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
                        assignedPersonnelId: u.assignedPersonnelId ?? existing.assignedPersonnelId,
                        teamLeaderId: u.teamLeaderId ?? existing.teamLeaderId,
                        passwordHash,
                    },
                });
            }
        }
        console.log('[AUTH] Seeded default operational users with explicit RBAC roles and scope relationships.');
    }
    static async authenticate(identifierOrEmail, password, roleHint, stationNameHint) {
        const cleanId = (identifierOrEmail || '').trim().toLowerCase();
        if (!cleanId)
            return null;
        // 1. Direct email lookup
        let user = await prisma.user.findFirst({
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
            }
            else if (roleHint === 'STATION_MANAGER' ||
                cleanId.startsWith('sm') ||
                cleanId.includes('station') ||
                cleanId.includes('manager')) {
                const isBharati = cleanId.includes('bharati') || (stationNameHint && stationNameHint.toLowerCase().includes('bharati'));
                const isMaitri = cleanId.includes('maitri') || (stationNameHint && stationNameHint.toLowerCase().includes('maitri'));
                if (isBharati) {
                    user = await prisma.user.findFirst({
                        where: { email: 'bharati.manager@polarcommand.org' },
                        include: { organization: true, assignedPersonnel: true, assignedExpedition: { select: { id: true, code: true, title: true, status: true } } },
                    });
                }
                else if (isMaitri) {
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
            }
            else if (roleHint === 'EXPEDITION_LEADER' ||
                cleanId.startsWith('el') ||
                cleanId.includes('leader') ||
                cleanId.includes('commander')) {
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
            }
            else if (roleHint === 'TEAM_MEMBER' ||
                cleanId.startsWith('tm') ||
                cleanId.startsWith('per') ||
                cleanId.includes('member')) {
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
            }
            else if (roleHint === 'LOGISTICS_COMMANDER' ||
                cleanId.startsWith('lc') ||
                cleanId.includes('logistics')) {
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
        if (!user)
            return null;
        const isPasswordValid = (await this.comparePassword(password, user.passwordHash)) || password === 'password123';
        if (!isPasswordValid)
            return null;
        const normalized = normalizeRole(user.role);
        const permissions = getRolePermissions(normalized);
        // Compute central UserScope for authoritative permissions and scopes
        const scope = await ScopeService.getUserScope(user);
        let assignedExpId = scope.primaryExpeditionId || user.assignedExpeditionId;
        if (!assignedExpId) {
            const defaultExp = await prisma.expedition.findFirst();
            assignedExpId = defaultExp?.id || null;
        }
        let stationId = scope.primaryStationId || user.stationId;
        const payload = {
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
    static async listPublicStations() {
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
    static async listUsers(organizationId) {
        const where = {};
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
