import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';

export class CheckInService {
  public static async recordCheckIn(
    expeditionId: string,
    personnelId: string,
    data: {
      status: string; // ACTIVE, RESTING, IN_TRANSIT, ON_TASK, MEDICAL, MISSING, EMERGENCY
      location?: string;
      stationName?: string;
      latitude?: number;
      longitude?: number;
      notes?: string;
    },
    user?: any
  ) {
    const person = await prisma.personnel.findUnique({
      where: { id: personnelId },
    });
    if (!person) throw new Error(`Personnel member ${personnelId} not found`);

    const now = new Date();
    // Next check-in typically expected within 12 hours during expedition
    const nextCheckIn = new Date(now.getTime() + 12 * 3600 * 1000);

    const log = await prisma.checkInLog.create({
      data: {
        expeditionId,
        personnelId,
        userId: user?.id || null,
        status: data.status,
        stationName: data.stationName || person.currentLocation,
        location: data.location || data.stationName || person.currentLocation,
        latitude: data.latitude ?? person.latitude ?? undefined,
        longitude: data.longitude ?? person.longitude ?? undefined,
        notes: data.notes || null,
        timestamp: now,
      },
    });

    const isEmergency = data.status === 'EMERGENCY' || data.status === 'MISSING';

    await prisma.personnel.update({
      where: { id: personnelId },
      data: {
        checkInStatus: data.status,
        status: data.status === 'IN_TRANSIT' ? 'In Transit' : data.status === 'ON_TASK' ? 'Field Mission' : 'At Station',
        lastCheckIn: now,
        expectedNextCheckIn: nextCheckIn,
        isCheckInOverdue: false,
        checkInNotes: data.notes || null,
        currentLocation: data.location || data.stationName || person.currentLocation,
        latitude: data.latitude ?? person.latitude,
        longitude: data.longitude ?? person.longitude,
      },
    });

    await AuditService.record({
      expeditionId,
      userId: user?.id,
      userName: user?.name || person.name,
      userRole: user?.role || 'FIELD_MEMBER',
      action: 'PERSONNEL_CHECK_IN',
      entity: 'Personnel',
      entityId: personnelId,
      previousState: person.checkInStatus,
      newState: data.status,
      reason: `Field check-in recorded [Status: ${data.status}] at ${data.location || person.currentLocation}${data.notes ? `: "${data.notes}"` : ''}`,
    });

    if (isEmergency) {
      await prisma.alert.create({
        data: {
          expeditionId,
          severity: 'CRITICAL',
          title: `PERSONNEL DISTRESS: ${person.name} Status is ${data.status}`,
          source: 'Field Personnel Accountability Monitor',
          affectedEntity: person.name,
          reason: data.notes || `Reported ${data.status} condition during check-in from ${data.location || person.currentLocation}`,
          impact: 'Life-safety priority event. Immediate triage response dispatch indicated.',
          recommendedAction: 'Verify VHF/satellite signal and mobilize nearest emergency traverse team.',
          status: 'ACTIVE',
        },
      });
    }

    await RiskService.calculateAndRecordExpeditionRisk(expeditionId);
    await AlertService.evaluateAndSyncAlerts(expeditionId);

    return { log, nextCheckIn };
  }

  public static async evaluateOverdueCheckIns(expeditionId: string) {
    const now = new Date();
    const people = await prisma.personnel.findMany({
      where: { expeditionId },
    });

    const overdueMembers: any[] = [];

    for (const p of people) {
      const isOverdue = p.expectedNextCheckIn ? now > p.expectedNextCheckIn : false;
      if (isOverdue && !p.isCheckInOverdue) {
        await prisma.personnel.update({
          where: { id: p.id },
          data: { isCheckInOverdue: true },
        });

        // Trigger alert
        await prisma.alert.create({
          data: {
            expeditionId,
            severity: 'HIGH',
            title: `OVERDUE CHECK-IN: ${p.name} (${p.role})`,
            source: 'Personnel Accountability Tracker',
            affectedEntity: p.name,
            reason: `Field member has missed scheduled check-in window at ${p.currentLocation}.`,
            impact: 'Personnel accountability compromised in polar field sector.',
            recommendedAction: `Attempt radio contact on VHF Ch-16 or Iridium phone ${p.contactInfo || ''}.`,
            status: 'ACTIVE',
          },
        });

        overdueMembers.push(p);
      }
    }

    if (overdueMembers.length > 0) {
      await RiskService.calculateAndRecordExpeditionRisk(expeditionId);
      await AlertService.evaluateAndSyncAlerts(expeditionId);
    }

    return overdueMembers;
  }

  public static async getPersonnelAccountability(expeditionId: string) {
    // First trigger check-in evaluation
    await this.evaluateOverdueCheckIns(expeditionId);

    const personnel = await prisma.personnel.findMany({
      where: { expeditionId },
      include: {
        assignedStation: true,
        assignedUserLink: { select: { id: true, email: true } },
        checkInLogs: { orderBy: { timestamp: 'desc' }, take: 3 },
      },
      orderBy: { name: 'asc' },
    });

    const total = personnel.length;
    const active = personnel.filter((p) => p.checkInStatus === 'ACTIVE').length;
    const resting = personnel.filter((p) => p.checkInStatus === 'RESTING').length;
    const inTransit = personnel.filter((p) => p.checkInStatus === 'IN_TRANSIT').length;
    const onTask = personnel.filter((p) => p.checkInStatus === 'ON_TASK').length;
    const medical = personnel.filter((p) => p.checkInStatus === 'MEDICAL').length;
    const overdue = personnel.filter((p) => p.isCheckInOverdue).length;
    const emergency = personnel.filter((p) => p.checkInStatus === 'EMERGENCY' || p.checkInStatus === 'MISSING').length;

    return {
      summary: {
        total,
        active,
        resting,
        inTransit,
        onTask,
        medical,
        overdue,
        emergency,
        accountabilityRate: total > 0 ? Math.round(((total - overdue) / total) * 100) : 100,
      },
      personnel,
    };
  }
}
