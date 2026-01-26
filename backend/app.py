# app.py — Windows-friendly Helm discovery (no Scapy L2 ARP sweep)
#
# Key changes vs your original:
# - Stops relying on scapy.srp() ARP broadcast (flaky on some Windows setups)
# - Uses Windows neighbor table (arp -a), optionally warmed by a quick ping sweep
# - Probes common Moonraker ports (7125, 80, 4408) and picks the one that answers /printer/info
# - Adds base_url so the frontend can use the right port, and fixes thumbnail_url to include base_url
# - NEW: /api/history/aggregate to compute fleet print-history totals across all discovered printers
#
# Run:
#   python app.py
#
# Endpoints:
#   GET  /api/devices   (or /devices)
#   POST /api/history/aggregate

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import requests
import threading
import logging
import subprocess
import re
import socket
import ipaddress
from typing import List, Tuple, Optional
from collections import defaultdict
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

# For thread-safe append to the device list
device_list_lock = threading.Lock()

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
            # Must be JSON and have expected structure
            j = r.json()
            if isinstance(j, dict) and "result" in j:
                return base
        except requests.RequestException:
            continue
        except ValueError:
            # Not JSON
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
                "base_url": base,  # tells frontend which port was used
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


# ---------------------------
# NEW: Fleet history aggregation
# ---------------------------

def _safe_get_json(url: str, timeout: float = 4.0) -> dict:
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    return r.json()


def _month_label_from_unix(ts: float) -> str:
    dt = datetime.fromtimestamp(ts)
    return dt.strftime("%Y-%m")


def _bucket_status(st: Optional[str]) -> str:
    """
    Map Moonraker job statuses to our buckets.
    """
    s = (st or "").strip().lower()
    if s == "completed":
        return "completed"
    if s in ("cancelled", "interrupted") or s.startswith("klippy_"):
        return "cancelled"
    if s == "error":
        return "error"
    return "other"


@app.route("/api/history/aggregate", methods=["POST"])
def aggregate_history():
    """
    Aggregate Moonraker history across multiple printers.

    Expects JSON body:
      {
        "printers": [ { "hostname": "...", "ip": "...", "base_url": "http://x.x.x.x:7125" }, ... ],
        "per_printer_limit": 800
      }

    Returns:
      {
        "summary": {...},
        "by_period": [ { "label": "YYYY-MM", "hours": 12.3 }, ... ]
      }
    """
    payload = request.get_json(silent=True) or {}
    printers = payload.get("printers") or []
    per_printer_limit = int(payload.get("per_printer_limit") or 800)

    total_jobs = 0
    total_time_s = 0.0
    total_print_time_s = 0.0
    total_filament_mm = 0.0

    status_counts = defaultdict(int)
    status_time_s = defaultdict(float)
    by_month_print_s = defaultdict(float)

    longest_print_s = 0.0
    longest_print_name = None
    last_finished_end_time = None  # unix seconds

    errors: List[str] = []

    for p in printers:
        base = (p.get("base_url") or "").rstrip("/")
        host = p.get("hostname") or p.get("ip") or base
        if not base.startswith("http"):
            continue

        # 1) totals (fast)
        try:
            totals = _safe_get_json(f"{base}/server/history/totals", timeout=3.0)
            jt = totals.get("result", {}).get("job_totals") or totals.get("job_totals") or {}

            total_jobs += int(jt.get("total_jobs") or 0)
            total_time_s += float(jt.get("total_time") or 0.0)
            total_print_time_s += float(jt.get("total_print_time") or 0.0)
            total_filament_mm += float(jt.get("total_filament_used") or 0.0)

            lp = float(jt.get("longest_print") or 0.0)
            if lp > longest_print_s:
                longest_print_s = lp
                # filename comes from list below (more useful)
        except Exception as e:
            errors.append(f"{host}: totals failed ({e})")

        # 2) list (compute breakdown + month buckets + longest filename)
        start = 0
        remaining = per_printer_limit
        best_local_longest = (0.0, None)  # (seconds, filename)

        while remaining > 0:
            lim = min(200, remaining)
            url = f"{base}/server/history/list?limit={lim}&start={start}&order=desc"
            try:
                data = _safe_get_json(url, timeout=4.0)
                jobs = data.get("result", {}).get("jobs") or data.get("jobs") or []
                if not jobs:
                    break

                for j in jobs:
                    bucket = _bucket_status(j.get("status"))
                    status_counts[bucket] += 1

                    pd = float(j.get("print_duration") or 0.0)  # seconds
                    status_time_s[bucket] += pd

                    et = j.get("end_time")
                    if et is not None:
                        try:
                            etf = float(et)
                            by_month_print_s[_month_label_from_unix(etf)] += pd
                            if last_finished_end_time is None or etf > last_finished_end_time:
                                last_finished_end_time = etf
                        except Exception:
                            pass

                    if pd > best_local_longest[0]:
                        best_local_longest = (pd, j.get("filename"))

                got = len(jobs)
                start += got
                remaining -= got
                if got < lim:
                    break
            except Exception as e:
                errors.append(f"{host}: list failed ({e})")
                break

        # update global longest name if this printer had the longest
        if best_local_longest[0] > 0 and best_local_longest[0] >= longest_print_s:
            longest_print_s = best_local_longest[0]
            longest_print_name = best_local_longest[1]

    by_period = [
        {"label": k, "hours": round(v / 3600.0, 3)}
        for k, v in sorted(by_month_print_s.items())
    ]

    summary = {
        "total_prints": int(total_jobs),
        "total_print_time_hours": (total_print_time_s / 3600.0) if total_print_time_s else 0.0,
        "avg_print_time_hours": ((total_print_time_s / max(total_jobs, 1)) / 3600.0) if total_jobs else 0.0,
        "longest_print_hours": (longest_print_s / 3600.0) if longest_print_s else 0.0,
        "longest_print_name": longest_print_name or "",
        "last_print_finished": datetime.fromtimestamp(last_finished_end_time).isoformat() if last_finished_end_time else None,
        "total_filament_m": (total_filament_mm / 1000.0) if total_filament_mm else 0.0,
        "status_breakdown": dict(status_counts),
        "status_time_hours": {k: (v / 3600.0) for k, v in status_time_s.items()},
        "errors": errors,
    }

    return jsonify({"summary": summary, "by_period": by_period})


