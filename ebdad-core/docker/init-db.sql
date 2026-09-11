-- 1. Product Catalog Master
CREATE TABLE products (
    product_id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    image_count INT NOT NULL,
    description_word_count INT NOT NULL,
    variant_count INT NOT NULL,
    has_size_chart BOOLEAN DEFAULT FALSE,
    rating NUMERIC(3, 2) DEFAULT 4.0,
    review_count INT DEFAULT 0,
    health_score INT DEFAULT 100,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Threshold Policies (Configurable via UI)
CREATE TABLE action_policies (
    policy_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    target_feature VARCHAR(50) NOT NULL,    -- 'image_count', 'variant_count', etc.
    operator VARCHAR(10) NOT NULL,          -- '<=', '>=', '=='
    threshold_value NUMERIC(10, 2) NOT NULL,
    secondary_condition VARCHAR(100),       -- e.g. 'dwell_time > 35'
    action_type VARCHAR(50) NOT NULL,       -- 'IMAGE_UPDATE', 'VARIANT_ADDITION', etc.
    suggested_action TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Product Action Log & Causal Tracking
CREATE TABLE product_actions (
    action_id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(product_id),
    policy_id VARCHAR(50) REFERENCES action_policies(policy_id),
    trigger_source VARCHAR(30) DEFAULT 'SHAP_RECOMMENDATION', -- or 'POLICY_RULE', 'MANUAL'
    identified_issue TEXT NOT NULL,
    suggested_action TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, APPLIED, EVALUATING, RESOLVED, FAILED
    
    -- Target configuration applied
    target_feature VARCHAR(50) NOT NULL,
    target_threshold_value NUMERIC(10, 2),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_at TIMESTAMP NULL,
    evaluation_end_date TIMESTAMP NULL,
    evaluation_window_days INT DEFAULT 14,
    
    -- Baseline Pre-Intervention Metrics
    baseline_conversion_rate NUMERIC(6, 4),
    baseline_avg_dwell NUMERIC(6, 2),
    baseline_image_count INT,
    baseline_price NUMERIC(10, 2),
    
    -- Post-Intervention Evaluated Metrics
    post_conversion_rate NUMERIC(6, 4) NULL,
    post_avg_dwell NUMERIC(6, 2) NULL,
    measured_uplift_pct NUMERIC(6, 2) NULL,
    attributed_gmv_tl NUMERIC(12, 2) NULL
);

-- 4. Action State Audit Trail (Detailed Log)
CREATE TABLE action_audit_logs (
    log_id SERIAL PRIMARY KEY,
    action_id VARCHAR(50) REFERENCES product_actions(action_id),
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    actor VARCHAR(50) DEFAULT 'SYSTEM', -- 'MERCHANT', 'ADMIN', 'SYSTEM_WORKER'
    change_summary TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
