import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import IncidentMap from "./IncidentMap";
import IncidentTable from "./IncidentTable";
import Stats from "./Stats";

const POLL_INTERVAL_MS = 8000;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [stats, setStats] = useState(null);
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      const [incidentsRes, statsRes, teamsRes] = await Promise.all([
        apiClient.get("/api/incidents"),
        apiClient.get("/api/incidents/stats"),
        apiClient.get("/api/incidents/teams"),
      ]);
      setIncidents(incidentsRes.data);
      setStats(statsRes.data);
      setTeams(teamsRes.data.teams);
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load dashboard data");
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const [wiping, setWiping] = useState(false);

  const handleAssign = async (incidentId, team) => {
    await apiClient.patch(`/api/incidents/${incidentId}/assign`, { assigned_team: team });
    refresh();
  };

  const handleStatusChange = async (incidentId, status) => {
    await apiClient.patch(`/api/incidents/${incidentId}/status`, { status });
    refresh();
  };

  const handleWipe = async () => {
    if (!window.confirm("Wipe all mock reports and incidents from the command database?")) return;
    setWiping(true);
    try {
      await apiClient.delete("/api/incidents/wipe");
      setSelectedIncident(null);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to wipe incidents");
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="mx-auto max-w-page px-6 pb-20 sm:px-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif tracking-tight text-ink">Emergency Command Dashboard</h1>
          <p className="mt-1 text-xs text-graphite">
            Live operational view of reported disaster incidents, automated AI severity triage, and squad dispatches.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-graphite">
          <Button
            variant="ghost"
            onClick={handleWipe}
            disabled={wiping}
            className="text-xs py-1.5 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            {wiping ? "Wiping..." : "🗑️ Wipe Mock Data"}
          </Button>
          <span className="hidden sm:inline font-mono text-xs text-graphite">{user?.email}</span>
          <Button variant="ghost" onClick={logout} className="text-xs py-1.5 px-3">
            Log out
          </Button>
        </div>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <div className="mb-6">
        <Stats stats={stats} />
      </div>

      <div className="mb-6 overflow-hidden rounded-3xl border border-ink/[0.06] shadow-sm">
        <IncidentMap
          incidents={incidents}
          selectedIncident={selectedIncident}
          onSelectIncident={setSelectedIncident}
        />
      </div>

      <IncidentTable
        incidents={incidents}
        teams={teams}
        selectedIncident={selectedIncident}
        onSelectIncident={setSelectedIncident}
        onAssign={handleAssign}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
