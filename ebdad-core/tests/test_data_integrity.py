import os
import pandas as pd
import pytest

def test_data_generation():
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
    
    prod_path = os.path.join(data_dir, 'raw_products.parquet')
    sess_path = os.path.join(data_dir, 'raw_sessions.parquet')
    
    assert os.path.exists(prod_path)
    assert os.path.exists(sess_path)
    
    df_prod = pd.read_parquet(prod_path)
    df_sess = pd.read_parquet(sess_path)
    
    assert len(df_prod) == 1000
    assert len(df_sess) == 100000
    
    assert 'product_id' in df_prod.columns
    assert 'session_id' in df_sess.columns
    assert 'added_to_cart' in df_sess.columns
    assert 'purchased' in df_sess.columns
    
    # Asserting product id formats
    assert df_prod['product_id'].iloc[0].startswith('P-')
    assert df_sess['session_id'].iloc[0].startswith('S-')
