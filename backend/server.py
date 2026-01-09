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
@api_router.get("/dashboard")
async def get_dashboard():
    grants = await db.grants.find({}, {"_id": 0}).to_list(1000)
    reports = await db.reporting.find({}, {"_id": 0}).to_list(1000)
    compliance = await db.compliance.find({}, {"_id": 0}).to_list(1000)
    
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    
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
            if deadline >= today:
                days_left = (datetime.fromisoformat(deadline) - now).days
                upcoming_deadlines.append({
                    'type': 'application',
                    'grant_id': g['id'],
                    'title': g['title'],
                    'date': deadline,
                    'days_left': days_left
                })
    
    # Reporting deadlines
    for r in reports:
        if r.get('status') in ['upcoming', 'in-progress'] and r.get('due_date'):
            due = r['due_date']
            if due >= today:
                days_left = (datetime.fromisoformat(due) - now).days
                upcoming_deadlines.append({
                    'type': 'report',
                    'report_type': r.get('report_type'),
                    'grant_id': r.get('grant_id'),
                    'title': r['title'],
                    'date': due,
                    'days_left': days_left
                })
    
    # Compliance deadlines
    for c in compliance:
        if not c.get('is_completed') and c.get('deadline'):
            deadline = c['deadline']
            if deadline >= today:
                days_left = (datetime.fromisoformat(deadline) - now).days
                upcoming_deadlines.append({
                    'type': 'compliance',
                    'grant_id': c.get('grant_id'),
                    'title': c['requirement'],
                    'date': deadline,
                    'days_left': days_left
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
