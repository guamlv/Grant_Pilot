from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# LLM Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="GrantPilot Intelligence Suite API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class Grant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    funder: str
    manager: Optional[str] = None
    description: str = ""
    award_amount: float = 0
    start_date: str = ""
    deadline: str = ""
    status: Literal['Prospect', 'Drafting', 'Submitted', 'Awarded', 'Declined', 'Closed'] = 'Prospect'
    probability: int = 50
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GrantCreate(BaseModel):
    title: str
    funder: str = "Unknown"
    manager: Optional[str] = None
    description: str = ""
    award_amount: float = 0
    start_date: str = ""
    deadline: str = ""
    status: Literal['Prospect', 'Drafting', 'Submitted', 'Awarded', 'Declined', 'Closed'] = 'Prospect'
    probability: int = 50

class GrantUpdate(BaseModel):
    title: Optional[str] = None
    funder: Optional[str] = None
    manager: Optional[str] = None
    description: Optional[str] = None
    award_amount: Optional[float] = None
    start_date: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[Literal['Prospect', 'Drafting', 'Submitted', 'Awarded', 'Declined', 'Closed']] = None
    probability: Optional[int] = None

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    grant_id: str
    description: str
    is_completed: bool = False
    due_date: str = ""

class TaskCreate(BaseModel):
    grant_id: str
    description: str
    is_completed: bool = False
    due_date: str = ""

