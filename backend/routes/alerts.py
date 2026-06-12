"""
SmartAQ Campus — Alert Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models import Alert, Sensor

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("")
async def get_alerts(db: Session = Depends(get_db)):
    """Get all active (non-dismissed) alerts."""
    alerts = db.query(Alert).filter(Alert.dismissed == False).order_by(Alert.timestamp.desc()).all()
    sensors = {s.id: s.name for s in db.query(Sensor).all()}
    return [{
        "id": a.id,
        "type": a.type,
        "severity": a.severity,
        "message": a.message,
        "sensor_id": a.sensor_id,
        "sensor_name": sensors.get(a.sensor_id, a.sensor_id),
        "timestamp": a.timestamp,
        "dismissed": a.dismissed
    } for a in alerts]

@router.get("/all")
async def get_all_alerts(db: Session = Depends(get_db)):
    """Get all alerts including dismissed ones."""
    alerts = db.query(Alert).order_by(Alert.timestamp.desc()).all()
    sensors = {s.id: s.name for s in db.query(Sensor).all()}
    return [{
        "id": a.id,
        "type": a.type,
        "severity": a.severity,
        "message": a.message,
        "sensor_id": a.sensor_id,
        "sensor_name": sensors.get(a.sensor_id, a.sensor_id),
        "timestamp": a.timestamp,
        "dismissed": a.dismissed,
        "dismissed_at": a.dismissed_at
    } for a in alerts]

@router.post("/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str, db: Session = Depends(get_db)):
    """Dismiss an active alert by ID."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.dismissed = True
    alert.dismissed_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    
    return {"message": "Alert dismissed", "alert_id": alert_id}
