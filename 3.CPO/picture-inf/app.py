import os
import io
import re
import csv
import time
import subprocess
import shutil
import urllib.request
import urllib.parse
import json
from flask import Flask, request, render_template, send_file
from datetime import datetime

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
PREVIEW_FOLDER = "previews"
BATCH_FOLDER = "batch_output"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PREVIEW_FOLDER, exist_ok=True)
os.makedirs(BATCH_FOLDER, exist_ok=True)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic", ".heif"}
CSV_HEADERS = [
    "ファイル名", "撮影日時",
    "撮影場所（国）", "撮影場所（郵便番号）", "撮影場所（都道府県）",
    "撮影場所（市区町村）", "撮影場所（住所番地）",
    "GPS情報（経度）", "GPS情報（緯度）", "GPS情報（高度）",
    "Google Map", "撮影機材",
]

EXIFTOOL = shutil.which("exiftool")
SIPS = shutil.which("sips")


def reverse_geocode(lat, lon):
    """緯度経度から住所の各フィールドを取得"""
    empty = {"country": "", "postcode": "", "state": "", "city": "", "detail": ""}
    try:
        params = urllib.parse.urlencode({
            "lat": lat, "lon": lon,
            "format": "json", "accept-language": "ja",
        })
        url = f"https://nominatim.openstreetmap.org/reverse?{params}"
        req = urllib.request.Request(url, headers={"User-Agent": "picture-inf/1.0"})
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            addr = data.get("address", {})
            # 市区町村：city > town > village の優先順（suburbは住所番地側で使う）
            city = addr.get("city") or addr.get("town") or addr.get("village") or ""
            # 住所番地：suburb（丁目）＋ quarter ＋ neighbourhood ＋ road ＋ house_number
            detail_parts = [
                addr.get("suburb", ""),
                addr.get("quarter", ""),
                addr.get("neighbourhood", ""),
                addr.get("road", ""),
                addr.get("house_number", ""),
            ]
            detail = "　".join(p for p in detail_parts if p)
            return {
                "country":  addr.get("country", ""),
                "postcode": addr.get("postcode", ""),
                "state":    addr.get("state", ""),
                "city":     city,
                "detail":   detail,
            }
    except Exception:
        return empty


def parse_dms(dms_str):
    m = re.match(r"([\d.]+)\s*deg\s*([\d.]+)'\s*([\d.]+)", dms_str)
    if m:
        return float(m.group(1)) + float(m.group(2))/60 + float(m.group(3))/3600
    m2 = re.match(r"([\d.]+)", dms_str)
    return float(m2.group(1)) if m2 else None


def get_exif_info(filepath):
    """EXIFから必要な値だけ抽出して返す"""
    if not EXIFTOOL:
        return {}

    proc = subprocess.run([EXIFTOOL, filepath], capture_output=True, text=True)
    info = {}
    for line in proc.stdout.splitlines():
        key, _, val = line.partition(":")
        key = key.strip()
        val = val.strip()
        if key == "Date/Time Original":
            info["datetime"] = val
        elif key == "GPS Latitude Ref":
            info["lat_ref"] = val
        elif key == "GPS Longitude Ref":
            info["lon_ref"] = val
        elif key == "GPS Latitude" and "Position" not in key:
            info["lat_str"] = val
        elif key == "GPS Longitude" and "Position" not in key:
            info["lon_str"] = val
        elif key == "GPS Altitude" and "Ref" not in key:
            info["altitude"] = val
        elif key == "Make":
            info["make"] = val
        elif key == "Camera Model Name":
            info["model"] = val

    # 座標を数値に変換
    lat = lon = None
    if info.get("lat_str") and info.get("lon_str"):
        try:
            lat = parse_dms(info["lat_str"])
            lon = parse_dms(info["lon_str"])
            if info.get("lat_ref") == "S": lat = -lat
            if info.get("lon_ref") == "W": lon = -lon
        except Exception:
            lat = lon = None
    info["lat"] = lat
    info["lon"] = lon
    return info


