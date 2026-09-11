import os
import pickle
import shap
import pandas as pd
import numpy as np

class DiagnosticEngine:
    def __init__(self, model_path=None, features_path=None):
        if model_path is None:
            models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'models')
            model_path = os.path.join(models_dir, 'lightgbm_model.pkl')
            features_path = os.path.join(models_dir, 'features.pkl')
            
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)
            
        with open(features_path, 'rb') as f:
            self.features = pickle.load(f)
            
        self.explainer = shap.TreeExplainer(self.model)
        
    def explain_instance(self, instance_df):
        X = instance_df[self.features]
        shap_values = self.explainer.shap_values(X)
        
        if isinstance(shap_values, list):
            shap_values = shap_values[1] 
            
        return shap_values[0], self.explainer.expected_value
        
    def diagnose(self, instance_df):
        shap_vals, expected_value = self.explain_instance(instance_df)
        
        if isinstance(expected_value, (list, np.ndarray)):
            expected_value = expected_value[1] if len(expected_value) > 1 else expected_value[0]
            
        diagnostics = []
        row = instance_df.iloc[0]
        
        shap_dict = {feat: shap_vals[i] for i, feat in enumerate(self.features)}
        
        if row.get('image_count', 0) <= 2 and shap_dict.get('image_count', 0) < -0.08:
            diagnostics.append({
                "issue": "Kritik Hata: Yetersiz Görsel Sayısı",
                "action": "En az 4 farklı açıdan çekilmiş görsel yükleyin",
                "shap_impact": shap_dict['image_count']
            })
            
        if row.get('variant_count', 0) <= 1 and shap_dict.get('variant_count', 0) < -0.06:
            diagnostics.append({
                "issue": "Varyant / Beden Seçeneği Yok",
                "action": "En az 3 farklı beden/renk ekleyin",
                "shap_impact": shap_dict['variant_count']
            })
            
        if row.get('has_size_chart', 1) == 0 and shap_dict.get('has_size_chart', 0) < -0.05:
            diagnostics.append({
                "issue": "Beden Tablosu Eksik",
                "action": "Standart beden tablosu görseli ekleyin",
                "shap_impact": shap_dict['has_size_chart']
            })
            
        if row.get('description_word_count', 100) < 50 and shap_dict.get('description_word_count', 0) < -0.07:
            diagnostics.append({
                "issue": "Çok Kısa Ürün Açıklaması",
                "action": "Açıklamayı en az 100 kelimeye çıkarın",
                "shap_impact": shap_dict['description_word_count']
            })
            
        if row.get('PRI', 1.0) > 1.25 and shap_dict.get('PRI', 0) < -0.10:
            diagnostics.append({
                "issue": "Kategori Ortalamasının Üzerinde Fiyat",
                "action": "Fiyatı kategori medyanına yaklaştırın",
                "shap_impact": shap_dict['PRI']
            })
            
        negative_contributors = []
        for feat, val in shap_dict.items():
            if val <= -0.05:
                negative_contributors.append({"feature": feat, "shap_impact": val})
                
        return {
            "expected_value": float(expected_value),
            "diagnostics": diagnostics,
            "negative_contributors": sorted(negative_contributors, key=lambda x: x['shap_impact']),
            "all_shap": {k: float(v) for k, v in shap_dict.items()}
        }
