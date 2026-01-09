
/**
 * Global AI Prompt Registry
 * Centralized templates for consistent intelligence behavior and easier A/B testing.
 */
export const PROMPTS = {
  PROPOSAL_DRAFT: (title: string, section: string, ctx: string, tone: string) => 
    `Role: Expert Grant Writer. 
     Task: Draft the "${section}" section for a grant titled "${title}". 
     Context: ${ctx}. 
     Tone: ${tone}. 
     Length: Approximately 250 words. 
     Requirement: Return only the drafted text without markdown code blocks or preamble.`,

  COMPREHENSIVE_REPORT: (title: string, status: string, metrics: string, risks: string, instr: string) => 
    `Executive Report Request for "${title}". 
     Current Phase: ${status}.
     Performance Metrics: ${metrics}.
     Identified Risks: ${risks}.
     Strategic Directives: ${instr}.
     Constraint: Output must be valid JSON matching the schema provided.`,

  DOCUMENT_EXTRACTION: `Analyze the attached grant document. Extract the Project Title, Funder Name, Total Award Amount (as a number), and the specific Submission Deadline (YYYY-MM-DD). If information is missing, infer logically from context.`,

  RISK_SCAN: `Analyze the provided documentation for operational, financial, and compliance hazards. Identify the top 3 critical risks. For each, provide a concise summary, an impact level (Low/Medium/High/Critical), and a concrete mitigation strategy.`,

  PORTFOLIO_ANALYSIS: (count: number) => 
    `Strategic Portfolio Review for ${count} active projects. 
     Analyze historical win rates, funding concentration, and sector diversity. 
     Identify 3 significant market trends and 3 long-term strategic recommendations.`,

  GRANT_DISCOVERY: (org: string) => 
    `Discovery Mode. Organization: ${org}. 
     Analyze current funding landscape and find 3 high-probability grant opportunities. 
     Provide rationale, suggested funders, and technical search keywords for each.`,

  BUDGET_FORECAST: (title: string, budget: number) => 
    `Financial Forecasting for "${title}" (Total Award: $${budget}). 
     Analyze current expenditure vs allocation to predict the Estimated Final Cost. 
     Identify efficiency status and provide 3 prescriptive financial corrective actions.`
};
