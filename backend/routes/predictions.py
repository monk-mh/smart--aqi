"""
SmartAQ Campus — Predictions Routes
"""

import math
from datetime import datetime, timezone, timedelta
from collections import defaultdict

from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Telemetry

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])

def _linear_regression(x: list, y: list) -> tuple:
    n = len(x)
    if n < 2:
        return 0, (y[0] if y else 0), 0

    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi * xi for xi in x)

    denom = n * sum_x2 - sum_x * sum_x
    if denom == 0:
        return 0, sum_y / n, 0

    slope = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n

    mean_y = sum_y / n
    ss_tot = sum((yi - mean_y) ** 2 for yi in y) or 1
    ss_res = sum((yi - (slope * xi + intercept)) ** 2 for xi, yi in zip(x, y))
    r_squared = max(0, 1 - ss_res / ss_tot)

    return slope, intercept, r_squared


@router.get("")
async def get_predictions(hours_ahead: int = Query(24, ge=1, le=48), db: Session = Depends(get_db)):
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    readings = db.query(Telemetry).filter(Telemetry.timestamp >= cutoff, Telemetry.status != "malfunction").all()

    hourly = defaultdict(lambda: {"aqi_sum": 0, "count": 0})
    for r in readings:
        ts = datetime.fromisoformat(r.timestamp)
        hour_key = ts.strftime("%Y-%m-%d %H:00")
        hourly[hour_key]["aqi_sum"] += r.aqi or 0
        hourly[hour_key]["count"] += 1

    sorted_hours = sorted(hourly.keys())
    x_vals = list(range(len(sorted_hours)))
    y_vals = [hourly[h]["aqi_sum"] / hourly[h]["count"] for h in sorted_hours]

    if len(x_vals) < 3:
        return {"error": "Insufficient data for prediction", "data": []}

    slope, intercept, r_squared = _linear_regression(x_vals, y_vals)

    residuals = [y - (slope * x + intercept) for x, y in zip(x_vals, y_vals)]
    std_err = math.sqrt(sum(r * r for r in residuals) / max(len(residuals) - 2, 1))
    confidence_band = 1.96 * std_err

    now = datetime.now(timezone.utc)
    last_x = len(x_vals) - 1
    predictions = []

    for i, hour_key in enumerate(sorted_hours[-12:]):
        actual_aqi = round(hourly[hour_key]["aqi_sum"] / hourly[hour_key]["count"], 1)
        predictions.append({
            "timestamp": hour_key,
            "aqi": actual_aqi,
            "type": "actual",
            "lower_bound": None,
            "upper_bound": None,
        })

    for h in range(1, hours_ahead + 1):
        future_x = last_x + h
        predicted_aqi = slope * future_x + intercept

        hour_of_day = (now + timedelta(hours=h)).hour
        daily_offset = 15 * math.sin((hour_of_day - 6) * math.pi / 12)
        predicted_aqi += daily_offset

        predicted_aqi = max(0, min(500, round(predicted_aqi, 1)))

        width = confidence_band * (1 + h * 0.15)
        lower = max(0, round(predicted_aqi - width, 1))
        upper = min(500, round(predicted_aqi + width, 1))

        future_time = (now + timedelta(hours=h)).strftime("%Y-%m-%d %H:00")
        predictions.append({
            "timestamp": future_time,
            "aqi": predicted_aqi,
            "type": "predicted",
            "lower_bound": lower,
            "upper_bound": upper,
        })

    return {
        "hours_ahead": hours_ahead,
        "model": {
            "slope": round(slope, 4),
            "intercept": round(intercept, 2),
            "r_squared": round(r_squared, 4),
            "confidence_level": 0.95,
        },
        "data": predictions,
    }
