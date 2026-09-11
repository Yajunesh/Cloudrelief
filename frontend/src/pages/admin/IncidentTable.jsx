import { useMemo, useState } from "react";
import SeverityBadge from "../../components/SeverityBadge";

const STATUS_OPTIONS = ["unassigned", "assigned", "resolved"];

const selectClasses =
  "rounded-full border border-ink/10 bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-ink/40";

export default function IncidentTable({
  incidents,
  teams,
  selectedIncident,
  onSelectIncident,
  onAssign,
  onStatusChange,
}) {
  const [sortBy, setSortBy] = useState("severity");
  const [pendingTeams, setPendingTeams] = useState({});
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [dispatchAlert, setDispatchAlert] = useState(null);

  const handleLockIn = async (incident) => {
    const team = pendingTeams[incident.incident_id];
    if (!team) return;
    await onAssign(incident.incident_id, team);
    setEditingTeamId(null);
    setDispatchAlert({
      team,
      incidentId: incident.incident_id,
      location: `${Number(incident.latitude).toFixed(4)}°, ${Number(incident.longitude).toFixed(4)}°`,
    });
    setTimeout(() => setDispatchAlert(null), 7000);
  };

  const sorted = useMemo(() => {
    const copy = [...incidents];
    if (sortBy === "severity") copy.sort((a, b) => b.severity_score - a.severity_score);
    if (sortBy === "status") copy.sort((a, b) => a.status.localeCompare(b.status));
    if (sortBy === "time") copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return copy;
  }, [incidents, sortBy]);

  return (
    <div className="overflow-hidden rounded-3xl border border-ink/[0.06] bg-paper shadow-sm">
      {/* Real-Time Citizen Dispatch Banner */}
      {dispatchAlert && (
        <div className="flex items-center gap-3 bg-emerald-600 px-5 py-3 text-xs font-medium text-white transition-all">
          <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-ping" />
          <div className="flex-1">
            <strong>RESCUE TEAM LOCKED IN:</strong> Squad <u>{dispatchAlert.team}</u> deployed to {dispatchAlert.location}.
            Notification alert has been broadcast to all registered citizens!
          </div>
          <button
            type="button"
            onClick={() => setDispatchAlert(null)}
            className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] hover:bg-black/30"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.06] px-5 py-4">
        <div>
          <h2 className="font-serif text-lg text-ink">Incident Triage Queue</h2>
          <p className="text-xs text-graphite">Click any incident to pinpoint on map. Select squad and click 'Lock in' to dispatch.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs text-graphite">Sort by:</span>
          <select className={selectClasses} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="severity">Highest Severity</option>
            <option value="status">Status</option>
            <option value="time">Most Recent</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-tight text-graphite bg-fog/50">
            <tr>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Description</th>
              <th className="px-5 py-3 font-medium">Coordinates</th>
              <th className="px-5 py-3 font-medium">Severity</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Rescue Squad</th>
              <th className="px-5 py-3 font-medium">Reported</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((incident) => {
              const isSelected = selectedIncident?.incident_id === incident.incident_id;
              const isEditing = editingTeamId === incident.incident_id || !incident.assigned_team;

              return (
                <tr
                  key={incident.incident_id}
                  onClick={() => onSelectIncident?.(incident)}
                  className={`border-t border-ink/[0.06] transition-colors cursor-pointer hover:bg-mist/50 ${
                    isSelected ? "bg-peach/30 border-l-4 border-l-ink" : ""
                  }`}
                >
                  <td className="px-5 py-3 font-medium capitalize text-ink">
                    <div className="flex items-center gap-1.5">
                      {isSelected && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                      {incident.incident_type}
                    </div>
                  </td>
                  <td className="max-w-xs truncate px-5 py-3 text-graphite" title={incident.description}>
                    {incident.description}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs font-mono text-graphite">
                    {Number(incident.latitude).toFixed(4)}°, {Number(incident.longitude).toFixed(4)}°
                  </td>
                  <td className="px-5 py-3">
                    <SeverityBadge score={incident.severity_score} />
                  </td>
                  <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      className={selectClasses}
                      value={incident.status}
                      onChange={(e) => onStatusChange(incident.incident_id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                    {!isEditing && incident.assigned_team ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200">
                          <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          {incident.assigned_team}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTeamId(incident.incident_id);
                            setPendingTeams({ ...pendingTeams, [incident.incident_id]: incident.assigned_team });
                          }}
                          className="text-[11px] text-graphite hover:text-ink underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <select
                          className={selectClasses}
                          value={pendingTeams[incident.incident_id] || incident.assigned_team || ""}
                          onChange={(e) =>
                            setPendingTeams({ ...pendingTeams, [incident.incident_id]: e.target.value })
                          }
                        >
                          <option value="" disabled>
                            Select squad...
                          </option>
                          {teams.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={
                            !pendingTeams[incident.incident_id] ||
                            (incident.assigned_team && pendingTeams[incident.incident_id] === incident.assigned_team)
                          }
                          onClick={() => handleLockIn(incident)}
                          className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-ink/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          🔒 Lock in
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-smoke">
                    {new Date(incident.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectIncident?.(incident)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                          isSelected
                            ? "bg-ink text-white border-ink"
                            : "border-ink/15 text-ink hover:bg-mist"
                        }`}
                      >
                        📍 Map
                      </button>
                      {incident.image_url && (
                        <a
                          href={incident.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-ink/15 px-2.5 py-1 text-xs text-ink hover:bg-mist"
                        >
                          Photo
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
