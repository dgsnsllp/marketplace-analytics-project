import os
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import pickle

def train_clustering():
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data')
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'models')
    
    in_path = os.path.join(data_dir, 'processed_dataset.parquet')
    df = pd.read_parquet(in_path)
    
    features_cluster = ['dwell_time_seconds', 'scroll_depth_pct', 'variant_clicks', 'EDI']
    X_c = df[features_cluster].fillna(0)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_c)
    
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    kmeans.fit(X_scaled)
    
    os.makedirs(models_dir, exist_ok=True)
    with open(os.path.join(models_dir, 'kmeans_cluster.pkl'), 'wb') as f:
        pickle.dump(kmeans, f)
        
    with open(os.path.join(models_dir, 'scaler.pkl'), 'wb') as f:
        pickle.dump(scaler, f)
        
    print("Clustering models saved.")

if __name__ == '__main__':
    train_clustering()
