"""
SmartAQ Campus — IoT Sensor Simulator
Generates realistic campus air quality telemetry (for testing/historical backfill).
Now writes directly to the SQLite database via SQLAlchemy.
"""

import random
import uuid
import math
from datetime import datetime, timezone, timedelta

from database import SessionLocal
from models import Sensor, Telemetry, Alert
from services.aqi_calculator import calculate_aqi
from config import ALERT_THRESHOLDS

# ─── Per-Location Base Profiles ──────────────────────────────────
LOCATION_PROFILES = {
    "sensor-001": {"pm25": 35, "pm10": 60, "co2": 850, "no2": 30, "so2": 15, "temperature": 30, "humidity": 60},
    "sensor-002": {"pm25": 45, "pm10": 80, "co2": 450, "no2": 55, "so2": 12, "temperature": 32, "humidity": 55},
    "sensor-003": {"pm25": 12, "pm10": 25, "co2": 520, "no2": 14, "so2": 4, "temperature": 24, "humidity": 47},
    "sensor-004": {"pm25": 15, "pm10": 30, "co2": 650, "no2": 18, "so2": 5, "temperature": 25, "humidity": 50},
    "sensor-005": {"pm25": 16, "pm10": 32, "co2": 680, "no2": 20, "so2": 6, "temperature": 25, "humidity": 51},
    "sensor-006": {"pm25": 22, "pm10": 38, "co2": 750, "no2": 28, "so2": 12, "temperature": 24, "humidity": 48},
    "sensor-007": {"pm25": 18, "pm10": 35, "co2": 480, "no2": 15, "so2": 6, "temperature": 28, "humidity": 55},
    "sensor-008": {"pm25": 20, "pm10": 38, "co2": 560, "no2": 16, "so2": 7, "temperature": 27, "humidity": 53},
}

# ─── Active Spikes State ────────────────────────────────────────
active_spikes = {}
active_sensor_alert_states = {}


def _get_time_factor(dt: datetime) -> float:
    hour = dt.hour
    if (8 <= hour < 10) or (17 <= hour < 19):
        return 1.3
    elif 10 <= hour < 17:
        return 1.1
    else:
        return 0.7


def _add_gaussian_noise(value: float, std_ratio: float = 0.1) -> float:
    noise = random.gauss(0, max(value * std_ratio, 1.0))
    return max(0, value + noise)


def _check_and_generate_alert(session, reading_data: dict, sensor_name: str):
    """Generate a DB alert if AQI exceeds thresholds (deduplicated)."""
    global active_sensor_alert_states
    aqi = reading_data.get("aqi", 0)
    sensor_id = reading_data["sensor_id"]

    if aqi <= ALERT_THRESHOLDS["warning"]:
        if sensor_id in active_sensor_alert_states:
            del active_sensor_alert_states[sensor_id]
        return None

    if aqi > ALERT_THRESHOLDS["critical"]:
        severity = "critical"
        message = f"CRITICAL: AQI {aqi} at {sensor_name}! Immediate action required."
    elif aqi > ALERT_THRESHOLDS["danger"]:
        severity = "danger"
        message = f"DANGER: AQI {aqi} at {sensor_name}. Unhealthy air quality detected."
    else:
        severity = "warning"
        message = f"WARNING: AQI {aqi} at {sensor_name}. Moderate to unhealthy levels."

    if active_sensor_alert_states.get(sensor_id) == severity:
        return None

    active_sensor_alert_states[sensor_id] = severity

    alert = Alert(
        id=str(uuid.uuid4()),
        type="aqi",
        severity=severity,
        message=message,
        sensor_id=sensor_id,
        timestamp=reading_data["timestamp"],
        dismissed=False
    )
    session.add(alert)
    return alert


