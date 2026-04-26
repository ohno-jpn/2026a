from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Trip(db.Model):
    __tablename__ = 'trips'
    id = db.Column(db.Integer, primary_key=True)
    folder_date = db.Column(db.Date)
    title = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    photos = db.relationship('Photo', backref='trip', lazy=True, cascade='all, delete-orphan')
    prefectures = db.relationship('TripPrefecture', backref='trip', lazy=True, cascade='all, delete-orphan')


class Photo(db.Model):
    __tablename__ = 'photos'
    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False)
    filename = db.Column(db.Text, nullable=False)
    is_selected = db.Column(db.Boolean, default=False)
    datetime_taken = db.Column(db.Text, default='')
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    altitude = db.Column(db.Text, default='')
    camera = db.Column(db.Text, default='')
    prefecture = db.Column(db.Text, default='')
    country = db.Column(db.Text, default='')
    city = db.Column(db.Text, default='')


class TripPrefecture(db.Model):
    __tablename__ = 'trip_prefectures'
    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False)
    prefecture = db.Column(db.Text, nullable=False)
    photo_count = db.Column(db.Integer, default=0)
