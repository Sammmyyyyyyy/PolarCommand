import { EventEmitter } from 'events';

export type PolarEventType =
  | 'CargoDelayed'
  | 'InventoryThresholdBreached'
  | 'AssetMaintenanceDue'
  | 'IncidentCreated'
  | 'ActionExecuted'
  | 'RiskRecalculated';

class DomainEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  public emitDomainEvent(event: PolarEventType, payload: Record<string, any>): boolean {
    console.log(`[DOMAIN EVENT: ${event}]`, JSON.stringify(payload));
    return this.emit(event, payload);
  }
}

export const eventBus = new DomainEventBus();
