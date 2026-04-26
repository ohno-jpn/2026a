import os
import re
import time
import shutil
import subprocess
import urllib.request
import urllib.parse
import json
from datetime import datetime
from flask import Flask, request, render_template, redirect, url_for, send_file, abort
from sqlalchemy import func
from models import db, Trip, Photo, TripPrefecture

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
app.config.update(
    SQLALCHEMY_DATABASE_URI=f'sqlite:///{BASE_DIR}/travel.db',
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    UPLOAD_FOLDER=os.path.join(BASE_DIR, 'uploads'),
    PREVIEW_FOLDER=os.path.join(BASE_DIR, 'previews'),
    MAX_CONTENT_LENGTH=1024 * 1024 * 1024,  # 1GB
    SECRET_KEY='travel-app-2026',
)

for _d in (app.config['UPLOAD_FOLDER'], app.config['PREVIEW_FOLDER']):
    os.makedirs(_d, exist_ok=True)

db.init_app(app)
with app.app_context():
    db.create_all()

# 起動時に Japan GeoJSON を取得
GEOJSON_PATH = os.path.join(BASE_DIR, 'static', 'japan.geojson')
if not os.path.exists(GEOJSON_PATH):
    try:
        _url = 'https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson'
        _req = urllib.request.Request(_url, headers={'User-Agent': 'travel-app/1.0'})
        with urllib.request.urlopen(_req, timeout=15) as _res:
            with open(GEOJSON_PATH, 'wb') as _f:
                _f.write(_res.read())
        print('[travel_app] Japan GeoJSON downloaded.')
    except Exception as _e:
        print(f'[travel_app] Warning: Could not download Japan GeoJSON: {_e}')

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.heic', '.heif'}
EXIFTOOL = shutil.which('exiftool')
SIPS = shutil.which('sips')


# ---------- EXIF / Geocode helpers ----------

def parse_dms(dms_str):
    m = re.match(r'([\d.]+)\s*deg\s*([\d.]+)\'\s*([\d.]+)', dms_str)
    if m:
        return float(m.group(1)) + float(m.group(2)) / 60 + float(m.group(3)) / 3600
    m2 = re.match(r'([\d.]+)', dms_str)
    return float(m2.group(1)) if m2 else None


def get_exif_info(filepath):
    if not EXIFTOOL:
        return {}
    proc = subprocess.run([EXIFTOOL, filepath], capture_output=True, text=True)
    info = {}
    for line in proc.stdout.splitlines():
        key, _, val = line.partition(':')
        key = key.strip()
        val = val.strip()
        if key == 'Date/Time Original':
            info['datetime'] = val
        elif key == 'GPS Latitude Ref':
            info['lat_ref'] = val
        elif key == 'GPS Longitude Ref':
            info['lon_ref'] = val
        elif key == 'GPS Latitude' and 'Position' not in key:
            info['lat_str'] = val
        elif key == 'GPS Longitude' and 'Position' not in key:
            info['lon_str'] = val
        elif key == 'GPS Altitude' and 'Ref' not in key:
            info['altitude'] = val
        elif key == 'Make':
            info['make'] = val
        elif key == 'Camera Model Name':
            info['model'] = val

    lat = lon = None
    if info.get('lat_str') and info.get('lon_str'):
        try:
            lat = parse_dms(info['lat_str'])
            lon = parse_dms(info['lon_str'])
            if info.get('lat_ref') == 'S':
                lat = -lat
            if info.get('lon_ref') == 'W':
                lon = -lon
        except Exception:
            lat = lon = None
    info['lat'] = lat
    info['lon'] = lon
    return info


def reverse_geocode(lat, lon):
    empty = {'country': '', 'postcode': '', 'state': '', 'city': '', 'detail': ''}
    try:
        params = urllib.parse.urlencode({
            'lat': lat, 'lon': lon,
            'format': 'json', 'accept-language': 'ja',
        })
        url = f'https://nominatim.openstreetmap.org/reverse?{params}'
        req = urllib.request.Request(url, headers={'User-Agent': 'travel-app/1.0'})
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            addr = data.get('address', {})
            city = addr.get('city') or addr.get('town') or addr.get('village') or ''
            detail_parts = [
                addr.get('suburb', ''),
                addr.get('quarter', ''),
                addr.get('neighbourhood', ''),
                addr.get('road', ''),
                addr.get('house_number', ''),
            ]
            detail = '　'.join(p for p in detail_parts if p)
            return {
                'country': addr.get('country', ''),
                'postcode': addr.get('postcode', ''),
                'state': addr.get('state', ''),
                'city': city,
                'detail': detail,
            }
    except Exception:
        return empty


def make_preview(src_path, trip_id, filename):
    preview_dir = os.path.join(app.config['PREVIEW_FOLDER'], str(trip_id))
    os.makedirs(preview_dir, exist_ok=True)
    stem = os.path.splitext(filename)[0]
    preview_path = os.path.join(preview_dir, stem + '.jpg')
    if os.path.exists(preview_path):
        return preview_path
    ext = os.path.splitext(filename)[1].lower()
    if ext in ('.heic', '.heif') and SIPS:
        subprocess.run([SIPS, '-s', 'format', 'jpeg', src_path, '--out', preview_path],
                       capture_output=True)
    else:
        shutil.copy(src_path, preview_path)
    return preview_path


def parse_folder_name(folder_name):
    """'20260422_東京旅行' → (date(2026,4,22), '東京旅行')"""
    m = re.match(r'^(\d{8})_(.+)$', folder_name)
    if m:
        try:
            d = datetime.strptime(m.group(1), '%Y%m%d').date()
            return d, m.group(2)
        except ValueError:
            pass
    return None, folder_name


