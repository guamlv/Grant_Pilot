
export type GrantStatus = 'Prospect' | 'Drafting' | 'Submitted' | 'Awarded' | 'Declined' | 'Closed';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type ReportType = 'Executive Summary' | 'Financial Narrative' | 'Quarterly Progress' | 'Final Impact Report' | 'Compliance Audit';

export interface Grant {
  id?: number;
  title: string;
  funder: string;
  manager?: string;
  description: string;
  awardAmount: number;
  startDate: string;
  deadline: string;
  status: GrantStatus;
  probability: number;
}

export interface FinancialSnapshot {
  id?: number;
  grantId: number;
  date: string;
  projectedSpend: number;
  fundsReceived: number;
  actualSpend: number;
}

export interface FinancialMetrics extends FinancialSnapshot {
  burnRate: number;
  remainingBudget: number;
  variance: number;
}

export interface ComplianceRisk {
  id?: number;
  grantId: number;
  summary: string;
  probability: number;
  impact: number;
  level: RiskLevel;
  mitigationPlan: string;
}

export interface Task {
  id?: number;
  grantId: number;
  description: string;
  isCompleted: boolean;
  dueDate: string;
}

export interface ChecklistItem {
  id?: number;
  grantId: number;
  text: string;
  isCompleted: boolean;
}

export interface BudgetItem {
  id?: number;
  grantId: number;
  category: string;
  allocated: number;
  spent: number;
  notes?: string;
}

export interface AiReport {
  id?: number;
  grantId: number;
  reportType: ReportType;
  title: string;
  generatedAt: string;
  summaryText: string;
  statusColor: 'Red' | 'Amber' | 'Green';
  recommendations: string[];
  financialSnapshot?: { projected: number; actual: number; received: number; };
  reportingPeriod?: { startDate: string; endDate: string; };
}

export interface ProposalDraft {
  id?: number;
  grantId: number;
  sectionName: string;
  content: string;
  lastUpdated: string;
}

export interface PortfolioAnalysis {
  trends: string[];
  strategy: string[];
  generatedAt: string;
}

export interface GrantRecommendation {
  focusArea: string;
  rationale: string;
  suggestedFunders: string[];
  searchKeywords: string[];
  matchScore: number;
}

export interface BudgetForecast {
  estimatedFinalSpend: number;
  status: 'Under Budget' | 'On Track' | 'Over Budget';
  analysis: string;
  recommendations: string[];
}

export interface GrantDocument {
  id?: number;
  grantId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  data: Blob | string; // Updated to allow Base64 string for mock storage
}

export interface UserSettings {
  id?: number;
  userName: string;
  userTitle: string;
  organizationName: string;
  // Included 'zen' to align with theme definitions in Layout.tsx and Dashboard.tsx
  theme: 'sanctuary' | 'bamboo' | 'zen';
  lastBackupAt?: string | null;
}
