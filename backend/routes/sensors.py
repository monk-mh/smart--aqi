"""
SmartAQ Campus — Sensor Routes
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from database import get_db
from models import Sensor, Telemetry

router = APIRouter(prefix="/api/sensors", tags=["Sensors"])

def _get_latest_readings_dict(db: Session):
    # This is a bit naive for large tables but fine for 8 sensors
    # Group by sensor_id and get the max timestamp
    from sqlalchemy import func
    subq = db.query(
        Telemetry.sensor_id, 
        func.max(Telemetry.timestamp).label('max_ts')
    ).group_by(Telemetry.sensor_id).subquery()

    latest_readings = db.query(Telemetry).join(
        subq, 
        (Telemetry.sensor_id == subq.c.sensor_id) & (Telemetry.timestamp == subq.c.max_ts)
    ).all()
    
    return {r.sensor_id: {
        "id": r.id,
        "sensor_id": r.sensor_id,
        "timestamp": r.timestamp,
        "status": r.status,
        "pm25": r.pm25,
        "pm10": r.pm10,
        "co2": r.co2,
        "no2": r.no2,
        "so2": r.so2,
        "temperature": r.temperature,
        "humidity": r.humidity,
        "aqi": r.aqi,
        "aqi_category": r.aqi_category,
        "dominant_pollutant": r.dominant_pollutant
    } for r in latest_readings}


@router.get("")
async def list_sensors(db: Session = Depends(get_db)):
    """List all sensors with their latest reading."""
    sensors = db.query(Sensor).all()
    latest_dict = _get_latest_readings_dict(db)
    
    result = []
    for s in sensors:
        sensor_data = {
            "id": s.id,
            "name": s.name,
            "location_type": s.location_type,
            "lat": s.lat,
            "lng": s.lng,
            "battery": s.battery,
            "status": s.status,
            "installed_at": s.installed_at
        }
        sensor_data["latest_reading"] = latest_dict.get(s.id)
        result.append(sensor_data)
    return result


@router.get("/{sensor_id}")
async def get_sensor(sensor_id: str, db: Session = Depends(get_db)):
    """Get single sensor details with latest reading."""
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    latest_dict = _get_latest_readings_dict(db)
    sensor_data = {
        "id": sensor.id,
        "name": sensor.name,
        "location_type": sensor.location_type,
        "lat": sensor.lat,
        "lng": sensor.lng,
        "battery": sensor.battery,
        "status": sensor.status,
        "installed_at": sensor.installed_at
    }
    sensor_data["latest_reading"] = latest_dict.get(sensor_id)
    return sensor_data


@router.get("/{sensor_id}/history")
async def get_sensor_history(sensor_id: str, hours: int = Query(24, ge=1, le=72), db: Session = Depends(get_db)):
    """Get historical readings for a sensor."""
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    readings = db.query(Telemetry).filter(Telemetry.sensor_id == sensor_id, Telemetry.timestamp >= cutoff).order_by(Telemetry.timestamp.asc()).all()

    history = [{
        "id": r.id,
        "sensor_id": r.sensor_id,
        "timestamp": r.timestamp,
        "status": r.status,
        "pm25": r.pm25,
        "pm10": r.pm10,
        "co2": r.co2,
        "no2": r.no2,
        "so2": r.so2,
        "temperature": r.temperature,
        "humidity": r.humidity,
        "aqi": r.aqi,
        "aqi_category": r.aqi_category,
        "dominant_pollutant": r.dominant_pollutant
    } for r in readings]

    # Downsample if too many points (keep ~200 points max for charts)
    if len(history) > 200:
        step = len(history) // 200
        history = history[::step]

    return {
        "sensor_id": sensor_id,
        "sensor_name": sensor.name,
        "hours": hours,
        "count": len(history),
        "readings": history,
    }
