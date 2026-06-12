"""
SmartAQ Campus — WebSocket Handlers
"""

import asyncio
import json
from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from database import SessionLocal
from models import Telemetry, Alert, Sensor
from routes.sensors import _get_latest_readings_dict

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        disconnected = []
        for conn in self.active_connections:
            try:
                await conn.send_json(data)
            except Exception:
                disconnected.append(conn)
        for conn in disconnected:
            self.disconnect(conn)


aqi_manager = ConnectionManager()
alert_manager = ConnectionManager()


@router.websocket("/ws/aqi")
async def websocket_aqi(websocket: WebSocket):
    await aqi_manager.connect(websocket)
    try:
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=3.0)
            except asyncio.TimeoutError:
                pass

            # Open short-lived session to fetch live DB data
            db = SessionLocal()
            try:
                readings_dict = _get_latest_readings_dict(db)

                # Enrich readings with sensor metadata (name, lat, lng, battery, location_type)
                sensors_meta = {s.id: s for s in db.query(Sensor).all()}
                enriched = []
                for sensor_id, r in readings_dict.items():
                    meta = sensors_meta.get(sensor_id)
                    enriched.append({
                        **r,
                        "sensor_name": meta.name if meta else sensor_id,
                        "location_type": meta.location_type if meta else "unknown",
                        "lat": meta.lat if meta else None,
                        "lng": meta.lng if meta else None,
                        "battery": meta.battery if meta else r.get("battery", 0),
                    })

                alert_count = db.query(Alert).filter(Alert.dismissed == False).count()

                await aqi_manager.broadcast({
                    "type": "sensor_update",
                    "data": enriched,
                    "alert_count": alert_count,
                })
            finally:
                db.close()

    except WebSocketDisconnect:
        aqi_manager.disconnect(websocket)
    except Exception:
        aqi_manager.disconnect(websocket)


@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await alert_manager.connect(websocket)
    try:
        db = SessionLocal()
        try:
            alerts = db.query(Alert).filter(Alert.dismissed == False).all()
            alert_list = [{"id": a.id, "type": a.type, "severity": a.severity, "message": a.message, "sensor_id": a.sensor_id, "timestamp": a.timestamp, "dismissed": a.dismissed} for a in alerts]
            
            await websocket.send_json({
                "type": "alert_snapshot",
                "data": alert_list,
            })
        finally:
            db.close()

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        alert_manager.disconnect(websocket)
    except Exception:
        alert_manager.disconnect(websocket)
