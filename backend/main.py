
import json
import platform
import time
from datetime import datetime
from pathlib import Path

import psutil
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agent import SystemMonitoringAgent


app = FastAPI(title="System Digital Twin Bot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = SystemMonitoringAgent()

CONFIG_PATH = Path(__file__).with_name("config.json")


def load_config():
    """Read current settings from config.json."""
    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as file:
            config = json.load(file)

        thresholds = config["thresholds"]
        monitoring = config["monitoring"]

        for key in ("cpu_percent", "ram_percent", "disk_percent"):
            value = thresholds[key]
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ValueError(f"Invalid threshold: {key}")
            if not 0 <= value <= 100:
                raise ValueError(f"{key} must be between 0 and 100")

        interval = monitoring["cpu_sample_seconds"]
        if isinstance(interval, bool) or not isinstance(interval, (int, float)):
            raise ValueError("CPU sample interval must be numeric")
        if not 0 < interval <= 5:
            raise ValueError("CPU sample interval must be above 0 and at most 5 seconds")

        return config

    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Configuration error in config.json: {exc}",
        ) from exc


@app.get("/")
def home():
    return {
        "message": "System Digital Twin Bot is running",
        "device": platform.node(),
    }


@app.get("/processes")
def get_processes():
    processes = []

    # Prime CPU measurements for each accessible process.
    for proc in psutil.process_iter():
        try:
            proc.cpu_percent(interval=None)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    # Allow a short sampling interval for CPU measurements.
    time.sleep(0.5)

    for proc in psutil.process_iter(
        ["pid", "name", "memory_percent", "status"]
    ):
        try:
            processes.append({
                "pid": proc.info["pid"],
                "name": proc.info["name"] or "Unknown",
                "cpu_percent": proc.cpu_percent(interval=None),
                "memory_percent": round(
                    proc.info["memory_percent"] or 0, 2
                ),
                "status": proc.info["status"],
            })
        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied,
            psutil.ZombieProcess,
        ):
            continue

    return {
        "count": len(processes),
        "top_cpu": sorted(
            processes,
            key=lambda p: p["cpu_percent"],
            reverse=True,
        )[:10],
        "top_memory": sorted(
            processes,
            key=lambda p: p["memory_percent"],
            reverse=True,
        )[:10],
    }



@app.get("/config")
def get_config():
    """Return the current alert thresholds."""
    return load_config()


@app.get("/metrics")
def get_metrics():
    config = load_config()
    limits = config["thresholds"]
    sample_seconds = config["monitoring"]["cpu_sample_seconds"]

    # Read actual CPU and memory measurements.
    cpu_percent = psutil.cpu_percent(interval=sample_seconds)
    memory = psutil.virtual_memory()

    alerts = []

    if cpu_percent >= limits["cpu_percent"]:
        alerts.append({
            "metric": "CPU",
            "value_percent": cpu_percent,
            "limit_percent": limits["cpu_percent"],
            "message": (
                f"CPU usage is {cpu_percent}%, "
                f"above your configured limit of "
                f"{limits['cpu_percent']}%."
            ),
        })

    if memory.percent >= limits["ram_percent"]:
        alerts.append({
            "metric": "RAM",
            "value_percent": memory.percent,
            "limit_percent": limits["ram_percent"],
            "message": (
                f"RAM usage is {memory.percent}%, "
                f"above your configured limit of "
                f"{limits['ram_percent']}%."
            ),
        })

    # Discover mounted disk partitions instead of assuming C:.
    disks = []

    for partition in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(partition.mountpoint)

            disk = {
                "device": partition.device,
                "mountpoint": partition.mountpoint,
                "used_percent": usage.percent,
                "used_gb": round(usage.used / (1024 ** 3), 2),
                "total_gb": round(usage.total / (1024 ** 3), 2),
                "free_gb": round(usage.free / (1024 ** 3), 2),
            }
            disks.append(disk)

            if usage.percent >= limits["disk_percent"]:
                alerts.append({
                    "metric": "Disk",
                    "device": partition.device,
                    "value_percent": usage.percent,
                    "limit_percent": limits["disk_percent"],
                    "message": (
                        f"Disk {partition.device} is "
                        f"{usage.percent}% full."
                    ),
                })

        except (PermissionError, OSError):
            # Some mounted volumes may not be accessible.
            continue

    return {
        "device": platform.node(),
        "platform": platform.platform(),
        "timestamp": datetime.now().astimezone().isoformat(),
        "cpu": {
            "usage_percent": cpu_percent,
            "logical_cores": psutil.cpu_count(logical=True),
        },
        "memory": {
            "usage_percent": memory.percent,
            "used_gb": round(memory.used / (1024 ** 3), 2),
            "available_gb": round(memory.available / (1024 ** 3), 2),
            "total_gb": round(memory.total / (1024 ** 3), 2),
        },
        "disks": disks,
        "status": "warning" if alerts else "healthy",
        "alerts": alerts,
        "thresholds": limits,
    }
@app.get("/agent/analyze")
def analyze_system():
    metrics = get_metrics()
    processes = get_processes()
    return agent.analyze(metrics, processes)