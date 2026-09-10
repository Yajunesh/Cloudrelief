import { useEffect, useRef, useState } from "react";
import { submitAwsIncident } from "../../api/awsIntake";
import { Button, Card, Field, Input, TextArea } from "../../components/ui";

// Automatically convert non-JPEG photos (PNG, WebP) to high-quality JPEG in browser
async function prepareImageAsJpeg(file) {
  if (!file) return null;
  if (
    file.type === "image/jpeg" ||
    file.name.toLowerCase().endsWith(".jpg") ||
    file.name.toLowerCase().endsWith(".jpeg")
  ) {
    return file;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            resolve(new File([blob], cleanName, { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.92
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function SubmitIncident() {
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please enter coordinates manually.");
      setShowManualCoords(true);
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError("Could not automatically retrieve GPS location. You can enter it manually below.");
        setLocating(false);
        setShowManualCoords(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const jpeg = await prepareImageAsJpeg(file);
      setPhoto(jpeg);
      setError("");
    } catch {
      setPhoto(file);
    }
  };

  const clearPhoto = () => {
    setPhoto(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!latitude || !longitude) {
      setError("Please detect or specify the incident location so responders know where to go.");
      return;
    }

    if (!photo) {
      setError("Please attach a photo of the incident to help responders evaluate severity.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await submitAwsIncident({ latitude, longitude, description, photo });
      setResult(data);

      // Reset all form inputs and location state
      setDescription("");
      setPhoto(null);
      setPhotoPreview(null);
      setLatitude("");
      setLongitude("");
      setShowManualCoords(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const apiMessage = err.response?.data?.detail || err.response?.data?.message;
      setError(apiMessage || err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-8 max-w-xl px-6 pb-16">
      <div className="mb-6">
        <h1 className="text-3xl font-serif tracking-tight text-ink">Report an incident</h1>
        <p className="mt-1 text-sm text-graphite">
          Provide immediate details and a photo so disaster response teams can triage and deploy aid.
        </p>
      </div>

      <Card className="shadow-float">
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Description */}
          <Field label="What is happening?">
            <TextArea
              rows={3}
              placeholder="E.g., Severe waterlogging on Main St, flash flood warning, people stranded..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </Field>

          {/* Location Section */}
          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-tight text-graphite">
              Incident Location
            </label>

            {latitude && longitude ? (
              <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-50/70 p-3.5 text-sm transition-all">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <p className="font-medium text-emerald-950 text-xs sm:text-sm">
                      Location captured
                    </p>
                    <p className="text-[11px] text-emerald-700/90 font-mono">
                      {Number(latitude).toFixed(4)}°, {Number(longitude).toFixed(4)}°
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={locating}
                    className="text-xs font-medium text-emerald-900 underline hover:text-emerald-950"
                  >
                    {locating ? "Locating..." : "Refresh"}
                  </button>
                  <span className="text-emerald-300">|</span>
                  <button
                    type="button"
                    onClick={() => setShowManualCoords(!showManualCoords)}
                    className="text-xs font-medium text-graphite hover:text-ink"
                  >
                    {showManualCoords ? "Hide" : "Edit"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-ink/20 p-4 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={useMyLocation}
                  disabled={locating}
                  className="w-full flex items-center justify-center gap-2 py-2.5"
                >
                  <svg className="h-4 w-4 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {locating ? "Detecting GPS location..." : "Use my current location"}
                </Button>
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowManualCoords(!showManualCoords)}
                    className="text-xs text-graphite hover:text-ink underline"
                  >
                    {showManualCoords ? "Hide coordinates" : "Or enter coordinates manually"}
                  </button>
                </div>
              </div>
            )}

            {/* Collapsible Manual Lat/Long Input for edge cases */}
            {showManualCoords && (
              <div className="pt-2">
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-mist/60 p-3">
                  <div>
                    <label className="text-[11px] font-medium text-graphite">Latitude</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 12.972775"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="mt-1 bg-white text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-graphite">Longitude</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 79.164489"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="mt-1 bg-white text-xs"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Photo Section */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-tight text-graphite mb-1.5">
              Incident Photo
            </label>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            {photoPreview ? (
              <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-fog p-3">
                <img
                  src={photoPreview}
                  alt="Incident preview"
                  className="h-20 w-20 rounded-xl object-cover border border-ink/10"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink truncate">
                    {photo?.name || "photo.jpg"}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    ✓ Photo ready for triage
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-xs py-1 px-3"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change
                    </Button>
                    <Button
                      type="button"
                      variant="quiet"
                      className="text-xs py-1 px-2"
                      onClick={clearPhoto}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex items-center justify-center gap-2 py-3 border-ink/15 hover:bg-mist"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <svg className="h-4 w-4 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Take photo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex items-center justify-center gap-2 py-3 border-ink/15 hover:bg-mist"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg className="h-4 w-4 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload file
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full py-3 text-sm font-semibold tracking-wide"
          >
            {submitting ? "Submitting incident..." : "Submit Incident Report"}
          </Button>
        </form>
      </Card>

      {/* Clean, Reassuring Success Card without AWS jargon */}
      {result && (
        <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-50/80 p-5 shadow-float">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-lg font-semibold text-emerald-950">
                Report Submitted Successfully
              </h3>
              <p className="mt-1 text-sm text-emerald-800 leading-relaxed">
                Your report and photo have been received. AI triage is evaluating the emergency severity, and local response coordinators have been alerted.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg bg-white/80 px-2.5 py-1 font-mono font-medium text-emerald-900 border border-emerald-200/80">
                  Ref: #{result.incidentId?.slice(0, 8)}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active in response queue
                </span>
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="bg-white/90 text-xs py-1.5 px-4 hover:bg-white"
                  onClick={() => setResult(null)}
                >
                  Submit another report
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
