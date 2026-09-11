import os
import pytest
from fastapi.testclient import TestClient
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.api.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_overview():
    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_sessions" in data
    assert "funnel" in data

def test_diagnostics_list():
    response = client.get("/api/diagnostics/products?page=1&limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data['data']) == 2
    
def test_what_if():
    res = client.get("/api/diagnostics/products?page=1&limit=1")
    pid = res.json()['data'][0]['product_id']
    
    payload = {
        "product_id": pid,
        "new_image_count": 5,
        "add_size_chart": 1
    }
    
    response = client.post("/api/simulator/what-if", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "original_probability" in data
    assert "new_probability" in data
    assert "uplift_pct" in data
