from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.db.session import get_db
from src.services.ai_advisor_service import AIAdvisorService

router = APIRouter(prefix="/api/ai-advisor", tags=["ai-advisor"])
advisor_service = AIAdvisorService()

@router.get("/status")
def get_ai_status():
    is_healthy = advisor_service.check_health()
    return {
        "healthy": is_healthy,
        "provider": advisor_service.provider,
        "model": advisor_service.model
    }

@router.get("/audit")
def get_audit_report(db: Session = Depends(get_db)):
    # This might take some time depending on the LLM
    report = advisor_service.generate_audit_report(db)
    return report