class FinancialSnapshot(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    grant_id: str
    date: str
    projected_spend: float = 0
    funds_received: float = 0
    actual_spend: float = 0

class FinancialSnapshotCreate(BaseModel):
    grant_id: str
    date: str
    projected_spend: float = 0
    funds_received: float = 0
    actual_spend: float = 0

class ComplianceRisk(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    grant_id: str
    summary: str
    probability: int = 3
    impact: int = 3
    level: Literal['Low', 'Medium', 'High', 'Critical'] = 'Medium'
    mitigation_plan: str = ""

class ComplianceRiskCreate(BaseModel):
    grant_id: str
    summary: str
    probability: int = 3
    impact: int = 3
    level: Literal['Low', 'Medium', 'High', 'Critical'] = 'Medium'
    mitigation_plan: str = ""

class ChecklistItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    grant_id: str
    text: str
    is_completed: bool = False

class ChecklistItemCreate(BaseModel):
    grant_id: str
    text: str
    is_completed: bool = False

class BudgetItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    grant_id: str
    category: str
    allocated: float = 0
    spent: float = 0
    notes: str = ""

class BudgetItemCreate(BaseModel):
    grant_id: str
    category: str
    allocated: float = 0
    spent: float = 0
    notes: str = ""

class AiReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    grant_id: str
    report_type: Literal['Executive Summary', 'Financial Narrative', 'Quarterly Progress', 'Final Impact Report', 'Compliance Audit']
    title: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    summary_text: str
    status_color: Literal['Red', 'Amber', 'Green'] = 'Green'
    recommendations: List[str] = []

class AiReportCreate(BaseModel):
    grant_id: str
    report_type: Literal['Executive Summary', 'Financial Narrative', 'Quarterly Progress', 'Final Impact Report', 'Compliance Audit']
    title: str
    summary_text: str
    status_color: Literal['Red', 'Amber', 'Green'] = 'Green'
    recommendations: List[str] = []

class ProposalDraft(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    grant_id: str
    section_name: str
    content: str = ""
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProposalDraftCreate(BaseModel):
    grant_id: str
    section_name: str
    content: str = ""

class GrantDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    grant_id: str
    file_name: str
    file_type: str
    file_size: int
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    data: str  # Base64 encoded

class GrantDocumentCreate(BaseModel):
    grant_id: str
    file_name: str
    file_type: str
    file_size: int
    data: str

class UserSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_name: str = "Admin User"
    user_title: str = "Grants Manager"
    organization_name: str = "Organization"
    theme: Literal['sanctuary', 'bamboo', 'zen'] = 'zen'
    last_backup_at: Optional[str] = None

class UserSettingsUpdate(BaseModel):
    user_name: Optional[str] = None
    user_title: Optional[str] = None
    organization_name: Optional[str] = None
    theme: Optional[Literal['sanctuary', 'bamboo', 'zen']] = None
    last_backup_at: Optional[str] = None

# ============== AI HELPER FUNCTIONS ==============

async def call_gemini(prompt: str, system_message: str = "You are an expert grant management AI assistant.") -> str:
    """Call Gemini AI for text generation"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

async def call_gemini_json(prompt: str, system_message: str = "You are an expert grant management AI. Always respond with valid JSON only, no markdown.") -> dict:
    """Call Gemini AI expecting JSON response"""
    try:
        response = await call_gemini(prompt, system_message)
        # Clean up response - remove markdown code blocks if present
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        import json
        return json.loads(cleaned)
    except Exception as e:
        logger.error(f"JSON parsing error: {e}")
        return {}

# ============== ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "GrantPilot Intelligence Suite API"}

# ----- GRANTS -----
@api_router.get("/grants", response_model=List[Grant])
async def get_grants():
    grants = await db.grants.find({}, {"_id": 0}).to_list(1000)
    return grants

@api_router.get("/grants/{grant_id}", response_model=Grant)
async def get_grant(grant_id: str):
    grant = await db.grants.find_one({"id": grant_id}, {"_id": 0})
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")
    return grant

@api_router.post("/grants", response_model=Grant)
async def create_grant(grant: GrantCreate):
    grant_obj = Grant(**grant.model_dump())
    doc = grant_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.grants.insert_one(doc)
    return grant_obj

@api_router.put("/grants/{grant_id}", response_model=Grant)
async def update_grant(grant_id: str, update: GrantUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.grants.update_one({"id": grant_id}, {"$set": update_data})
    grant = await db.grants.find_one({"id": grant_id}, {"_id": 0})
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")
    return grant

@api_router.delete("/grants/{grant_id}")
async def delete_grant(grant_id: str):
    result = await db.grants.delete_one({"id": grant_id})
    # Also delete related data
    await db.tasks.delete_many({"grant_id": grant_id})
    await db.financials.delete_many({"grant_id": grant_id})
    await db.risks.delete_many({"grant_id": grant_id})
    await db.checklist.delete_many({"grant_id": grant_id})
    await db.proposals.delete_many({"grant_id": grant_id})
    await db.budget_items.delete_many({"grant_id": grant_id})
    await db.reports.delete_many({"grant_id": grant_id})
    await db.documents.delete_many({"grant_id": grant_id})
    return {"deleted": result.deleted_count > 0}

# ----- TASKS -----
@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(grant_id: Optional[str] = None):
    query = {"grant_id": grant_id} if grant_id else {}
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    return tasks

@api_router.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate):
    task_obj = Task(**task.model_dump())
    await db.tasks.insert_one(task_obj.model_dump())
    return task_obj

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, is_completed: bool):
    await db.tasks.update_one({"id": task_id}, {"$set": {"is_completed": is_completed}})
    return {"updated": True}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    await db.tasks.delete_one({"id": task_id})
    return {"deleted": True}

# ----- FINANCIALS -----
@api_router.get("/financials", response_model=List[FinancialSnapshot])
async def get_financials(grant_id: Optional[str] = None):
    query = {"grant_id": grant_id} if grant_id else {}
    financials = await db.financials.find(query, {"_id": 0}).to_list(1000)
    return financials

@api_router.post("/financials", response_model=FinancialSnapshot)
async def create_financial(financial: FinancialSnapshotCreate):
    fin_obj = FinancialSnapshot(**financial.model_dump())
    await db.financials.insert_one(fin_obj.model_dump())
    return fin_obj

@api_router.delete("/financials/{financial_id}")
async def delete_financial(financial_id: str):
    await db.financials.delete_one({"id": financial_id})
    return {"deleted": True}

# ----- RISKS -----
@api_router.get("/risks", response_model=List[ComplianceRisk])
async def get_risks(grant_id: Optional[str] = None):
    query = {"grant_id": grant_id} if grant_id else {}
    risks = await db.risks.find(query, {"_id": 0}).to_list(1000)
    return risks

@api_router.post("/risks", response_model=ComplianceRisk)
async def create_risk(risk: ComplianceRiskCreate):
    risk_obj = ComplianceRisk(**risk.model_dump())
    await db.risks.insert_one(risk_obj.model_dump())
    return risk_obj

@api_router.delete("/risks/{risk_id}")
async def delete_risk(risk_id: str):
    await db.risks.delete_one({"id": risk_id})
    return {"deleted": True}

# ----- CHECKLIST -----
@api_router.get("/checklist", response_model=List[ChecklistItem])
async def get_checklist(grant_id: Optional[str] = None):
    query = {"grant_id": grant_id} if grant_id else {}
    items = await db.checklist.find(query, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/checklist", response_model=ChecklistItem)
async def create_checklist_item(item: ChecklistItemCreate):
    item_obj = ChecklistItem(**item.model_dump())
    await db.checklist.insert_one(item_obj.model_dump())
    return item_obj

@api_router.put("/checklist/{item_id}")
async def update_checklist_item(item_id: str, is_completed: bool):
    await db.checklist.update_one({"id": item_id}, {"$set": {"is_completed": is_completed}})
    return {"updated": True}

@api_router.delete("/checklist/{item_id}")
async def delete_checklist_item(item_id: str):
    await db.checklist.delete_one({"id": item_id})
    return {"deleted": True}

# ----- BUDGET ITEMS -----
@api_router.get("/budget-items", response_model=List[BudgetItem])
async def get_budget_items(grant_id: Optional[str] = None):
    query = {"grant_id": grant_id} if grant_id else {}
    items = await db.budget_items.find(query, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/budget-items", response_model=BudgetItem)
async def create_budget_item(item: BudgetItemCreate):
    item_obj = BudgetItem(**item.model_dump())
    await db.budget_items.insert_one(item_obj.model_dump())
    return item_obj

@api_router.delete("/budget-items/{item_id}")
async def delete_budget_item(item_id: str):
    await db.budget_items.delete_one({"id": item_id})
    return {"deleted": True}

# ----- PROPOSALS -----
@api_router.get("/proposals", response_model=List[ProposalDraft])
async def get_proposals(grant_id: Optional[str] = None):
    query = {"grant_id": grant_id} if grant_id else {}
    proposals = await db.proposals.find(query, {"_id": 0}).to_list(1000)
    return proposals

@api_router.post("/proposals", response_model=ProposalDraft)
async def create_proposal(proposal: ProposalDraftCreate):
    prop_obj = ProposalDraft(**proposal.model_dump())
    await db.proposals.insert_one(prop_obj.model_dump())
    return prop_obj

@api_router.put("/proposals/{proposal_id}")
async def update_proposal(proposal_id: str, content: str):
    await db.proposals.update_one(
        {"id": proposal_id}, 
        {"$set": {"content": content, "last_updated": datetime.now(timezone.utc).isoformat()}}
    )
    return {"updated": True}

@api_router.delete("/proposals/{proposal_id}")
async def delete_proposal(proposal_id: str):
    await db.proposals.delete_one({"id": proposal_id})
    return {"deleted": True}

# ----- REPORTS -----
@api_router.get("/reports", response_model=List[AiReport])
async def get_reports(grant_id: Optional[str] = None):
    query = {"grant_id": grant_id} if grant_id else {}
    reports = await db.reports.find(query, {"_id": 0}).to_list(1000)
    return reports

@api_router.post("/reports", response_model=AiReport)
async def create_report(report: AiReportCreate):
    report_obj = AiReport(**report.model_dump())
    await db.reports.insert_one(report_obj.model_dump())
    return report_obj

@api_router.delete("/reports/{report_id}")
async def delete_report(report_id: str):
    await db.reports.delete_one({"id": report_id})
    return {"deleted": True}

# ----- DOCUMENTS -----
@api_router.get("/documents", response_model=List[GrantDocument])
async def get_documents(grant_id: Optional[str] = None):
    query = {"grant_id": grant_id} if grant_id else {}
    docs = await db.documents.find(query, {"_id": 0}).to_list(1000)
    return docs

@api_router.post("/documents", response_model=GrantDocument)
async def create_document(doc: GrantDocumentCreate):
    doc_obj = GrantDocument(**doc.model_dump())
    await db.documents.insert_one(doc_obj.model_dump())
    return doc_obj

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    await db.documents.delete_one({"id": doc_id})
    return {"deleted": True}

# ----- SETTINGS -----
@api_router.get("/settings", response_model=UserSettings)
async def get_settings():
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        # Create default settings
        default = UserSettings()
        await db.settings.insert_one(default.model_dump())
        return default
    return settings

@api_router.put("/settings")
async def update_settings(update: UserSettingsUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        existing = await db.settings.find_one({})
        if existing:
            await db.settings.update_one({}, {"$set": update_data})
        else:
            default = UserSettings(**update_data)
            await db.settings.insert_one(default.model_dump())
    settings = await db.settings.find_one({}, {"_id": 0})
    return settings

# ============== AI ENDPOINTS ==============

class DraftProposalRequest(BaseModel):
    grant_title: str
    section: str
    context: str = ""
    tone: str = "Professional"

@api_router.post("/ai/draft-proposal")
async def draft_proposal(request: DraftProposalRequest):
    prompt = f"""Role: Expert Grant Writer.
Task: Draft the "{request.section}" section for a grant titled "{request.grant_title}".
Context: {request.context}
Tone: {request.tone}
Length: Approximately 250 words.
Requirement: Return only the drafted text without markdown code blocks or preamble."""
    
    content = await call_gemini(prompt)
    return {"content": content}

class GenerateReportRequest(BaseModel):
    grant_title: str
    grant_status: str
    metrics: str = "N/A"
    risks: str = "None identified"
    instructions: str = ""

@api_router.post("/ai/generate-report")
async def generate_report(request: GenerateReportRequest):
    prompt = f"""Executive Report Request for "{request.grant_title}".
Current Phase: {request.grant_status}.
Performance Metrics: {request.metrics}.
Identified Risks: {request.risks}.
Strategic Directives: {request.instructions}.

Generate a comprehensive report with:
1. A professional title
2. An overall status (Red/Amber/Green)
3. A detailed summary (2-3 paragraphs)
4. 3-5 actionable recommendations

Return as JSON: {{"title": "...", "statusColor": "Green|Amber|Red", "summaryText": "...", "recommendations": ["...", "..."]}}"""

    result = await call_gemini_json(prompt)
    return result

class ParseDocumentRequest(BaseModel):
    base64_data: str
    mime_type: str

@api_router.post("/ai/parse-document")
async def parse_document(request: ParseDocumentRequest):
    # For text documents, decode and analyze
    try:
        data = request.base64_data
        if ',' in data:
            data = data.split(',')[1]
        
        if request.mime_type == 'text/plain':
            content = base64.b64decode(data).decode('utf-8')
        else:
            content = "[Document content - PDF parsing limited in text mode]"
        
        prompt = f"""Analyze this grant document and extract key information.

Document content:
{content[:5000]}

Extract and return as JSON:
{{
    "title": "Project/Grant title",
    "funder": "Funding organization name",
    "awardAmount": numeric_value_or_0,
    "deadline": "YYYY-MM-DD or empty string",
    "description": "Brief description",
    "probability": estimated_win_probability_0_to_100
}}"""

        result = await call_gemini_json(prompt)
        return result
    except Exception as e:
        logger.error(f"Document parsing error: {e}")
        return {"title": "", "funder": "", "awardAmount": 0, "deadline": "", "description": "", "probability": 50}

class AnalyzeRisksRequest(BaseModel):
    base64_data: str
    mime_type: str

@api_router.post("/ai/analyze-risks")
async def analyze_risks(request: AnalyzeRisksRequest):
    try:
        data = request.base64_data
        if ',' in data:
            data = data.split(',')[1]
        
        if request.mime_type == 'text/plain':
            content = base64.b64decode(data).decode('utf-8')
        else:
            content = "[Document content]"
        
        prompt = f"""Analyze this document for operational, financial, and compliance risks.

Document:
{content[:5000]}

Identify the top 3 critical risks. Return as JSON array:
[
    {{"summary": "Risk description", "level": "Low|Medium|High|Critical", "mitigationPlan": "How to address"}},
    ...
]"""

        result = await call_gemini_json(prompt)
        if isinstance(result, list):
            return result
        return []
    except Exception as e:
        logger.error(f"Risk analysis error: {e}")
        return []

class PortfolioAnalysisRequest(BaseModel):
    grants_count: int
    grants_summary: str = ""

@api_router.post("/ai/portfolio-analysis")
async def portfolio_analysis(request: PortfolioAnalysisRequest):
    prompt = f"""Strategic Portfolio Review for {request.grants_count} active projects.
{request.grants_summary}

Analyze the portfolio and provide:
1. 3 significant market trends
2. 3 long-term strategic recommendations

Return as JSON:
{{"trends": ["trend1", "trend2", "trend3"], "strategy": ["rec1", "rec2", "rec3"]}}"""

    result = await call_gemini_json(prompt)
    result["generatedAt"] = datetime.now(timezone.utc).isoformat()
    return result

class GrantDiscoveryRequest(BaseModel):
    organization_name: str
    current_focus: str = ""

@api_router.post("/ai/grant-discovery")
async def grant_discovery(request: GrantDiscoveryRequest):
    prompt = f"""Discovery Mode for: {request.organization_name}
Current Focus: {request.current_focus}

Find 3 high-probability grant opportunities. For each provide:
- Focus area
- Rationale
- Suggested funders
- Search keywords
- Match score (0-100)

Return as JSON array:
[{{"focusArea": "...", "rationale": "...", "suggestedFunders": ["..."], "searchKeywords": ["..."], "matchScore": 85}}]"""

    result = await call_gemini_json(prompt)
    if isinstance(result, list):
        return result
    return []

class BudgetForecastRequest(BaseModel):
    grant_title: str
    total_award: float
    current_spend: float = 0
    budget_items: str = ""

@api_router.post("/ai/budget-forecast")
async def budget_forecast(request: BudgetForecastRequest):
    prompt = f"""Financial Forecasting for "{request.grant_title}"
Total Award: ${request.total_award:,.0f}
Current Spend: ${request.current_spend:,.0f}
Budget Categories: {request.budget_items}

Predict the Estimated Final Cost and provide analysis.

Return as JSON:
{{"estimatedFinalSpend": number, "status": "Under Budget|On Track|Over Budget", "analysis": "detailed analysis", "recommendations": ["rec1", "rec2", "rec3"]}}"""

    result = await call_gemini_json(prompt)
    return result

# ----- SEED DATA -----
@api_router.post("/seed")
async def seed_database():
    """Seed initial demo data if database is empty"""
    grants_count = await db.grants.count_documents({})
    if grants_count > 0:
        return {"message": "Database already has data", "seeded": False}
    
    # Create demo grant
    demo_grant = Grant(
        title="Infrastructure Modernization Fund",
        description="Federal grant for grid resilience and safety improvements across metropolitan areas.",
        award_amount=2450000,
        start_date="2024-01-01",
        deadline="2025-12-30",
        status="Awarded",
        funder="Dept. of Energy",
        manager="Sarah Chen",
        probability=100
    )
    await db.grants.insert_one({**demo_grant.model_dump(), "created_at": demo_grant.created_at.isoformat()})
    
    # Add financial snapshot
    financial = FinancialSnapshot(
        grant_id=demo_grant.id,
        date="2024-03-31",
        projected_spend=250000,
        funds_received=210000,
        actual_spend=230000
    )
    await db.financials.insert_one(financial.model_dump())
    
    # Add more financial history
    financial2 = FinancialSnapshot(
        grant_id=demo_grant.id,
        date="2024-06-30",
        projected_spend=500000,
        funds_received=480000,
        actual_spend=465000
    )
    await db.financials.insert_one(financial2.model_dump())
    
    financial3 = FinancialSnapshot(
        grant_id=demo_grant.id,
        date="2024-09-30",
        projected_spend=750000,
        funds_received=720000,
        actual_spend=695000
    )
    await db.financials.insert_one(financial3.model_dump())
    
    # Add risk
    risk = ComplianceRisk(
        grant_id=demo_grant.id,
        summary="Audit documentation missing for Q1",
        level="High",
        mitigation_plan="Reconstruct digital records from portal and request backup from finance department.",
        probability=5,
        impact=4
    )
    await db.risks.insert_one(risk.model_dump())
    
    risk2 = ComplianceRisk(
        grant_id=demo_grant.id,
        summary="Vendor compliance certificates expiring",
        level="Medium",
        mitigation_plan="Contact vendors 60 days before expiration for renewal documentation.",
        probability=3,
        impact=3
    )
    await db.risks.insert_one(risk2.model_dump())
    
    # Add task
    task = Task(
        grant_id=demo_grant.id,
        description="Submit Q4 Financial Report",
        is_completed=False,
        due_date="2025-01-15"
    )
    await db.tasks.insert_one(task.model_dump())
    
    task2 = Task(
        grant_id=demo_grant.id,
        description="Schedule Annual Compliance Review",
        is_completed=True,
        due_date="2024-12-01"
    )
    await db.tasks.insert_one(task2.model_dump())
    
    # Add checklist items
    checks = [
        "Environmental impact assessment complete",
        "Quarterly expenditure report submitted",
        "Subcontractor agreements on file",
        "Progress photos uploaded to portal"
    ]
    for i, check in enumerate(checks):
        item = ChecklistItem(grant_id=demo_grant.id, text=check, is_completed=i < 2)
        await db.checklist.insert_one(item.model_dump())
    
    # Add budget items
    budgets = [
        {"category": "Personnel", "allocated": 800000, "spent": 285000},
        {"category": "Equipment", "allocated": 650000, "spent": 180000},
        {"category": "Subcontracts", "allocated": 500000, "spent": 150000},
        {"category": "Travel", "allocated": 100000, "spent": 35000},
        {"category": "Indirect Costs", "allocated": 400000, "spent": 145000}
    ]
    for b in budgets:
        item = BudgetItem(grant_id=demo_grant.id, **b)
        await db.budget_items.insert_one(item.model_dump())
    
    # Create default settings
    settings = UserSettings()
    await db.settings.insert_one(settings.model_dump())
    
    return {"message": "Demo data seeded successfully", "seeded": True, "grant_id": demo_grant.id}

# ----- DATA EXPORT/IMPORT -----
@api_router.get("/export")
async def export_data():
    """Export all data for backup"""
    data = {
        "grants": await db.grants.find({}, {"_id": 0}).to_list(1000),
        "tasks": await db.tasks.find({}, {"_id": 0}).to_list(1000),
        "financials": await db.financials.find({}, {"_id": 0}).to_list(1000),
        "risks": await db.risks.find({}, {"_id": 0}).to_list(1000),
        "checklist": await db.checklist.find({}, {"_id": 0}).to_list(1000),
        "proposals": await db.proposals.find({}, {"_id": 0}).to_list(1000),
        "budget_items": await db.budget_items.find({}, {"_id": 0}).to_list(1000),
        "reports": await db.reports.find({}, {"_id": 0}).to_list(1000),
        "documents": await db.documents.find({}, {"_id": 0}).to_list(1000),
        "settings": await db.settings.find({}, {"_id": 0}).to_list(10),
    }
    return data

class ImportDataRequest(BaseModel):
    grants: List[dict] = []
    tasks: List[dict] = []
    financials: List[dict] = []
    risks: List[dict] = []
    checklist: List[dict] = []
    proposals: List[dict] = []
    budget_items: List[dict] = []
    reports: List[dict] = []
    documents: List[dict] = []
    settings: List[dict] = []

@api_router.post("/import")
async def import_data(data: ImportDataRequest):
    """Import data from backup"""
    # Clear existing data
    await db.grants.delete_many({})
    await db.tasks.delete_many({})
    await db.financials.delete_many({})
    await db.risks.delete_many({})
    await db.checklist.delete_many({})
    await db.proposals.delete_many({})
    await db.budget_items.delete_many({})
    await db.reports.delete_many({})
    await db.documents.delete_many({})
    await db.settings.delete_many({})
    
    # Import new data
    if data.grants:
        await db.grants.insert_many(data.grants)
    if data.tasks:
        await db.tasks.insert_many(data.tasks)
    if data.financials:
        await db.financials.insert_many(data.financials)
    if data.risks:
        await db.risks.insert_many(data.risks)
    if data.checklist:
        await db.checklist.insert_many(data.checklist)
    if data.proposals:
        await db.proposals.insert_many(data.proposals)
    if data.budget_items:
        await db.budget_items.insert_many(data.budget_items)
    if data.reports:
        await db.reports.insert_many(data.reports)
    if data.documents:
        await db.documents.insert_many(data.documents)
    if data.settings:
        await db.settings.insert_many(data.settings)
    
    return {"message": "Data imported successfully"}

@api_router.delete("/clear-all")
async def clear_all_data():
    """Clear all data (factory reset)"""
    await db.grants.delete_many({})
    await db.tasks.delete_many({})
    await db.financials.delete_many({})
    await db.risks.delete_many({})
    await db.checklist.delete_many({})
    await db.proposals.delete_many({})
    await db.budget_items.delete_many({})
    await db.reports.delete_many({})
    await db.documents.delete_many({})
    await db.settings.delete_many({})
    return {"message": "All data cleared"}

# Include the router
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
