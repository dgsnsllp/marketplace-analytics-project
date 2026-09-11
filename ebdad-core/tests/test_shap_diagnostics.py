import os
import pandas as pd
import pytest
import sys

# Add src to path so pytest can find it
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.ml.explainability import DiagnosticEngine

def test_diagnostic_engine():
    engine = DiagnosticEngine()
    
    dummy_data = {
        'dwell_time_seconds': 100,
        'scroll_depth_pct': 0.5,
        'variant_clicks': 2,
        'reviews_expanded': 0,
        'added_to_cart': 0,
        'base_price': 200,
        'image_count': 1, 
        'description_word_count': 20, 
        'variant_count': 1, 
        'has_size_chart': 0, 
        'rating': 3.5,
        'review_count': 1,
        'PRI': 1.5, 
        'VRS': 0.1,
        'SPI': 0.2,
        'EDI': 2.0
    }
    
    df_instance = pd.DataFrame([dummy_data])
    
    res = engine.diagnose(df_instance)
    
    assert "diagnostics" in res
    assert "all_shap" in res
    assert isinstance(res['diagnostics'], list)
