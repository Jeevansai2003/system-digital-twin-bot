# System Digital Twin Bot

A real-time system monitoring dashboard built using Python, FastAPI, psutil, Next.js, React, and TypeScript. The project collects actual system resource measurements, displays them on a web dashboard, and uses a rule-based monitoring agent to identify resource usage that exceeds configured thresholds.

## Features

- Real-time CPU utilization monitoring
- RAM usage and utilization monitoring
- Disk usage monitoring
- Running process information and top CPU/memory-consuming processes
- Configurable thresholds and system health alerts
- Rule-based monitoring agent with findings and recommendations
- Automatically refreshing dashboard
- REST API for metrics, processes, configuration, and agent analysis

## Technology Stack

| Technology | Purpose |
|---|---|
| Python | System monitoring and agent logic |
| psutil | Reads actual system resource and process information |
| FastAPI | Backend REST API |
| Uvicorn | Runs the backend server |
| Next.js | Frontend framework |
| React | Dashboard UI |
| TypeScript | Frontend types and logic |
| JSON | Monitoring configuration |

## Architecture

```text
Local Computer
      |
      v
Python + psutil
      |
      v
FastAPI Backend (Port 8000)
      |
      +---- /metrics
      +---- /processes
      +---- /config
      +---- /agent/analyze
      |
      v
Next.js Frontend (Port 3000)
      |
      v
System Monitoring Dashboard
```

The backend reads measurements from the computer running the Python application. The frontend periodically requests these measurements and displays them.

## How Real-Time Data Works

### CPU

The backend uses `psutil` to measure CPU utilization over a sampling interval.

### RAM

The backend reads actual system memory statistics, including used memory and utilization percentage.

### Disk

The backend reads disk usage for available mounted volumes.

### Processes

The backend collects running process information, including process IDs, names, CPU usage, and memory usage. It returns the top processes by CPU and memory usage.

Process CPU percentages depend on sampling and may vary between readings.

### Monitoring Agent

The `SystemMonitoringAgent` evaluates current measurements against configurable CPU, RAM, and disk thresholds. When a threshold is reached or exceeded, it returns a finding and recommendation. It may also include relevant high-usage processes.

**Current implementation:** The monitoring agent is rule-based. It is not yet a generative AI model and does not automatically terminate processes or modify the computer.

## Dashboard Refresh Intervals

The current frontend requests updates at these intervals:

| Data | Refresh interval |
|---|---|
| CPU, RAM, and disk metrics | 5 seconds |
| Process information | 10 seconds |
| Agent analysis | 10 seconds |

These are frontend polling intervals, not a guarantee that every measurement is instantaneous.

## Requirements

Install:

- Python 3.12 or a compatible Python 3 version
- Node.js and npm
- Git
- A modern web browser

The project was developed locally on Windows.

## Project Structure

```text
system-digital-twin-bot/
├── backend/
│   ├── main.py
│   ├── agent.py
│   ├── config.json
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   └── page.tsx
│   ├── package.json
│   └── ...
├── .gitignore
└── README.md
```

The exact files may vary slightly as development continues.

## Setup and Run the Backend

Open PowerShell.

### 1. Navigate to the backend

```powershell
cd "C:\Users\Jeevan sai\system-twin-bot\backend"
```

Adjust the path if you cloned the repository into another directory.

### 2. Create a virtual environment

Run this once:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

If `requirements.txt` exists:

```powershell
python -m pip install -r requirements.txt
```

If it does not exist yet, install the required backend packages:

```powershell
python -m pip install fastapi uvicorn psutil
```

### 4. Start the backend

Run from the `backend` directory:

```powershell
python -m uvicorn main:app --reload
```

The backend runs at:

- API: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs

Keep this terminal running.

## Setup and Run the Frontend

Open a **second PowerShell terminal**.

### 1. Navigate to the frontend

```powershell
cd "C:\Users\Jeevan sai\system-twin-bot\frontend"
```

### 2. Install dependencies

```powershell
npm install
```

### 3. Start Next.js

```powershell
npm run dev
```

Open the dashboard at:

http://localhost:3000

Keep both backend and frontend terminals running.

## Configuration

The backend configuration is stored in `backend/config.json`.

Current example:

```json
{
  "thresholds": {
    "cpu_percent": 80,
    "ram_percent": 80,
    "disk_percent": 90
  },
  "monitoring": {
    "cpu_sample_seconds": 0.5
  }
}
```

- `cpu_percent`: CPU warning threshold.
- `ram_percent`: RAM warning threshold.
- `disk_percent`: Disk warning threshold.
- `cpu_sample_seconds`: Configured CPU sampling interval.

For example, setting `ram_percent` to `75` makes the agent flag RAM usage at 75% or above, provided the backend loads that configuration.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Basic API and device information |
| GET | `/config` | Returns monitoring configuration |
| GET | `/metrics` | Returns current system metrics and alerts |
| GET | `/processes` | Returns process count