def make_preview(src_path, filename):
    """ブラウザ表示用JPEGプレビューを生成（HEIC対応）"""
    preview_path = os.path.join(PREVIEW_FOLDER, os.path.splitext(filename)[0] + ".jpg")
    if os.path.exists(preview_path):
        return preview_path
    ext = os.path.splitext(filename)[1].lower()
    if ext in (".heic", ".heif") and SIPS:
        subprocess.run([SIPS, "-s", "format", "jpeg", src_path, "--out", preview_path],
                       capture_output=True)
    else:
        shutil.copy(src_path, preview_path)
    return preview_path


def build_text(filename, exif, addr):
    """出力テキストを12項目で構成"""
    lat = exif.get("lat")
    lon = exif.get("lon")
    make  = exif.get("make", "")
    model = exif.get("model", "")
    camera = f"{make} {model}".strip() or "情報なし"
    lines = [
        f"1.  ファイル名　　　　　　: {filename}",
        f"2.  撮影日時　　　　　　　: {exif.get('datetime', '情報なし')}",
        f"3.  撮影場所（国）　　　　: {addr.get('country', '情報なし')}",
        f"4.  撮影場所（郵便番号）　: {addr.get('postcode', '情報なし')}",
        f"5.  撮影場所（都道府県）　: {addr.get('state', '情報なし')}",
        f"6.  撮影場所（市区町村）　: {addr.get('city', '情報なし')}",
        f"7.  撮影場所（住所番地）　: {addr.get('detail', '情報なし')}",
        f"8.  GPS情報（経度）　　　 : {f'{lon:.6f}' if lon is not None else '情報なし'}",
        f"9.  GPS情報（緯度）　　　 : {f'{lat:.6f}' if lat is not None else '情報なし'}",
        f"10. GPS情報（高度）　　　 : {exif.get('altitude', '情報なし')}",
        f"11. Google Map　　　　　　: {f'https://maps.google.com/?q={lat:.6f},{lon:.6f}' if lat and lon else '情報なし'}",
        f"12. 撮影機材　　　　　　　: {camera}",
    ]
    return "\n".join(lines)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("photo")
    if not file or file.filename == "":
        return render_template("index.html", error="ファイルを選択してください")

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)
    make_preview(filepath, file.filename)

    exif = get_exif_info(filepath)
    lat, lon = exif.get("lat"), exif.get("lon")

    addr = reverse_geocode(lat, lon) if lat and lon else {}
    full_text = build_text(file.filename, exif, addr)

    address_display = "　".join(filter(None, [
        addr.get("country"), addr.get("state"), addr.get("city")
    ])) if addr else None

    return render_template("result.html", result=full_text, filename=file.filename,
                           lat=lat, lon=lon, address=address_display)


@app.route("/photo/<path:filename>")
def serve_photo(filename):
    preview_path = os.path.join(PREVIEW_FOLDER, os.path.splitext(filename)[0] + ".jpg")
    if not os.path.exists(preview_path):
        return "Not found", 404
    return send_file(preview_path, mimetype="image/jpeg")


def build_row(filename, exif, addr):
    lat, lon = exif.get("lat"), exif.get("lon")
    make  = exif.get("make", "")
    model = exif.get("model", "")
    return {
        "ファイル名":           filename,
        "撮影日時":             exif.get("datetime", ""),
        "撮影場所（国）":       addr.get("country", ""),
        "撮影場所（郵便番号）": addr.get("postcode", ""),
        "撮影場所（都道府県）": addr.get("state", ""),
        "撮影場所（市区町村）": addr.get("city", ""),
        "撮影場所（住所番地）": addr.get("detail", ""),
        "GPS情報（経度）":      f"{lon:.6f}" if lon is not None else "",
        "GPS情報（緯度）":      f"{lat:.6f}" if lat is not None else "",
        "GPS情報（高度）":      exif.get("altitude", ""),
        "Google Map":           f"https://maps.google.com/?q={lat:.6f},{lon:.6f}" if lat and lon else "",
        "撮影機材":             f"{make} {model}".strip(),
    }


