
from datetime import datetime, timezone


class SystemMonitoringAgent:
    """Lightweight rule-based agent for system health analysis."""

    def __init__(self, cpu_limit=80, ram_limit=80, disk_limit=90):
        self.cpu_limit = cpu_limit
        self.ram_limit = ram_limit
        self.disk_limit = disk_limit

    def analyze(self, metrics, processes=None):
        findings = []

        cpu = metrics["cpu"]["usage_percent"]
        ram = metrics["memory"]["usage_percent"]

        # Analyze CPU usage
        if cpu >= self.cpu_limit:
            top_cpu_processes = [
                {
                    "pid": process["pid"],
                    "name": process["name"],
                    "cpu_percent": process["cpu_percent"],
                }
                for process in (processes or {}).get("top_cpu", [])
                if process["name"] != "System Idle Process"
            ][:3]

            findings.append({
                "severity": "warning",
                "metric": "CPU",
                "value_percent": cpu,
                "finding": "CPU usage is above the configured threshold.",
                "recommendation": (
                    "Inspect CPU-consuming processes and check "
                    "whether high usage persists."
                ),
                "top_cpu_processes": top_cpu_processes,
            })

        # Analyze RAM usage
        if ram >= self.ram_limit:
            top_memory_processes = [
                {
                    "pid": process["pid"],
                    "name": process["name"],
                    "memory_percent": process["memory_percent"],
                }
                for process in (processes or {}).get("top_memory", [])[:3]
            ]

            findings.append({
                "severity": "warning",
                "metric": "RAM",
                "value_percent": ram,
                "finding": "Memory usage is above the configured threshold.",
                "recommendation": (
                    "Inspect memory-heavy processes and close "
                    "unneeded applications if appropriate."
                ),
                "top_memory_processes": top_memory_processes,
            })

        # Analyze disk usage
        for disk in metrics["disks"]:
            if disk["used_percent"] >= self.disk_limit:
                findings.append({
                    "severity": "warning",
                    "metric": f"Disk {disk['device']}",
                    "value_percent": disk["used_percent"],
                    "finding": "Disk usage is above the configured threshold.",
                    "recommendation": (
                        "Review disk usage and remove only files "
                        "you no longer need."
                    ),
                })

        # Return the complete analysis
        return {
            "agent": "SystemMonitoringAgent",
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "system_status": "warning" if findings else "healthy",
            "findings_count": len(findings),
            "findings": findings,
        }
