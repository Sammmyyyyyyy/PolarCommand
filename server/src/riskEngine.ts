import {
  CargoShipment,
  InventoryItem,
  Asset,
  Station,
} from './types.js';

export interface RiskBreakdown {
  cargo: number;
  inventory: number;
  assets: number;
  personnel: number;
  weather: number;
  total: number;
}

export function calculateExpeditionRisk(
  cargoList: CargoShipment[],
  inventoryList: InventoryItem[],
  assetsList: Asset[],
  stations: Station[]
): RiskBreakdown {
  // 1. Cargo Risk (0 - 30 max weight)
  const delayedOrCriticalCargo = cargoList.filter(
    (c) => c.status === 'Delayed' || c.priority === 'CRITICAL' || c.delayHours > 0
  );
  let cargoRiskScore = 0;
  for (const c of cargoList) {
    if (c.status === 'Delayed' || c.delayHours > 0) {
      cargoRiskScore += c.priority === 'CRITICAL' ? 12 : 6;
    } else if (c.priority === 'CRITICAL') {
      cargoRiskScore += 4;
    }
  }
  const normalizedCargo = Math.min(30, Math.round(cargoRiskScore));

  // 2. Inventory Risk (0 - 35 max weight)
  let inventoryRiskScore = 0;
  for (const inv of inventoryList) {
    if (inv.daysRemaining <= inv.safetyThresholdDays) {
      const breachSeverity = Math.max(1, inv.safetyThresholdDays - inv.daysRemaining + 1);
      inventoryRiskScore += (inv.category === 'Medicine' || inv.category === 'Fuel') ? 14 * breachSeverity : 7 * breachSeverity;
    } else if (inv.daysRemaining <= inv.safetyThresholdDays + 3) {
      inventoryRiskScore += 4;
    }
  }
  const normalizedInventory = Math.min(35, Math.round(inventoryRiskScore));

  // 3. Asset Risk (0 - 15 max weight)
  let assetRiskScore = 0;
  for (const a of assetsList) {
    if (a.healthPercentage < 50 || a.failureRisk === 'High') {
      assetRiskScore += 6;
    } else if (a.healthPercentage < 75 || a.failureRisk === 'Medium') {
      assetRiskScore += 2.5;
    }
  }
  const normalizedAssets = Math.min(15, Math.round(assetRiskScore));

  // 4. Personnel Risk (0 - 10 max weight)
  const normalizedPersonnel = 6; // Stable transit operations

  // 5. Weather Risk (0 - 10 max weight)
  let weatherRiskScore = 0;
  for (const s of stations) {
    if (s.weather.windSpeed > 40) weatherRiskScore += 5;
    else if (s.weather.windSpeed > 30) weatherRiskScore += 2;
  }
  const normalizedWeather = Math.min(10, Math.round(weatherRiskScore || 5));

  const total = Math.min(100, normalizedCargo + normalizedInventory + normalizedAssets + normalizedPersonnel + normalizedWeather);

  return {
    cargo: normalizedCargo,
    inventory: normalizedInventory,
    assets: normalizedAssets,
    personnel: normalizedPersonnel,
    weather: normalizedWeather,
    total,
  };
}
