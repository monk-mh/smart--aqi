"""
SmartAQ Campus — Application Configuration
"""

import os

# ─── JWT Settings ────────────────────────────────────────────────
SECRET_KEY = os.getenv("SMARTAQ_SECRET_KEY", "smartaq-super-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7   # 7 days

# ─── CORS ────────────────────────────────────────────────────────
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://smart-aqi-one.vercel.app",
]

# Add external frontend URL if provided
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url == "*":
    CORS_ORIGINS = ["*"]
elif frontend_url:
    CORS_ORIGINS.append(frontend_url)

# ─── Simulation ──────────────────────────────────────────────────
SIMULATION_INTERVAL_SECONDS = 5
HISTORICAL_BACKFILL_HOURS = 48

# ─── AQI Thresholds for Alerts ──────────────────────────────────
ALERT_THRESHOLDS = {
    "warning": 100,
    "danger": 150,
    "critical": 200,
}
