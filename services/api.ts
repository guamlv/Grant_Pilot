
import { Grant, Task, FinancialSnapshot, ComplianceRisk, ChecklistItem, ProposalDraft, BudgetItem, AiReport, GrantDocument, UserSettings } from '../types.ts';

class IndexedDBStore<T extends { id?: number }> {
  private dbName = 'GrantPilotDB';
  private storeName: string;
  private version = 1;
  private listeners: Set<() => void> = new Set();
  private storeVersion = 0; // Incremental version for cache invalidation

  constructor(storeName: string) {
    this.storeName = `gp_${storeName}`;
  }

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const stores = ['grants', 'tasks', 'financials', 'risks', 'checklist', 'proposals', 'budget', 'reports', 'documents', 'settings'];
        stores.forEach(s => {
          if (!db.objectStoreNames.contains(`gp_${s}`)) {
            db.createObjectStore(`gp_${s}`, { keyPath: 'id', autoIncrement: true });
          }
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async perform(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<any> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, mode);
      const store = transaction.objectStore(this.storeName);
      const request = action(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.storeVersion++;
    this.listeners.forEach(l => l());
  }

  async list(filter?: (item: T) => boolean): Promise<T[]> {
    const all = await this.perform('readonly', (s) => s.getAll()) as T[];
    return filter ? all.filter(filter) : all;
  }

  async get(id: number): Promise<T | undefined> {
    return this.perform('readonly', (s) => s.get(id));
  }

  async add(item: T): Promise<number> {
    const result = await this.perform('readwrite', (s) => s.add(item));
    this.notify();
    return result as number;
  }

  async update(id: number, updates: Partial<T>): Promise<void> {
    const existing = await this.get(id);
    if (existing) {
      await this.perform('readwrite', (s) => s.put({ ...existing, ...updates }));
      this.notify();
    }
  }

  async delete(id: number): Promise<void> {
    await this.perform('readwrite', (s) => s.delete(id));
    this.notify();
  }

  async clear(): Promise<void> {
    await this.perform('readwrite', (s) => s.clear());
    this.notify();
  }

  async count(): Promise<number> {
    const all = await this.list();
    return all.length;
  }

  getSnapshot() {
    return this.storeVersion;
  }
}

export const api = {
  grants: new IndexedDBStore<Grant>('grants'),
  tasks: new IndexedDBStore<Task>('tasks'),
  financials: new IndexedDBStore<FinancialSnapshot>('financials'),
  risks: new IndexedDBStore<ComplianceRisk>('risks'),
  checklistItems: new IndexedDBStore<ChecklistItem>('checklist'),
  proposals: new IndexedDBStore<ProposalDraft>('proposals'),
  budgetItems: new IndexedDBStore<BudgetItem>('budget'),
  reports: new IndexedDBStore<AiReport>('reports'),
  documents: new IndexedDBStore<GrantDocument>('documents'),
  settings: new IndexedDBStore<UserSettings>('settings'),
  
  seed: async () => {
    if (await api.grants.count() === 0) {
       const gid = await api.grants.add({
          title: "Infrastructure Modernization Fund",
          description: "Federal grant for grid resilience and safety.",
          awardAmount: 2450000,
          startDate: "2024-01-01",
          deadline: "2025-12-30",
          status: "Awarded",
          funder: "Dept. of Energy",
          probability: 100
        });

        await api.financials.add({ grantId: gid, date: "2024-03-31", projectedSpend: 250000, fundsReceived: 210000, actualSpend: 230000 });
        await api.risks.add({ 
          grantId: gid, 
          summary: "Audit documentation missing for Q1", 
          level: "High", 
          mitigationPlan: "Reconstruct digital records from portal.",
          probability: 5,
          impact: 4
        });
        await api.tasks.add({ grantId: gid, description: "Submit Q2 Financial Report", isCompleted: false, dueDate: "2024-06-15" });
        await api.settings.add({ userName: 'Admin User', userTitle: 'Grants Manager', organizationName: 'Global Solutions', theme: 'zen' });
    }
  }
};
