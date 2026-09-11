import os
import sys

# Ensure project root is in PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.db.session import engine
from src.db.models import Base
from sqlalchemy import text

def migrate_and_index():
    print("Starting data migration...")
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    print("Database tables verified.")

    # 1. Clear existing data safely
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE products CASCADE"))

    # 2. Generate and Insert products (simulating reading from Parquet)
    products_data = []
    for i in range(1, 1001):
        products_data.append({
            "product_id": f"PROD-{i:05d}",
            "category": "Electronics" if i % 2 == 0 else "Fashion",
            "base_price": 100.0 + (i % 50),
            "image_count": (i % 5) + 1,
            "description_word_count": 100 + (i % 100),
            "variant_count": (i % 3) + 1,
            "has_size_chart": bool(i % 2),
            "rating": 4.5,
            "review_count": i % 50,
            "health_score": 100
        })

    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO products (product_id, category, base_price, image_count, description_word_count, variant_count, has_size_chart, rating, review_count, health_score) 
                VALUES (:product_id, :category, :base_price, :image_count, :description_word_count, :variant_count, :has_size_chart, :rating, :review_count, :health_score)
            """),
            products_data
        )
    print(f"Successfully migrated {len(products_data)} products into PostgreSQL.")

    # 3. Create indices for performance
    print("Building database indices...")
    with engine.begin() as conn:
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_health ON products (health_score);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_actions_status ON product_actions (status);"))
    print("Database indices created successfully.")

if __name__ == "__main__":
    migrate_and_index()
