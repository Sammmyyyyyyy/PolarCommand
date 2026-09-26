import { prisma } from '../config/database.js';
import { IncidentService } from './incident.service.js';
import { AlertService } from './alert.service.js';
import { AuditService } from './audit.service.js';

export interface LocationPingInput {
  personnelId: string;
  expeditionId: string;
  deviceId?: string;
  latitude: number;
  longitude: number;
  battery?: number;
  connectionStatus?: string;
  isSos?: boolean;
}

export class TrackingService {
  /**
   * Record a new tracking telemetry ping from a personnel tracker/GPS device
   */
  public static async recordLocationPing(input: LocationPingInput, user?: any) {
    const {
      personnelId,
      expeditionId,
      deviceId,
      latitude,
      longitude,
      battery = 100,
      connectionStatus = 'LIVE',
      isSos = false,
    } = input;

    // 1. Record ping entry
    const ping = await prisma.trackingPing.create({
      data: {
        personnelId,
        expeditionId,
        deviceId: deviceId || 'GPS-DEF',
        latitude,
        longitude,
        battery,
        connectionStatus,
        isSos,
        timestamp: new Date(),
      },
    });

    // 2. Update personnel current coordinates, battery, and lastLocationUpdate
    const personnel = await prisma.personnel.update({
      where: { id: personnelId },
      data: {
        latitude,
        longitude,
        deviceId: deviceId || undefined,
        batteryPercentage: battery,
        connectionStatus: isSos ? 'LIVE' : connectionStatus,
        lastLocationUpdate: new Date(),
        checkInStatus: isSos ? 'EMERGENCY' : undefined,
      },
    });

    // 3. If SOS Beacon triggered, create emergency incident and alert immediately
    if (isSos) {
      await IncidentService.createIncident(
        expeditionId,
        {
          type: 'SOS Beacon',
          title: `EMERGENCY SOS: Active Field Beacon from ${personnel.name}`,
          location: `Lat ${latitude.toFixed(4)}, Long ${longitude.toFixed(4)}`,
          latitude,
          longitude,
          severity: 'CRITICAL',
          peopleAffected: 1,
          isSosEmergency: true,
          description: `High-priority SOS beacon triggered by device ${deviceId || 'Tracker'}. Field member ${personnel.name} (${personnel.role}) requires emergency dispatch. Battery: ${battery}%.`,
          assignedPersonnelId: personnel.id,
        },
        user
      );

      await AlertService.evaluateAndSyncAlerts(expeditionId);

      await AuditService.record({
        expeditionId,
        userId: user?.id,
        userName: user?.name || personnel.name,
        userRole: user?.role || 'TEAM_MEMBER',
        action: 'EMERGENCY_SOS_BEACON',
        entity: 'TrackingPing',
        entityId: ping.id,
        reason: `Automated SOS emergency alert triggered at coordinates ${latitude}, ${longitude}`,
      });
    }

    return ping;
  }

  /**
   * Get live tracking status for an expedition.
   * Accurately categorizes into:
   * - LIVE (< 3 min)
   * - LAST_KNOWN (3 - 20 min)
   * - OFFLINE (> 20 min)
   */
  public static async getExpeditionTracking(expeditionId: string, currentPersonnelId?: string) {
    const members = await prisma.personnel.findMany({
      where: { expeditionId },
      include: {
        assignedStation: true,
        assignedAssets: true,
      },
      orderBy: { name: 'asc' },
    });

    const now = Date.now();

    return members.map((m) => {
      let trackingStatus: 'LIVE' | 'LAST_KNOWN' | 'OFFLINE' = 'OFFLINE';
      let lastUpdateText = 'No telemetry received';
      let minutesSinceUpdate = 9999;

      if (m.lastLocationUpdate) {
        const diffMs = now - new Date(m.lastLocationUpdate).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        minutesSinceUpdate = diffMins;

        if (diffMins < 3) {
          trackingStatus = 'LIVE';
          lastUpdateText = `${Math.max(1, Math.floor(diffMs / 1000))}s ago`;
        } else if (diffMins < 20) {
          trackingStatus = 'LAST_KNOWN';
          lastUpdateText = `${diffMins}m ago`;
        } else {
          trackingStatus = 'OFFLINE';
          lastUpdateText = diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`;
        }
      }

      return {
        id: m.id,
        memberId: m.memberId,
        name: m.name,
        role: m.role,
        currentLocation: m.currentLocation,
        assignedStation: m.assignedStation?.name || null,
        latitude: m.latitude ?? -69.407,
        longitude: m.longitude ?? 76.191,
        batteryPercentage: m.batteryPercentage ?? 95,
        deviceId: m.deviceId || `TRK-${m.memberId}`,
        trackingStatus,
        lastUpdateText,
        minutesSinceUpdate,
        lastLocationUpdate: m.lastLocationUpdate,
        checkInStatus: m.checkInStatus,
        assignedAssets: m.assignedAssets,
        isSelf: currentPersonnelId ? m.id === currentPersonnelId : false,
      };
    });
  }
}
