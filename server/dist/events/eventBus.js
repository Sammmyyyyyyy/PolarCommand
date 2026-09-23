import { EventEmitter } from 'events';
class DomainEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50);
    }
    emitDomainEvent(event, payload) {
        console.log(`[DOMAIN EVENT: ${event}]`, JSON.stringify(payload));
        return this.emit(event, payload);
    }
}
export const eventBus = new DomainEventBus();
