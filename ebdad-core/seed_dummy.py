import os
import pandas as pd
import numpy as np
import random
import uuid
import datetime
from sqlalchemy import text
from src.db.session import SessionLocal, engine
from src.db.models import Base, Product, ActionPolicy, ProductAction, ActionAuditLog
from src.services.action_service import create_action, transition_action

def seed():
    print("Initializing database...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    print("Cleaning old data...")
    db.execute(text('DELETE FROM action_audit_logs'))
    db.execute(text('DELETE FROM product_actions'))
    db.execute(text('DELETE FROM action_policies'))
    db.execute(text('DELETE FROM products'))
    db.commit()
    
    # 1. Add 5 Policies
    policies_data = [
        ("Low Visual Richness", "image_count", "<=", 2.0, "IMAGE", "Yetersiz Görsel", "En az 4 farklı açıdan görsel ekle"),
        ("Missing Variations", "variant_count", "<=", 1.0, "VARIANT", "Varyant Eksikliği", "Renk/Beden seçenekleri ekle"),
        ("High Price / Low Engagement", "base_price", ">", 100.0, "PRICE", "Yüksek Fiyat", "Kategori medyan fiyatına çek"),
        ("Poor Description", "description_word_count", "<", 50.0, "CONTENT", "Yetersiz Açıklama", "Açıklamayı genişlet"),
        ("No Size Chart", "has_size_chart", "==", 0.0, "CONTENT", "Beden Tablosu Eksik", "Standart beden tablosu ekle")
    ]
    
    policies = {}
    for name, feat, op, val, atype, issue, act in policies_data:
        pid = f'POL-{uuid.uuid4().hex[:8].upper()}'
        db.add(ActionPolicy(
            policy_id=pid, name=name, target_feature=feat, operator=op,
            threshold_value=val, action_type=atype, suggested_action=act
        ))
        policies[name] = {"id": pid, "feat": feat, "val": val, "issue": issue, "action": act}
    db.commit()
    
    # 2. Load Parquet and insert Products
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    try:
        df = pd.read_parquet(os.path.join(data_dir, 'raw_products.parquet'))
        print(f"Loaded {len(df)} products from parquet.")
    except Exception as e:
        print("Could not load products.parquet", e)
        return
        
    df_sample = df.sample(n=min(200, len(df)), random_state=42)
    products_to_insert = []
    for _, row in df_sample.iterrows():
        products_to_insert.append(Product(
            product_id=row['product_id'],
            category=row['category'],
            base_price=row['base_price'],
            image_count=row['image_count'],
            description_word_count=row['description_word_count'],
            variant_count=row['variant_count'],
            has_size_chart=bool(row['has_size_chart']),
            rating=4.0,
            review_count=10
        ))
    db.add_all(products_to_insert)
    db.commit()
    print(f"Inserted {len(products_to_insert)} products into DB.")
    
    # 3. Create Actions
    print("Scanning products for actions...")
    created_actions = []
    
    # Base probability for generating actions
    for p in products_to_insert:
        # Check rules
        if p.image_count <= 2:
            pol = policies["Low Visual Richness"]
            aid = create_action(db, p.product_id, pol['id'], pol['issue'], pol['action'], pol['feat'], pol['val'])
            created_actions.append(aid)
            
        if p.variant_count <= 1 and random.random() > 0.5:
            pol = policies["Missing Variations"]
            aid = create_action(db, p.product_id, pol['id'], pol['issue'], pol['action'], pol['feat'], pol['val'])
            created_actions.append(aid)
            
        if p.base_price > 100 and random.random() > 0.3:
            pol = policies["High Price / Low Engagement"]
            aid = create_action(db, p.product_id, pol['id'], pol['issue'], pol['action'], pol['feat'], pol['val'])
            created_actions.append(aid)
            
        if p.description_word_count < 50:
            pol = policies["Poor Description"]
            aid = create_action(db, p.product_id, pol['id'], pol['issue'], pol['action'], pol['feat'], pol['val'])
            created_actions.append(aid)
            
        if not p.has_size_chart:
            pol = policies["No Size Chart"]
            aid = create_action(db, p.product_id, pol['id'], pol['issue'], pol['action'], pol['feat'], pol['val'])
            created_actions.append(aid)
            
    print(f"Generated {len(created_actions)} PENDING actions.")
    
    # 4. Resolve / Apply some actions to simulate history
    random.shuffle(created_actions)
    applied_count = 6
    resolved_count = 8
    
    for i in range(applied_count):
        if i < len(created_actions):
            transition_action(db, created_actions[i], "APPLIED", "MERCHANT")
            
    for i in range(applied_count, applied_count + resolved_count):
        if i < len(created_actions):
            act_id = created_actions[i]
            transition_action(db, act_id, "APPLIED", "MERCHANT")
            transition_action(db, act_id, "RESOLVED", "SYSTEM")
            # Update GMV and uplift for resolved
            db.execute(text(f"""
                UPDATE product_actions 
                SET measured_uplift_pct = {random.uniform(2.5, 15.0):.2f},
                    attributed_gmv_tl = {random.uniform(500, 5000):.2f}
                WHERE action_id = '{act_id}'
            """))
            
    db.commit()
    print("Seed complete!")

if __name__ == '__main__':
    seed()
