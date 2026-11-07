"""Community reporting endpoints with bounded uploads and protected official actions."""
from __future__ import annotations

import hashlib
import os
import re
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse

from src.config import DATA_DIR

router = APIRouter(prefix="/community", tags=["Community reports"])
DB_PATH = DATA_DIR / "community_reports.sqlite3"
UPLOAD_DIR = DATA_DIR / "community_uploads"
MAX_IMAGE_BYTES = 5 * 1024 * 1024
CATEGORIES = {"Roads & sidewalks", "Public transport", "Water & drainage", "Waste & cleanliness", "Parks & public spaces", "Street lighting", "Public safety", "Other"}
STATUSES = {"Reported", "Under review", "Assigned", "In progress", "Resolved"}
_requests: dict[str, list[float]] = {}


def _connect():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("""CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
        category TEXT NOT NULL, location TEXT NOT NULL, image_name TEXT,
        status TEXT NOT NULL DEFAULT 'Reported', department TEXT, created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL, demo INTEGER NOT NULL DEFAULT 0)""")
    con.execute("""CREATE TABLE IF NOT EXISTS support (
        report_id TEXT NOT NULL, resident_hash TEXT NOT NULL, created_at TEXT NOT NULL,
        PRIMARY KEY(report_id, resident_hash), FOREIGN KEY(report_id) REFERENCES reports(id))""")
    con.execute("""CREATE TABLE IF NOT EXISTS updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT, report_id TEXT NOT NULL, status TEXT NOT NULL,
        note TEXT NOT NULL, created_at TEXT NOT NULL, actor TEXT NOT NULL)""")
    con.commit()
    return con


def _rate_limit(request: Request, action: str, max_hits: int = 12):
    key = f"{action}:{request.client.host if request.client else 'unknown'}"
    now = time.monotonic()
    hits = [stamp for stamp in _requests.get(key, []) if now - stamp < 60]
    if len(hits) >= max_hits:
        raise HTTPException(429, "Too many requests. Please try again in a minute.")
    hits.append(now)
    _requests[key] = hits


def _clean(value: str, limit: int, field: str) -> str:
    value = " ".join(value.split()).strip()
    if not value or len(value) > limit:
        raise HTTPException(422, f"{field} must contain 1 to {limit} characters.")
    return value


def _shape(con: sqlite3.Connection, row: sqlite3.Row, resident_hash: Optional[str] = None):
    count = con.execute("SELECT COUNT(*) FROM support WHERE report_id=?", (row["id"],)).fetchone()[0]
    supported = bool(resident_hash and con.execute("SELECT 1 FROM support WHERE report_id=? AND resident_hash=?", (row["id"], resident_hash)).fetchone())
    latest = con.execute("SELECT status,note,created_at,actor FROM updates WHERE report_id=? ORDER BY id DESC LIMIT 1", (row["id"],)).fetchone()
    return {**dict(row), "support_count": count, "supported_by_you": supported,
            "latest_update": dict(latest) if latest else None,
            "image_url": f"/community/images/{row['image_name']}" if row["image_name"] else None}


@router.get("/reports")
def list_reports(category: Optional[str] = None, status: Optional[str] = None,
                 sort: str = Query("popular", pattern="^(popular|recent)$"),
                 x_resident_id: Optional[str] = Header(None)):
    resident_hash = hashlib.sha256(x_resident_id.encode()).hexdigest() if x_resident_id and len(x_resident_id) <= 80 else None
    con = _connect()
    try:
        query = "SELECT r.*, COUNT(s.report_id) AS support_count FROM reports r LEFT JOIN support s ON s.report_id=r.id WHERE 1=1"
        params = []
        if category and category in CATEGORIES:
            query += " AND r.category=?"; params.append(category)
        if status and status in STATUSES:
            query += " AND r.status=?"; params.append(status)
        query += " GROUP BY r.id ORDER BY " + ("support_count DESC, " if sort == "popular" else "") + "r.created_at DESC LIMIT 100"
        rows = con.execute(query, params).fetchall()
        latest_updates = {update["report_id"]: {"status": update["status"], "note": update["note"], "created_at": update["created_at"], "actor": update["actor"]}
                          for update in con.execute("""SELECT u.report_id,u.status,u.note,u.created_at,u.actor FROM updates u
                              JOIN (SELECT report_id,MAX(id) AS latest_id FROM updates GROUP BY report_id) x ON x.latest_id=u.id""")}
        reports = []
        for row in rows:
            item = dict(row)
            item["supported_by_you"] = bool(resident_hash and con.execute("SELECT 1 FROM support WHERE report_id=? AND resident_hash=?", (row["id"], resident_hash)).fetchone())
            item["latest_update"] = latest_updates.get(row["id"])
            item["image_url"] = f"/community/images/{row['image_name']}" if row["image_name"] else None
            reports.append(item)
        counts = {"total": con.execute("SELECT COUNT(*) FROM reports WHERE demo=0").fetchone()[0],
                  "open": con.execute("SELECT COUNT(*) FROM reports WHERE demo=0 AND status!='Resolved'").fetchone()[0],
                  "resolved": con.execute("SELECT COUNT(*) FROM reports WHERE demo=0 AND status='Resolved'").fetchone()[0]}
        return {"reports": reports, "counts": counts}
    finally:
        con.close()


