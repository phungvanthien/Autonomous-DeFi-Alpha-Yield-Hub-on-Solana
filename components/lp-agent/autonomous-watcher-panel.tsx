"use client";

import { useState, useEffect } from "react";
import {
  LpWatcherLog,
  LpWatcherState,
  getWatcherLogs,
  getWatcherState,
  saveWatcherState,
  saveWatcherLogs,
  runAutonomousLpScan,
  simulateMarketWaveEvent,
} from "@/lib/lp-background-watcher";
import { ActiveLpPosition } from "@/lib/lp-agent-engine";
import {
  Bot,
  Activity,
  Zap,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Sliders,
  Radio,
  ExternalLink,
} from "lucide-react";

interface AutonomousWatcherPanelProps {
  positions: ActiveLpPosition[];
  ownerAddress?: string;
  onRefreshPositions: () => void;
}

export function AutonomousWatcherPanel({
  positions,
  ownerAddress,
  onRefreshPositions,
}: AutonomousWatcherPanelProps) {
  const [state, setState] = useState<LpWatcherState>(getWatcherState());
  const [logs, setLogs] = useState<LpWatcherLog[]>(getWatcherLogs());
  const [isScanning, setIsScanning] = useState(false);
  const [countdown, setCountdown] = useState<number>(8);
  const [simulatedMsg, setSimulatedMsg] = useState<string | null>(null);

  // Lắng nghe sự kiện thêm log mới
  useEffect(() => {
    const handleLogAdded = () => {
      setLogs(getWatcherLogs());
      setState(getWatcherState());
      onRefreshPositions();
    };

    window.addEventListener("solana_lp_watcher_log_added", handleLogAdded);
    return () => {
      window.removeEventListener("solana_lp_watcher_log_added", handleLogAdded);
    };
  }, [onRefreshPositions]);

  // Bộ hẹn giờ Background Watcher ngầm (mỗi scanIntervalSec giây)
  useEffect(() => {
    if (!state.isEnabled) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Kích hoạt quét
          runAutonomousLpScan(ownerAddress).then((res) => {
            if (res.actionsCount > 0) {
              setLogs(getWatcherLogs());
              setState(getWatcherState());
              onRefreshPositions();
            }
          });
          return state.scanIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.isEnabled, state.scanIntervalSec, ownerAddress, onRefreshPositions]);

  const handleToggleWatcher = () => {
    const updated = { ...state, isEnabled: !state.isEnabled };
    setState(updated);
    saveWatcherState(updated);
  };

  const handleManualScan = async () => {
    setIsScanning(true);
    const res = await runAutonomousLpScan(ownerAddress);
    setLogs(getWatcherLogs());
    setState(getWatcherState());
    onRefreshPositions();
    setIsScanning(false);
  };

  const handleClearLogs = () => {
    saveWatcherLogs([]);
    setLogs([]);
  };

  const handleSimulateWave = (shiftPct: number) => {
    if (positions.length === 0) {
      alert("No active LP positions to simulate. Deploy a position first!");
      return;
    }
    const targetPos = positions[0];
    const res = simulateMarketWaveEvent(targetPos.id, shiftPct);
    setSimulatedMsg(res.message);
    setTimeout(() => setSimulatedMsg(null), 4000);
    // Trigger immediate scan to test bot reflex
    runAutonomousLpScan(ownerAddress).then(() => {
      setLogs(getWatcherLogs());
      setState(getWatcherState());
      onRefreshPositions();
    });
  };

  return (
    <div className="space-y-4">
      {/* Simulation Feedback Alert */}
      {simulatedMsg && (
        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Radio className="size-4 animate-ping" />
            <span className="font-mono">{simulatedMsg}</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-sans">Sub-Wallet reflex triggered</span>
        </div>
      )}

      {/* Watcher Status Banner */}
      <div className="p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                state.isEnabled
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-md shadow-purple-500/10"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
              }`}
            >
              <Bot className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Autonomous Background Worker</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1.5 ${
                    state.isEnabled
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      state.isEnabled ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                    }`}
                  />
                  <span>{state.isEnabled ? "ACTIVE (RUNNING)" : "PAUSED"}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Continuous on-chain sentinel for Meteora & FluxBeam bins: auto-rebalances and executes stop-loss exits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleWatcher}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                state.isEnabled
                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              }`}
            >
              {state.isEnabled ? (
                <>
                  <Pause className="size-3.5" />
                  <span>Pause Sentinel</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  <span>Resume Sentinel</span>
                </>
              )}
            </button>

            <button
              onClick={handleManualScan}
              disabled={isScanning}
              className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`size-3.5 ${isScanning ? "animate-spin" : ""}`} />
              <span>Scan Now</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-0.5">
            <span className="text-zinc-500 text-[10px] block font-sans">Next Scan Tick</span>
            <span className="text-white font-bold text-sm">
              {state.isEnabled ? `${countdown}s` : "Paused"}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-0.5">
            <span className="text-zinc-500 text-[10px] block font-sans">Auto-Rebalances</span>
            <span className="text-purple-300 font-bold text-sm">
              {state.totalRebalances} ops
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-0.5">
            <span className="text-zinc-500 text-[10px] block font-sans">Auto-Compounds</span>
            <span className="text-emerald-400 font-bold text-sm">
              {state.totalCompounds} ops
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-0.5">
            <span className="text-zinc-500 text-[10px] block font-sans">Panic Exits</span>
            <span className="text-red-400 font-bold text-sm">
              {state.totalEmergencyExits} ops
            </span>
          </div>
        </div>

        {/* Simulation Action Bar */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/40 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
              <Zap className="size-3.5 text-amber-400" />
              <span>Sub-Wallet Behavioral Simulator:</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Simulates shock on active position</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleSimulateWave(16)}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              +16% Surge (Test Rebalance)
            </button>
            <button
              onClick={() => handleSimulateWave(-22)}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              -22% Flash Dump (Test Guard)
            </button>
            <button
              onClick={() => handleSimulateWave(2)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              Accrue Fees &gt; 0.05 SOL (Test Compound)
            </button>
          </div>
        </div>
      </div>

      {/* Autonomous Execution Logs Table */}
      <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 overflow-hidden shadow-xl space-y-0">
        <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-purple-400" />
            <h4 className="font-bold text-white text-xs">
              Autonomous Execution Logs
            </h4>
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
              {logs.length} entries
            </span>
          </div>

          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="text-zinc-500 hover:text-red-400 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="size-3" />
              <span>Clear Logs</span>
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/60 text-xs">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No autonomous sentinel events recorded yet.
            </div>
          ) : (
            logs.map((log) => {
              const isRebal = log.actionType === "AUTO_REBALANCE";
              const isCompound = log.actionType === "AUTO_COMPOUND";
              const isPanic = log.actionType === "EMERGENCY_PANIC_EXIT";

              return (
                <div
                  key={log.id}
                  className="p-3.5 hover:bg-zinc-800/20 transition-colors flex items-start justify-between gap-3 font-mono"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isRebal
                            ? "bg-purple-500/10 text-purple-300 border border-purple-500/30"
                            : isCompound
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : isPanic
                            ? "bg-red-500/10 text-red-400 border border-red-500/30 font-bold"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {log.actionType}
                      </span>
                      <span className="font-bold text-white text-xs">
                        {log.tokenPair}
                      </span>
                      <span className="text-zinc-500 text-[10px]">
                        ({log.dex})
                      </span>
                      <span className="text-zinc-600 text-[10px]">
                        Sig: {log.signature.slice(0, 12)}...
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                      {log.details}
                    </p>
                  </div>

                  <span className="text-[10px] text-zinc-500 whitespace-nowrap pt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString("en-US")}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
