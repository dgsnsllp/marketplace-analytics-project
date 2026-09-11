from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from src.api.routes import router, periodic_retrain_task
from src.api.routes_actions import router as actions_router
from src.api.routes_ai_advisor import router as ai_advisor_router
import asyncio

app = FastAPI(title="E-BDAD API")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(periodic_retrain_task())

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(actions_router)
app.include_router(ai_advisor_router)

dashboard_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dashboard')
os.makedirs(dashboard_path, exist_ok=True) # Ensure it exists for mounting

# Mount dashboard on root
app.mount("/", StaticFiles(directory=dashboard_path, html=True), name="dashboard")
