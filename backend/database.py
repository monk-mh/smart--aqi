import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext  # type: ignore[import-not-found]
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base, User, Sensor

SQLALCHEMY_DATABASE_URL = "sqlite:///./smartaq.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # Check if users exist
        if not db.query(User).first():
            users = [
                User(id=str(uuid.uuid4()), name="Admin User", email="admin@smartaq.edu", password=pwd_context.hash("admin123"), role="Admin", created_at=datetime.now(timezone.utc).isoformat()),
                User(id=str(uuid.uuid4()), name="Faculty Member", email="faculty@smartaq.edu", password=pwd_context.hash("faculty123"), role="Faculty", created_at=datetime.now(timezone.utc).isoformat()),
                User(id=str(uuid.uuid4()), name="Student User", email="student@smartaq.edu", password=pwd_context.hash("student123"), role="Student", created_at=datetime.now(timezone.utc).isoformat()),
            ]
            db.add_all(users)
            db.commit()

        # Check if sensors exist
        if not db.query(Sensor).first():
            sensors = [
                Sensor(id="sensor-001", name="Canteen", location_type="outdoor", lat=12.910677, lng=74.897480, battery=87, status="active", installed_at="2024-01-15"),
                Sensor(id="sensor-002", name="Parking", location_type="outdoor", lat=12.911566, lng=74.900122, battery=92, status="active", installed_at="2024-01-15"),
                Sensor(id="sensor-003", name="Administrative Block", location_type="Indoor", lat=12.91082, lng=74.89868, battery=78, status="active", installed_at="2024-02-01"),
                Sensor(id="sensor-004", name="Academic Block -1", location_type="Indoor", lat=12.910712, lng=74.89875, battery=95, status="active", installed_at="2024-02-01"),
                Sensor(id="sensor-005", name="Academic Block -2", location_type="indoor", lat=12.91071, lng=74.89936, battery=64, status="active", installed_at="2024-03-10"),
                Sensor(id="sensor-006", name="Academic Block -3", location_type="Indoor", lat=12.910375, lng=74.89961, battery=88, status="active", installed_at="2024-03-10"),
                Sensor(id="sensor-007", name="Girls Hostel", location_type="Outdoor", lat=12.90936, lng=74.89929, battery=71, status="active", installed_at="2024-04-20"),
                Sensor(id="sensor-008", name="Boys Hostel", location_type="Indoor", lat=12.91145, lng=74.90053, battery=93, status="active", installed_at="2024-04-20"),
            ]
            db.add_all(sensors)
            db.commit()
    finally:
        db.close()

