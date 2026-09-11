import os
import pytest
import pickle

def test_models_exist():
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'models')
    
    assert os.path.exists(os.path.join(models_dir, 'lightgbm_model.pkl'))
    assert os.path.exists(os.path.join(models_dir, 'kmeans_cluster.pkl'))
    assert os.path.exists(os.path.join(models_dir, 'scaler.pkl'))
    
def test_model_loading():
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'models')
    
    with open(os.path.join(models_dir, 'lightgbm_model.pkl'), 'rb') as f:
        model = pickle.load(f)
        
    assert model is not None
