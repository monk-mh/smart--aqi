"""
SmartAQ Campus — Sensor Data Ingestion Route
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from models import Sensor, Telemetry, Alert
from services.aqi_calculator import calculate_aqi
from config import ALERT_THRESHOLDS

router = APIRouter(prefix="/api/ingest", tags=["Ingestion"])

class SensorReading(BaseModel):
    sensor_id: str = Field(...)
    pm25: float = Field(..., ge=0)
    pm10: float = Field(..., ge=0)
    co2: float = Field(..., ge=0)
    no2: float = Field(0, ge=0)
    so2: float = Field(0, ge=0)
    temperature: float = Field(0)
    humidity: float = Field(0, ge=0, le=100)

@router.post("")
async def ingest_reading(reading: SensorReading, db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.id == reading.sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not registered.")

    aqi_result = calculate_aqi({
        "pm25": reading.pm25,
        "pm10": reading.pm10,
        "co2": reading.co2,
        "no2": reading.no2,
        "so2": reading.so2,
    })

    now = datetime.now(timezone.utc).isoformat()

    telemetry = Telemetry(
        id=str(uuid.uuid4()),
        sensor_id=reading.sensor_id,
        timestamp=now,
        status="active",
        battery=sensor.battery,
        pm25=reading.pm25,
        pm10=reading.pm10,
        co2=reading.co2,
        no2=reading.no2,
        so2=reading.so2,
        temperature=reading.temperature,
        humidity=reading.humidity,
        aqi=aqi_result["aqi"],
        aqi_category=aqi_result["category"],
        dominant_pollutant=aqi_result["dominant_pollutant"]
    )
    db.add(telemetry)

    # Simple alert logic
    alert_generated = False
    aqi = aqi_result["aqi"]
    if aqi > ALERT_THRESHOLDS["warning"]:
        severity = "critical" if aqi > ALERT_THRESHOLDS["critical"] else ("danger" if aqi > ALERT_THRESHOLDS["danger"] else "warning")
        
        # Check if an active alert of this severity already exists for this sensor
        existing_alert = db.query(Alert).filter(Alert.sensor_id == sensor.id, Alert.dismissed == False, Alert.severity == severity).first()
        if not existing_alert:
            message = f"{severity.upper()}: AQI {aqi} at {sensor.name}!"
            new_alert = Alert(
                id=str(uuid.uuid4()),
                type="aqi",
                severity=severity,
                message=message,
                sensor_id=sensor.id,
                timestamp=now,
                dismissed=False
            )
            db.add(new_alert)
            alert_generated = True

    db.commit()

    return {
        "status": "ok",
        "aqi": aqi_result["aqi"],
        "category": aqi_result["category"],
        "alert_generated": alert_generated,
        "reading_id": telemetry.id,
    }

@router.get("/test")
async def test_ingestion(db: Session = Depends(get_db)):
    sensors = db.query(Sensor).all()
    return {
        "status": "ready",
        "registered_sensors": [{"id": s.id, "name": s.name} for s in sensors],
        "endpoint": "POST /api/ingest",
    }
