"""
SmartAQ Campus — Analytics Routes
"""

from datetime import datetime, timezone, timedelta
from collections import defaultdict
import csv
import io

from fastapi import APIRouter, Query, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Telemetry, Sensor

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/trends")
async def get_trends(hours: int = Query(24, ge=1, le=72), db: Session = Depends(get_db)):
    """
    Get hourly averaged AQI trends across all sensors.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()

    readings = db.query(Telemetry).filter(Telemetry.timestamp >= cutoff, Telemetry.status != "malfunction").all()

    # Group readings by hour
    hourly = defaultdict(lambda: {"aqi_sum": 0, "pm25_sum": 0, "pm10_sum": 0,
                                   "co2_sum": 0, "temp_sum": 0, "humidity_sum": 0,
                                   "count": 0})

    for r in readings:
        ts = datetime.fromisoformat(r.timestamp)
        hour_key = ts.strftime("%Y-%m-%d %H:00")
        h = hourly[hour_key]
        h["aqi_sum"] += r.aqi or 0
        h["pm25_sum"] += r.pm25 or 0
        h["pm10_sum"] += r.pm10 or 0
        h["co2_sum"] += r.co2 or 0
        h["temp_sum"] += r.temperature or 0
        h["humidity_sum"] += r.humidity or 0
        h["count"] += 1

    # Build output
    result = []
    for hour_key in sorted(hourly.keys()):
        h = hourly[hour_key]
        n = h["count"]
        if n == 0:
            continue
        result.append({
            "timestamp": hour_key,
            "aqi": round(h["aqi_sum"] / n, 1),
            "pm25": round(h["pm25_sum"] / n, 1),
            "pm10": round(h["pm10_sum"] / n, 1),
            "co2": round(h["co2_sum"] / n, 0),
            "temperature": round(h["temp_sum"] / n, 1),
            "humidity": round(h["humidity_sum"] / n, 1),
        })

    return {"hours": hours, "data": result}


@router.get("/pollutant-breakdown")
async def get_pollutant_breakdown(db: Session = Depends(get_db)):
    """
    Get per-pollutant averages grouped by sensor location.
    """
    sensor_data = defaultdict(lambda: {"pm25_sum": 0, "pm10_sum": 0,
                                        "co2_sum": 0, "no2_sum": 0,
                                        "so2_sum": 0, "count": 0, "name": ""})

    # Use last 6 hours of data
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat()
    readings = db.query(Telemetry).filter(Telemetry.timestamp >= cutoff, Telemetry.status != "malfunction").all()

    # Get sensor names
    sensors = {s.id: s.name for s in db.query(Sensor).all()}

    for r in readings:
        sid = r.sensor_id
        d = sensor_data[sid]
        d["pm25_sum"] += r.pm25 or 0
        d["pm10_sum"] += r.pm10 or 0
        d["co2_sum"] += r.co2 or 0
        d["no2_sum"] += r.no2 or 0
        d["so2_sum"] += r.so2 or 0
        d["count"] += 1
        d["name"] = sensors.get(sid, sid)

    result = []
    for sid, d in sensor_data.items():
        n = d["count"]
        if n == 0:
            continue
        result.append({
            "sensor_id": sid,
            "sensor_name": d["name"],
            "pm25": round(d["pm25_sum"] / n, 1),
            "pm10": round(d["pm10_sum"] / n, 1),
            "co2": round(d["co2_sum"] / n, 0),
            "no2": round(d["no2_sum"] / n, 1),
            "so2": round(d["so2_sum"] / n, 1),
        })

    return result


@router.get("/export")
async def export_telemetry_csv(
    hours: int = Query(24, ge=1, le=168),
    sensor_id: str = Query("all"),
    db: Session = Depends(get_db)
):
    """
    Export historical sensor telemetry data as a CSV file.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    
    query = db.query(Telemetry).filter(Telemetry.timestamp >= cutoff)
    if sensor_id != "all":
        query = query.filter(Telemetry.sensor_id == sensor_id)
        
    readings = query.order_by(Telemetry.timestamp.desc()).all()
    sensors = {s.id: s for s in db.query(Sensor).all()}

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Timestamp", "Sensor ID", "Sensor Name", "Location Type", "Latitude", "Longitude",
        "Status", "Battery %", "AQI", "AQI Category", "PM2.5 (ug/m3)", "PM10 (ug/m3)",
        "CO2 (ppm)", "NO2 (ug/m3)", "SO2 (ug/m3)", "Temperature (C)", "Humidity (%)",
        "Dominant Pollutant"
    ])

    for r in readings:
        sensor = sensors.get(r.sensor_id)
        s_name = sensor.name if sensor else r.sensor_id
        loc_type = sensor.location_type if sensor else "Unknown"
        lat = sensor.lat if sensor else 0
        lng = sensor.lng if sensor else 0

        writer.writerow([
            r.timestamp,
            r.sensor_id,
            s_name,
            loc_type,
            lat,
            lng,
            r.status,
            r.battery,
            r.aqi,
            r.aqi_category,
            r.pm25,
            r.pm10,
            r.co2,
            r.no2,
            r.so2,
            r.temperature,
            r.humidity,
            r.dominant_pollutant
        ])

    output.seek(0)
    filename = f"smartaq_history_{hours}h.csv" if sensor_id == "all" else f"smartaq_history_{sensor_id}_{hours}h.csv"

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
