import { prisma } from '../config/database.js';
export class RiskService {
    static async calculateAndRecordExpeditionRisk(expeditionId) {
        const expedition = await prisma.expedition.findUnique({
            where: { id: expeditionId },
            include: {
                cargo: true,
                inventory: { include: { station: true } },
                assets: { include: { station: true } },
                personnel: true,
                tasks: true,
                movements: true,
                observations: { where: { severity: { in: ['HIGH', 'CRITICAL'] } } },
                incidents: { where: { status: { not: 'Resolved' } } },
                stations: { include: { weather: { orderBy: { recordedAt: 'desc' }, take: 1 } } },
            },
        });
        if (!expedition) {
            throw new Error(`Expedition ${expeditionId} not found`);
        }
        const contributingFactors = [];
        const affectedResources = [];
        // 1. Cargo Risk (0 - 25 points)
        let cargoRiskScore = 0;
        for (const c of expedition.cargo) {
            if (c.status === 'DELAYED' || c.status === 'Delayed' || c.delayHours > 0) {
                const penalty = c.priority === 'CRITICAL' ? 14 : c.priority === 'HIGH' ? 9 : 5;
                const delayFactor = Math.min(2, 1 + c.delayHours / 48);
                const itemScore = Math.round(penalty * delayFactor);
                cargoRiskScore += itemScore;
                contributingFactors.push(`+${itemScore} Cargo delay: ${c.cargoCode} (${c.description}) delayed by +${c.delayHours}h`);
                affectedResources.push(`Cargo: ${c.cargoCode}`);
            }
            else if (c.priority === 'CRITICAL' && (c.status === 'IN_TRANSIT' || c.status === 'In Transit')) {
                cargoRiskScore += 3;
            }
        }
        const normalizedCargo = Math.min(25, Math.round(cargoRiskScore));
        // 2. Inventory Risk (0 - 30 points)
        let inventoryRiskScore = 0;
        for (const inv of expedition.inventory) {
            const daily = inv.dailyUsage > 0 ? inv.dailyUsage : 1;
            const daysOfSupply = inv.currentStock / daily;
            if (daysOfSupply <= inv.safetyThresholdDays) {
                const breachGap = Math.max(1, inv.safetyThresholdDays - daysOfSupply + 1);
                const isCriticalCat = inv.category.toLowerCase().includes('med') || inv.category.toLowerCase().includes('fuel');
                const weight = isCriticalCat ? 14 : 7;
                const penalty = Math.round(weight * breachGap);
                inventoryRiskScore += penalty;
                contributingFactors.push(`+${penalty} ${inv.station.name} ${inv.itemName} stock (${Math.round(daysOfSupply)}d) below safety threshold (${inv.safetyThresholdDays}d)`);
                affectedResources.push(`Inventory: ${inv.station.name} - ${inv.itemName}`);
            }
            else if (daysOfSupply <= inv.safetyThresholdDays + 3) {
                inventoryRiskScore += 3;
            }
        }
        const normalizedInventory = Math.min(30, Math.round(inventoryRiskScore));
        // 3. Asset Risk (0 - 15 points)
        let assetRiskScore = 0;
        for (const a of expedition.assets) {
            const remainingHours = a.maintenanceInterval - a.operatingHours;
            if (remainingHours <= 0 || a.lifecycleStatus === 'FAILED' || a.status === 'Critical' || a.status === 'Unavailable') {
                assetRiskScore += 7;
                contributingFactors.push(`+7 Asset ${a.assetCode} (${a.name}) overdue for maintenance or unavailable`);
                affectedResources.push(`Asset: ${a.assetCode}`);
            }
            else if (remainingHours <= 200 || a.healthPercentage < 65) {
                assetRiskScore += 3.5;
                contributingFactors.push(`+3.5 Asset ${a.assetCode} health degraded (${a.healthPercentage}%)`);
            }
        }
        const normalizedAssets = Math.min(15, Math.round(assetRiskScore));
        // 4. Incident Risk (0 - 15 points)
        let incidentRiskScore = 0;
        for (const inc of expedition.incidents) {
            const incPoints = inc.isSosEmergency ? 15 : inc.severity === 'CRITICAL' ? 12 : inc.severity === 'HIGH' ? 8 : 4;
            incidentRiskScore += incPoints;
            contributingFactors.push(`+${incPoints} Active emergency: ${inc.title} (${inc.severity} severity)`);
            affectedResources.push(`Incident: ${inc.incidentCode}`);
        }
        const normalizedIncidents = Math.min(15, Math.round(incidentRiskScore));
        // 5. Personnel Availability & Check-In Accountability Risk (0 - 10 points)
        let personnelRiskScore = 0;
        const overdueCheckIns = expedition.personnel.filter((p) => p.isCheckInOverdue);
        if (overdueCheckIns.length > 0) {
            personnelRiskScore += overdueCheckIns.length * 4;
            for (const p of overdueCheckIns) {
                contributingFactors.push(`+4 Personnel check-in overdue: ${p.name} at ${p.currentLocation}`);
                affectedResources.push(`Personnel: ${p.name}`);
            }
        }
        const emergencyPeople = expedition.personnel.filter((p) => p.checkInStatus === 'EMERGENCY' || p.checkInStatus === 'MISSING');
        if (emergencyPeople.length > 0) {
            personnelRiskScore += 8;
            contributingFactors.push(`+8 Emergency: ${emergencyPeople.length} personnel in distress status`);
        }
        const normalizedPersonnel = Math.min(10, Math.round(personnelRiskScore));
        // 6. Task / Mission Blocked Risk (0 - 10 points)
        let taskRiskScore = 0;
        const blockedTasks = expedition.tasks.filter((t) => t.status === 'BLOCKED');
        if (blockedTasks.length > 0) {
            taskRiskScore += blockedTasks.length * 4;
            for (const t of blockedTasks) {
                contributingFactors.push(`+4 Mission task blocked: "${t.title}"`);
                affectedResources.push(`Task: ${t.title}`);
            }
        }
        const normalizedTasks = Math.min(10, Math.round(taskRiskScore));
        // 7. Movement Delays & Weather Constraints (0 - 10 points)
        let movementRiskScore = 0;
        for (const m of expedition.movements) {
            if (m.status === 'DELAYED' || m.delayHours > 0) {
                const mPoints = m.delayHours >= 6 ? 6 : 3;
                movementRiskScore += mPoints;
                contributingFactors.push(`+${mPoints} Movement delay: ${m.movementCode} delayed by +${m.delayHours}h`);
                affectedResources.push(`Movement: ${m.movementCode}`);
            }
        }
        // 8. Field Observations (Critical / High severity)
        for (const obs of expedition.observations) {
            const obsPoints = obs.severity === 'CRITICAL' ? 5 : 2;
            movementRiskScore += obsPoints;
            contributingFactors.push(`+${obsPoints} Field observation [${obs.category}]: ${obs.description.slice(0, 50)}`);
        }
        // 9. Weather Risk (0 - 5 points)
        let weatherRiskScore = 0;
        for (const st of expedition.stations) {
            const latestWeather = st.weather[0];
            if (latestWeather) {
                if (latestWeather.windSpeedKnots > 45) {
                    weatherRiskScore += 4;
                    contributingFactors.push(`+4 ${st.name} severe blizzard winds (${latestWeather.windSpeedKnots} knots)`);
                }
                else if (latestWeather.windSpeedKnots > 30) {
                    weatherRiskScore += 2;
                    contributingFactors.push(`+2 ${st.name} high wind advisory (${latestWeather.windSpeedKnots} knots)`);
                }
            }
        }
        const normalizedWeather = Math.min(5, Math.round(weatherRiskScore || (expedition.stations.length > 0 ? 1 : 0)));
        // Total Calculation (0 - 100)
        const totalScore = Math.min(100, normalizedCargo +
            normalizedInventory +
            normalizedAssets +
            normalizedIncidents +
            normalizedPersonnel +
            normalizedTasks +
            Math.min(10, movementRiskScore) +
            normalizedWeather);
        let riskLevel = 'LOW';
        if (totalScore >= 70)
            riskLevel = 'CRITICAL';
        else if (totalScore >= 50)
            riskLevel = 'HIGH';
        else if (totalScore >= 30)
            riskLevel = 'MEDIUM';
        // Mitigation synthesis
        let recommendedMitigation = 'Maintain nominal scheduled logistics tracking.';
        if (normalizedIncidents >= 10 || emergencyPeople.length > 0) {
            recommendedMitigation = 'Dispatch immediate rescue response team and mobilize medical triage.';
        }
        else if (normalizedInventory >= 15) {
            recommendedMitigation = 'Authorize inter-station supply reallocation or emergency logistics airbridge.';
        }
        else if (normalizedCargo >= 15) {
            recommendedMitigation = 'Expedite maritime transit and reroute high-priority cargo via ski-plane corridors.';
        }
        else if (normalizedTasks >= 6) {
            recommendedMitigation = 'Reassign blocked mission task dependencies and mobilize backup support assets.';
        }
        else if (normalizedAssets >= 8) {
            recommendedMitigation = 'Schedule priority maintenance overhaul and activate standby backup equipment.';
        }
        // Persist snapshot to RiskSnapshot table for authentic historical telemetry
        await prisma.riskSnapshot.create({
            data: {
                expeditionId,
                totalScore,
                cargoRisk: normalizedCargo,
                inventoryRisk: normalizedInventory,
                assetRisk: normalizedAssets,
                personnelRisk: normalizedPersonnel,
                incidentRisk: normalizedIncidents,
                weatherRisk: normalizedWeather,
                taskRisk: normalizedTasks,
                checkInRisk: normalizedPersonnel,
                contributingFactors: contributingFactors.slice(0, 6).join('; '),
            },
        });
        // Update current overallRiskScore on Expedition
        await prisma.expedition.update({
            where: { id: expeditionId },
            data: { overallRiskScore: totalScore },
        });
        // Update station-specific risk
        for (const station of expedition.stations) {
            const stationInventory = expedition.inventory.filter((i) => i.stationId === station.id);
            const breachedCount = stationInventory.filter((i) => {
                const d = i.dailyUsage > 0 ? i.dailyUsage : 1;
                return i.currentStock / d <= i.safetyThresholdDays;
            }).length;
            const stationRisk = Math.min(100, Math.round(totalScore * 0.4 + breachedCount * 20));
            const stationStatus = stationRisk >= 65 ? 'High Risk' : stationRisk >= 40 ? 'Warning' : 'Operational';
            await prisma.station.update({
                where: { id: station.id },
                data: { currentRisk: stationRisk, status: stationStatus },
            });
        }
        return {
            totalScore,
            riskLevel,
            breakdown: {
                cargo: normalizedCargo,
                inventory: normalizedInventory,
                assets: normalizedAssets,
                personnel: normalizedPersonnel,
                incidents: normalizedIncidents,
                weather: normalizedWeather,
                tasks: normalizedTasks,
                checkIns: normalizedPersonnel,
            },
            contributingFactors,
            affectedResources,
            recommendedMitigation,
        };
    }
    static async getRiskHistory(expeditionId, limit = 30) {
        return prisma.riskSnapshot.findMany({
            where: { expeditionId },
            orderBy: { recordedAt: 'asc' },
            take: limit,
        });
    }
}
