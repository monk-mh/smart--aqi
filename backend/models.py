from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)
    created_at = Column(String)

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    location_type = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    battery = Column(Integer)
    status = Column(String)
    installed_at = Column(String)

class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(String, primary_key=True, index=True)
    sensor_id = Column(String, index=True)
    timestamp = Column(String, index=True)
    status = Column(String)
    battery = Column(Integer)
    pm25 = Column(Float)
    pm10 = Column(Float)
    co2 = Column(Float)
    no2 = Column(Float)
    so2 = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)
    aqi = Column(Integer)
    aqi_category = Column(String)
    dominant_pollutant = Column(String)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, index=True)
    type = Column(String)
    severity = Column(String)
    message = Column(String)
    sensor_id = Column(String, index=True)
    timestamp = Column(String)
    dismissed = Column(Boolean, default=False)
    dismissed_at = Column(String, nullable=True)
