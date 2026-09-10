import { useEffect, useRef, useState } from "react";
import { submitAwsIncident } from "../../api/awsIntake";
import { Button, Card, Field, Input, TextArea } from "../../components/ui";

export default function SubmitIncident() {
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser; enter lat/lng manually.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError("Could not get location; enter lat/lng manually.");
        setLocating(false);
      }
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!photo) {
      setError("Please attach a photo.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await submitAwsIncident({ latitude, longitude, description, photo });
      setResult(data);
      setDescription("");
      setPhoto(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-8 max-w-xl px-6">
      <h1 className="mb-6 text-3xl tracking-tighter text-ink">Report an incident</h1>
      <Card className="shadow-float">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Description">
            <TextArea
              rows={4}
              placeholder="Describe what's happening (e.g. 'flooding, water rising, help needed')"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </Field>

          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Field label="Latitude">
                  <Input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Longitude">
                  <Input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                  />
                </Field>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={useMyLocation}
              disabled={locating}
              className="w-full"
            >
              {locating ? "Locating..." : "Use my location"}
            </Button>
          </div>

          <Field label="Photo">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            />

            {photoPreview ? (
              <div className="flex items-center gap-3">
                <img
                  src={photoPreview}
                  alt="Selected"
                  className="h-20 w-20 rounded-2xl object-cover"
                />
                <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="ghost" onClick={() => cameraInputRef.current?.click()}>
                    Retake
                  </Button>
                  <Button type="button" variant="quiet" onClick={() => setPhoto(null)}>
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  Take photo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload file
                </Button>
              </div>
            )}
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit report"}
          </Button>
        </form>
      </Card>

      {result && (
        <Card accent className="mt-4 shadow-float">
          <p className="font-serif text-lg">Report submitted</p>
          <ul className="mt-2 space-y-1 text-sm text-sienna/90">
            <li>Report ID: {result.incidentId}</li>
            <li>Photo uploaded securely. AI triage is now processing it.</li>
            <li className="text-xs">Classification and any critical alert are handled asynchronously by AWS.</li>
          </ul>
        </Card>
      )}
    </div>
  );
}