@router.post("/reports", status_code=201)
async def create_report(request: Request, title: str = Form(...), description: str = Form(...),
                        category: str = Form(...), location: str = Form(...),
                        image: Optional[UploadFile] = File(None)):
    _rate_limit(request, "create", 5)
    title = _clean(title, 120, "Title"); description = _clean(description, 2000, "Description"); location = _clean(location, 180, "Location")
    if category not in CATEGORIES:
        raise HTTPException(422, "Choose a valid report category.")
    image_name = None
    if image and image.filename:
        payload = await image.read(MAX_IMAGE_BYTES + 1)
        if len(payload) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "Images must be 5 MB or smaller.")
        signatures = [(b"\x89PNG\r\n\x1a\n", ".png"), (b"\xff\xd8\xff", ".jpg"), (b"RIFF", ".webp")]
        extension = next((ext for sig, ext in signatures if payload.startswith(sig) and (ext != ".webp" or payload[8:12] == b"WEBP")), None)
        if not extension:
            raise HTTPException(415, "Upload a valid JPEG, PNG, or WebP image.")
        image_name = f"{uuid4().hex}{extension}"
        (UPLOAD_DIR / image_name).write_bytes(payload)
    report_id = f"CP-{secrets.token_hex(4).upper()}"
    now = datetime.now(timezone.utc).isoformat()
    con = _connect()
    try:
        con.execute("INSERT INTO reports(id,title,description,category,location,image_name,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                    (report_id, title, description, category, location, image_name, now, now))
        con.commit()
        return _shape(con, con.execute("SELECT * FROM reports WHERE id=?", (report_id,)).fetchone())
    finally:
        con.close()


@router.post("/reports/{report_id}/support")
def toggle_support(report_id: str, request: Request, x_resident_id: Optional[str] = Header(None)):
    _rate_limit(request, "support", 30)
    if not x_resident_id or not re.fullmatch(r"[a-f0-9-]{16,80}", x_resident_id):
        raise HTTPException(400, "A valid resident session is required.")
    resident_hash = hashlib.sha256(x_resident_id.encode()).hexdigest()
    con = _connect()
    try:
        if not con.execute("SELECT 1 FROM reports WHERE id=?", (report_id,)).fetchone():
            raise HTTPException(404, "Report not found.")
        existing = con.execute("SELECT 1 FROM support WHERE report_id=? AND resident_hash=?", (report_id, resident_hash)).fetchone()
        if existing:
            con.execute("DELETE FROM support WHERE report_id=? AND resident_hash=?", (report_id, resident_hash))
        else:
            con.execute("INSERT INTO support VALUES(?,?,?)", (report_id, resident_hash, datetime.now(timezone.utc).isoformat()))
        con.commit()
        row = con.execute("SELECT * FROM reports WHERE id=?", (report_id,)).fetchone()
        return _shape(con, row, resident_hash)
    finally:
        con.close()


@router.get("/images/{image_name}")
def get_image(image_name: str):
    if not re.fullmatch(r"[a-f0-9]{32}\.(png|jpg|webp)", image_name):
        raise HTTPException(404, "Image not found.")
    path = UPLOAD_DIR / image_name
    if not path.is_file():
        raise HTTPException(404, "Image not found.")
    return FileResponse(path, headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=86400"})


@router.get("/reports/{report_id}/updates")
def report_updates(report_id: str):
    con = _connect()
    try:
        if not con.execute("SELECT 1 FROM reports WHERE id=?", (report_id,)).fetchone():
            raise HTTPException(404, "Report not found.")
        rows = con.execute("SELECT status,note,created_at,actor FROM updates WHERE report_id=? ORDER BY id DESC", (report_id,)).fetchall()
        return [dict(row) for row in rows]
    finally:
        con.close()


@router.patch("/reports/{report_id}/status")
def update_status(report_id: str, status: str = Form(...), note: str = Form(""),
                  department: str = Form(""), authorization: Optional[str] = Header(None)):
    token = os.getenv("CIVIC_OFFICIAL_TOKEN", "")
    if not token:
        raise HTTPException(503, "Official actions are disabled until CIVIC_OFFICIAL_TOKEN is configured.")
    supplied = authorization.removeprefix("Bearer ") if authorization else ""
    if not secrets.compare_digest(supplied, token):
        raise HTTPException(401, "Official authorization required.")
    if status not in STATUSES:
        raise HTTPException(422, "Choose a valid status.")
    if len(note) > 500 or len(department) > 100:
        raise HTTPException(422, "Update note or department is too long.")
    now = datetime.now(timezone.utc).isoformat()
    con = _connect()
    try:
        if not con.execute("SELECT 1 FROM reports WHERE id=?", (report_id,)).fetchone():
            raise HTTPException(404, "Report not found.")
        con.execute("UPDATE reports SET status=?, department=?, updated_at=? WHERE id=?", (status, department.strip(), now, report_id))
        con.execute("INSERT INTO updates(report_id,status,note,created_at,actor) VALUES(?,?,?,?,?)", (report_id,status,note.strip(),now,department.strip() or "Municipal team"))
        con.commit()
        return dict(con.execute("SELECT * FROM reports WHERE id=?", (report_id,)).fetchone())
    finally:
        con.close()