# ---------------------------
# Routes
# ---------------------------

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    static_dir = app.static_folder  # backend/static
    if path:
        full_path = os.path.join(static_dir, path)
        if os.path.isfile(full_path):
            return send_from_directory(static_dir, path)
    return send_from_directory(static_dir, "index.html")


@app.route("/api/devices", methods=["GET"])
def get_devices_api():
    return get_devices()


@app.route("/devices", methods=["GET"])
def get_devices():
    # Defaults
    cidr = request.args.get("cidr", "192.168.1.0/24")
    warm = request.args.get("warm", "1") != "0"
    ports_arg = request.args.get("ports", "")
    ports = [7125, 80, 4408]

    if ports_arg.strip():
        try:
            ports = [int(p.strip()) for p in ports_arg.split(",") if p.strip()]
        except ValueError:
            return jsonify({"error": "Invalid ports param. Use e.g. ?ports=7125,80,4408"}), 400

    my_ip = get_my_ipv4()
    logger.info("My IP: %s", my_ip)
    logger.info("Using CIDR: %s", cidr)
    logger.info("Probe ports: %s", ports)

    # Warm neighbor cache so arp -a has more entries (helps a lot on Windows)
    if warm:
        logger.info("Warming neighbor table (ping sweep)...")
        warm_neighbor_table(cidr, limit=None)

    arp_entries = parse_arp_a()
    logger.info("arp -a entries: %d", len(arp_entries))

    devices_list = []
    processed_hostnames = set()
    threads = []

    for ip, mac in arp_entries:
        if ip == my_ip:
            continue
        t = threading.Thread(
            target=probe_and_collect,
            args=(ip, mac, ports, devices_list, processed_hostnames),
            daemon=True
        )
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    logger.info("Printers found: %d", len(devices_list))
    return jsonify(devices_list)


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


if __name__ == "__main__":
    host = "0.0.0.0"
    port = pick_port(host)
    app.run(host=host, port=port, debug=False)
