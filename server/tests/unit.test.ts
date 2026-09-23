import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('1. Days of Supply Calculation', () => {
  it('should calculate correct days of supply for positive consumption', () => {
    const stock = 220;
    const dailyUsage = 20;
    const daysOfSupply = Math.round(stock / dailyUsage);
    assert.strictEqual(daysOfSupply, 11);
  });

  it('should handle zero daily consumption safely without NaN or Infinity', () => {
    const stock = 150;
    const dailyUsage = 0;
    const safeDaily = dailyUsage > 0 ? dailyUsage : 1;
    const daysOfSupply = Math.round(stock / safeDaily);
    assert.strictEqual(daysOfSupply, 150);
  });
});

describe('2. Maintenance Hours Calculation', () => {
  it('should calculate remaining hours and mark due soon when remaining <= 200', () => {
    const operatingHours = 1820;
    const maintenanceInterval = 2000;
    const remaining = maintenanceInterval - operatingHours;
    assert.strictEqual(remaining, 180);
    const status = remaining <= 0 ? 'Maintenance Due' : remaining <= 200 ? 'Maintenance Due Soon' : 'Healthy';
    assert.strictEqual(status, 'Maintenance Due Soon');
  });

  it('should detect overdue maintenance when operating hours exceed interval', () => {
    const operatingHours = 2050;
    const maintenanceInterval = 2000;
    const remaining = maintenanceInterval - operatingHours;
    assert.ok(remaining < 0);
    const status = remaining <= 0 ? 'Maintenance Due' : 'Healthy';
    assert.strictEqual(status, 'Maintenance Due');
  });
});

describe('3. Deterministic Risk Level Mapping', () => {
  it('should categorize risk levels correctly', () => {
    const getRiskLevel = (score: number) => {
      if (score >= 70) return 'CRITICAL';
      if (score >= 50) return 'HIGH';
      if (score >= 30) return 'MEDIUM';
      return 'LOW';
    };

    assert.strictEqual(getRiskLevel(25), 'LOW');
    assert.strictEqual(getRiskLevel(38), 'MEDIUM');
    assert.strictEqual(getRiskLevel(62), 'HIGH');
    assert.strictEqual(getRiskLevel(84), 'CRITICAL');
  });
});
