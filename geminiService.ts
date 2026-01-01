
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Grant, ComplianceRisk, Task, AiReport, FinancialMetrics, PortfolioAnalysis, BudgetItem, BudgetForecast, ReportType, ProposalDraft, GrantDocument, UserSettings, GrantRecommendation } from "../types";

// VERCEL MIGRATION NOTE:
// In production, this entire file should be replaced by calls to your Vercel API routes.
// Example: const res = await fetch('/api/ai/draft-proposal', { ... });
// This keeps your API_KEY secure on the server.

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanJson = (text: string) => text.replace(/```json\s*|```\s*$/g, "").trim();

async function askAI<T>(prompt: string, schema?: Schema): Promise<T> {
  if (!process.env.API_KEY) {
      console.warn("Missing API Key. In Vercel, ensure this logic runs server-side.");
      throw new Error("API Key missing. Please configure your environment.");
  }

  try {
    const res = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: schema ? { responseMimeType: "application/json", responseSchema: schema } : undefined
    });
    return schema ? JSON.parse(cleanJson(res.text || "{}")) : (res.text as unknown as T);
  } catch (e) {
    console.error("AI Error:", e);
    throw new Error("AI Request Failed");
  }
}

export const draftProposalSection = (grant: Grant, section: string, ctx: string, tone: string) => 
  askAI<string>(`Role: Grant Writer. Task: Draft "${section}" for grant: ${grant.title} (${grant.funder}, $${grant.awardAmount}). Context: ${ctx}. Tone: ${tone}. Length: 200-300 words. Output: Just the text.`);

export const generateComprehensiveReport = async (
  grant: Grant, type: ReportType, instr: string, fin: FinancialMetrics | null, budget: BudgetItem[], risks: ComplianceRisk[], tasks: Task[], props: ProposalDraft[], docs: GrantDocument[], period?: { startDate: string, endDate: string }
): Promise<AiReport> => {
  const prompt = `Role: Compliance Officer. Write a ${type}.
    Grant: ${grant.title} (${grant.funder}). Status: ${grant.status}.
    Financials: ${fin ? `Spent $${fin.actualSpend} of $${grant.awardAmount}` : 'N/A'}.
    Budget: ${budget.map(b => `${b.category}: $${b.spent}/$${b.allocated}`).join(', ')}.
    Risks: ${risks.map(r => r.summary).join(', ')}.
    Context: ${instr}.
    Return JSON: {title, statusColor (Red/Amber/Green), summaryText, recommendations[]}`;

  const res = await askAI<any>(prompt, {
    type: Type.OBJECT,
    properties: { title: { type: Type.STRING }, statusColor: { type: Type.STRING, enum: ["Red", "Amber", "Green"] }, summaryText: { type: Type.STRING }, recommendations: { type: Type.ARRAY, items: { type: Type.STRING } } },
    required: ["title", "statusColor", "summaryText", "recommendations"]
  });

  return {
    grantId: grant.id!, reportType: type, title: res.title, generatedAt: new Date().toISOString(),
    summaryText: res.summaryText, statusColor: res.statusColor, recommendations: res.recommendations,
    financialSnapshot: fin ? { projected: fin.projectedSpend, actual: fin.actualSpend, received: fin.fundsReceived } : undefined,
    reportingPeriod: period
  };
};

export const generatePortfolioAnalysis = (grants: Grant[]) => 
  askAI<PortfolioAnalysis>(`Role: Strategist. Analyze ${grants.length} grants. Won: ${grants.filter(g=>g.status==='Awarded').length}.
    Return JSON: {trends[], strategy[]}`, {
    type: Type.OBJECT, properties: { trends: { type: Type.ARRAY, items: { type: Type.STRING } }, strategy: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["trends", "strategy"]
  }).then(r => ({ ...r, generatedAt: new Date().toISOString() }));

export const generateGrantRecommendations = (grants: Grant[], profile: UserSettings | null) => 
  askAI<GrantRecommendation[]>(`Role: Prospect Researcher. Org: ${profile?.organizationName}. History: ${grants.filter(g=>g.status==='Awarded').map(g=>g.title).join(', ')}.
    Suggest 3 grants. JSON Array: [{focusArea, rationale, suggestedFunders[], searchKeywords[], matchScore}]`, {
    type: Type.ARRAY, items: { type: Type.OBJECT, properties: { focusArea: { type: Type.STRING }, rationale: { type: Type.STRING }, suggestedFunders: { type: Type.ARRAY, items: { type: Type.STRING } }, searchKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }, matchScore: { type: Type.NUMBER } }, required: ["focusArea", "rationale", "suggestedFunders", "searchKeywords", "matchScore"] }
  });

export const generateBudgetForecast = (grant: Grant, hist: FinancialMetrics[], items: BudgetItem[]) => 
  askAI<BudgetForecast>(`Role: Financial Analyst. Forecast budget. Grant: ${grant.title}. Award: $${grant.awardAmount}.
    Spent: ${hist.length ? hist[hist.length-1].actualSpend : 0}. Items: ${items.map(i=>`${i.category}:$${i.spent}`).join(',')}.
    Return JSON: {estimatedFinalSpend, status (Under Budget/On Track/Over Budget), analysis, recommendations[]}`, {
    type: Type.OBJECT, properties: { estimatedFinalSpend: { type: Type.NUMBER }, status: { type: Type.STRING, enum: ["Under Budget", "On Track", "Over Budget"] }, analysis: { type: Type.STRING }, recommendations: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["estimatedFinalSpend", "status", "analysis", "recommendations"]
  });
