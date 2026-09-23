import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
import { eventBus } from '../events/eventBus.js';

export interface ExecuteActionRequest {
  expeditionId: string;
  actionType: 'INVENTORY_REALLOCATION' | 'MAINTENANCE_OVERHAUL' | 'EXPEDITE_CARGO' | 'EMERGENCY_DISPATCH';
  title?: string;
  description?: string;
  assignedTo?: string;
  donorStationId?: string;
  recipientStationId?: string;
  inventoryCategory?: string;
  transferQuantity?: number;
  assetId?: string;
  cargoId?: string;
  incidentId?: string;
  alertId?: string;
  user?: { id?: string; name?: string; role?: string };
}

export class ActionService {
  public static async executeAction(req: ExecuteActionRequest) {
    const { expeditionId, actionType, user } = req;

    let executionResult: any = null;

    if (actionType === 'INVENTORY_REALLOCATION') {
      const { donorStationId, recipientStationId, inventoryCategory, transferQuantity = 150 } = req;
      if (!donorStationId || !recipientStationId || !inventoryCategory) {
        throw new Error('Missing donor, recipient, or category for inventory reallocation');
      }

      executionResult = await prisma.$transaction(async (tx) => {
        const catPrefix = inventoryCategory.slice(0, 3);
        // Find donor item
        const donorItem = await tx.inventoryItem.findFirst({
          where: {
            expeditionId,
            stationId: donorStationId,
            category: { contains: catPrefix },
          },
        });

        // Find recipient item
        const recipientItem = await tx.inventoryItem.findFirst({
          where: {
            expeditionId,
            stationId: recipientStationId,
            category: { contains: catPrefix },
          },
        });

        if (!donorItem || !recipientItem) {
          throw new Error('Donor or recipient inventory record not found');
        }

        if (donorItem.currentStock < transferQuantity) {
          throw new Error(`Insufficient donor stock (${donorItem.currentStock} < ${transferQuantity})`);
        }

        const prevDonor = donorItem.currentStock;
        const prevRecipient = recipientItem.currentStock;

        // Perform stock mutation
        const updatedDonor = await tx.inventoryItem.update({
          where: { id: donorItem.id },
          data: {
            currentStock: donorItem.currentStock - transferQuantity,
          },
        });

        const updatedRecipient = await tx.inventoryItem.update({
          where: { id: recipientItem.id },
          data: {
            currentStock: recipientItem.currentStock + transferQuantity,
            riskStatus: 'Normal',
          },
        });

        // Resolve linked alerts
        if (req.alertId) {
          await tx.alert.update({
            where: { id: req.alertId },
            data: { status: 'RESOLVED' },
          });
        } else {
          // Resolve any active alerts matching this inventory item/station
          await tx.alert.updateMany({
            where: {
              expeditionId,
              status: { in: ['ACTIVE', 'IN_PROGRESS'] },
              affectedEntity: { contains: inventoryCategory },
            },
            data: { status: 'RESOLVED' },
          });
        }

        // Record ActionItem
        const actionItem = await tx.actionItem.create({
          data: {
            expeditionId,
            alertId: req.alertId || null,
            actionType: 'Reallocate',
            title: req.title || `Reallocated ${transferQuantity} units of ${inventoryCategory}`,
            description: `Transferred ${transferQuantity} units from Station (${donorStationId}) to Station (${recipientStationId}) via emergency air transit.`,
            assignedTo: req.assignedTo || 'Station Logistics Operations',
            targetStationId: recipientStationId,
            status: 'Completed',
            executedAt: new Date(),
            executionPayloadJson: JSON.stringify({
              donorStationId,
              recipientStationId,
              transferQuantity,
              prevDonor,
              newDonor: updatedDonor.currentStock,
              prevRecipient,
              newRecipient: updatedRecipient.currentStock,
            }),
          },
        });

        return {
          actionItem,
          donor: { previous: prevDonor, current: updatedDonor.currentStock },
          recipient: { previous: prevRecipient, current: updatedRecipient.currentStock },
        };
      });

      // Audit Log
      await AuditService.record({
        expeditionId,
        userId: user?.id,
        userName: user?.name || 'Expedition Commander',
        userRole: user?.role || 'COMMANDER',
        action: 'INVENTORY_REALLOCATION',
        entity: 'InventoryItem',
        entityId: req.recipientStationId!,
        previousState: executionResult.donor.previous,
        newState: executionResult.recipient.current,
        reason: `Reallocated ${req.transferQuantity} units of ${req.inventoryCategory} to relieve critical stockout`,
      });
    } else if (actionType === 'MAINTENANCE_OVERHAUL') {
      const { assetId } = req;
      if (!assetId) throw new Error('Asset ID required for maintenance overhaul');

      executionResult = await prisma.$transaction(async (tx) => {
        const asset = await tx.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw new Error(`Asset ${assetId} not found`);

        const updated = await tx.asset.update({
          where: { id: assetId },
          data: {
            operatingHours: 0,
            healthPercentage: 100,
            lastMaintenanceDate: new Date(),
            status: 'Operational',
            failureRisk: 'Low',
          },
        });

        await tx.alert.updateMany({
          where: {
            expeditionId,
            status: { in: ['ACTIVE', 'IN_PROGRESS'] },
            affectedEntity: { contains: asset.assetCode },
          },
          data: { status: 'RESOLVED' },
        });

        const actionItem = await tx.actionItem.create({
          data: {
            expeditionId,
            actionType: 'Maintenance',
            title: `Completed Depot Overhaul on ${asset.name}`,
            description: `Full fluid flush, mechanical inspection, and hours reset completed at station depot.`,
            assignedTo: req.assignedTo || 'Depot Lead Mechanical Engineer',
            targetStationId: asset.stationId,
            assignedAssetId: asset.id,
            status: 'Completed',
            executedAt: new Date(),
          },
        });

        return { actionItem, asset: updated };
      });

      await AuditService.record({
        expeditionId,
        userId: user?.id,
        userName: user?.name || 'Expedition Commander',
        userRole: user?.role || 'COMMANDER',
        action: 'ASSET_MAINTENANCE',
        entity: 'Asset',
        entityId: req.assetId!,
        reason: 'Completed scheduled 2,000h maintenance overhaul and sensor reset',
      });
    } else if (actionType === 'EXPEDITE_CARGO') {
      const { cargoId } = req;
      if (!cargoId) throw new Error('Cargo ID required to expedite');

      executionResult = await prisma.$transaction(async (tx) => {
        const cargo = await tx.cargo.findUnique({ where: { id: cargoId } });
        if (!cargo) throw new Error(`Cargo ${cargoId} not found`);

        const newDelay = Math.max(0, cargo.delayHours - 24);
        const updated = await tx.cargo.update({
          where: { id: cargoId },
          data: {
            delayHours: newDelay,
            status: newDelay === 0 ? 'In Transit' : 'Delayed',
          },
        });

        const actionItem = await tx.actionItem.create({
          data: {
            expeditionId,
            actionType: 'Expedite',
            title: `Expedited Cargo ${cargo.cargoCode}`,
            description: `Rerouted cargo through express transport corridor. Delay reduced by 24h.`,
            assignedTo: 'Maritime Operations Dispatch',
            status: 'Completed',
            executedAt: new Date(),
          },
        });

        return { actionItem, cargo: updated };
      });

      await AuditService.record({
        expeditionId,
        userId: user?.id,
        userName: user?.name || 'Expedition Commander',
        userRole: user?.role || 'COMMANDER',
        action: 'CARGO_EXPEDITE',
        entity: 'Cargo',
        entityId: req.cargoId!,
        reason: 'Expedited transport priority and scheduled priority coastal offloading',
      });
    }

    // Automatically recalculate Risk & Alerts across the entire expedition!
    const newRisk = await RiskService.calculateAndRecordExpeditionRisk(expeditionId);
    await AlertService.evaluateAndSyncAlerts(expeditionId);

    eventBus.emitDomainEvent('ActionExecuted', {
      expeditionId,
      actionType,
      newRisk: newRisk.totalScore,
    });

    return {
      success: true,
      executionResult,
      newRisk,
      message: 'Action executed successfully. Database state updated and risk recalculated.',
    };
  }

  public static async listActions(expeditionId: string) {
    return prisma.actionItem.findMany({
      where: { expeditionId },
      orderBy: { createdAt: 'desc' },
      include: {
        alert: true,
        targetStation: true,
        assignedPersonnel: true,
        assignedAsset: true,
      },
    });
  }
}
