
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PROMPTS } from "./promptRegistry.ts";
import { Grant, ComplianceRisk, Task, AiReport, FinancialMetrics, PortfolioAnalysis, BudgetItem, BudgetForecast, ReportType, ProposalDraft, GrantDocument, UserSettings, GrantRecommendation } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanJson = (text: string | undefined) => {
  if (!text) return "{}";
  return text.replace(/```json\s*|```\s*$/g, "").trim();
};

async function askAI<T>(prompt: string, schema?: Schema): Promise<T> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: schema ? { 
      responseMimeType: "application/json", 
      responseSchema: schema 
    } : undefined
  });
  
  const text = response.text;
  return schema ? JSON.parse(cleanJson(text)) : (text as unknown as T);
}

export const draftProposalSection = (grant: Grant, section: string, ctx: string, tone: string) => 
  askAI<string>(PROMPTS.PROPOSAL_DRAFT(grant.title, section, ctx, tone));

export const generateComprehensiveReport = async (
  grant: Grant, type: ReportType, instr: string, fin: FinancialMetrics | null, budget: BudgetItem[], risks: ComplianceRisk[]
): Promise<AiReport> => {
  const metrics = fin ? `CV: ${fin.variance}, Spent: ${fin.actualSpend}` : 'N/A';
  const riskList = risks.map(r => r.summary).join(', ');
  
  const res = await askAI<any>(PROMPTS.COMPREHENSIVE_REPORT(grant.title, grant.status, metrics, riskList, instr), {
    type: Type.OBJECT,
    properties: { 
      title: { type: Type.STRING }, 
      statusColor: { type: Type.STRING, enum: ["Red", "Amber", "Green"] }, 
      summaryText: { type: Type.STRING }, 
      recommendations: { type: Type.ARRAY, items: { type: Type.STRING } } 
    },
    required: ["title", "statusColor", "summaryText", "recommendations"]
  });

  return {
    grantId: grant.id!, reportType: type, title: res.title, generatedAt: new Date().toISOString(),
    summaryText: res.summaryText, statusColor: res.statusColor, recommendations: res.recommendations
  };
};

export const parseGrantDocument = async (base64Data: string, mimeType: string) => {
  const data = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const parts = mimeType === 'application/pdf' 
    ? [{ inlineData: { mimeType, data } }, { text: PROMPTS.DOCUMENT_EXTRACTION }]
    : [{ text: `${PROMPTS.DOCUMENT_EXTRACTION}\n\nContent:\n${atob(data)}` }];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          funder: { type: Type.STRING },
          awardAmount: { type: Type.NUMBER },
          deadline: { type: Type.STRING },
          description: { type: Type.STRING },
          probability: { type: Type.NUMBER }
        }
      }
    }
  });
  return JSON.parse(cleanJson(response.text));
};

export const analyzeDocumentRisks = async (base64Data: string, mimeType: string) => {
  const data = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const parts = mimeType === 'application/pdf'
    ? [{ inlineData: { mimeType, data } }, { text: PROMPTS.RISK_SCAN }]
    : [{ text: `${PROMPTS.RISK_SCAN}\n\nContent:\n${atob(data)}` }];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
             summary: { type: Type.STRING },
             level: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
             mitigationPlan: { type: Type.STRING }
          }
        }
      }
    }
  });
  return JSON.parse(cleanJson(response.text));
};

export const generatePortfolioAnalysis = (grants: Grant[]) => 
  askAI<PortfolioAnalysis>(PROMPTS.PORTFOLIO_ANALYSIS(grants.length), {
    type: Type.OBJECT, 
    properties: { 
      trends: { type: Type.ARRAY, items: { type: Type.STRING } }, 
      strategy: { type: Type.ARRAY, items: { type: Type.STRING } } 
    }, 
    required: ["trends", "strategy"]
  }).then(r => ({ ...r, generatedAt: new Date().toISOString() }));

export const generateGrantRecommendations = (grants: Grant[], profile: UserSettings | null) => 
  askAI<GrantRecommendation[]>(PROMPTS.GRANT_DISCOVERY(profile?.organizationName || 'a non-profit'), {
    type: Type.ARRAY, 
    items: { 
      type: Type.OBJECT, 
      properties: { 
        focusArea: { type: Type.STRING }, 
        rationale: { type: Type.STRING }, 
        suggestedFunders: { type: Type.ARRAY, items: { type: Type.STRING } }, 
        searchKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }, 
        matchScore: { type: Type.NUMBER } 
      } 
    }
  });

export const generateBudgetForecast = (grant: Grant, hist: FinancialMetrics[], items: BudgetItem[]) => 
  askAI<BudgetForecast>(PROMPTS.BUDGET_FORECAST(grant.title, grant.awardAmount), {
    type: Type.OBJECT, 
    properties: { 
      estimatedFinalSpend: { type: Type.NUMBER }, 
      status: { type: Type.STRING, enum: ["Under Budget", "On Track", "Over Budget"] }, 
      analysis: { type: Type.STRING }, 
      recommendations: { type: Type.ARRAY, items: { type: Type.STRING } } 
    }
  });
