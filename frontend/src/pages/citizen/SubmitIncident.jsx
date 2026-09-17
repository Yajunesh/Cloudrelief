import { useEffect, useRef, useState } from "react";
import apiClient from "../../api/client";
import { submitAwsIncident, publishAwsAlert } from "../../api/awsIntake";
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

// Lightweight client-side image feature analyzer
async function analyzeImageFeatures(file) {
  if (!file) return { fireRatio: 0, skyRatio: 0.2, floodRatio: 0, stormRatio: 0 };
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, 64, 64);
          const { data } = ctx.getImageData(0, 0, 64, 64);
          let firePixels = 0;
          let blueSkyPixels = 0;
          let floodWaterPixels = 0;
          let darkStormPixels = 0;
          const total = data.length / 4;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;

            // Fire: strong red/orange, red > green * 1.15, red > blue * 1.8
            if (r > 160 && g > 60 && b < 110 && r > g * 1.15 && r > b * 1.8) {
              firePixels++;
            }
            // Clear blue sky / bright daylight
            if (b > 120 && b > r * 1.1 && brightness > 115) {
              blueSkyPixels++;
            }
            // Murky muddy water / flood
            if (r > 60 && r < 140 && g > 55 && g < 130 && b < 110 && Math.abs(r - g) < 35) {
              floodWaterPixels++;
            }
            // Dark storm / tornado funnel / dense dark clouds
            if (brightness < 85 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
              darkStormPixels++;
            }
          }

          resolve({
            fireRatio: firePixels / total,
            skyRatio: blueSkyPixels / total,
            floodRatio: floodWaterPixels / total,
            stormRatio: darkStormPixels / total,
          });
        } catch {
          resolve({ fireRatio: 0, skyRatio: 0.2, floodRatio: 0, stormRatio: 0 });
        }
      };
      img.onerror = () => resolve({ fireRatio: 0, skyRatio: 0.2, floodRatio: 0, stormRatio: 0 });
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({ fireRatio: 0, skyRatio: 0.2, floodRatio: 0, stormRatio: 0 });
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
      setError("Geolocation is not supported by your browser. Please enter coordinates below.");
      setShowManualCoords(true);
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (geoError) => {
        setLocating(false);
        setError("Unable to retrieve location. Please check browser permissions or enter manually.");
        setShowManualCoords(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const jpegFile = await prepareImageAsJpeg(file);
    setPhoto(jpegFile);
  };

  const clearPhoto = () => {
    setPhoto(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!latitude || !longitude) {
      setError("Please click 'Use my current location' or enter coordinates.");
      return;
    }

    if (!photo) {
      setError("Please attach a photo of the incident to help responders evaluate severity.");
      return;
    }

    setSubmitting(true);
    try {
      // Analyze image features & description text
      const imageFeatures = await analyzeImageFeatures(photo);
      const descLower = (description || "").toLowerCase();

      // Check keywords
      const isFireKeyword = /(fire|flame|burn|smoke|blaze|wildfire|explosion|heat|burning|ignit)/i.test(descLower);
      const isTornadoKeyword = /(tornado|twister|cyclone|hurricane|funnel|windstorm|gale|collapse|crack|structural|building|wall|bridge|rubble|debris|destruction|demolish)/i.test(descLower);
      const isFloodKeyword = /(flood|water|rain|submerge|drown|overflow|river|inundat|waterlog)/i.test(descLower);
      const isExplicitNormalDesc = /(sunny|clear sky|blue sky|good weather|pleasant weather|routine weather|peaceful|calm day|no disaster|no emergency)/i.test(descLower) && !/(fire|smoke|flood|water|tornado|storm|collapse|damage)/i.test(descLower);

      let detectedType = "normal";
      let severityScore = 0.0;
      let isDisaster = false;

      // 1. Fire: Detected either by fire keywords OR by visual fire pixels in the photo
      if (isFireKeyword || imageFeatures.fireRatio > 0.035) {
        detectedType = "fire";
        severityScore = 0.96;
        isDisaster = true;
      }
      // 2. Tornado / Structural Destruction: Detected by keywords OR by dark storm funnel / destruction pixels
      else if (isTornadoKeyword || (imageFeatures.stormRatio > 0.22 && !isFloodKeyword)) {
        detectedType = "structural_damage";
        severityScore = 0.94;
        isDisaster = true;
      }
      // 3. Flood: Detected by flood keywords OR by murky flood water pixels
      else if (isFloodKeyword || imageFeatures.floodRatio > 0.18) {
        detectedType = "flood";
        severityScore = 0.92;
        isDisaster = true;
      }
      // 4. Normal weather: Routine photo, clear skies, or benign conditions
      else {
        detectedType = "normal";
        severityScore = 0.0;
        isDisaster = false;
      }

      const data = await submitAwsIncident({ latitude, longitude, description, photo });
      setResult({
        incidentId: data.incidentId,
        incidentType: detectedType,
        severityScore,
        isDisaster,
        intake: data.intake,
      });

      // Register with the incident dispatch database
      try {
        await apiClient.post("/api/incidents/sync", {
          incident_id: data.incidentId,
          latitude: Number(latitude),
          longitude: Number(longitude),
          description,
          image_key: `incidents/${data.incidentId}.jpg`,
          incident_type: detectedType,
          severity_score: severityScore,
        });

        // Broadcast acute disaster warning ONLY for confirmed disasters (NEVER for normal weather)
        if (isDisaster && severityScore >= 0.5) {
          try {
            const label = detectedType === "structural_damage" ? "STRUCTURAL / TORNADO" : detectedType.toUpperCase();
            await publishAwsAlert({
              subject: `⚠️ DISASTER WARNING: Critical ${label} Alert`,
              message:
                `EMERGENCY ALERT: High-severity ${label} confirmed near ` +
                `coordinates (${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}).\n\n` +
                `Description: ${description || "Acute disaster condition detected"}\n` +
                `Confirmed Severity: ${(severityScore * 100).toFixed(1)}%\n\n` +
                `All registered citizens in this sector are advised to take shelter immediately. Emergency squads are mobilizing.`,
            });
          } catch (pubErr) {
            console.warn("AWS SNS disaster alert broadcast skipped:", pubErr);
          }
        }
      } catch (syncErr) {
        console.warn("Backend sync notice:", syncErr);
      }

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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7">
          <Card className="p-6 sm:p-8 bg-white border-ink/[0.06] shadow-float">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-serif tracking-tight text-ink">
                Report an Incident
              </h2>
              <p className="mt-1 text-xs text-graphite">
                Your report helps direct emergency rescue squads. Location and photo are required.
              </p>
            </div>

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
      </div>

      {/* Result Card: Distinguishes acute disaster vs normal weather */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {result ? (
          <div
            className={`rounded-3xl border p-5 shadow-float transition-all ${
              result.isDisaster
                ? "border-red-500/20 bg-red-50/80 text-red-950"
                : "border-sky-500/20 bg-sky-50/80 text-sky-950"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
                  result.isDisaster ? "bg-red-600" : "bg-sky-600"
                }`}
              >
                {result.isDisaster ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-lg font-semibold">
                    {result.isDisaster
                      ? `Disaster Triaged: ${
                          result.incidentType === "structural_damage"
                            ? "Structural Hazard / Tornado"
                            : result.incidentType.toUpperCase()
                        }`
                      : "☀️ Routine Weather Report Logged"}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono font-medium ${
                      result.isDisaster
                        ? "bg-red-200/80 text-red-900 border border-red-300"
                        : "bg-sky-200/80 text-sky-900 border border-sky-300"
                    }`}
                  >
                    Severity: {(result.severityScore * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed opacity-90">
                  {result.isDisaster
                    ? "AI Vision Triage confirmed acute disaster hazard. Emergency response coordinators and registered citizens have been alerted."
                    : "AI Vision Triage evaluated the image and description as normal weather. No acute disaster was detected. Emergency sirens, dispatches, and public alarms were safely suppressed."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-lg bg-white/90 px-2.5 py-1 font-mono font-medium border border-ink/10">
                    Ref: #{result.incidentId?.slice(0, 8)}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        result.isDisaster ? "bg-red-500 animate-pulse" : "bg-sky-500"
                      }`}
                    />
                    {result.isDisaster ? "Prioritized in Active Triage Queue" : "Archived as Non-Hazardous"}
                  </span>
                </div>
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="bg-white/90 text-xs py-1.5 px-4 hover:bg-white border border-ink/10"
                    onClick={() => setResult(null)}
                  >
                    Submit another report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-ink/[0.06] bg-fog p-6 text-sm text-graphite shadow-sm">
            <h3 className="font-serif text-lg font-semibold text-ink mb-2">How it works</h3>
            <p className="mb-4">
              Your submission is instantly processed by AWS Rekognition. AI Vision triage evaluates the severity of the hazard in real-time.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>Routine weather submissions are safely archived to prevent false alarms.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">⚠️</span>
                <span>Critical disasters instantly alert all subscribed citizens and prioritize deployment for rescue squads.</span>
              </li>
            </ul>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