@app.route("/batch_upload", methods=["POST"])
def batch_upload():
    """ブラウザからフォルダ選択で受け取った複数ファイルを一括処理"""
    files = request.files.getlist("photos")
    image_files = [f for f in files
                   if os.path.splitext(f.filename)[1].lower() in IMAGE_EXTENSIONS]
    if not image_files:
        return render_template("index.html", error="画像ファイルが見つかりませんでした")

    # フォルダ名をパスから取得
    folder_name = image_files[0].filename.split("/")[0] if "/" in image_files[0].filename else "uploaded"
    tmp_dir = os.path.join(UPLOAD_FOLDER, f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    os.makedirs(tmp_dir, exist_ok=True)

    saved = []
    for f in image_files:
        basename = os.path.basename(f.filename)
        dest = os.path.join(tmp_dir, basename)
        f.save(dest)
        saved.append((basename, dest))

    rows = []
    geocode_cache = {}
    for filename, filepath in sorted(saved):
        exif = get_exif_info(filepath)
        lat, lon = exif.get("lat"), exif.get("lon")
        addr = {}
        if lat is not None and lon is not None:
            cache_key = (round(lat, 4), round(lon, 4))
            if cache_key not in geocode_cache:
                time.sleep(1)
                geocode_cache[cache_key] = reverse_geocode(lat, lon)
            addr = geocode_cache[cache_key]
        rows.append(build_row(filename, exif, addr))

    csv_filename = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    csv_path = os.path.join(BATCH_FOLDER, csv_filename)
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        writer.writeheader()
        writer.writerows(rows)

    return render_template("batch_result.html", rows=rows, folder=folder_name,
                           csv_filename=csv_filename)


@app.route("/batch", methods=["POST"])
def batch():
    folder_path = request.form.get("folder_path", "").strip()
    if not folder_path or not os.path.isdir(folder_path):
        return render_template("index.html", batch_error="フォルダが見つかりません。パスを確認してください。",
                               batch_folder=folder_path)

    image_files = sorted([
        f for f in os.listdir(folder_path)
        if os.path.splitext(f)[1].lower() in IMAGE_EXTENSIONS
    ])
    if not image_files:
        return render_template("index.html", batch_error="フォルダ内に対応する画像ファイルが見つかりませんでした。",
                               batch_folder=folder_path)

    rows = []
    geocode_cache = {}
    for filename in image_files:
        filepath = os.path.join(folder_path, filename)
        exif = get_exif_info(filepath)
        lat, lon = exif.get("lat"), exif.get("lon")
        addr = {}
        if lat is not None and lon is not None:
            cache_key = (round(lat, 4), round(lon, 4))
            if cache_key not in geocode_cache:
                time.sleep(1)  # Nominatim利用規約：1秒以上の間隔
                geocode_cache[cache_key] = reverse_geocode(lat, lon)
            addr = geocode_cache[cache_key]
        rows.append(build_row(filename, exif, addr))

    # CSVファイルに保存（Excel対応のためutf-8-sig）
    csv_filename = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    csv_path = os.path.join(BATCH_FOLDER, csv_filename)
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        writer.writeheader()
        writer.writerows(rows)

    return render_template("batch_result.html", rows=rows, folder=folder_path,
                           csv_filename=csv_filename)


@app.route("/batch_download/<path:filename>")
def batch_download(filename):
    csv_path = os.path.join(BATCH_FOLDER, filename)
    if not os.path.exists(csv_path):
        return "Not found", 404
    return send_file(csv_path, as_attachment=True, mimetype="text/csv; charset=utf-8")


@app.route("/download", methods=["POST"])
def download():
    text = request.form.get("result", "")
    filename = request.form.get("filename", "photo")
    txt_filename = os.path.splitext(filename)[0] + "_exif.txt"
    buf = io.BytesIO(text.encode("utf-8"))
    buf.seek(0)
    return send_file(buf, as_attachment=True, download_name=txt_filename, mimetype="text/plain")


if __name__ == "__main__":
    app.run(debug=True, port=5001)
