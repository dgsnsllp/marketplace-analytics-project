import os
import sys
import random
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.db.session import SessionLocal
from src.db.models import ProductAction
from src.services.action_service import transition_action
from datetime import datetime, timedelta

def run():
    db = SessionLocal()
    
    # Randomly pick some PENDING actions and transition them to APPLIED
    pending = db.query(ProductAction).filter(ProductAction.status == 'PENDING').limit(15).all()
    for act in pending:
        transition_action(db, act.action_id, 'APPLIED', 'SYSTEM_MOCK')
    
    # Pick some APPLIED actions and transition them to RESOLVED with mock DiD values
    applied = db.query(ProductAction).filter(ProductAction.status == 'APPLIED').limit(8).all()
    
    for act in applied:
        transition_action(db, act.action_id, 'RESOLVED', 'SYSTEM_MOCK')
        # Simulate Causal Uplift calculation
        act.measured_uplift_pct = round(random.uniform(-1.5, 8.5), 2)
        act.attributed_gmv_tl = round(random.uniform(-2000, 25000), 2)
        if act.measured_uplift_pct < 0:
            act.attributed_gmv_tl = act.attributed_gmv_tl if act.attributed_gmv_tl < 0 else act.attributed_gmv_tl * -1
            
        act.evaluation_end_date = datetime.now() - timedelta(days=1)
        
    db.commit()
    print(f"Mock resolved {len(applied)} actions to populate ROI data.")

if __name__ == '__main__':
    run()
