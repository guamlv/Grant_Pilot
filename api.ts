
import { Grant, Task, FinancialSnapshot, ComplianceRisk, ChecklistItem, ProposalDraft, BudgetItem, AiReport, GrantDocument, UserSettings } from '../types';

// This simulates a backend API. 
// INSTRUCTIONS FOR VERCEL MIGRATION:
// 1. Move the data handling logic to Vercel Serverless Functions (/api/grants, /api/tasks, etc.) using Vercel Postgres.
// 2. Replace the methods below to use `fetch('/api/...')` instead of localStorage.

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const EVENTS = { DATA_CHANGE: 'data_change' };

const triggerUpdate = (resource: string) => {
  window.dispatchEvent(new CustomEvent(EVENTS.DATA_CHANGE, { detail: { resource } }));
};

// Generic Mock Storage Helper
class MockStore<T extends { id?: number }> {
  key: string;
  constructor(key: string) { this.key = `gp_${key}`; }

  getAll(): T[] {
    try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } 
    catch { return []; }
  }

  async list(filter?: (item: T) => boolean): Promise<T[]> {
    const all = this.getAll();
    return filter ? all.filter(filter) : all;
  }

  async get(id: number): Promise<T | undefined> {
    return this.getAll().find(i => i.id === id);
  }

  async add(item: T): Promise<number> {
    const all = this.getAll();
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const newItem = { ...item, id };
    localStorage.setItem(this.key, JSON.stringify([...all, newItem]));
    triggerUpdate(this.key);
    return id;
  }

  async update(id: number, updates: Partial<T>): Promise<void> {
    const all = this.getAll();
    const index = all.findIndex(i => i.id === id);
    if (index !== -1) {
      all[index] = { ...all[index], ...updates };
      localStorage.setItem(this.key, JSON.stringify(all));
      triggerUpdate(this.key);
    }
  }

  async delete(id: number): Promise<void> {
    const all = this.getAll().filter(i => i.id !== id);
    localStorage.setItem(this.key, JSON.stringify(all));
    triggerUpdate(this.key);
  }

  async bulkAdd(items: T[]): Promise<void> {
    for (const item of items) await this.add(item);
  }
  
  async count(): Promise<number> {
      return this.getAll().length;
  }
  
  async clear(): Promise<void> {
      localStorage.removeItem(this.key);
      triggerUpdate(this.key);
  }
}

export const api = {
  grants: new MockStore<Grant>('grants'),
  tasks: new MockStore<Task>('tasks'),
  financials: new MockStore<FinancialSnapshot>('financials'),
  risks: new MockStore<ComplianceRisk>('risks'),
  checklistItems: new MockStore<ChecklistItem>('checklist'),
  proposals: new MockStore<ProposalDraft>('proposals'),
  budgetItems: new MockStore<BudgetItem>('budget'),
  reports: new MockStore<AiReport>('reports'),
  documents: new MockStore<GrantDocument>('documents'), // Note: Storing files in localStorage is bad practice. Move to Blob Storage on Vercel.
  settings: new MockStore<UserSettings>('settings'),
  
  // Helper to seed data if empty
  seed: async () => {
    if (await api.grants.count() === 0) {
       const gid = await api.grants.add({
          title: "Community STEM Initiative 2024",
          description: "Funding to provide robotics kits and coding workshops for under-resourced high schools.",
          awardAmount: 150000,
          startDate: "2024-01-01",
          deadline: "2024-12-31",
          status: "Awarded",
          funder: "National Science Foundation",
          probability: 100
        });

        await api.financials.bulkAdd([
          { grantId: gid, date: "2024-01-31", projectedSpend: 10000, fundsReceived: 50000, actualSpend: 5000 },
          { grantId: gid, date: "2024-02-28", projectedSpend: 25000, fundsReceived: 50000, actualSpend: 22000 },
          { grantId: gid, date: "2024-03-31", projectedSpend: 40000, fundsReceived: 50000, actualSpend: 38000 },
        ]);
        
        await api.risks.add({ grantId: gid, summary: "Failure to meet participant enrollment quota", probability: 3, impact: 4, level: "High", mitigationPlan: "Partner with 3 additional school districts" });
        await api.tasks.add({ grantId: gid, description: "Submit Q1 Quarterly Report", isCompleted: false, dueDate: "2024-04-15" });
        await api.settings.add({ userName: 'Grant Manager', userTitle: 'Development Director', organizationName: 'My Nonprofit', theme: 'sanctuary' });
    }
  }
};
