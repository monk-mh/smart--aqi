"""
SmartAQ Campus — FastAPI Entry Point
Main application with CORS, router mounting, and startup hooks.
"""

import sys
import io
import asyncio

# ─── Windows UTF-8 Fix ──────────────────────────────────────────
# Reconfigure stdout/stderr for UTF-8 so emoji logs don't crash on Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from database import init_db, SessionLocal
from models import Telemetry
from services.simulator import generate_historical

# Import routers
from routes.auth import router as auth_router
from routes.sensors import router as sensors_router
from routes.alerts import router as alerts_router
from routes.analytics import router as analytics_router
from routes.predictions import router as predictions_router
from routes.websocket_handler import router as ws_router
from routes.ingest import router as ingest_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ─── Startup ─────────────────────────────────────────
    print("=" * 60)
    print("  SmartAQ Campus - Air Quality Monitoring Platform")
    print("=" * 60)

    # Generate historical data only if the telemetry table is empty
    db = SessionLocal()
    try:
        count = db.query(Telemetry).count()
    finally:
        db.close()

    if count == 0:
        print("  No telemetry found - generating 48h of historical data...")
        generate_historical(hours=48)
        print("  Historical data ready!")
    else:
        print(f"  Found {count} existing telemetry records. Skipping backfill.")

    print("\n  Server is running!")
    print("  API Docs: http://localhost:8000/docs")
    print("  WebSocket AQI: ws://localhost:8000/ws/aqi")
    print("  WebSocket Alerts: ws://localhost:8000/ws/alerts")
    print("=" * 60)

    # ─── Start live simulation background task ────────────
    from services.simulator import live_tick
    from config import SIMULATION_INTERVAL_SECONDS

    async def simulation_loop():
        """Continuously generate sensor readings every N seconds."""
        while True:
            await live_tick()
            await asyncio.sleep(SIMULATION_INTERVAL_SECONDS)

    sim_task = asyncio.create_task(simulation_loop())
    print(f"  Live simulator started (interval={SIMULATION_INTERVAL_SECONDS}s)")

    yield

    # ─── Shutdown ────────────────────────────────────────
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass
    print("\n  SmartAQ Campus server shutting down...")


# ─── Create App ──────────────────────────────────────────────────
# Initialize real database tables and seed data
init_db()

app = FastAPI(
    title="SmartAQ Campus API",
    description="Real-time campus air quality monitoring platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS Middleware ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Mount Routers ───────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(sensors_router)
app.include_router(alerts_router)
app.include_router(analytics_router)
app.include_router(predictions_router)
app.include_router(ws_router)
app.include_router(ingest_router)


# ─── Health Check ────────────────────────────────────────────────
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "SmartAQ Campus"}
