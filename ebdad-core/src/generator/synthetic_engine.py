import pandas as pd
import numpy as np
import os
import pyarrow as pa
import pyarrow.parquet as pq

np.random.seed(42)

def generate_products(n=1000):
    categories = ['T-shirt', 'Shoes', 'Electronics', 'Watch', 'Home & Living']
    
    products = []
    for i in range(n):
        cat = np.random.choice(categories)
        base_price = round(np.random.uniform(10.0, 500.0), 2)
        if cat == 'Electronics':
            base_price = round(np.random.uniform(100.0, 2000.0), 2)
        elif cat == 'Watch':
            base_price = round(np.random.uniform(50.0, 1000.0), 2)
            
        products.append({
            'product_id': f"P-{1000+i}",
            'category': cat,
            'base_price': base_price,
            'image_count': np.random.randint(1, 9),
            'description_word_count': np.random.randint(10, 451),
            'variant_count': np.random.randint(1, 15),
            'has_size_chart': np.random.choice([0, 2]), # 0 or 1. Wait, np.random.choice([0, 1])
            'rating': round(np.random.uniform(1.0, 5.0), 1),
            'review_count': np.random.randint(0, 1201)
        })
    df_products = pd.DataFrame(products)
    # Fix the has_size_chart bug:
    df_products['has_size_chart'] = np.random.choice([0, 1], size=n)
    return df_products

def generate_sessions(df_products, n_interactions=100000):
    n_sessions = 35000
    
    session_ids = [f"S-{10000+i}" for i in range(n_sessions)]
    user_ids = [f"U-{1000+i}" for i in range(n_sessions // 2)]
    
    median_prices = df_products.groupby('category')['base_price'].median().to_dict()
    
    interactions = []
    
    for i in range(n_interactions):
        session_id = session_ids[i % n_sessions]
        user_id = user_ids[i % len(user_ids)]
        
        product = df_products.sample(1).iloc[0]
        
        p_cart = 0.10
        p_purchase_given_cart = 0.50
        
        dwell_time = np.random.randint(5, 300)
        scroll_depth = np.random.uniform(0.1, 1.0)
        variant_clicks = np.random.randint(0, 10)
        reviews_expanded = np.random.choice([0, 1])
        
        # SC-03
        if product['description_word_count'] < 30:
            if np.random.random() < 0.80:
                dwell_time = np.random.randint(1, 6)
            p_cart = 0.02
            
        # SC-01
        if product['image_count'] == 1 and dwell_time > 40:
            p_cart *= 0.25
            
        # SC-04
        if product['base_price'] > 1.35 * median_prices[product['category']]:
            p_cart *= 0.40
            
        # SC-05
        if product['review_count'] < 3 and scroll_depth > 0.70:
            p_cart *= 0.35
            
        # SC-06
        if product['category'] in ['T-shirt', 'Shoes'] and product['has_size_chart'] == 0:
            p_cart *= 0.50
            
        # SC-07
        if product['rating'] >= 4.5 and product['review_count'] > 50 and reviews_expanded == 1:
            p_cart *= 2.10
            
        added_to_cart = 1 if np.random.random() < p_cart else 0
        
        # SC-02
        if product['category'] in ['T-shirt', 'Shoes'] and product['variant_count'] == 1:
            p_purchase_given_cart *= 0.30
            
        purchased = 0
        if added_to_cart:
            purchased = 1 if np.random.random() < p_purchase_given_cart else 0
            
        interactions.append({
            'session_id': session_id,
            'user_id': user_id,
            'product_id': product['product_id'],
            'dwell_time_seconds': dwell_time,
            'scroll_depth_pct': round(scroll_depth, 2),
            'variant_clicks': variant_clicks,
            'reviews_expanded': reviews_expanded,
            'added_to_cart': added_to_cart,
            'purchased': purchased
        })
        
    df_sessions = pd.DataFrame(interactions)
    return df_sessions

if __name__ == '__main__':
    print("Generating products...")
    df_prod = generate_products()
    print("Generating sessions...")
    df_sess = generate_sessions(df_prod)
    
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    df_prod.to_parquet(os.path.join(data_dir, 'raw_products.parquet'))
    df_sess.to_parquet(os.path.join(data_dir, 'raw_sessions.parquet'))
    print("Synthetic data generated successfully.")