def generate_historical(hours: int = 48):
    """
    Generate backfilled historical data for charts.
    Creates readings every 5 minutes for the specified number of hours.
    Writes directly to the real SQLite database.
    """
    db = SessionLocal()
    try:
        sensors = db.query(Sensor).all()
        sensor_map = {s.id: s for s in sensors}

        now = datetime.now(timezone.utc)
        start = now - timedelta(hours=hours)
        interval = timedelta(minutes=5)

        current = start
        count = 0
        batch = []

        while current <= now:
            for sensor in sensors:
                profile = LOCATION_PROFILES.get(sensor.id)
                if not profile:
                    continue

                time_factor = _get_time_factor(current)

                if random.random() < 0.005:
                    continue  # Skip malfunctions in historical

                pm25 = round(max(0, _add_gaussian_noise(profile["pm25"] * time_factor)), 1)
                pm10 = round(max(0, _add_gaussian_noise(profile["pm10"] * time_factor)), 1)
                co2  = round(max(0, _add_gaussian_noise(profile["co2"] * time_factor, 0.05)), 0)
                no2  = round(max(0, _add_gaussian_noise(profile["no2"] * time_factor)), 1)
                so2  = round(max(0, _add_gaussian_noise(profile["so2"] * time_factor)), 1)
                temperature = round(min(50, max(-10, _add_gaussian_noise(profile["temperature"], 0.03))), 1)
                humidity    = round(min(100, max(0, _add_gaussian_noise(profile["humidity"], 0.05))), 1)

                aqi_result = calculate_aqi({"pm25": pm25, "pm10": pm10, "co2": co2, "no2": no2, "so2": so2})

                batch.append(Telemetry(
                    id=str(uuid.uuid4()),
                    sensor_id=sensor.id,
                    timestamp=current.isoformat(),
                    status="active",
                    battery=sensor.battery,
                    pm25=pm25, pm10=pm10, co2=co2, no2=no2, so2=so2,
                    temperature=temperature, humidity=humidity,
                    aqi=aqi_result["aqi"],
                    aqi_category=aqi_result["category"],
                    dominant_pollutant=aqi_result["dominant_pollutant"]
                ))
                count += 1

                # Flush every 500 rows to avoid huge memory usage
                if len(batch) >= 500:
                    db.bulk_save_objects(batch)
                    db.commit()
                    batch = []

            current += interval

        if batch:
            db.bulk_save_objects(batch)
            db.commit()

        print(f"  Generated {count} historical readings over {hours} hours")
    finally:
        db.close()


async def live_tick():
    """
    Generate one realistic sensor reading per sensor and write to DB.
    Called every N seconds by the background asyncio task in main.py.
    """
    import asyncio

    db = SessionLocal()
    try:
        sensors = db.query(Sensor).all()
        now = datetime.now(timezone.utc)
        time_factor = _get_time_factor(now)

        for sensor in sensors:
            profile = LOCATION_PROFILES.get(sensor.id)
            if not profile:
                continue

            # Occasionally create a spike event
            if random.random() < 0.02 and sensor.id not in active_spikes:
                active_spikes[sensor.id] = random.randint(3, 8)

            spike_mult = 1.0
            if sensor.id in active_spikes:
                spike_mult = random.uniform(2.5, 4.0)
                active_spikes[sensor.id] -= 1
                if active_spikes[sensor.id] <= 0:
                    del active_spikes[sensor.id]

            is_malfunction = random.random() < 0.003

            pm25 = round(max(0, _add_gaussian_noise(profile["pm25"] * time_factor * spike_mult)), 1)
            pm10 = round(max(0, _add_gaussian_noise(profile["pm10"] * time_factor * spike_mult)), 1)
            co2  = round(max(0, _add_gaussian_noise(profile["co2"] * time_factor * (spike_mult ** 0.5), 0.05)), 0)
            no2  = round(max(0, _add_gaussian_noise(profile["no2"] * time_factor * spike_mult)), 1)
            so2  = round(max(0, _add_gaussian_noise(profile["so2"] * time_factor * spike_mult)), 1)
            temperature = round(min(50, max(-10, _add_gaussian_noise(profile["temperature"], 0.03))), 1)
            humidity    = round(min(100, max(0, _add_gaussian_noise(profile["humidity"], 0.05))), 1)

            aqi_result = calculate_aqi({"pm25": pm25, "pm10": pm10, "co2": co2, "no2": no2, "so2": so2})

            reading = Telemetry(
                id=str(uuid.uuid4()),
                sensor_id=sensor.id,
                timestamp=now.isoformat(),
                status="malfunction" if is_malfunction else "active",
                battery=sensor.battery,
                pm25=pm25, pm10=pm10, co2=co2, no2=no2, so2=so2,
                temperature=temperature, humidity=humidity,
                aqi=aqi_result["aqi"],
                aqi_category=aqi_result["category"],
                dominant_pollutant=aqi_result["dominant_pollutant"]
            )
            db.add(reading)

            if not is_malfunction:
                _check_and_generate_alert(db, {
                    "sensor_id": sensor.id,
                    "aqi": aqi_result["aqi"],
                    "timestamp": now.isoformat(),
                }, sensor.name)

        db.commit()
    except Exception as e:
        print(f"[live_tick] Error: {e}")
    finally:
        db.close()
