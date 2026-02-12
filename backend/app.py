# app.py — Windows-friendly Helm discovery (no Scapy L2 ARP sweep)
#
# + SIMPLE USER MANAGEMENT (NOT SECURE BY DESIGN)
#   - First-run setup creates admin
#   - Admin creates PIN users and assigns printers (by hostname)
#   - Non-admin users only see/control assigned printers
#   - Sessions are in-memory tokens (re-login after backend restart)
#   - Users/assignments persisted in data/users.json
#
# Endpoints (new):
#   GET  /api/auth/status
#   POST /api/auth/setup
#   POST /api/auth/login
#   POST /api/auth/logout
#   GET  /api/me
#   GET  /api/users                (admin)
#   POST /api/users                (admin)
#   PATCH/DELETE /api/users/<id>    (admin)
#   PUT  /api/users/<id>/printers   (admin)
#
# Existing endpoints (now filtered by user permissions):
#   GET /api/devices
#   GET /api/history/aggregate
#
# NEW (UI heartbeat):
#   GET /api/health

from flask import Flask, jsonify, request, send_from_directory, make_response, abort
from flask_cors import CORS
import os
import json
import secrets
import requests
import threading
import logging
import subprocess
import re
import socket
import ipaddress
import time
from datetime import datetime
from typing import List, Tuple, Optional, Dict, Any, Callable
from functools import wraps

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder="static", static_url_path="")
# If you want cookie-based auth from a different origin, keep supports_credentials True
CORS(app, supports_credentials=True)

# For thread-safe append to the device list
device_list_lock = threading.Lock()

# ---------------------------
# Simple auth + user storage
# ---------------------------

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")

# ---------------------------
# ✅ Right-rail persistence (per-user)
# ---------------------------

RIGHT_RAIL_DIR = os.path.join(DATA_DIR, "right_rail")
right_rail_lock = threading.Lock()

def _ensure_right_rail_dir() -> None:
    ensure_data_dir()
    os.makedirs(RIGHT_RAIL_DIR, exist_ok=True)

def _right_rail_path_for_user(user_id: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", str(user_id or "unknown"))
    return os.path.join(RIGHT_RAIL_DIR, f"{safe}.json")

def _default_right_rail_doc() -> Dict[str, Any]:
    return {"notes": [], "tasks": [], "scratchpad": ""}

def _sanitize_right_rail_payload(payload: Any) -> Dict[str, Any]:
    payload = payload if isinstance(payload, dict) else {}

    notes = payload.get("notes", [])
    tasks = payload.get("tasks", [])
    scratchpad = payload.get("scratchpad", "")

    if not isinstance(notes, list): notes = []
    if not isinstance(tasks, list): tasks = []
    if not isinstance(scratchpad, str): scratchpad = ""

    # Light shape validation (keep only expected fields)
    clean_notes = []
    for n in notes:
        if not isinstance(n, dict): 
            continue
        nid = str(n.get("id") or "")
        text = str(n.get("text") or "")
        created_at = n.get("created_at")
        try:
            created_at = int(created_at)
        except Exception:
            created_at = 0
        if nid and text.strip():
            clean_notes.append({"id": nid, "text": text, "created_at": created_at})

    clean_tasks = []
    for t in tasks:
        if not isinstance(t, dict):
            continue
        tid = str(t.get("id") or "")
        text = str(t.get("text") or "")
        done = bool(t.get("done", False))
        created_at = t.get("created_at")
        try:
            created_at = int(created_at)
        except Exception:
            created_at = 0
        if tid and text.strip():
            clean_tasks.append({"id": tid, "text": text, "done": done, "created_at": created_at})

    # Optional: cap sizes so file doesn’t explode
    clean_notes = clean_notes[:200]
    clean_tasks = clean_tasks[:400]
    if len(scratchpad) > 10000:
        scratchpad = scratchpad[:10000]

    return {"notes": clean_notes, "tasks": clean_tasks, "scratchpad": scratchpad}

def _read_right_rail_for_user(user_id: str) -> Dict[str, Any]:
    _ensure_right_rail_dir()
    path = _right_rail_path_for_user(user_id)
    if not os.path.isfile(path):
        return _default_right_rail_doc()
    try:
        with open(path, "r", encoding="utf-8") as f:
            doc = json.load(f)
        return _sanitize_right_rail_payload(doc)
    except Exception:
        return _default_right_rail_doc()

def _write_right_rail_for_user(user_id: str, doc: Dict[str, Any]) -> None:
    _ensure_right_rail_dir()
    path = _right_rail_path_for_user(user_id)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=2)
    os.replace(tmp, path)


users_file_lock = threading.Lock()

# In-memory session store: token -> user_id
# (Not persisted; restart requires re-login)
sessions_lock = threading.Lock()
sessions: Dict[str, str] = {}

# ---------------------------
# ✅ Health snapshot for UI heartbeat
# ---------------------------

APP_STARTED_TS = time.time()

# Updated whenever discovery runs (devices/history endpoints)
HEALTH_SNAPSHOT: Dict[str, Any] = {
    "last_discovery": None,
    "last_discovery_cidr": None,
    "last_printers_found": 0,
    "last_discovery_ms": None,
    "last_error": None,
}


def ensure_data_dir() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)


def _default_users_doc() -> Dict[str, Any]:
    return {"users": []}


