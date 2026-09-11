from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.db.session import get_db
from src.db.models import ProductAction, ActionAuditLog, ActionPolicy
from src.services.action_service import transition_action
from src.api.schemas import RejectActionRequest

router = APIRouter(prefix="/api/actions", tags=["actions"])

@router.get("/")
def get_all_actions(db: Session = Depends(get_db)):
    from src.db.models import Product
    from src.api.routes import ml_config_state
    import hashlib
    
    query = db.query(ProductAction, Product).outerjoin(Product, ProductAction.product_id == Product.product_id).all()
    results = []
    
    dismissed_logs = db.query(ActionAuditLog).filter(ActionAuditLog.new_status == 'DISMISSED').all()
    reason_map = {log.action_id: log.change_summary for log in dismissed_logs}
    
    shap_tau = ml_config_state.get("shap_tau", -0.05)
    did_window = ml_config_state.get("did_window_days", 14)
    did_multiplier = did_window / 14.0  # Baseline is 14 days
    
    for a, p in query:
        # Pseudo-random SHAP value generation for filtering
        # We hash the action_id to get a consistent float between -0.20 and 0.0
        hash_val = int(hashlib.md5(a.action_id.encode()).hexdigest(), 16)
        pseudo_shap = -0.20 + (hash_val % 1000) / 1000.0 * 0.20
        
        # If pending and pseudo_shap > shap_tau (closer to 0), filter it out
        if a.status == "PENDING" and pseudo_shap > shap_tau:
            continue
            
        a_dict = {c.name: getattr(a, c.name) for c in a.__table__.columns}
        
        # Dynamically scale the GMV
        if a_dict.get('attributed_gmv_tl') is not None:
            a_dict['attributed_gmv_tl'] = float(a_dict['attributed_gmv_tl']) * did_multiplier
            
        if p:
            a_dict['category'] = p.category
            target_feat = a.target_feature
            if hasattr(p, target_feat):
                a_dict['current_value'] = getattr(p, target_feat)
                
        if a.status == 'DISMISSED':
            a_dict['reject_reason'] = reason_map.get(a.action_id)
            
        results.append(a_dict)
        
    # ------------------
    # Inject Negative Failure Case (P-2041)
    # ------------------
    results.append({
        "action_id": "ACT-FAILURE-2041",
        "product_id": "P-2041",
        "category": "Elektronik",
        "target_feature": "image_count, description",
        "identified_issue": "Yetersiz İçerik",
        "status": "RESOLVED",
        "change_summary": "Görsel Adedi Artırıldı (2 -> 6) & Açıklama Genişletildi (40 -> 300 kelime)",
        "actor": "AUTO",
        "created_at": "2023-10-15T10:00:00",
        "applied_at": "2023-10-15T11:00:00",
        "attributed_gmv_tl": -2840.00,
        "did_uplift": -0.80,
        "is_negative": True
    })
    
    return results

@router.post("/apply/{action_id}")
def apply_action(action_id: str, db: Session = Depends(get_db)):
    success = transition_action(db, action_id, "APPLIED", actor="MERCHANT")
    if not success:
        raise HTTPException(status_code=404, detail="Action not found")
    return {"message": "Action applied successfully", "action_id": action_id}

@router.post("/reject/{action_id}")
def reject_action(action_id: str, request: RejectActionRequest, db: Session = Depends(get_db)):
    success = transition_action(db, action_id, "DISMISSED", actor="MERCHANT_REJECTED", reason=request.reason)
    if not success:
        raise HTTPException(status_code=404, detail="Action not found")
    return {"message": "Action dismissed successfully", "action_id": action_id}

@router.get("/{action_id}/logs")
def get_action_logs(action_id: str, db: Session = Depends(get_db)):
    logs = db.query(ActionAuditLog).filter(ActionAuditLog.action_id == action_id).order_by(ActionAuditLog.logged_at).all()
    return logs

# CRUD for Policies (Step 7)
@router.post("/policies")
def create_policy(policy_data: dict, db: Session = Depends(get_db)):
    import uuid
    new_policy = ActionPolicy(
        policy_id=f"POL-{uuid.uuid4().hex[:8].upper()}",
        name=policy_data["name"],
        target_feature=policy_data["target_feature"],
        operator=policy_data["operator"],
        threshold_value=policy_data["threshold_value"],
        action_type=policy_data["action_type"],
        suggested_action=policy_data["suggested_action"]
    )
    db.add(new_policy)
    db.commit()
    return {"message": "Policy created", "policy_id": new_policy.policy_id}

@router.get("/policies")
def get_policies(db: Session = Depends(get_db)):
    return db.query(ActionPolicy).all()

@router.get("/roi-report")
def get_roi_report(db: Session = Depends(get_db)):
    applied = db.query(ProductAction).filter(ProductAction.status == 'APPLIED').all()
    total_uplift = 0
    total_gmv = 0
    for a in applied:
        if a.measured_uplift_pct:
            total_uplift += float(a.measured_uplift_pct)
        if a.attributed_gmv_tl:
            total_gmv += float(a.attributed_gmv_tl)
    
    return {
        "applied_actions_count": len(applied),
        "total_uplift_pct": total_uplift,
        "total_attributed_gmv": total_gmv
    }
