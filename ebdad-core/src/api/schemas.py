from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class WhatIfRequest(BaseModel):
    product_id: str
    image_count: Optional[int] = None
    price: Optional[float] = None
    variant_count: Optional[int] = None
    has_size_chart: Optional[int] = None
    description_word_count: Optional[int] = None

class SimulatorResponse(BaseModel):
    product_id: str
    original_probability: float
    new_probability: float
    uplift_pct: float
    marginal_contributions: Optional[Dict[str, float]] = None

class MLConfig(BaseModel):
    shap_tau: float
    did_window_days: int
    kmeans_k: int

class RejectActionRequest(BaseModel):
    reason: str
