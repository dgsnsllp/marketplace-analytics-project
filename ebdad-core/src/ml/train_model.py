import os
import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import roc_auc_score
import pickle

def train_lgb_model():
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data')
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'models')
    
    in_path = os.path.join(data_dir, 'processed_dataset.parquet')
    df = pd.read_parquet(in_path)
    
    features = [
        'dwell_time_seconds', 'scroll_depth_pct', 'variant_clicks', 
        'reviews_expanded', 'added_to_cart', 'base_price', 'image_count', 
        'description_word_count', 'variant_count', 'has_size_chart', 
        'rating', 'review_count', 'PRI', 'VRS', 'SPI', 'EDI'
    ]
    target = 'purchased'
    
    X = df[features]
    y = df[target]
    
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    oof = np.zeros(len(df))
    models = []
    
    params = {
        'objective': 'binary',
        'metric': 'auc',
        'learning_rate': 0.05,
        'max_depth': 6,
        'num_leaves': 31,
        'feature_fraction': 0.8,
        'verbose': -1,
        'seed': 42
    }
    
    print("Training LightGBM with 5-Fold Stratified CV...")
    
    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
        X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
        X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]
        
        dtrain = lgb.Dataset(X_train, label=y_train)
        dval = lgb.Dataset(X_val, label=y_val, reference=dtrain)
        
        model = lgb.train(
            params,
            dtrain,
            num_boost_round=500,
            valid_sets=[dtrain, dval],
            callbacks=[lgb.early_stopping(stopping_rounds=50, verbose=False)]
        )
        
        val_preds = model.predict(X_val)
        oof[val_idx] = val_preds
        
        fold_auc = roc_auc_score(y_val, val_preds)
        print(f"Fold {fold+1} AUC: {fold_auc:.4f}")
        
        models.append(model)
        
    cv_auc = roc_auc_score(y, oof)
    print(f"Overall CV AUC: {cv_auc:.4f}")
    
    assert cv_auc >= 0.82, f"Failed requirement: ROC-AUC is {cv_auc:.4f} < 0.82"
    
    print("Training final model on full dataset...")
    dall = lgb.Dataset(X, label=y)
    final_model = lgb.train(params, dall, num_boost_round=150)
    
    os.makedirs(models_dir, exist_ok=True)
    with open(os.path.join(models_dir, 'lightgbm_model.pkl'), 'wb') as f:
        pickle.dump(final_model, f)
        
    with open(os.path.join(models_dir, 'features.pkl'), 'wb') as f:
        pickle.dump(features, f)
        
    print("Model training complete.")

if __name__ == '__main__':
    train_lgb_model()
