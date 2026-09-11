from sqlalchemy.orm import Session
from src.db.models import ProductAction, ActionAuditLog, Product
import datetime
import uuid

def create_action(db: Session, product_id: str, policy_id: str, issue: str, suggested_action: str, target_feat: str, target_val: float):
    action_id = f"ACT-{uuid.uuid4().hex[:8].upper()}"
    
    prod = db.query(Product).filter(Product.product_id == product_id).first()
    baseline_price = prod.base_price if prod else None
    baseline_image = prod.image_count if prod else None
    
    baseline_conversion = 0.05
    baseline_dwell = 45.0
    
    new_action = ProductAction(
        action_id=action_id,
        product_id=product_id,
        policy_id=policy_id,
        identified_issue=issue,
        suggested_action=suggested_action,
        target_feature=target_feat,
        target_threshold_value=target_val,
        baseline_conversion_rate=baseline_conversion,
        baseline_avg_dwell=baseline_dwell,
        baseline_image_count=baseline_image,
        baseline_price=baseline_price
    )
    db.add(new_action)
    db.commit()
    
    audit = ActionAuditLog(action_id=action_id, previous_status=None, new_status="PENDING", change_summary="Action Created")
    db.add(audit)
    db.commit()
    return action_id

def transition_action(db: Session, action_id: str, new_status: str, actor: str = "SYSTEM", reason: str = None):
    action = db.query(ProductAction).filter(ProductAction.action_id == action_id).first()
    if not action:
        return False
        
    old_status = action.status
    action.status = new_status
    
    if new_status == "APPLIED":
        action.applied_at = datetime.datetime.utcnow()
        action.evaluation_end_date = action.applied_at + datetime.timedelta(days=action.evaluation_window_days)
        
    change_summary = reason if reason else f"Transitioned to {new_status}"
    
    audit = ActionAuditLog(
        action_id=action_id, 
        previous_status=old_status, 
        new_status=new_status, 
        actor=actor,
        change_summary=change_summary
    )
    db.add(audit)
    db.commit()
    return True