def load_users_doc() -> Dict[str, Any]:
    ensure_data_dir()
    with users_file_lock:
        if not os.path.isfile(USERS_FILE):
            return _default_users_doc()
        try:
            with open(USERS_FILE, "r", encoding="utf-8") as f:
                doc = json.load(f)
            if not isinstance(doc, dict) or "users" not in doc or not isinstance(doc["users"], list):
                return _default_users_doc()
            return doc
        except Exception:
            return _default_users_doc()


def save_users_doc(doc: Dict[str, Any]) -> None:
    ensure_data_dir()
    with users_file_lock:
        tmp = USERS_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=2)
        os.replace(tmp, USERS_FILE)


def is_configured() -> bool:
    doc = load_users_doc()
    for u in doc.get("users", []):
        if u.get("role") == "admin":
            return True
    return False


def find_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    doc = load_users_doc()
    for u in doc.get("users", []):
        if u.get("id") == user_id:
            return u
    return None


def find_admin() -> Optional[Dict[str, Any]]:
    doc = load_users_doc()
    for u in doc.get("users", []):
        if u.get("role") == "admin":
            return u
    return None


def find_user_by_pin(pin: str) -> Optional[Dict[str, Any]]:
    doc = load_users_doc()
    for u in doc.get("users", []):
        if u.get("role") == "user" and str(u.get("pin", "")) == str(pin):
            return u
    return None


def find_admin_by_username(username: str) -> Optional[Dict[str, Any]]:
    doc = load_users_doc()
    for u in doc.get("users", []):
        if u.get("role") == "admin" and str(u.get("username", "")).lower() == str(username).lower():
            return u
    return None


def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(24)
    with sessions_lock:
        sessions[token] = user_id
    return token


def clear_session(token: str) -> None:
    with sessions_lock:
        sessions.pop(token, None)


def get_token_from_request() -> Optional[str]:
    # Prefer Authorization header
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip() or None
    # Fallback to cookie
    tok = request.cookies.get("helm_session")
    return tok or None


def current_user() -> Optional[Dict[str, Any]]:
    tok = get_token_from_request()
    if not tok:
        return None
    with sessions_lock:
        uid = sessions.get(tok)
    if not uid:
        return None
    return find_user_by_id(uid)


def require_configured(fn: Callable):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not is_configured():
            return jsonify({"error": "not_configured"}), 409
        return fn(*args, **kwargs)
    return wrapper


