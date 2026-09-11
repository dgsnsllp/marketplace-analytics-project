from sqlalchemy.orm import Session
from src.db.models import ActionPolicy
import uuid

def seed_default_policies(db: Session):
    if db.query(ActionPolicy).count() > 0:
        return
        
    policies = [
        ActionPolicy(
            policy_id=f"POL-{uuid.uuid4().hex[:8].upper()}",
            name="Visual Gap - Missing Images",
            target_feature="image_count",
            operator="<=",
            threshold_value=2,
            action_type="IMAGE_UPDATE",
            suggested_action="En az 4 görsel ekleyin"
        ),
        ActionPolicy(
            policy_id=f"POL-{uuid.uuid4().hex[:8].upper()}",
            name="Variant Gap - Missing Colors/Sizes",
            target_feature="variant_count",
            operator="<=",
            threshold_value=1,
            action_type="VARIANT_ADDITION",
            suggested_action="En az 3 varyant ekleyin"
        ),
        ActionPolicy(
            policy_id=f"POL-{uuid.uuid4().hex[:8].upper()}",
            name="Pricing Wall - Above Median",
            target_feature="base_price",
            operator=">=",
            threshold_value=1.30, 
            action_type="PRICE_OPTIMIZATION",
            suggested_action="Fiyatı kategori ortalamasına çekin"
        )
    ]
    
    for p in policies:
        db.add(p)
    db.commit()
