import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.db.session import SessionLocal
from src.db.models import ActionPolicy, Product, ProductAction
from src.services.action_service import create_action
from sqlalchemy import text
import uuid

def run():
    db = SessionLocal()
    # Clear existing policies and actions for a clean slate
    db.execute(text("TRUNCATE TABLE action_policies CASCADE"))
    db.commit()

    policies = [
        ActionPolicy(
            policy_id=f"POL-{uuid.uuid4().hex[:8].upper()}",
            name="Low Visual Richness",
            target_feature="image_count",
            operator="<=",
            threshold_value=2,
            action_type="IMAGE_UPDATE",
            suggested_action="Add at least 3 high-quality images"
        ),
        ActionPolicy(
            policy_id=f"POL-{uuid.uuid4().hex[:8].upper()}",
            name="Missing Variations",
            target_feature="variant_count",
            operator="<=",
            threshold_value=1,
            action_type="VARIANT_ADDITION",
            suggested_action="Add alternative colors or sizes"
        ),
        ActionPolicy(
            policy_id=f"POL-{uuid.uuid4().hex[:8].upper()}",
            name="High Price / Low Engagement",
            target_feature="base_price",
            operator=">=",
            threshold_value=150, 
            action_type="PRICE_OPTIMIZATION",
            suggested_action="Apply 15% discount or match category average"
        ),
        ActionPolicy(
            policy_id=f"POL-{uuid.uuid4().hex[:8].upper()}",
            name="Poor Description",
            target_feature="description_word_count",
            operator="<=",
            threshold_value=150, 
            action_type="CONTENT_UPDATE",
            suggested_action="Expand product description with SEO keywords"
        ),
        ActionPolicy(
            policy_id=f"POL-{uuid.uuid4().hex[:8].upper()}",
            name="No Size Chart",
            target_feature="has_size_chart",
            operator="==",
            threshold_value=0, 
            action_type="CONTENT_UPDATE",
            suggested_action="Upload a detailed size chart"
        )
    ]
    
    for p in policies:
        db.add(p)
    db.commit()
    print("5 core policies seeded.")

    # Evaluate catalog and generate pending actions
    products = db.query(Product).limit(100).all() # Just scan 100 for speed
    created_count = 0
    for p in products:
        for pol in policies:
            # Simple evaluator
            val = getattr(p, pol.target_feature, None)
            if val is not None:
                match = False
                if pol.operator == '<=' and val <= pol.threshold_value: match = True
                elif pol.operator == '>=' and val >= pol.threshold_value: match = True
                elif pol.operator == '==' and val == pol.threshold_value: match = True
                
                if match:
                    # Check if already exists
                    existing = db.query(ProductAction).filter(ProductAction.product_id==p.product_id, ProductAction.policy_id==pol.policy_id).first()
                    if not existing:
                        create_action(db, p.product_id, pol.policy_id, pol.name, pol.suggested_action, pol.target_feature, pol.threshold_value)
                        created_count += 1

    print(f"Catalog evaluated. Created {created_count} PENDING actions.")

if __name__ == '__main__':
    run()
