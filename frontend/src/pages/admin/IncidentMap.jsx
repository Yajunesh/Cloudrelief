import { useEffect } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { severityColor } from "../../components/SeverityBadge";

// Default incidents to a sensible fallback center when there's no data yet.
const DEFAULT_CENTER = [12.9728, 79.1645]; // Centered on Vellore disaster response zone

function FlyToSelected({ selectedIncident }) {
  const map = useMap();

  useEffect(() => {
    if (selectedIncident && selectedIncident.latitude && selectedIncident.longitude) {
      map.flyTo([selectedIncident.latitude, selectedIncident.longitude], 15, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [selectedIncident, map]);

  return null;
}

export default function IncidentMap({ incidents, selectedIncident, onSelectIncident }) {
  const center =
    selectedIncident && selectedIncident.latitude && selectedIncident.longitude
      ? [selectedIncident.latitude, selectedIncident.longitude]
      : incidents.length > 0
      ? [incidents[0].latitude, incidents[0].longitude]
      : DEFAULT_CENTER;

  return (
    <div className="relative">
      {selectedIncident && (
        <div className="absolute top-3 left-14 z-[1000] flex items-center gap-2 rounded-full bg-ink/90 px-3.5 py-1.5 text-xs text-white shadow-lg backdrop-blur-md border border-white/10">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            Targeting: <strong>{selectedIncident.incident_type}</strong> (
            {Number(selectedIncident.latitude).toFixed(4)}°, {Number(selectedIncident.longitude).toFixed(4)}°)
          </span>
          <button
            type="button"
            onClick={() => onSelectIncident?.(null)}
            className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] hover:bg-white/30"
          >
            Clear
          </button>
        </div>
      )}

      <MapContainer center={center} zoom={13} style={{ height: "460px", width: "100%" }}>
        <FlyToSelected selectedIncident={selectedIncident} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {incidents.map((incident) => {
          const isSelected = selectedIncident?.incident_id === incident.incident_id;
          return (
            <CircleMarker
              key={incident.incident_id}
              center={[incident.latitude, incident.longitude]}
              radius={isSelected ? 16 : 10}
              pathOptions={{
                color: isSelected ? "#17191c" : severityColor(incident.severity_score),
                weight: isSelected ? 3 : 2,
                fillColor: severityColor(incident.severity_score),
                fillOpacity: isSelected ? 0.95 : 0.8,
              }}
              eventHandlers={{
                click: () => onSelectIncident?.(incident),
              }}
            >
              <Popup>
                <div className="text-sm p-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold capitalize text-ink">{incident.incident_type}</p>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-mist">
                      {incident.status}
                    </span>
                  </div>
                  <p className="text-xs text-graphite mt-1">{incident.description}</p>
                  <p className="text-xs font-mono text-ink mt-1.5">
                    Severity: <strong>{(incident.severity_score * 100).toFixed(0)}%</strong>
                  </p>
                  <p className="text-[11px] font-mono text-smoke">
                    Coordinates: {incident.latitude}, {incident.longitude}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

// Fixes a common Vite/Leaflet marker icon issue for any default L.marker usage.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
