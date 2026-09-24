import { ConnectivityStatus, Task, CheckInLog, Incident } from '../types';

export interface QueuedMutation {
  id: string;
  type:
    | 'TASK_STATUS_UPDATE'
    | 'PERSONNEL_CHECK_IN'
    | 'REPORT_INCIDENT'
    | 'EMERGENCY_SOS'
    | 'CREATE_OBSERVATION'
    | 'ATTACH_DOCUMENT';
  expeditionId: string;
  payload: any;
  timestamp: string;
  retryCount: number;
}

export interface OfflineCacheState {
  expeditionId: string | null;
  tasks: Task[];
  personnelCheckIns: CheckInLog[];
  emergencyContacts: Array<{ name: string; role: string; channel: string; station: string }>;
  queuedMutations: QueuedMutation[];
  lastSyncTimestamp: string | null;
  connectivityStatus: ConnectivityStatus;
  simulatedOffline: boolean;
}

const STORAGE_KEY = 'polar_command_offline_cache';

export class OfflineSyncService {
  private static listeners: Array<(state: OfflineCacheState) => void> = [];

  private static state: OfflineCacheState = this.loadState();

  private static loadState(): OfflineCacheState {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          expeditionId: parsed.expeditionId || null,
          tasks: parsed.tasks || [],
          personnelCheckIns: parsed.personnelCheckIns || [],
          emergencyContacts: parsed.emergencyContacts || [
            { name: 'Dr. Anita Singh', role: 'Station Medical Director', channel: 'VHF Ch-16 / Iridium 8816', station: 'Bharati Station' },
            { name: 'Dr. Rajesh Nair', role: 'Expedition Commander', channel: 'VHF Ch-09 Priority', station: 'Command Base' },
            { name: 'SAR Traverse Dispatch', role: 'Field Rescue Coordinator', channel: 'VHF Emergency Duplex 450.125', station: 'Maitri Transit Depot' },
          ],
          queuedMutations: parsed.queuedMutations || [],
          lastSyncTimestamp: parsed.lastSyncTimestamp || new Date().toISOString(),
          connectivityStatus: parsed.simulatedOffline ? 'OFFLINE' : (navigator.onLine ? 'ONLINE' : 'OFFLINE'),
          simulatedOffline: Boolean(parsed.simulatedOffline),
        };
      }
    } catch {
      // Fallback
    }

    return {
      expeditionId: null,
      tasks: [],
      personnelCheckIns: [],
      emergencyContacts: [
        { name: 'Dr. Anita Singh', role: 'Station Medical Director', channel: 'VHF Ch-16 / Iridium 8816', station: 'Bharati Station' },
        { name: 'Dr. Rajesh Nair', role: 'Expedition Commander', channel: 'VHF Ch-09 Priority', station: 'Command Base' },
        { name: 'SAR Traverse Dispatch', role: 'Field Rescue Coordinator', channel: 'VHF Emergency Duplex 450.125', station: 'Maitri Transit Depot' },
      ],
      queuedMutations: [],
      lastSyncTimestamp: new Date().toISOString(),
      connectivityStatus: navigator.onLine ? 'ONLINE' : 'OFFLINE',
      simulatedOffline: false,
    };
  }

  private static saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to write offline cache to storage', e);
    }
    this.notify();
  }

  public static getState(): OfflineCacheState {
    return { ...this.state };
  }

  public static subscribe(listener: (state: OfflineCacheState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notify() {
    for (const l of this.listeners) {
      l({ ...this.state });
    }
  }

  public static setSimulatedOffline(isOffline: boolean) {
    this.state.simulatedOffline = isOffline;
    this.state.connectivityStatus = isOffline ? 'OFFLINE' : (navigator.onLine ? 'ONLINE' : 'OFFLINE');
    this.saveState();
  }

  public static setConnectivityStatus(status: ConnectivityStatus) {
    if (this.state.simulatedOffline && status !== 'OFFLINE') return;
    this.state.connectivityStatus = status;
    this.saveState();
  }

  public static cacheExpeditionData(expeditionId: string, tasks: Task[]) {
    this.state.expeditionId = expeditionId;
    this.state.tasks = tasks;
    this.state.lastSyncTimestamp = new Date().toISOString();
    this.saveState();
  }

  public static queueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retryCount'>): QueuedMutation {
    const item: QueuedMutation = {
      ...mutation,
      id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    // Optimistically apply mutation to offline tasks if task update
    if (item.type === 'TASK_STATUS_UPDATE') {
      const idx = this.state.tasks.findIndex((t) => t.id === item.payload.taskId);
      if (idx >= 0) {
        this.state.tasks[idx] = {
          ...this.state.tasks[idx],
          status: item.payload.status,
          notes: item.payload.notes || this.state.tasks[idx].notes,
          fieldObservations: item.payload.fieldObservations || this.state.tasks[idx].fieldObservations,
        };
      }
    }

    this.state.queuedMutations.push(item);
    this.saveState();
    return item;
  }

  public static async drainQueue(
    handlers: {
      updateTaskStatus: (taskId: string, status: string, notes?: string, fieldObservations?: string) => Promise<any>;
      recordCheckIn: (expeditionId: string, personnelId: string, data: any) => Promise<any>;
      createIncident: (expeditionId: string, data: any) => Promise<any>;
      triggerSos: (expeditionId: string, data: any) => Promise<any>;
      createObservation?: (expeditionId: string, data: any) => Promise<any>;
      attachDocument?: (expeditionId: string, data: any) => Promise<any>;
    }
  ): Promise<{ syncedCount: number; errors: any[] }> {
    if (this.state.simulatedOffline || !navigator.onLine) {
      return { syncedCount: 0, errors: ['Device currently offline'] };
    }

    if (this.state.queuedMutations.length === 0) {
      return { syncedCount: 0, errors: [] };
    }

    this.state.connectivityStatus = 'SYNCING';
    this.notify();

    const errors: any[] = [];
    const remaining: QueuedMutation[] = [];
    let syncedCount = 0;

    for (const item of this.state.queuedMutations) {
      try {
        if (item.type === 'TASK_STATUS_UPDATE') {
          await handlers.updateTaskStatus(
            item.payload.taskId,
            item.payload.status,
            item.payload.notes,
            item.payload.fieldObservations
          );
        } else if (item.type === 'PERSONNEL_CHECK_IN') {
          await handlers.recordCheckIn(item.expeditionId, item.payload.personnelId, item.payload);
        } else if (item.type === 'REPORT_INCIDENT') {
          await handlers.createIncident(item.expeditionId, item.payload);
        } else if (item.type === 'EMERGENCY_SOS') {
          await handlers.triggerSos(item.expeditionId, item.payload);
        } else if (item.type === 'CREATE_OBSERVATION' && handlers.createObservation) {
          await handlers.createObservation(item.expeditionId, item.payload);
        } else if (item.type === 'ATTACH_DOCUMENT' && handlers.attachDocument) {
          await handlers.attachDocument(item.expeditionId, item.payload);
        }
        syncedCount++;
      } catch (err: any) {
        console.error('Failed to sync queued mutation:', item, err);
        errors.push({ id: item.id, error: err.message });
        item.retryCount += 1;
        remaining.push(item);
      }
    }

    this.state.queuedMutations = remaining;
    this.state.lastSyncTimestamp = new Date().toISOString();
    this.state.connectivityStatus = 'ONLINE';
    this.saveState();

    return { syncedCount, errors };
  }
}
