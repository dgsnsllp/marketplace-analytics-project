from sqlalchemy import Column, Integer, String, Numeric, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from src.db.session import Base

class Product(Base):
    __tablename__ = 'products'
    product_id = Column(String(50), primary_key=True)
    category = Column(String(50), nullable=False)
    base_price = Column(Numeric(10, 2), nullable=False)
    image_count = Column(Integer, nullable=False)
    description_word_count = Column(Integer, nullable=False)
    variant_count = Column(Integer, nullable=False)
    has_size_chart = Column(Boolean, default=False)
    rating = Column(Numeric(3, 2), default=4.0)
    review_count = Column(Integer, default=0)
    health_score = Column(Integer, default=100)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class ActionPolicy(Base):
    __tablename__ = 'action_policies'
    policy_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    target_feature = Column(String(50), nullable=False)
    operator = Column(String(10), nullable=False)
    threshold_value = Column(Numeric(10, 2), nullable=False)
    secondary_condition = Column(String(100))
    action_type = Column(String(50), nullable=False)
    suggested_action = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

class ProductAction(Base):
    __tablename__ = 'product_actions'
    action_id = Column(String(50), primary_key=True)
    product_id = Column(String(50), ForeignKey('products.product_id'))
    policy_id = Column(String(50), ForeignKey('action_policies.policy_id'))
    trigger_source = Column(String(30), default='SHAP_RECOMMENDATION')
    identified_issue = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=False)
    status = Column(String(20), default='PENDING')
    target_feature = Column(String(50), nullable=False)
    target_threshold_value = Column(Numeric(10, 2))
    
    created_at = Column(DateTime, default=func.now())
    applied_at = Column(DateTime)
    evaluation_end_date = Column(DateTime)
    evaluation_window_days = Column(Integer, default=14)
    
    baseline_conversion_rate = Column(Numeric(6, 4))
    baseline_avg_dwell = Column(Numeric(6, 2))
    baseline_image_count = Column(Integer)
    baseline_price = Column(Numeric(10, 2))
    
    post_conversion_rate = Column(Numeric(6, 4))
    post_avg_dwell = Column(Numeric(6, 2))
    measured_uplift_pct = Column(Numeric(6, 2))
    attributed_gmv_tl = Column(Numeric(12, 2))

class ActionAuditLog(Base):
    __tablename__ = 'action_audit_logs'
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    action_id = Column(String(50), ForeignKey('product_actions.action_id'))
    previous_status = Column(String(20))
    new_status = Column(String(20))
    actor = Column(String(50), default='SYSTEM')
    change_summary = Column(Text)
    logged_at = Column(DateTime, default=func.now())