def require_auth(fn: Callable):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        u = current_user()
        if not u:
            return jsonify({"error": "unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


def require_admin(fn: Callable):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        u = current_user()
        if not u:
            return jsonify({"error": "unauthorized"}), 401
        if u.get("role") != "admin":
            return jsonify({"error": "forbidden"}), 403
        return fn(*args, **kwargs)
    return wrapper


def allowed_printer_hostnames_for_user(u: Dict[str, Any]) -> Optional[set]:
    """
    Returns:
      - None for admin / wildcard (means all)
      - set of allowed hostnames for regular users
    """
    if not u:
        return set()
    if u.get("role") == "admin":
        return None
    printers = u.get("printers") or []
    if "*" in printers:
        return None
    return set(str(x) for x in printers if x)


def filter_devices_for_user(devices: List[Dict[str, Any]], u: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # If not logged in, show nothing (your UI will route to login anyway)
    if not u:
        return []
    allowed = allowed_printer_hostnames_for_user(u)
    if allowed is None:
        return devices
    out = []
    for d in devices:
        hn = str(d.get("hostname") or "")
        if hn in allowed:
            out.append(d)
    return out


# ---------------------------
# Helpers: local IP, ARP table
# ---------------------------

def get_my_ipv4() -> str:
    """
    Reliable way to get the active LAN IPv4 (not 127.0.0.1), even with multiple adapters.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't send traffic; just selects the route.
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    finally:
        s.close()


def ping_once(ip: str, timeout_ms: int = 150) -> None:
    """
    Fire-and-forget ping to warm Windows neighbor/ARP cache.
    """
    try:
        subprocess.Popen(
            ["ping", "-n", "1", "-w", str(timeout_ms), ip],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        pass


def warm_neighbor_table(cidr: str, limit: Optional[int] = None) -> None:
    """
    Ping-sweep (lightweight) to populate arp -a. Limit can reduce load.
    """
    net = ipaddress.ip_network(cidr, strict=False)
    count = 0
    for host in net.hosts():
        ping_once(str(host))
        count += 1
        if limit is not None and count >= limit:
            break


def parse_arp_a() -> List[Tuple[str, str]]:
    """
    Parse `arp -a` output into (ip, mac).
    Only includes entries that look like real unicast neighbors.
    """
    out = subprocess.check_output(["arp", "-a"], text=True, encoding="utf-8", errors="ignore")
    entries: List[Tuple[str, str]] = []

    # Matches lines like: "  192.168.1.210         d8-3a-dd-e0-c9-4b     dynamic"
    line_re = re.compile(r"^\s*(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F-]{17})\s+(\w+)\s*$")

    for line in out.splitlines():
        m = line_re.match(line)
        if not m:
            continue

        ip, mac, typ = m.group(1), m.group(2).lower(), m.group(3).lower()

        # Filter multicast / broadcast-ish entries
        if ip.startswith("224.") or ip.startswith("239.") or ip.endswith(".255") or ip == "255.255.255.255":
            continue

        # Filter common multicast MAC prefixes
        if mac.startswith("01-00-5e") or mac == "ff-ff-ff-ff-ff-ff":
            continue

        entries.append((ip, mac))

    return entries


def port_open(ip: str, port: int, timeout: float = 0.25) -> bool:
    """
    Fast TCP connect test.
    """
    try:
        with socket.create_connection((ip, port), timeout=timeout):
            return True
    except OSError:
        return False


# ---------------------------
# Moonraker probing + queries
# ---------------------------

def pick_moonraker_base(ip: str, ports: List[int]) -> Optional[str]:
    """
    Find a base URL (http://ip:port) that answers /printer/info.
    Returns None if none of the ports respond as Moonraker.
    """
    for p in ports:
        base = f"http://{ip}:{p}"
        info_url = f"{base}/printer/info"
        try:
            r = requests.get(info_url, timeout=1.5)
            r.raise_for_status()
            j = r.json()
            if isinstance(j, dict) and "result" in j:
                return base
        except requests.RequestException:
            continue
        except ValueError:
            continue
    return None


def fetch_printer_details(base: str, ip: str, mac: str, devices_list, processed_hostnames) -> None:
    """
    Fetch the fields you were using before, but using `base` so it works
    whether Moonraker is on 7125, 80, etc.
    """
    info_url = f"{base}/printer/info"
    virtual_sdcard_url = f"{base}/printer/objects/query?virtual_sdcard"
    extruder_url = f"{base}/printer/objects/query?gcode_move&toolhead&extruder=target,temperature"
    extruder1_url = f"{base}/printer/objects/query?gcode_move&toolhead&extruder1=target,temperature"
    extruder2_url = f"{base}/printer/objects/query?gcode_move&toolhead&extruder2=target,temperature"
    heater_bed_url = f"{base}/printer/objects/query?gcode_move&toolhead&heater_bed=target,temperature"
    idle_timeout_url = f"{base}/printer/objects/query?idle_timeout"

    try:
        r_info = requests.get(info_url, timeout=2)
        r_info.raise_for_status()
        info_data = r_info.json()

        r_extruder = requests.get(extruder_url, timeout=2); r_extruder.raise_for_status()
        r_extruder1 = requests.get(extruder1_url, timeout=2); r_extruder1.raise_for_status()
        r_extruder2 = requests.get(extruder2_url, timeout=2); r_extruder2.raise_for_status()
        r_bed = requests.get(heater_bed_url, timeout=2); r_bed.raise_for_status()
        r_idle = requests.get(idle_timeout_url, timeout=2); r_idle.raise_for_status()
        r_vsd = requests.get(virtual_sdcard_url, timeout=2); r_vsd.raise_for_status()

        extruder_data = r_extruder.json()
        extruder1_data = r_extruder1.json()
        extruder2_data = r_extruder2.json()
        heater_bed_data = r_bed.json()
        idle_timeout_data = r_idle.json()
        virtual_sdcard_data = r_vsd.json()

        hostname = info_data["result"]["hostname"]
        software_version = info_data["result"].get("software_version")
        state_message = info_data["result"].get("state_message")

        status = idle_timeout_data["result"]["status"]["idle_timeout"]["state"]

        # Print progress + file path
        vs = virtual_sdcard_data["result"]["status"]["virtual_sdcard"]
        print_progress = vs.get("progress", 0)
        file_path = vs.get("file_path")

        thumbnail_url = None
        if file_path and file_path.startswith("/home/pi/printer_data/gcodes/"):
            stripped = file_path.removeprefix("/home/pi/printer_data/gcodes/")
            thumbnail_url = f"{base}/server/files/thumbnails?filename={requests.utils.quote(stripped)}"

        # Temps (may not exist on all printers; guard with .get)
        extruder_temperature = extruder_data["result"]["status"].get("extruder", {}).get("temperature")
        extruder1_temperature = extruder1_data["result"]["status"].get("extruder1", {}).get("temperature")
        extruder2_temperature = extruder2_data["result"]["status"].get("extruder2", {}).get("temperature")
        heater_bed_temperature = heater_bed_data["result"]["status"].get("heater_bed", {}).get("temperature")

        with device_list_lock:
            if hostname in processed_hostnames:
                return
            processed_hostnames.add(hostname)
            devices_list.append({
                "hostname": hostname,
                "ip": ip,
                "mac": mac,
                "base_url": base,
                "ui_url": f"http://{ip}",
                "software_version": software_version,
                "state_message": state_message,
                "status": status,
                "extruder_temperature": extruder_temperature,
                "extruder1_temperature": extruder1_temperature,
                "extruder2_temperature": extruder2_temperature,
                "heater_bed_temperature": heater_bed_temperature,
                "print_progress": print_progress,
                "file_path": file_path,
                "thumbnail_url": thumbnail_url
            })

    except requests.RequestException as e:
        logger.info("Query failed for %s via %s: %s", ip, base, e)
    except (KeyError, TypeError, ValueError) as e:
        logger.info("Unexpected JSON shape for %s via %s: %s", ip, base, e)


def probe_and_collect(ip: str, mac: str, ports: List[int], devices_list, processed_hostnames) -> None:
    """
    Worker: quick port check then Moonraker probe then details fetch.
    """
    open_ports = [p for p in ports if port_open(ip, p)]
    if not open_ports:
        return

    base = pick_moonraker_base(ip, open_ports)
    if not base:
        return

    fetch_printer_details(base, ip, mac, devices_list, processed_hostnames)


def discover_devices(cidr: str, warm: bool, ports: List[int]) -> List[Dict[str, Any]]:
    t0 = time.time()
    try:
        my_ip = get_my_ipv4()
        logger.info("My IP: %s", my_ip)
        logger.info("Using CIDR: %s", cidr)
        logger.info("Probe ports: %s", ports)

        if warm:
            logger.info("Warming neighbor table (ping sweep)...")
            warm_neighbor_table(cidr, limit=None)

        arp_entries = parse_arp_a()
        logger.info("arp -a entries: %d", len(arp_entries))

        devices_list: List[Dict[str, Any]] = []
        processed_hostnames = set()
        threads = []

        for ip, mac in arp_entries:
            if ip == my_ip:
                continue
            t = threading.Thread(target=probe_and_collect, args=(ip, mac, ports, devices_list, processed_hostnames))
            t.start()
            threads.append(t)

        for t in threads:
            t.join()

        logger.info("Printers found: %d", len(devices_list))

        # ✅ health snapshot on success
        try:
            HEALTH_SNAPSHOT["last_discovery"] = datetime.now().isoformat()
            HEALTH_SNAPSHOT["last_discovery_cidr"] = cidr
            HEALTH_SNAPSHOT["last_printers_found"] = len(devices_list)
            HEALTH_SNAPSHOT["last_discovery_ms"] = int((time.time() - t0) * 1000)
            HEALTH_SNAPSHOT["last_error"] = None
        except Exception:
            pass

        return devices_list

    except Exception as e:
        # ✅ health snapshot on failure
        try:
            HEALTH_SNAPSHOT["last_discovery"] = datetime.now().isoformat()
            HEALTH_SNAPSHOT["last_discovery_cidr"] = cidr
            HEALTH_SNAPSHOT["last_printers_found"] = 0
            HEALTH_SNAPSHOT["last_discovery_ms"] = int((time.time() - t0) * 1000)
            HEALTH_SNAPSHOT["last_error"] = str(e)
        except Exception:
            pass
        raise


# ---------------------------
# History aggregation helpers
# ---------------------------

def moonraker_get_json(base: str, path: str, timeout: float = 2.5) -> Optional[Dict[str, Any]]:
    url = f"{base}{path}"
    try:
        r = requests.get(url, timeout=timeout)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


def fetch_history_totals(base: str) -> Optional[Dict[str, Any]]:
    """
    /server/history/totals returns { job_totals: {...}, auxiliary_totals: [...] }
    Some setups wrap under "result".
    """
    j = moonraker_get_json(base, "/server/history/totals", timeout=3.0)
    if not isinstance(j, dict):
        return None
    if "job_totals" in j and isinstance(j["job_totals"], dict):
        return j
    if "result" in j and isinstance(j["result"], dict) and "job_totals" in j["result"]:
        return j["result"]
    return None


def fetch_history_list_page(base: str, limit: int, start: int, order: str = "desc") -> Optional[Dict[str, Any]]:
    """
    /server/history/list?limit=...&start=...&order=...
    Some setups wrap under "result".
    """
    j = moonraker_get_json(base, f"/server/history/list?limit={limit}&start={start}&order={order}", timeout=4.0)
    if not isinstance(j, dict):
        return None
    if "jobs" in j and isinstance(j["jobs"], list):
        return j
    if "result" in j and isinstance(j["result"], dict) and "jobs" in j["result"]:
        return j["result"]
    return None


def find_job_matching_duration(
    base: str,
    target_seconds: float,
    duration_key: str,
    page_limit: int = 200,
    max_pages: int = 6,
    eps: float = 0.01
) -> Optional[Dict[str, Any]]:
    """
    Scan the history list looking for a job whose {duration_key} matches target_seconds.
    duration_key should be "total_duration" or "print_duration".
    """
    if not target_seconds or target_seconds <= 0:
        return None

    start = 0
    for _ in range(max_pages):
        page = fetch_history_list_page(base, limit=page_limit, start=start, order="desc")
        if not page:
            return None
        jobs = page.get("jobs") or []
        if not jobs:
            return None

        for job in jobs:
            try:
                v = float(job.get(duration_key) or 0.0)
                if abs(v - float(target_seconds)) <= eps:
                    return job
            except Exception:
                continue

        start += page_limit

    return None


# ---------------------------
# NEW: status + monthly rollups
# ---------------------------

def _bucket_status(raw: Optional[str]) -> str:
    """
    Map Moonraker job statuses into the buckets your UI expects.
    Buckets: completed, cancelled, error, other
    """
    s = (raw or "").strip().lower()
    if s == "completed":
        return "completed"
    if s == "error":
        return "error"

    cancelled_like = {
        "cancelled",
        "canceled",
        "interrupted",
        "server_exit",
        "klippy_shutdown",
        "shutdown",
        "aborted",
    }
    if s in cancelled_like:
        return "cancelled"

    return "other"


def _month_label_from_ts(ts: Optional[float]) -> Optional[str]:
    if not ts:
        return None
    try:
        d = datetime.fromtimestamp(float(ts))
        return d.strftime("%b %Y")  # e.g. "Jan 2026"
    except Exception:
        return None


def _iso_from_ts(ts: Optional[float]) -> Optional[str]:
    if not ts:
        return None
    try:
        return datetime.fromtimestamp(float(ts)).isoformat()
    except Exception:
        return None


def scan_history_stats(
    base: str,
    page_limit: int = 200,
    max_pages: int = 12,
) -> Dict[str, Any]:
    """
    Scan /server/history/list and compute:
      - status_breakdown: counts by bucket
      - status_time_hours: hours by bucket (based on print_duration with fallback)
      - by_period: monthly print hours (based on print_duration with fallback)
      - last_print_finished: newest end_time in iso
    """
    counts = {"completed": 0, "cancelled": 0, "error": 0, "other": 0}
    time_hours = {"completed": 0.0, "cancelled": 0.0, "error": 0.0, "other": 0.0}
    by_month: Dict[str, float] = {}
    last_end_ts: float = 0.0

    start = 0
    for _ in range(max_pages):
        page = fetch_history_list_page(base, limit=page_limit, start=start, order="desc")
        if not page:
            break

        jobs = page.get("jobs") or []
        if not jobs:
            break

        for job in jobs:
            try:
                bucket = _bucket_status(job.get("status"))
                counts[bucket] = int(counts.get(bucket, 0)) + 1

                # Prefer print_duration (actual printing), fallback to total_duration
                dur_s = job.get("print_duration")
                if dur_s is None:
                    dur_s = job.get("total_duration")
                dur_s = float(dur_s or 0.0)
                if dur_s < 0:
                    dur_s = 0.0

                time_hours[bucket] = float(time_hours.get(bucket, 0.0)) + (dur_s / 3600.0)

                # Month bucketing (prefer end_time, fallback start_time)
                ts = job.get("end_time") or job.get("start_time")
                lbl = _month_label_from_ts(ts)
                if lbl:
                    by_month[lbl] = float(by_month.get(lbl, 0.0)) + (dur_s / 3600.0)

                # Last finished print time
                et = float(job.get("end_time") or 0.0)
                if et > last_end_ts:
                    last_end_ts = et

            except Exception:
                continue

        start += page_limit

    # Sorted monthly list for frontend
    def _month_sort_key(label: str) -> float:
        try:
            return datetime.strptime(label, "%b %Y").timestamp()
        except Exception:
            return 0.0

    by_period = [{"label": k, "hours": float(v)} for k, v in by_month.items()]
    by_period.sort(key=lambda x: _month_sort_key(x["label"]))

    return {
        "status_breakdown": counts,
        "status_time_hours": time_hours,
        "by_period": by_period,
        "last_print_finished": _iso_from_ts(last_end_ts) if last_end_ts else None,
    }


def aggregate_history_for_device(device: Dict[str, Any], opts: Dict[str, Any]) -> Dict[str, Any]:
    base = device.get("base_url")
    out: Dict[str, Any] = {
        "hostname": device.get("hostname"),
        "ip": device.get("ip"),
        "base_url": base,
        "ok": False,
        "error": None,
        "job_totals": None,
        "longest_job": None,
        "longest_print": None,

        # per-device breakdowns
        "status_breakdown": None,
        "status_time_hours": None,
        "by_period": None,
        "last_print_finished": None,
    }

    if not base:
        out["error"] = "missing base_url"
        return out

    totals = fetch_history_totals(base)
    if not totals:
        out["error"] = "history totals unavailable"
        return out

    job_totals = totals.get("job_totals") or {}
    out["job_totals"] = job_totals
    out["ok"] = True

    match_longest = opts.get("match_longest", True)
    page_limit = int(opts.get("page_limit", 200))
    max_pages = int(opts.get("max_pages", 6))

    # durations in seconds
    longest_job_s = float(job_totals.get("longest_job") or 0.0)
    longest_print_s = float(job_totals.get("longest_print") or 0.0)

    if match_longest:
        lj = find_job_matching_duration(
            base=base,
            target_seconds=longest_job_s,
            duration_key="total_duration",
            page_limit=page_limit,
            max_pages=max_pages,
        )
        lp = find_job_matching_duration(
            base=base,
            target_seconds=longest_print_s,
            duration_key="print_duration",
            page_limit=page_limit,
            max_pages=max_pages,
        )
        out["longest_job"] = lj
        out["longest_print"] = lp
    else:
        out["longest_job"] = {"total_duration": longest_job_s}
        out["longest_print"] = {"print_duration": longest_print_s}

    # breakdowns
    try:
        stats_pages = int(opts.get("stats_pages", 12))
        stats = scan_history_stats(base, page_limit=page_limit, max_pages=stats_pages)
        out["status_breakdown"] = stats.get("status_breakdown")
        out["status_time_hours"] = stats.get("status_time_hours")
        out["by_period"] = stats.get("by_period")
        out["last_print_finished"] = stats.get("last_print_finished")
    except Exception:
        pass

    return out


# ---------------------------
# Routes: Auth
# ---------------------------

@app.route("/api/auth/status", methods=["GET"])
def auth_status():
    return jsonify({"configured": is_configured()})


@app.route("/api/auth/setup", methods=["POST"])
def auth_setup():
    """
    First-run setup. Creates the admin user if not configured.
    Body: { "username": "...", "password": "..." }
    """
    if is_configured():
        return jsonify({"error": "already_configured"}), 409

    data = request.get_json(silent=True) or {}
    username = str(data.get("username") or "").strip()
    password = str(data.get("password") or "").strip()
    if not username or not password:
        return jsonify({"error": "username_and_password_required"}), 400

    doc = load_users_doc()
    doc["users"] = [
        {
            "id": "admin",
            "role": "admin",
            "username": username,
            "password": password,   # plain-text by design
            "printers": ["*"],
            "created_at": datetime.now().isoformat(),
        }
    ]
    save_users_doc(doc)

    token = create_session("admin")
    resp = make_response(jsonify({"ok": True, "token": token, "role": "admin"}))
    # Optional cookie (works nicely for kiosk/local)
    resp.set_cookie("helm_session", token, httponly=False, samesite="Lax")
    return resp


@app.route("/api/auth/login", methods=["POST"])
@require_configured
def auth_login():
    """
    Login either as admin or user.
    Admin body: { "mode":"admin", "username":"...", "password":"..." }
    User  body: { "mode":"pin", "pin":"1234" }  (PIN must be unique)
    """
    data = request.get_json(silent=True) or {}
    mode = str(data.get("mode") or "").strip().lower()

    u = None
    if mode == "admin":
        username = str(data.get("username") or "").strip()
        password = str(data.get("password") or "").strip()
        if not username or not password:
            return jsonify({"error": "username_and_password_required"}), 400
        adm = find_admin_by_username(username)
        if not adm or str(adm.get("password") or "") != password:
            return jsonify({"error": "invalid_credentials"}), 401
        u = adm

    elif mode == "pin":
        pin = str(data.get("pin") or "").strip()
        if not pin:
            return jsonify({"error": "pin_required"}), 400
        usr = find_user_by_pin(pin)
        if not usr:
            return jsonify({"error": "invalid_pin"}), 401
        u = usr

    else:
        return jsonify({"error": "invalid_mode", "modes": ["admin", "pin"]}), 400

    token = create_session(str(u.get("id")))
    resp = make_response(jsonify({
        "ok": True,
        "token": token,
        "role": u.get("role"),
        "user": {"id": u.get("id"), "role": u.get("role"), "name": u.get("name") or u.get("username")}
    }))
    resp.set_cookie("helm_session", token, httponly=False, samesite="Lax")
    return resp


@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    tok = get_token_from_request()
    if tok:
        clear_session(tok)
    resp = make_response(jsonify({"ok": True}))
    resp.delete_cookie("helm_session")
    return resp


@app.route("/api/me", methods=["GET"])
@require_auth
def me():
    u = current_user()
    allowed = allowed_printer_hostnames_for_user(u)
    return jsonify({
        "id": u.get("id"),
        "role": u.get("role"),
        "name": u.get("name") or u.get("username"),
        "allowed_printers": None if allowed is None else sorted(list(allowed)),
    })

# ---------------------------
# ✅ Routes: Right rail (Notes/Tasks) — per-user
# ---------------------------

@app.route("/api/right-rail", methods=["GET"])
@require_auth
def right_rail_get():
    u = current_user()
    uid = str(u.get("id") or "")
    with right_rail_lock:
        doc = _read_right_rail_for_user(uid)
    return jsonify(doc)

@app.route("/api/right-rail", methods=["PUT"])
@require_auth
def right_rail_put():
    u = current_user()
    uid = str(u.get("id") or "")
    payload = request.get_json(silent=True) or {}
    doc = _sanitize_right_rail_payload(payload)
    with right_rail_lock:
        _write_right_rail_for_user(uid, doc)
    return jsonify({"ok": True})



# ---------------------------
# ✅ Routes: Health (for UI heartbeat)
# ---------------------------

@app.route("/api/health", methods=["GET"])
def api_health():
    """
    Lightweight health check for the UI heartbeat.
    No auth required so it can show on login screens too.
    """
    uptime_s = int(time.time() - APP_STARTED_TS)
    return jsonify({
        "ok": True,
        "uptime_s": uptime_s,
        "configured": is_configured(),
        "time": datetime.now().isoformat(),
        "snapshot": HEALTH_SNAPSHOT,
    })


# ---------------------------
# Routes: Admin user management
# ---------------------------

@app.route("/api/users", methods=["GET"])
@require_admin
def users_list():
    doc = load_users_doc()
    # Don’t leak admin password to the UI
    users_out = []
    for u in doc.get("users", []):
        u2 = dict(u)
        if u2.get("role") == "admin":
            u2.pop("password", None)
        users_out.append(u2)
    return jsonify({"users": users_out})


@app.route("/api/users", methods=["POST"])
@require_admin
def users_create():
    """
    Create a PIN user.
    Body: { "name":"Operator 1", "pin":"1234" }
    """
    data = request.get_json(silent=True) or {}
    name = str(data.get("name") or "").strip()
    pin = str(data.get("pin") or "").strip()

    if not name or not pin:
        return jsonify({"error": "name_and_pin_required"}), 400
    if not pin.isdigit():
        return jsonify({"error": "pin_must_be_digits"}), 400
    if len(pin) < 3 or len(pin) > 8:
        return jsonify({"error": "pin_length_invalid", "min": 3, "max": 8}), 400

    # Ensure PIN uniqueness
    if find_user_by_pin(pin):
        return jsonify({"error": "pin_already_in_use"}), 409

    doc = load_users_doc()
    new_id = "u_" + secrets.token_hex(4)

    doc["users"].append({
        "id": new_id,
        "role": "user",
        "name": name,
        "pin": pin,
        "printers": [],
        "created_at": datetime.now().isoformat(),
    })
    save_users_doc(doc)

    return jsonify({"ok": True, "user": {"id": new_id, "role": "user", "name": name, "pin": pin, "printers": []}})


@app.route("/api/users/<user_id>", methods=["PATCH"])
@require_admin
def users_patch(user_id: str):
    """
    Update a user name and/or pin.
    Body: { "name": "...", "pin":"...." }
    """
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    pin = data.get("pin")

    doc = load_users_doc()
    users = doc.get("users", [])
    target = None
    for u in users:
        if u.get("id") == user_id:
            target = u
            break
    if not target:
        return jsonify({"error": "not_found"}), 404
    if target.get("role") == "admin":
        return jsonify({"error": "cannot_edit_admin_here"}), 400

    if name is not None:
        name_s = str(name).strip()
        if not name_s:
            return jsonify({"error": "name_empty"}), 400
        target["name"] = name_s

    if pin is not None:
        pin_s = str(pin).strip()
        if not pin_s or not pin_s.isdigit():
            return jsonify({"error": "pin_must_be_digits"}), 400
        if len(pin_s) < 3 or len(pin_s) > 8:
            return jsonify({"error": "pin_length_invalid", "min": 3, "max": 8}), 400
        existing = find_user_by_pin(pin_s)
        if existing and existing.get("id") != user_id:
            return jsonify({"error": "pin_already_in_use"}), 409
        target["pin"] = pin_s

    save_users_doc(doc)
    return jsonify({"ok": True})


@app.route("/api/users/<user_id>", methods=["DELETE"])
@require_admin
def users_delete(user_id: str):
    doc = load_users_doc()
    users = doc.get("users", [])
    before = len(users)
    users = [u for u in users if u.get("id") != user_id]
    if len(users) == before:
        return jsonify({"error": "not_found"}), 404
    # never delete admin via this path
    users = [u for u in users if u.get("role") != "admin" or u.get("id") == "admin"]
    doc["users"] = users
    save_users_doc(doc)
    return jsonify({"ok": True})


@app.route("/api/users/<user_id>/printers", methods=["PUT"])
@require_admin
def users_set_printers(user_id: str):
    """
    Assign printers by hostname.
    Body: { "printers": ["gigabot-xlt-01", "terabot-02"] }
    """
    data = request.get_json(silent=True) or {}
    printers = data.get("printers")
    if not isinstance(printers, list):
        return jsonify({"error": "printers_list_required"}), 400

    printers_norm = []
    for p in printers:
        s = str(p).strip()
        if s:
            printers_norm.append(s)

    doc = load_users_doc()
    target = None
    for u in doc.get("users", []):
        if u.get("id") == user_id:
            target = u
            break
    if not target:
        return jsonify({"error": "not_found"}), 404
    if target.get("role") == "admin":
        return jsonify({"error": "admin_always_all"}), 400

    target["printers"] = printers_norm
    save_users_doc(doc)
    return jsonify({"ok": True, "user": {"id": user_id, "printers": printers_norm}})


# ---------------------------
# Routes: Devices (filtered)
# ---------------------------

@app.route("/api/devices", methods=["GET"])
@require_auth
def get_devices_api():
    cidr = request.args.get("cidr", "192.168.1.0/24")
    warm = request.args.get("warm", "1") != "0"
    ports_arg = request.args.get("ports", "")
    ports = [7125, 80, 4408]

    if ports_arg.strip():
        try:
            ports = [int(p.strip()) for p in ports_arg.split(",") if p.strip()]
        except ValueError:
            return jsonify({"error": "Invalid ports param. Use e.g. ?ports=7125,80,4408"}), 400

    devices_list = discover_devices(cidr=cidr, warm=warm, ports=ports)
    u = current_user()
    devices_list = filter_devices_for_user(devices_list, u)
    return jsonify(devices_list)


# ---------------------------
# Routes: History aggregate (filtered)
# ---------------------------

@app.route("/api/history/aggregate", methods=["GET"])
@require_auth
def history_aggregate():
    cidr = request.args.get("cidr", "192.168.1.0/24")
    warm = request.args.get("warm", "1") != "0"
    ports_arg = request.args.get("ports", "")
    ports = [7125, 80, 4408]
    if ports_arg.strip():
        try:
            ports = [int(p.strip()) for p in ports_arg.split(",") if p.strip()]
        except ValueError:
            return jsonify({"error": "Invalid ports param. Use e.g. ?ports=7125,80,4408"}), 400

    match_longest = request.args.get("match_longest", "1") != "0"
    max_pages = int(request.args.get("max_pages", "6"))
    page_limit = int(request.args.get("page_limit", "200"))
    stats_pages = int(request.args.get("stats_pages", "12"))

    devices = discover_devices(cidr=cidr, warm=warm, ports=ports)
    u = current_user()
    devices = filter_devices_for_user(devices, u)

    opts = {
        "match_longest": match_longest,
        "max_pages": max_pages,
        "page_limit": page_limit,
        "stats_pages": stats_pages,
    }

    per_printer: List[Dict[str, Any]] = []
    per_lock = threading.Lock()
    threads = []

    def worker(dev: Dict[str, Any]):
        row = aggregate_history_for_device(dev, opts)
        with per_lock:
            per_printer.append(row)

    for d in devices:
        t = threading.Thread(target=worker, args=(d,))
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    # Fleet totals (seconds + mm)
    fleet = {
        "printers_seen": len(devices),
        "printers_ok": sum(1 for r in per_printer if r.get("ok")),
        "total_jobs": 0,
        "total_time": 0.0,
        "total_print_time": 0.0,
        "total_filament_used": 0.0,
        "fleet_longest_job": None,
        "fleet_longest_print": None,

        "status_breakdown": {"completed": 0, "cancelled": 0, "error": 0, "other": 0},
        "status_time_hours": {"completed": 0.0, "cancelled": 0.0, "error": 0.0, "other": 0.0},
        "by_period": [],
        "last_print_finished": None,
    }

    best_job = {"seconds": 0.0, "printer": None, "job": None}
    best_print = {"seconds": 0.0, "printer": None, "job": None}

    fleet_by_month: Dict[str, float] = {}
    fleet_last_end_ts: float = 0.0

    for r in per_printer:
        jt = r.get("job_totals") or {}
        try:
            fleet["total_jobs"] += int(jt.get("total_jobs") or 0)
            fleet["total_time"] += float(jt.get("total_time") or 0.0)
            fleet["total_print_time"] += float(jt.get("total_print_time") or 0.0)
            fleet["total_filament_used"] += float(jt.get("total_filament_used") or 0.0)
        except Exception:
            pass

        sb = r.get("status_breakdown") or {}
        sth = r.get("status_time_hours") or {}
        for k in ("completed", "cancelled", "error", "other"):
            try:
                fleet["status_breakdown"][k] = int(fleet["status_breakdown"].get(k, 0)) + int(sb.get(k, 0))
            except Exception:
                pass
            try:
                fleet["status_time_hours"][k] = float(fleet["status_time_hours"].get(k, 0.0)) + float(sth.get(k, 0.0))
            except Exception:
                pass

        periods = r.get("by_period") or []
        for p in periods:
            try:
                lbl = str(p.get("label") or "").strip()
                hrs = float(p.get("hours") or 0.0)
                if lbl:
                    fleet_by_month[lbl] = float(fleet_by_month.get(lbl, 0.0)) + hrs
            except Exception:
                continue

        lpf = r.get("last_print_finished")
        if lpf:
            try:
                ts = datetime.fromisoformat(lpf).timestamp()
                if ts > fleet_last_end_ts:
                    fleet_last_end_ts = ts
            except Exception:
                pass

        try:
            lj_s = float(jt.get("longest_job") or 0.0)
            if lj_s > best_job["seconds"]:
                best_job = {
                    "seconds": lj_s,
                    "printer": r.get("hostname") or r.get("ip"),
                    "job": r.get("longest_job"),
                }
        except Exception:
            pass

        try:
            lp_s = float(jt.get("longest_print") or 0.0)
            if lp_s > best_print["seconds"]:
                best_print = {
                    "seconds": lp_s,
                    "printer": r.get("hostname") or r.get("ip"),
                    "job": r.get("longest_print"),
                }
        except Exception:
            pass

    if best_job["printer"]:
        fleet["fleet_longest_job"] = best_job
    if best_print["printer"]:
        fleet["fleet_longest_print"] = best_print

    def _month_sort_key(label: str) -> float:
        try:
            return datetime.strptime(label, "%b %Y").timestamp()
        except Exception:
            return 0.0

    fleet_periods = [{"label": k, "hours": float(v)} for k, v in fleet_by_month.items()]
    fleet_periods.sort(key=lambda x: _month_sort_key(x["label"]))
    fleet["by_period"] = fleet_periods

    if fleet_last_end_ts > 0:
        fleet["last_print_finished"] = datetime.fromtimestamp(fleet_last_end_ts).isoformat()

    def sort_key(x: Dict[str, Any]) -> float:
        jt2 = x.get("job_totals") or {}
        try:
            return float(jt2.get("total_print_time") or 0.0)
        except Exception:
            return 0.0

    per_printer_sorted = sorted(per_printer, key=sort_key, reverse=True)

    return jsonify({
        "fleet": fleet,
        "by_printer": per_printer_sorted,
    })


def pick_port(host="0.0.0.0", preferred=5000):
    for p in [preferred, 5050, 8000, 8080, 0]:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            s.bind((host, p))
            return s.getsockname()[1]
        except OSError:
            continue
        finally:
            s.close()
    return preferred


@app.route("/__debug")
def __debug():
    return jsonify({
        "file": __file__,
        "cwd": os.getcwd(),
        "static_folder": app.static_folder,
        "index_exists": os.path.isfile(os.path.join(app.static_folder, "index.html")),
    })


@app.route("/__ping")
def __ping():
    return "pong-from-this-app.py", 200


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    # Never let SPA fallback swallow API routes
    if path.startswith("api/"):
        abort(404)

    static_dir = app.static_folder  # backend/static

    # If it's a real file (assets, images, etc.), serve it
    full_path = os.path.join(static_dir, path)
    if path and os.path.isfile(full_path):
        return send_from_directory(static_dir, path)

    # Otherwise serve the SPA shell
    return send_from_directory(static_dir, "index.html")


if __name__ == "__main__":
    host = "0.0.0.0"
    port = pick_port(host)
    app.run(host=host, port=port, debug=False)
