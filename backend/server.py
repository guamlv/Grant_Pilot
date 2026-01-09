from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client['grantpilot_v2']

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="GrantPilot - Grant Management for Small Nonprofits")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

# Organization Content Library
class ContentItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: Literal['mission', 'history', 'leadership', 'programs', 'financials', 'boilerplate', 'other']
    title: str
    content: str
    tags: List[str] = []
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ContentItemCreate(BaseModel):
    category: Literal['mission', 'history', 'leadership', 'programs', 'financials', 'boilerplate', 'other']
    title: str
    content: str
    tags: List[str] = []

# Funder Profiles
class FunderProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    website: str = ""
    portal_url: str = ""
    portal_login_notes: str = ""
    priorities: str = ""
    restrictions: str = ""
    typical_award_range: str = ""
    application_requirements: List[str] = []
    contact_name: str = ""
    contact_email: str = ""
    relationship_notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FunderProfileCreate(BaseModel):
    name: str
    website: str = ""
    portal_url: str = ""
    portal_login_notes: str = ""
    priorities: str = ""
    restrictions: str = ""
    typical_award_range: str = ""
    application_requirements: List[str] = []
    contact_name: str = ""
    contact_email: str = ""
    relationship_notes: str = ""

# Grant Pipeline
class Grant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    funder_id: Optional[str] = None
    funder_name: str = ""
    amount_requested: float = 0
    amount_awarded: float = 0
    stage: Literal['researching', 'writing', 'submitted', 'pending', 'awarded', 'declined', 'closed'] = 'researching'
    deadline: str = ""
    submitted_date: str = ""
    decision_date: str = ""
    grant_period_start: str = ""
    grant_period_end: str = ""
    program: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GrantCreate(BaseModel):
    title: str
    funder_id: Optional[str] = None
    funder_name: str = ""
    amount_requested: float = 0
    stage: Literal['researching', 'writing', 'submitted', 'pending', 'awarded', 'declined', 'closed'] = 'researching'
    deadline: str = ""
    program: str = ""
    notes: str = ""

class GrantUpdate(BaseModel):
    title: Optional[str] = None
    funder_id: Optional[str] = None
    funder_name: Optional[str] = None
    amount_requested: Optional[float] = None
    amount_awarded: Optional[float] = None
    stage: Optional[Literal['researching', 'writing', 'submitted', 'pending', 'awarded', 'declined', 'closed']] = None
    deadline: Optional[str] = None
    submitted_date: Optional[str] = None
    decision_date: Optional[str] = None
    grant_period_start: Optional[str] = None
    grant_period_end: Optional[str] = None
    program: Optional[str] = None
    notes: Optional[str] = None

# Post-Award Compliance & Reporting
class ReportingRequirement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    grant_id: str
    report_type: Literal['financial', 'narrative', 'progress', 'final', 'audit', 'other']
    title: str
    description: str = ""
    due_date: str
    frequency: Literal['one-time', 'monthly', 'quarterly', 'semi-annual', 'annual'] = 'one-time'
    status: Literal['upcoming', 'in-progress', 'submitted', 'approved'] = 'upcoming'
    submitted_date: str = ""
    notes: str = ""

class ReportingRequirementCreate(BaseModel):
    grant_id: str
    report_type: Literal['financial', 'narrative', 'progress', 'final', 'audit', 'other']
    title: str
    description: str = ""
    due_date: str
    frequency: Literal['one-time', 'monthly', 'quarterly', 'semi-annual', 'annual'] = 'one-time'
    notes: str = ""

class ComplianceItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    grant_id: str
    requirement: str
    category: Literal['spending', 'documentation', 'programmatic', 'audit', 'other'] = 'other'
    deadline: str = ""
    is_completed: bool = False
    notes: str = ""

class ComplianceItemCreate(BaseModel):
    grant_id: str
    requirement: str
    category: Literal['spending', 'documentation', 'programmatic', 'audit', 'other'] = 'other'
    deadline: str = ""
    notes: str = ""

# Budget Builder
class BudgetTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    grant_id: Optional[str] = None
    line_items: List[dict] = []  # {category, description, amount, notes}
    total: float = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BudgetTemplateCreate(BaseModel):
    name: str
    grant_id: Optional[str] = None
    line_items: List[dict] = []