# ---------- Routes ----------

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload():
    files = request.files.getlist('photos')
    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()

    image_files = [f for f in files
                   if os.path.splitext(f.filename)[1].lower() in IMAGE_EXTENSIONS]
    if not image_files:
        return render_template('index.html', error='画像ファイルが見つかりませんでした')

    folder_name = (image_files[0].filename.split('/')[0]
                   if '/' in image_files[0].filename else 'uploaded')
    folder_date, auto_title = parse_folder_name(folder_name)
    if not title:
        title = auto_title

    trip = Trip(folder_date=folder_date, title=title, description=description)
    db.session.add(trip)
    db.session.flush()

    upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], str(trip.id))
    os.makedirs(upload_dir, exist_ok=True)

    saved = []
    for f in image_files:
        basename = os.path.basename(f.filename)
        dest = os.path.join(upload_dir, basename)
        f.save(dest)
        saved.append((basename, dest))

    # EXIF抽出 → ジオコード（Nominatim 1秒ルール遵守）
    geocode_cache = {}
    exif_cache = {}
    for filename, filepath in sorted(saved):
        make_preview(filepath, trip.id, filename)
        exif = get_exif_info(filepath)
        exif_cache[filename] = exif
        lat, lon = exif.get('lat'), exif.get('lon')
        if lat is not None and lon is not None:
            key = (round(lat, 4), round(lon, 4))
            if key not in geocode_cache:
                time.sleep(1)
                geocode_cache[key] = reverse_geocode(lat, lon)

    # Photo レコード作成 + 都道府県集計
    pref_counts = {}
    for filename, _ in sorted(saved):
        exif = exif_cache[filename]
        lat, lon = exif.get('lat'), exif.get('lon')
        addr = {}
        prefecture = ''
        if lat is not None and lon is not None:
            key = (round(lat, 4), round(lon, 4))
            addr = geocode_cache.get(key, {})
            prefecture = addr.get('state', '')
            if prefecture:
                pref_counts[prefecture] = pref_counts.get(prefecture, 0) + 1

        make = exif.get('make', '')
        model = exif.get('model', '')
        db.session.add(Photo(
            trip_id=trip.id,
            filename=filename,
            datetime_taken=exif.get('datetime', ''),
            latitude=lat,
            longitude=lon,
            altitude=exif.get('altitude', ''),
            camera=f'{make} {model}'.strip(),
            prefecture=prefecture,
            country=addr.get('country', ''),
            city=addr.get('city', ''),
        ))

    for pref, count in pref_counts.items():
        db.session.add(TripPrefecture(trip_id=trip.id, prefecture=pref, photo_count=count))

    db.session.commit()
    return redirect(url_for('select_photos', trip_id=trip.id))


@app.route('/trips/<int:trip_id>/select', methods=['GET', 'POST'])
def select_photos(trip_id):
    trip = Trip.query.get_or_404(trip_id)
    photos = Photo.query.filter_by(trip_id=trip_id).order_by(Photo.datetime_taken).all()

    if request.method == 'POST':
        selected_ids = request.form.getlist('selected_photos')
        if len(selected_ids) != 5:
            return render_template('select_photos.html', trip=trip, photos=photos,
                                   error=f'5枚選択してください（現在 {len(selected_ids)} 枚）')
        Photo.query.filter_by(trip_id=trip_id).update({'is_selected': False})
        for pid in selected_ids:
            Photo.query.filter_by(id=int(pid), trip_id=trip_id).update({'is_selected': True})
        db.session.commit()
        return redirect(url_for('trip_detail', trip_id=trip_id))

    return render_template('select_photos.html', trip=trip, photos=photos)


@app.route('/trips/<int:trip_id>')
def trip_detail(trip_id):
    trip = Trip.query.get_or_404(trip_id)
    selected = Photo.query.filter_by(trip_id=trip_id, is_selected=True).all()
    return render_template('trip.html', trip=trip, selected=selected)


@app.route('/trips')
def trip_list():
    trips = Trip.query.order_by(Trip.folder_date.desc()).all()
    return render_template('trips.html', trips=trips)


@app.route('/map')
def map_view():
    rows = (db.session.query(
                TripPrefecture.prefecture,
                func.count(TripPrefecture.trip_id).label('trip_count'),
            )
            .group_by(TripPrefecture.prefecture)
            .all())

    pref_data = {}
    for row in rows:
        trips = (Trip.query
                 .join(TripPrefecture)
                 .filter(TripPrefecture.prefecture == row.prefecture)
                 .order_by(Trip.folder_date)
                 .all())
        pref_data[row.prefecture] = {
            'trip_count': row.trip_count,
            'trips': [
                {
                    'id': t.id,
                    'title': t.title,
                    'date': t.folder_date.strftime('%Y年%m月%d日') if t.folder_date else '',
                    'url': url_for('trip_detail', trip_id=t.id),
                }
                for t in trips
            ],
        }

    max_visits = max((v['trip_count'] for v in pref_data.values()), default=1)
    return render_template('map.html', pref_data=pref_data, max_visits=max_visits)


@app.route('/photo/<int:trip_id>/<path:filename>')
def serve_photo(trip_id, filename):
    path = os.path.join(app.config['PREVIEW_FOLDER'], str(trip_id),
                        os.path.splitext(filename)[0] + '.jpg')
    if not os.path.exists(path):
        abort(404)
    return send_file(path, mimetype='image/jpeg')


if __name__ == '__main__':
    app.run(debug=True, port=5002)
