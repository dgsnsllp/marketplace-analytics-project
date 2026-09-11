import duckdb
import os
import pandas as pd

def run_feature_pipeline():
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data')
    prod_path = os.path.join(data_dir, 'raw_products.parquet')
    sess_path = os.path.join(data_dir, 'raw_sessions.parquet')
    out_path = os.path.join(data_dir, 'processed_dataset.parquet')
    
    if not os.path.exists(prod_path) or not os.path.exists(sess_path):
        raise FileNotFoundError("Raw data not found. Run synthetic_engine.py first.")
    
    con = duckdb.connect(database=':memory:')
    
    query = f"""
    WITH category_medians AS (
        SELECT category, MEDIAN(base_price) as median_price
        FROM '{prod_path}'
        GROUP BY category
    ),
    enriched_products AS (
        SELECT 
            p.*,
            cm.median_price,
            (p.base_price / cm.median_price) AS PRI,
            (LEAST(1.0, p.image_count / 5.0) * 0.7 + (p.has_size_chart * 0.3)) AS VRS,
            (LN(1 + p.review_count) * (p.rating / 5.0)) AS SPI
        FROM '{prod_path}' p
        JOIN category_medians cm ON p.category = cm.category
    )
    SELECT 
        s.*,
        ep.category,
        ep.base_price,
        ep.image_count,
        ep.description_word_count,
        ep.variant_count,
        ep.has_size_chart,
        ep.rating,
        ep.review_count,
        ep.PRI,
        ep.VRS,
        ep.SPI,
        (s.dwell_time_seconds / GREATEST(1.0, s.scroll_depth_pct * 100.0)) AS EDI
    FROM '{sess_path}' s
    JOIN enriched_products ep ON s.product_id = ep.product_id
    """
    
    df_processed = con.execute(query).df()
    
    df_processed.to_parquet(out_path)
    print(f"Processed dataset saved to {out_path} with {len(df_processed)} records.")

if __name__ == '__main__':
    run_feature_pipeline()