# Outcome Bank
class OutcomeMetric(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    program: str
    metric_type: Literal['output', 'outcome', 'testimonial', 'demographic']
    title: str
    value: str
    time_period: str = ""
    source: str = ""
    notes: str = ""
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OutcomeMetricCreate(BaseModel):
    program: str
    metric_type: Literal['output', 'outcome', 'testimonial', 'demographic']
    title: str
    value: str
    time_period: str = ""
    source: str = ""
    notes: str = ""

# Settings
class OrgSettings(BaseModel):
    id: str = "default"
    org_name: str = ""
    ein: str = ""
    fiscal_year_end: str = ""
    primary_contact: str = ""
    primary_email: str = ""

# ============== AI HELPER ==============

async def call_gemini(prompt: str, system_msg: str = "") -> str:
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=system_msg or "You are a grant management assistant for small nonprofits."
        ).with_model("gemini", "gemini-2.5-flash")
        response = await chat.send_message(UserMessage(text=prompt))
        return response
    except Exception as e:
        logger.error(f"AI error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

async def call_gemini_json(prompt: str) -> dict:
    try:
        response = await call_gemini(prompt, "You extract structured data from documents. Always respond with valid JSON only, no markdown code blocks.")
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        return {}

# ============== API ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "GrantPilot API - Grant Management for Small Nonprofits"}

# ----- Dashboard Metrics -----
def days_until(date_str):
    """Calculate days until a date string (YYYY-MM-DD format)"""
    if not date_str:
        return None
    try:
        target = datetime.strptime(date_str[:10], "%Y-%m-%d")
        today = datetime.now()
        return (target - today).days
    except:
        return None

@api_router.get("/dashboard")
async def get_dashboard():
    grants = await db.grants.find({}, {"_id": 0}).to_list(1000)
    reports = await db.reporting.find({}, {"_id": 0}).to_list(1000)
    compliance = await db.compliance.find({}, {"_id": 0}).to_list(1000)
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Pipeline counts
    pipeline = {stage: 0 for stage in ['researching', 'writing', 'submitted', 'pending', 'awarded', 'declined', 'closed']}
    total_pending = 0
    total_awarded = 0
    
    upcoming_deadlines = []
    
    for g in grants:
        pipeline[g.get('stage', 'researching')] += 1
        if g.get('stage') in ['researching', 'writing', 'submitted', 'pending']:
            total_pending += g.get('amount_requested', 0)
        if g.get('stage') == 'awarded':
            total_awarded += g.get('amount_awarded', 0)
        
        # Deadline alerts
        if g.get('deadline') and g.get('stage') in ['researching', 'writing']:
            deadline = g['deadline']
            dl = days_until(deadline)
            if dl is not None and dl >= 0:
                upcoming_deadlines.append({
                    'type': 'application',
                    'grant_id': g['id'],
                    'title': g['title'],
                    'date': deadline,
                    'days_left': dl
                })
    
    # Reporting deadlines
    for r in reports:
        if r.get('status') in ['upcoming', 'in-progress'] and r.get('due_date'):
            due = r['due_date']
            dl = days_until(due)
            if dl is not None and dl >= 0:
                upcoming_deadlines.append({
                    'type': 'report',
                    'report_type': r.get('report_type'),
                    'grant_id': r.get('grant_id'),
                    'title': r['title'],
                    'date': due,
                    'days_left': dl
                })
    
    # Compliance deadlines
    for c in compliance:
        if not c.get('is_completed') and c.get('deadline'):
            deadline = c['deadline']
            dl = days_until(deadline)
            if dl is not None and dl >= 0:
                upcoming_deadlines.append({
                    'type': 'compliance',
                    'grant_id': c.get('grant_id'),
                    'title': c['requirement'],
                    'date': deadline,
                    'days_left': dl
                })
    
    # Sort by urgency
    upcoming_deadlines.sort(key=lambda x: x['days_left'])
    
    # Overdue items
    overdue_reports = [r for r in reports if r.get('status') in ['upcoming', 'in-progress'] and r.get('due_date', '') < today]
    overdue_compliance = [c for c in compliance if not c.get('is_completed') and c.get('deadline', '') and c.get('deadline', '') < today]
    
    return {
        'pipeline': pipeline,
        'total_pending': total_pending,
        'total_awarded': total_awarded,
        'active_grants': pipeline['awarded'],
        'in_progress': pipeline['researching'] + pipeline['writing'] + pipeline['submitted'] + pipeline['pending'],
        'upcoming_deadlines': upcoming_deadlines[:10],
        'overdue_count': len(overdue_reports) + len(overdue_compliance),
        'success_rate': round((pipeline['awarded'] / max(pipeline['awarded'] + pipeline['declined'], 1)) * 100)
    }

# ----- Content Library -----
@api_router.get("/content")
async def get_content(category: Optional[str] = None):
    query = {"category": category} if category else {}
    items = await db.content.find(query, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/content")
async def create_content(item: ContentItemCreate):
    obj = ContentItem(**item.model_dump())
    await db.content.insert_one(obj.model_dump())
    return obj

@api_router.put("/content/{item_id}")
async def update_content(item_id: str, item: ContentItemCreate):
    update_data = item.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.content.update_one({"id": item_id}, {"$set": update_data})
    return await db.content.find_one({"id": item_id}, {"_id": 0})

@api_router.delete("/content/{item_id}")
async def delete_content(item_id: str):
    await db.content.delete_one({"id": item_id})
    return {"deleted": True}

# ----- Funder Profiles -----
@api_router.get("/funders")
async def get_funders():
    return await db.funders.find({}, {"_id": 0}).to_list(1000)

@api_router.get("/funders/{funder_id}")
async def get_funder(funder_id: str):
    funder = await db.funders.find_one({"id": funder_id}, {"_id": 0})
    if not funder:
        raise HTTPException(status_code=404, detail="Funder not found")
    return funder

@api_router.post("/funders")
async def create_funder(funder: FunderProfileCreate):
    obj = FunderProfile(**funder.model_dump())
    await db.funders.insert_one(obj.model_dump())
    return obj

@api_router.put("/funders/{funder_id}")
async def update_funder(funder_id: str, funder: FunderProfileCreate):
    await db.funders.update_one({"id": funder_id}, {"$set": funder.model_dump()})
    return await db.funders.find_one({"id": funder_id}, {"_id": 0})

@api_router.delete("/funders/{funder_id}")
async def delete_funder(funder_id: str):
    await db.funders.delete_one({"id": funder_id})
    return {"deleted": True}

# ----- Grants Pipeline -----
@api_router.get("/grants")
async def get_grants(stage: Optional[str] = None):
    query = {"stage": stage} if stage else {}
    return await db.grants.find(query, {"_id": 0}).to_list(1000)

@api_router.get("/grants/{grant_id}")
async def get_grant(grant_id: str):
    grant = await db.grants.find_one({"id": grant_id}, {"_id": 0})
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")
    return grant

@api_router.post("/grants")
async def create_grant(grant: GrantCreate):
    obj = Grant(**grant.model_dump())
    await db.grants.insert_one(obj.model_dump())
    return obj

@api_router.put("/grants/{grant_id}")
async def update_grant(grant_id: str, update: GrantUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.grants.update_one({"id": grant_id}, {"$set": update_data})
    return await db.grants.find_one({"id": grant_id}, {"_id": 0})

@api_router.delete("/grants/{grant_id}")
async def delete_grant(grant_id: str):
    await db.grants.delete_one({"id": grant_id})
    await db.reporting.delete_many({"grant_id": grant_id})
    await db.compliance.delete_many({"grant_id": grant_id})
    return {"deleted": True}

# ----- Reporting Requirements -----
@api_router.get("/reporting")
async def get_reporting(grant_id: Optional[str] = None):
    query = {"grant_id": grant_id} if grant_id else {}
    return await db.reporting.find(query, {"_id": 0}).to_list(1000)

@api_router.post("/reporting")
async def create_reporting(req: ReportingRequirementCreate):
    obj = ReportingRequirement(**req.model_dump())
    await db.reporting.insert_one(obj.model_dump())
    return obj

@api_router.put("/reporting/{req_id}")
async def update_reporting(req_id: str, status: str, submitted_date: str = ""):
    update = {"status": status}
    if submitted_date:
        update["submitted_date"] = submitted_date
    await db.reporting.update_one({"id": req_id}, {"$set": update})
    return await db.reporting.find_one({"id": req_id}, {"_id": 0})

@api_router.delete("/reporting/{req_id}")
async def delete_reporting(req_id: str):
    await db.reporting.delete_one({"id": req_id})
    return {"deleted": True}

# ----- Compliance Items -----
@api_router.get("/compliance")
async def get_compliance(grant_id: Optional[str] = None):
    query = {"grant_id": grant_id} if grant_id else {}
    return await db.compliance.find(query, {"_id": 0}).to_list(1000)

@api_router.post("/compliance")
async def create_compliance(item: ComplianceItemCreate):
    obj = ComplianceItem(**item.model_dump())
    await db.compliance.insert_one(obj.model_dump())
    return obj

@api_router.put("/compliance/{item_id}")
async def update_compliance(item_id: str, is_completed: bool):
    await db.compliance.update_one({"id": item_id}, {"$set": {"is_completed": is_completed}})
    return await db.compliance.find_one({"id": item_id}, {"_id": 0})

@api_router.delete("/compliance/{item_id}")
async def delete_compliance(item_id: str):
    await db.compliance.delete_one({"id": item_id})
    return {"deleted": True}

# ----- Budget Templates -----
@api_router.get("/budgets")
async def get_budgets(grant_id: Optional[str] = None):
    query = {"grant_id": grant_id} if grant_id else {}
    return await db.budgets.find(query, {"_id": 0}).to_list(1000)

@api_router.post("/budgets")
async def create_budget(budget: BudgetTemplateCreate):
    total = sum(item.get('amount', 0) for item in budget.line_items)
    obj = BudgetTemplate(**budget.model_dump(), total=total)
    await db.budgets.insert_one(obj.model_dump())
    return obj

@api_router.put("/budgets/{budget_id}")
async def update_budget(budget_id: str, budget: BudgetTemplateCreate):
    total = sum(item.get('amount', 0) for item in budget.line_items)
    update_data = budget.model_dump()
    update_data['total'] = total
    await db.budgets.update_one({"id": budget_id}, {"$set": update_data})
    return await db.budgets.find_one({"id": budget_id}, {"_id": 0})

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str):
    await db.budgets.delete_one({"id": budget_id})
    return {"deleted": True}

# ----- Outcome Bank -----
@api_router.get("/outcomes")
async def get_outcomes(program: Optional[str] = None):
    query = {"program": program} if program else {}
    return await db.outcomes.find(query, {"_id": 0}).to_list(1000)

@api_router.post("/outcomes")
async def create_outcome(outcome: OutcomeMetricCreate):
    obj = OutcomeMetric(**outcome.model_dump())
    await db.outcomes.insert_one(obj.model_dump())
    return obj

@api_router.put("/outcomes/{outcome_id}")
async def update_outcome(outcome_id: str, outcome: OutcomeMetricCreate):
    update_data = outcome.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.outcomes.update_one({"id": outcome_id}, {"$set": update_data})
    return await db.outcomes.find_one({"id": outcome_id}, {"_id": 0})

@api_router.delete("/outcomes/{outcome_id}")
async def delete_outcome(outcome_id: str):
    await db.outcomes.delete_one({"id": outcome_id})
    return {"deleted": True}

# ----- Settings -----
@api_router.get("/settings")
async def get_settings():
    settings = await db.settings.find_one({"id": "default"}, {"_id": 0})
    return settings or OrgSettings().model_dump()

@api_router.put("/settings")
async def update_settings(settings: OrgSettings):
    await db.settings.update_one({"id": "default"}, {"$set": settings.model_dump()}, upsert=True)
    return settings

# ----- AI: Extract from Award Document -----
class AwardDocumentRequest(BaseModel):
    grant_id: str
    base64_data: str
    mime_type: str
    filename: str = ""

@api_router.post("/ai/extract-award")
async def extract_award_document(request: AwardDocumentRequest):
    """Extract reporting requirements, compliance deadlines, and grant terms from award documents"""
    try:
        data = request.base64_data
        if ',' in data:
            data = data.split(',')[1]
        
        content = ""
        if request.mime_type == 'text/plain':
            content = base64.b64decode(data).decode('utf-8')
        elif 'pdf' in request.mime_type:
            content = "[PDF document - extracting text content]"
        else:
            content = base64.b64decode(data).decode('utf-8', errors='ignore')
        
        prompt = f"""Analyze this grant award document and extract all reporting and compliance requirements.

Document content:
{content[:8000]}

Extract and return as JSON:
{{
    "grant_info": {{
        "award_amount": number or null,
        "grant_period_start": "YYYY-MM-DD" or "",
        "grant_period_end": "YYYY-MM-DD" or "",
        "funder_name": "string"
    }},
    "reporting_requirements": [
        {{
            "report_type": "financial|narrative|progress|final|audit|other",
            "title": "e.g. Quarterly Financial Report",
            "description": "what must be included",
            "due_date": "YYYY-MM-DD or empty if recurring",
            "frequency": "one-time|monthly|quarterly|semi-annual|annual"
        }}
    ],
    "compliance_items": [
        {{
            "requirement": "specific requirement text",
            "category": "spending|documentation|programmatic|audit|other",
            "deadline": "YYYY-MM-DD or empty if ongoing"
        }}
    ],
    "restrictions": [
        "any spending or programmatic restrictions"
    ]
}}

Be thorough. Common reporting requirements include:
- Quarterly/Annual financial reports
- Narrative/Progress reports  
- Final reports (financial and narrative)
- Audit requirements
- Expenditure documentation

Common compliance items include:
- Spending restrictions
- Match/cost-share requirements
- Record retention periods
- Prior approval requirements
- Acknowledgment requirements
"""

        result = await call_gemini_json(prompt)
        
        # Auto-create reporting requirements in database
        created_reports = []
        for req in result.get('reporting_requirements', []):
            report = ReportingRequirement(
                grant_id=request.grant_id,
                report_type=req.get('report_type', 'other'),
                title=req.get('title', 'Report'),
                description=req.get('description', ''),
                due_date=req.get('due_date', ''),
                frequency=req.get('frequency', 'one-time')
            )
            await db.reporting.insert_one(report.model_dump())
            created_reports.append(report.model_dump())
        
        # Auto-create compliance items
        created_compliance = []
        for item in result.get('compliance_items', []):
            comp = ComplianceItem(
                grant_id=request.grant_id,
                requirement=item.get('requirement', ''),
                category=item.get('category', 'other'),
                deadline=item.get('deadline', '')
            )
            await db.compliance.insert_one(comp.model_dump())
            created_compliance.append(comp.model_dump())
        
        # Update grant with extracted info
        grant_info = result.get('grant_info', {})
        if grant_info:
            update_data = {}
            if grant_info.get('award_amount'):
                update_data['amount_awarded'] = grant_info['award_amount']
            if grant_info.get('grant_period_start'):
                update_data['grant_period_start'] = grant_info['grant_period_start']
            if grant_info.get('grant_period_end'):
                update_data['grant_period_end'] = grant_info['grant_period_end']
            if update_data:
                await db.grants.update_one({"id": request.grant_id}, {"$set": update_data})
        
        return {
            "extracted": result,
            "created_reports": len(created_reports),
            "created_compliance": len(created_compliance)
        }
        
    except Exception as e:
        logger.error(f"Award extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ----- AI: Draft Content -----
class DraftRequest(BaseModel):
    prompt: str
    context: str = ""

@api_router.post("/ai/draft")
async def ai_draft(request: DraftRequest):
    """General AI drafting assistance"""
    prompt = f"""Help draft grant content for a small nonprofit.

Request: {request.prompt}

Context: {request.context}

Provide clear, professional, funder-ready content. Be concise but thorough."""
    
    content = await call_gemini(prompt)
    return {"content": content}

# ----- Calendar Export -----
@api_router.get("/calendar/export")
async def export_calendar():
    """Generate ICS file with all deadlines"""
    grants = await db.grants.find({}, {"_id": 0}).to_list(1000)
    reports = await db.reporting.find({}, {"_id": 0}).to_list(1000)
    compliance = await db.compliance.find({}, {"_id": 0}).to_list(1000)
    
    events = []
    
    # Grant deadlines
    for g in grants:
        if g.get('deadline') and g.get('stage') in ['researching', 'writing', 'submitted', 'pending']:
            events.append({
                'title': f"DEADLINE: {g['title']}",
                'date': g['deadline'],
                'description': f"Grant application deadline for {g.get('funder_name', 'Unknown Funder')}. Amount: ${g.get('amount_requested', 0):,}"
            })
    
    # Reporting deadlines
    for r in reports:
        if r.get('due_date') and r.get('status') in ['upcoming', 'in-progress']:
            events.append({
                'title': f"REPORT DUE: {r['title']}",
                'date': r['due_date'],
                'description': f"Type: {r.get('report_type', 'Report')}. {r.get('description', '')}"
            })
    
    # Compliance deadlines
    for c in compliance:
        if c.get('deadline') and not c.get('is_completed'):
            events.append({
                'title': f"COMPLIANCE: {c['requirement'][:50]}",
                'date': c['deadline'],
                'description': c['requirement']
            })
    
    return {"events": events}

# ----- Data Export/Import -----
@api_router.get("/export")
async def export_all():
    return {
        "content": await db.content.find({}, {"_id": 0}).to_list(1000),
        "funders": await db.funders.find({}, {"_id": 0}).to_list(1000),
        "grants": await db.grants.find({}, {"_id": 0}).to_list(1000),
        "reporting": await db.reporting.find({}, {"_id": 0}).to_list(1000),
        "compliance": await db.compliance.find({}, {"_id": 0}).to_list(1000),
        "budgets": await db.budgets.find({}, {"_id": 0}).to_list(1000),
        "outcomes": await db.outcomes.find({}, {"_id": 0}).to_list(1000),
        "settings": await db.settings.find({}, {"_id": 0}).to_list(10)
    }

class ImportRequest(BaseModel):
    content: List[dict] = []
    funders: List[dict] = []
    grants: List[dict] = []
    reporting: List[dict] = []
    compliance: List[dict] = []
    budgets: List[dict] = []
    outcomes: List[dict] = []
    settings: List[dict] = []

@api_router.post("/import")
async def import_all(data: ImportRequest):
    for coll, items in [
        (db.content, data.content),
        (db.funders, data.funders),
        (db.grants, data.grants),
        (db.reporting, data.reporting),
        (db.compliance, data.compliance),
        (db.budgets, data.budgets),
        (db.outcomes, data.outcomes),
        (db.settings, data.settings)
    ]:
        if items:
            await coll.delete_many({})
            await coll.insert_many(items)
    return {"imported": True}

# ----- Budget Templates -----
BUDGET_TEMPLATES = {
    "foundation_general": {
        "name": "Foundation Grant (General)",
        "line_items": [
            {"category": "Personnel", "description": "Program Staff Salaries", "amount": 0, "notes": "Include FTE %"},
            {"category": "Personnel", "description": "Fringe Benefits", "amount": 0, "notes": "Typically 25-35% of salaries"},
            {"category": "Consultants", "description": "Professional Services", "amount": 0, "notes": ""},
            {"category": "Supplies", "description": "Program Supplies", "amount": 0, "notes": ""},
            {"category": "Equipment", "description": "Equipment (if allowed)", "amount": 0, "notes": "Check funder restrictions"},
            {"category": "Travel", "description": "Local Travel", "amount": 0, "notes": "Mileage, parking"},
            {"category": "Other", "description": "Printing & Communications", "amount": 0, "notes": ""},
            {"category": "Other", "description": "Participant Support", "amount": 0, "notes": "Stipends, incentives"},
            {"category": "Indirect", "description": "Indirect Costs", "amount": 0, "notes": "Check funder cap (often 10-15%)"}
        ]
    },
    "federal_standard": {
        "name": "Federal Grant (Standard)",
        "line_items": [
            {"category": "Personnel", "description": "Key Personnel", "amount": 0, "notes": "PI, Co-PI salaries"},
            {"category": "Personnel", "description": "Other Personnel", "amount": 0, "notes": "Staff, coordinators"},
            {"category": "Fringe", "description": "Fringe Benefits", "amount": 0, "notes": "Per organizational rate"},
            {"category": "Travel", "description": "Domestic Travel", "amount": 0, "notes": "Conference, site visits"},
            {"category": "Travel", "description": "International Travel", "amount": 0, "notes": "If applicable"},
            {"category": "Equipment", "description": "Equipment (>$5,000)", "amount": 0, "notes": "Capital equipment"},
            {"category": "Supplies", "description": "Materials & Supplies", "amount": 0, "notes": ""},
            {"category": "Contractual", "description": "Subawards/Contracts", "amount": 0, "notes": ""},
            {"category": "Other", "description": "Other Direct Costs", "amount": 0, "notes": "Participant support, etc."},
            {"category": "Indirect", "description": "F&A Costs", "amount": 0, "notes": "Per negotiated rate"}
        ]
    },
    "program_specific": {
        "name": "Program-Specific Budget",
        "line_items": [
            {"category": "Personnel", "description": "Program Director (% FTE)", "amount": 0, "notes": ""},
            {"category": "Personnel", "description": "Program Coordinator", "amount": 0, "notes": ""},
            {"category": "Personnel", "description": "Direct Service Staff", "amount": 0, "notes": ""},
            {"category": "Fringe", "description": "Benefits & Taxes", "amount": 0, "notes": ""},
            {"category": "Program", "description": "Training & Curriculum", "amount": 0, "notes": ""},
            {"category": "Program", "description": "Client Services", "amount": 0, "notes": "Direct assistance"},
            {"category": "Program", "description": "Outreach & Recruitment", "amount": 0, "notes": ""},
            {"category": "Operations", "description": "Facility/Space", "amount": 0, "notes": "If program-specific"},
            {"category": "Operations", "description": "Technology", "amount": 0, "notes": "Software, hardware"},
            {"category": "Evaluation", "description": "Data Collection & Reporting", "amount": 0, "notes": ""},
            {"category": "Indirect", "description": "Administrative Overhead", "amount": 0, "notes": ""}
        ]
    },
    "capacity_building": {
        "name": "Capacity Building Grant",
        "line_items": [
            {"category": "Personnel", "description": "Project Lead Time", "amount": 0, "notes": ""},
            {"category": "Consultants", "description": "Strategic Planning Consultant", "amount": 0, "notes": ""},
            {"category": "Consultants", "description": "Technology Consultant", "amount": 0, "notes": ""},
            {"category": "Consultants", "description": "Fundraising Consultant", "amount": 0, "notes": ""},
            {"category": "Training", "description": "Staff Professional Development", "amount": 0, "notes": ""},
            {"category": "Training", "description": "Board Development", "amount": 0, "notes": ""},
            {"category": "Technology", "description": "Systems & Software", "amount": 0, "notes": "CRM, accounting, etc."},
            {"category": "Technology", "description": "Website/Digital", "amount": 0, "notes": ""},
            {"category": "Other", "description": "Materials & Resources", "amount": 0, "notes": ""},
            {"category": "Indirect", "description": "Administrative Costs", "amount": 0, "notes": ""}
        ]
    }
}

@api_router.get("/budget-templates")
async def get_budget_templates():
    """Get available budget templates"""
    return [{"id": k, "name": v["name"], "line_items_count": len(v["line_items"])} for k, v in BUDGET_TEMPLATES.items()]

@api_router.get("/budget-templates/{template_id}")
async def get_budget_template(template_id: str):
    """Get a specific budget template"""
    if template_id not in BUDGET_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    return BUDGET_TEMPLATES[template_id]

# ----- Seed Demo Data -----
@api_router.post("/seed-demo")
async def seed_demo_data():
    """Seed comprehensive demo data for showcasing the app"""
    
    # Check if data already exists
    existing = await db.grants.count_documents({})
    if existing > 5:
        return {"message": "Demo data already exists", "seeded": False}
    
    # Organization Settings
    await db.settings.update_one(
        {"id": "default"},
        {"$set": {
            "id": "default",
            "org_name": "Community Bridges",
            "ein": "12-3456789",
            "fiscal_year_end": "June 30",
            "primary_contact": "Maria Rodriguez",
            "primary_email": "maria@communitybridges.org"
        }},
        upsert=True
    )
    
    # Funders
    funders_data = [
        {
            "id": str(uuid.uuid4()),
            "name": "Robert Wood Johnson Foundation",
            "website": "https://www.rwjf.org",
            "portal_url": "https://www.rwjf.org/en/how-we-work/submit-a-proposal.html",
            "portal_login_notes": "Use maria@communitybridges.org account",
            "priorities": "Building a Culture of Health. Focus on health equity, community health, childhood obesity prevention.",
            "restrictions": "No direct service delivery. Must have policy/systems change component.",
            "typical_award_range": "$100,000 - $500,000",
            "application_requirements": ["Letter of Inquiry first", "501(c)(3) determination letter", "Board list with affiliations", "Most recent audited financials", "Organizational budget", "Logic model"],
            "contact_name": "Sarah Chen",
            "contact_email": "proposals@rwjf.org",
            "relationship_notes": "Met Sarah at GIA conference 2024. She suggested we apply to Evidence for Action program.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "The Kresge Foundation",
            "website": "https://kresge.org",
            "portal_url": "https://kresge.fluxx.io",
            "portal_login_notes": "Fluxx portal - password in LastPass",
            "priorities": "Health, environment, arts & culture, education, human services in American cities.",
            "restrictions": "Focus on place-based work. Strong preference for organizations in Detroit and select cities.",
            "typical_award_range": "$150,000 - $400,000",
            "application_requirements": ["Online application", "Strategic plan", "DEI statement", "990 (3 years)", "Board-approved budget"],
            "contact_name": "",
            "contact_email": "",
            "relationship_notes": "Applied in 2023, declined. Feedback: strengthen evaluation plan.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Community Foundation of Greater Metro",
            "website": "https://cfgm.org",
            "portal_url": "https://cfgm.org/grants",
            "portal_login_notes": "Annual cycle - deadline usually March 1",
            "priorities": "Local community needs - education, health, human services, arts.",
            "restrictions": "Must serve Greater Metro area. No capital campaigns.",
            "typical_award_range": "$10,000 - $50,000",
            "application_requirements": ["Common Grant Application", "501(c)(3) letter", "Current year budget", "Most recent 990"],
            "contact_name": "James Wilson",
            "contact_email": "grants@cfgm.org",
            "relationship_notes": "Long-term funder. Have received 5 grants since 2019. James is very responsive.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    for f in funders_data:
        await db.funders.update_one({"name": f["name"]}, {"$set": f}, upsert=True)
    
    # Grants
    grant1_id = str(uuid.uuid4())
    grant2_id = str(uuid.uuid4())
    grant3_id = str(uuid.uuid4())
    grant4_id = str(uuid.uuid4())
    
    grants_data = [
        {
            "id": grant1_id,
            "title": "Youth Health Equity Initiative",
            "funder_name": "Robert Wood Johnson Foundation",
            "amount_requested": 250000,
            "amount_awarded": 250000,
            "stage": "awarded",
            "deadline": "2024-06-15",
            "submitted_date": "2024-06-10",
            "decision_date": "2024-09-01",
            "grant_period_start": "2025-01-01",
            "grant_period_end": "2026-12-31",
            "program": "Youth Health",
            "notes": "2-year grant. Focus on policy change in school nutrition.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": grant2_id,
            "title": "Community Health Worker Training Program",
            "funder_name": "Community Foundation of Greater Metro",
            "amount_requested": 45000,
            "amount_awarded": 45000,
            "stage": "awarded",
            "deadline": "2024-03-01",
            "submitted_date": "2024-02-28",
            "decision_date": "2024-05-15",
            "grant_period_start": "2024-07-01",
            "grant_period_end": "2025-06-30",
            "program": "Workforce Development",
            "notes": "Annual renewal likely if outcomes met.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": grant3_id,
            "title": "Neighborhood Wellness Hubs",
            "funder_name": "The Kresge Foundation",
            "amount_requested": 300000,
            "amount_awarded": 0,
            "stage": "submitted",
            "deadline": "2025-02-15",
            "submitted_date": "2025-02-10",
            "decision_date": "",
            "grant_period_start": "",
            "grant_period_end": "",
            "program": "Community Health",
            "notes": "Strengthened evaluation plan based on previous feedback.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": grant4_id,
            "title": "Mental Health First Aid Expansion",
            "funder_name": "State Department of Health",
            "amount_requested": 125000,
            "amount_awarded": 0,
            "stage": "writing",
            "deadline": "2025-04-30",
            "submitted_date": "",
            "decision_date": "",
            "grant_period_start": "",
            "grant_period_end": "",
            "program": "Mental Health",
            "notes": "RFP released Jan 2025. Need letters of support from 3 partners.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    for g in grants_data:
        await db.grants.update_one({"id": g["id"]}, {"$set": g}, upsert=True)
    
    # Reporting Requirements for awarded grants
    reports_data = [
        {"id": str(uuid.uuid4()), "grant_id": grant1_id, "report_type": "financial", "title": "Q1 2025 Financial Report", "description": "Quarterly expenditure report with budget vs actual", "due_date": "2025-04-15", "frequency": "quarterly", "status": "upcoming", "submitted_date": "", "notes": ""},
        {"id": str(uuid.uuid4()), "grant_id": grant1_id, "report_type": "narrative", "title": "Q1 2025 Progress Report", "description": "Narrative progress on objectives and activities", "due_date": "2025-04-15", "frequency": "quarterly", "status": "upcoming", "submitted_date": "", "notes": ""},
        {"id": str(uuid.uuid4()), "grant_id": grant1_id, "report_type": "financial", "title": "Q2 2025 Financial Report", "description": "Quarterly expenditure report", "due_date": "2025-07-15", "frequency": "quarterly", "status": "upcoming", "submitted_date": "", "notes": ""},
        {"id": str(uuid.uuid4()), "grant_id": grant1_id, "report_type": "narrative", "title": "Annual Progress Report", "description": "Comprehensive year 1 progress report", "due_date": "2026-01-31", "frequency": "annual", "status": "upcoming", "submitted_date": "", "notes": "Include outcome data and success stories"},
        {"id": str(uuid.uuid4()), "grant_id": grant2_id, "report_type": "narrative", "title": "Mid-Year Report", "description": "6-month progress update", "due_date": "2025-01-15", "frequency": "semi-annual", "status": "submitted", "submitted_date": "2025-01-10", "notes": "Submitted on time"},
        {"id": str(uuid.uuid4()), "grant_id": grant2_id, "report_type": "final", "title": "Final Report", "description": "Final narrative and financial report", "due_date": "2025-07-31", "frequency": "one-time", "status": "upcoming", "submitted_date": "", "notes": "Include photos and testimonials"}
    ]
    for r in reports_data:
        await db.reporting.update_one({"id": r["id"]}, {"$set": r}, upsert=True)
    
    # Compliance Items
    compliance_data = [
        {"id": str(uuid.uuid4()), "grant_id": grant1_id, "requirement": "Submit any budget modifications over 10% for prior approval", "category": "spending", "deadline": "", "is_completed": False, "notes": ""},
        {"id": str(uuid.uuid4()), "grant_id": grant1_id, "requirement": "Acknowledge RWJF funding in all publications and materials", "category": "documentation", "deadline": "", "is_completed": True, "notes": "Logo added to all materials"},
        {"id": str(uuid.uuid4()), "grant_id": grant1_id, "requirement": "Maintain time and effort documentation for all staff", "category": "documentation", "deadline": "", "is_completed": False, "notes": "Using Toggl for tracking"},
        {"id": str(uuid.uuid4()), "grant_id": grant1_id, "requirement": "Participate in funder learning community calls", "category": "programmatic", "deadline": "", "is_completed": False, "notes": "Monthly calls on 3rd Thursday"},
        {"id": str(uuid.uuid4()), "grant_id": grant2_id, "requirement": "Track participant demographics using provided template", "category": "documentation", "deadline": "", "is_completed": True, "notes": ""},
        {"id": str(uuid.uuid4()), "grant_id": grant2_id, "requirement": "Conduct pre/post surveys for all training participants", "category": "programmatic", "deadline": "", "is_completed": True, "notes": "Using SurveyMonkey"}
    ]
    for c in compliance_data:
        await db.compliance.update_one({"id": c["id"]}, {"$set": c}, upsert=True)
    
    # Content Library
    content_data = [
        {
            "id": str(uuid.uuid4()),
            "category": "mission",
            "title": "Mission Statement",
            "content": "Community Bridges builds healthier communities by connecting residents to resources, training community health leaders, and advocating for policies that promote equity and wellbeing.",
            "tags": ["general", "about"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "category": "history",
            "title": "Organization History",
            "content": "Founded in 2008 by a coalition of community health workers and public health professionals, Community Bridges emerged from a grassroots effort to address health disparities in underserved neighborhoods. What began as a volunteer-run health education program has grown into a comprehensive community health organization serving over 5,000 residents annually across the Greater Metro area. Our growth has been guided by our commitment to community leadership and evidence-based practices.",
            "tags": ["about", "background"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "category": "leadership",
            "title": "Executive Director Bio",
            "content": "Maria Rodriguez, MPH, has led Community Bridges as Executive Director since 2018. With over 15 years of experience in community health, Maria previously served as Director of Programs at Metro Health Alliance and as a community health worker herself. She holds a Master of Public Health from State University and serves on the boards of the Community Health Worker Network and the Regional Health Equity Coalition.",
            "tags": ["leadership", "bio"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "category": "programs",
            "title": "Youth Health Program Description",
            "content": "Our Youth Health Initiative engages young people ages 12-18 as health leaders in their communities. Through peer education training, advocacy projects, and community health assessments, youth participants develop leadership skills while improving health outcomes in their schools and neighborhoods. The program operates in 8 schools and 3 community centers, reaching 500 youth annually with intensive programming and an additional 2,000 through peer-led activities.",
            "tags": ["youth", "program"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "category": "programs",
            "title": "Community Health Worker Program",
            "content": "Our CHW Training Program prepares residents to serve as trusted health resources in their communities. The 120-hour curriculum covers health education, care coordination, advocacy, and professional skills. Graduates receive state certification and ongoing support through our CHW Network. Since 2015, we have trained 180 CHWs, with 85% achieving employment in health-related fields within 6 months of graduation.",
            "tags": ["chw", "workforce", "program"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "category": "financials",
            "title": "Organizational Budget Summary",
            "content": "FY2024 Budget: $1.2M\n\nRevenue:\n- Foundation Grants: $650,000 (54%)\n- Government Contracts: $350,000 (29%)\n- Individual Donations: $120,000 (10%)\n- Earned Revenue: $80,000 (7%)\n\nExpenses:\n- Program Services: $900,000 (75%)\n- Administration: $180,000 (15%)\n- Fundraising: $120,000 (10%)",
            "tags": ["budget", "financials"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "category": "boilerplate",
            "title": "Diversity Statement",
            "content": "Community Bridges is committed to diversity, equity, and inclusion in all aspects of our work. Our board and staff reflect the communities we serve, with 70% identifying as people of color and 60% having lived experience with the health challenges we address. We actively recruit from communities experiencing health disparities and provide professional development pathways for community members to advance into leadership roles.",
            "tags": ["dei", "equity"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "category": "boilerplate",
            "title": "Evaluation Approach",
            "content": "Community Bridges employs a participatory evaluation approach that centers community voice in measuring success. We use mixed methods including quantitative tracking of outputs and outcomes, pre/post surveys, focus groups, and community advisory input. Our evaluation partner, Metro University's Department of Public Health, provides technical assistance and ensures methodological rigor. Data is reviewed quarterly with staff and annually with community stakeholders to inform continuous improvement.",
            "tags": ["evaluation", "methodology"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    for c in content_data:
        await db.content.update_one({"id": c["id"]}, {"$set": c}, upsert=True)
    
    # Outcomes
    outcomes_data = [
        {"id": str(uuid.uuid4()), "program": "Youth Health", "metric_type": "output", "title": "Youth trained as peer educators", "value": "120", "time_period": "FY2024", "source": "Program records", "notes": "", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "program": "Youth Health", "metric_type": "output", "title": "Peer education sessions delivered", "value": "450", "time_period": "FY2024", "source": "Activity logs", "notes": "In schools and community settings", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "program": "Youth Health", "metric_type": "outcome", "title": "Youth reporting increased health knowledge", "value": "87%", "time_period": "FY2024", "source": "Pre/post surveys", "notes": "n=118", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "program": "Youth Health", "metric_type": "outcome", "title": "Youth reporting healthy behavior changes", "value": "64%", "time_period": "FY2024", "source": "6-month follow-up survey", "notes": "Primarily nutrition and physical activity", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "program": "CHW Training", "metric_type": "output", "title": "CHWs trained and certified", "value": "32", "time_period": "FY2024", "source": "Certification records", "notes": "", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "program": "CHW Training", "metric_type": "outcome", "title": "Graduates employed in health field", "value": "85%", "time_period": "FY2024", "source": "6-month follow-up", "notes": "Within 6 months of graduation", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "program": "CHW Training", "metric_type": "outcome", "title": "Average wage increase for graduates", "value": "$8,500/year", "time_period": "FY2024", "source": "Alumni survey", "notes": "Compared to pre-training employment", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "program": "General", "metric_type": "demographic", "title": "Clients identifying as BIPOC", "value": "78%", "time_period": "FY2024", "source": "Intake data", "notes": "", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "program": "General", "metric_type": "demographic", "title": "Clients with household income below 200% FPL", "value": "82%", "time_period": "FY2024", "source": "Intake data", "notes": "", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "program": "Youth Health", "metric_type": "testimonial", "title": "Youth participant quote", "value": "\"Before this program, I didn't know I could make a difference in my community's health. Now I've helped my whole family eat better and I'm planning to become a nurse.\" - Jasmine, age 16", "time_period": "2024", "source": "Focus group", "notes": "Permission obtained", "updated_at": datetime.now(timezone.utc).isoformat()}
    ]
    for o in outcomes_data:
        await db.outcomes.update_one({"id": o["id"]}, {"$set": o}, upsert=True)
    
    return {
        "message": "Demo data seeded successfully",
        "seeded": True,
        "summary": {
            "funders": len(funders_data),
            "grants": len(grants_data),
            "reports": len(reports_data),
            "compliance": len(compliance_data),
            "content": len(content_data),
            "outcomes": len(outcomes_data)
        }
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
