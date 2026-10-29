
"use client";

import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

type ProcessInfo = {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_percent: number;
  status: string;
};

type ProcessResponse = {
  count: number;
  top_cpu: ProcessInfo[];
  top_memory: ProcessInfo[];
};

type Metrics = {
  device: string;
  platform: string;
  timestamp: string;
  cpu: {
    usage_percent: number;
    logical_cores: number;
  };
  memory: {
    usage_percent: number;
    used_gb: number;
    available_gb: number;
    total_gb: number;
  };
  disks: {
    device: string;
    mountpoint?: string;
    used_percent: number;
    free_gb: number;
    total_gb: number;
  }[];
  status: string;
  alerts: {
    metric: string;
    message: string;
  }[];
};

type AgentFinding = {
  severity: string;
  metric: string;
  value_percent: number;
  finding: string;
  recommendation: string;
  top_memory_processes?: {
    pid: number;
    name: string;
    memory_percent: number;
  }[];
  top_cpu_processes?: {
    pid: number;
    name: string;
    cpu_percent: number;
  }[];
};

type AgentResponse = {
  agent: string;
  analyzed_at: string;
  system_status: string;
  findings_count: number;
  findings: AgentFinding[];
};

export default function Home() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [processes, setProcesses] = useState<ProcessResponse | null>(null);
  const [agentData, setAgentData] = useState<AgentResponse | null>(null);
  const [error, setError] = useState("");
  const [agentError, setAgentError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchMetrics() {
      try {
        const response = await fetch(`${API_URL}/metrics`);

        if (!response.ok) {
          throw new Error("Backend returned an error");
        }

        const data: Metrics = await response.json();

        if (active) {
          setMetrics(data);
          setError("");
        }
      } catch {
        if (active) {
          setError("Cannot connect to backend. Check that FastAPI is running.");
        }
      }
    }

    async function fetchProcesses() {
      try {
        const response = await fetch(`${API_URL}/processes`);

        if (!response.ok) {
          throw new Error("Failed to fetch processes");
        }

        const data: ProcessResponse = await response.json();

        if (active) {
          setProcesses(data);
        }
      } catch (error) {
        console.error("Process monitoring error:", error);
      }
    }

    async function fetchAgentAnalysis() {
      try {
        const response = await fetch(`${API_URL}/agent/analyze`);

        if (!response.ok) {
          throw new Error("Agent analysis request failed");
        }

        const data: AgentResponse = await response.json();

        if (active) {
          setAgentData(data);
          setAgentError("");
        }
      } catch (error) {
        if (active) {
          setAgentError("Agent analysis is temporarily unavailable.");
        }
        console.error("Agent analysis error:", error);
      }
    }

    fetchMetrics();
    fetchProcesses();
    fetchAgentAnalysis();

    const metricsTimer = setInterval(fetchMetrics, 5000);
    const processTimer = setInterval(fetchProcesses, 10000);
    const agentTimer = setInterval(fetchAgentAnalysis, 10000);

    return () => {
      active = false;
      clearInterval(metricsTimer);
      clearInterval(processTimer);
      clearInterval(agentTimer);
    };
  }, []);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <h1 className="text-3xl font-bold">System Digital Twin</h1>
        <p className="mt-4 text-red-400">{error}</p>
      </main>
    );
  }

  if (!metrics) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Loading real system metrics...
      </main>
    );
  }

  const cards = [
    {
      title: "CPU Usage",
      value: metrics.cpu.usage_percent,
      detail: `${metrics.cpu.logical_cores} logical cores`,
    },
    {
      title: "Memory Usage",
      value: metrics.memory.usage_percent,
      detail: `${metrics.memory.used_gb} GB used of ${metrics.memory.total_gb} GB`,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-cyan-400">SYSTEM MONITORING</p>
            <h1 className="mt-2 text-3xl font-bold">
              System Digital Twin
            </h1>
            <p className="mt-2 text-slate-400">
              Device: {metrics.device}
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 px-4 py-3">
            <p className="text-sm text-slate-400">System status</p>
            <p
              className={`mt-1 font-semibold ${
                metrics.status === "healthy"
                  ? "text-green-400"
                  : "text-amber-400"
              }`}
            >
              {metrics.status.toUpperCase()}
            </p>
          </div>
        </header>

        <p className="mb-4 text-sm text-slate-400">
          Live readings · Metrics refresh every 5 seconds
        </p>

        {/* CPU and Memory Cards */}
        <section className="grid gap-5 md:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <p className="text-slate-400">{card.title}</p>

              <p className="my-4 text-4xl font-bold">
                {card.value.toFixed(1)}%
              </p>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full ${
                    card.value >= 80 ? "bg-red-500" : "bg-cyan-400"
                  }`}
                  style={{
                    width: `${Math.min(card.value, 100)}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-sm text-slate-400">
                {card.detail}
              </p>
            </div>
          ))}
        </section>

        {/* Disk Usage */}
        <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Disk Usage</h2>

          <div className="mt-4 space-y-5">
            {metrics.disks.map((disk) => (
              <div key={disk.mountpoint ?? disk.device}>
                <div className="mb-2 flex justify-between gap-4 text-sm">
                  <span>{disk.device}</span>
                  <span>{disk.used_percent.toFixed(1)}% used</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      disk.used_percent >= 90
                        ? "bg-red-500"
                        : "bg-cyan-400"
                    }`}
                    style={{
                      width: `${Math.min(disk.used_percent, 100)}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-sm text-slate-400">
                  {disk.free_gb} GB free of {disk.total_gb} GB
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* System Alerts */}
        <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">System Alerts</h2>

          {metrics.alerts.length === 0 ? (
            <p className="mt-3 text-green-400">
              No threshold alerts. System is healthy.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {metrics.alerts.map((alert, index) => (
                <li
                  key={`${alert.metric}-${index}`}
                  className="rounded-lg border border-amber-900 bg-amber-950/40 p-4"
                >
                  <p className="font-semibold text-amber-300">
                    {alert.metric} Alert
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {alert.message}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Monitoring Agent Analysis */}
        <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-cyan-400">RULE-BASED AGENT</p>
              <h2 className="mt-1 text-xl font-semibold">
                Agent Analysis
              </h2>
            </div>

            {agentData && (
              <span
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                  agentData.system_status === "healthy"
                    ? "border-green-800 bg-green-950/40 text-green-400"
                    : "border-amber-800 bg-amber-950/40 text-amber-300"
                }`}
              >
                {agentData.system_status.toUpperCase()}
              </span>
            )}
          </div>

          {agentError ? (
            <p className="mt-4 text-red-400">{agentError}</p>
          ) : !agentData ? (
            <p className="mt-4 text-slate-400">
              Analyzing system health...
            </p>
          ) : (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 p-4">
                  <p className="text-sm text-slate-400">Findings detected</p>
                  <p className="mt-2 text-3xl font-bold">
                    {agentData.findings_count}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 p-4">
                  <p className="text-sm text-slate-400">Last analysis</p>
                  <p className="mt-2 text-sm">
                    {new Date(agentData.analyzed_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {agentData.findings_count === 0 ? (
                <div className="mt-4 rounded-xl border border-green-900 bg-green-950/30 p-4">
                  <p className="font-semibold text-green-400">
                    No threshold warnings detected
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    All monitored metrics are below the agent&apos;s
                    configured warning thresholds.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {agentData.findings.map((finding, index) => (
                    <article
                      key={`${finding.metric}-${index}`}
                      className="rounded-xl border border-amber-900 bg-amber-950/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-amber-300">
                          {finding.metric} Warning
                        </h3>
                        <span className="text-lg font-bold text-amber-300">
                          {finding.value_percent.toFixed(1)}%
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-200">
                        {finding.finding}
                      </p>

                      <div className="mt-3 rounded-lg bg-slate-950/70 p-3">
                        <p className="text-sm font-semibold text-cyan-300">
                          Recommended action
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {finding.recommendation}
                        </p>
                      </div>

                      {finding.top_memory_processes &&
                        finding.top_memory_processes.length > 0 && (
                          <div className="mt-4">
                            <h4 className="mb-2 text-sm font-semibold">
                              Top memory-consuming processes
                            </h4>

                            <div className="space-y-2">
                              {finding.top_memory_processes.map((process) => (
                                <div
                                  key={process.pid}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 p-3 text-sm"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {process.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      PID: {process.pid}
                                    </p>
                                  </div>
                                  <span className="text-cyan-300">
                                    {process.memory_percent.toFixed(2)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {finding.top_cpu_processes &&
                        finding.top_cpu_processes.length > 0 && (
                          <div className="mt-4">
                            <h4 className="mb-2 text-sm font-semibold">
                              Top CPU-consuming processes
                            </h4>

                            <div className="space-y-2">
                              {finding.top_cpu_processes.map((process) => (
                                <div
                                  key={process.pid}
                                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 p-3 text-sm"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {process.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      PID: {process.pid}
                                    </p>
                                  </div>
                                  <span className="text-cyan-300">
                                    {process.cpu_percent.toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </article>
                  ))}
                </div>
              )}

              <p className="mt-4 text-xs text-slate-500">
                Agent analysis refreshes every 10 seconds. The current agent
                uses configured rules and real system metrics; it does not
                automatically stop processes.
              </p>
            </>
          )}
        </section>

        {/* Top Processes */}
        <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Top Processes</h2>

            <span className="text-sm text-slate-400">
              {processes
                ? `${processes.count} processes detected`
                : "Loading..."}
            </span>
          </div>

          {!processes ? (
            <p className="mt-4 text-slate-400">Loading process data...</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="py-3 pr-4">Process</th>
                    <th className="py-3 pr-4">PID</th>
                    <th className="py-3 pr-4">CPU %</th>
                    <th className="py-3 pr-4">Memory %</th>
                    <th className="py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {processes.top_cpu
                    .filter((process) => process.pid !== 0)
                    .map((process) => (
                      <tr
                        key={process.pid}
                        className="border-t border-slate-800"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {process.name}
                        </td>
                        <td className="py-3 pr-4 text-slate-400">
                          {process.pid}
                        </td>
                        <td
                          className={`py-3 pr-4 ${
                            process.cpu_percent >= 80
                              ? "text-red-400"
                              : "text-slate-200"
                          }`}
                        >
                          {process.cpu_percent.toFixed(1)}%
                        </td>
                        <td className="py-3 pr-4">
                          {process.memory_percent.toFixed(2)}%
                        </td>
                        <td className="py-3 text-slate-400">
                          {process.status}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">
            Process data refreshes every 10 seconds. CPU readings are sampled
            values and may fluctuate. System Idle Process is excluded.
          </p>
        </section>

        {/* Footer */}
        <footer className="mt-6 text-sm text-slate-500">
          Last updated: {new Date(metrics.timestamp).toLocaleString()}
          <p>Platform: {metrics.platform}</p>
        </footer>
      </div>
    </main>
  );
}
