import axios from "axios";

// This gateway owns only the asynchronous AWS intake flow.  The existing
// FastAPI API client remains responsible for authentication, report history,
// and the admin dashboard until those endpoints are also migrated to AWS.
const AWS_INTAKE_API_URL = import.meta.env.VITE_AWS_INTAKE_API_URL;

const awsIntakeClient = axios.create({
  baseURL: AWS_INTAKE_API_URL,
});

function readUploadUrl(payload) {
  return payload.upload_url || payload.presigned_url || payload.presignedUrl || payload.url;
}

function readIncidentId(payload) {
  return payload.incident_id || payload.incidentId || payload.id;
}

/**
 * Creates an incident record in DynamoDB and returns the pre-signed S3 URL
 * supplied by the ReportHandler Lambda.  The image bytes deliberately do not
 * pass through API Gateway; the browser uploads them directly to private S3.
 */
export async function submitAwsIncident({ latitude, longitude, description, photo }) {
  if (!AWS_INTAKE_API_URL) {
    throw new Error("AWS intake is not configured. Set VITE_AWS_INTAKE_API_URL before building the frontend.");
  }

  const { data } = await awsIntakeClient.post("/reports", {
    latitude: Number(latitude),
    longitude: Number(longitude),
    description,
    filename: photo.name,
    content_type: photo.type || "image/jpeg",
  });

  const uploadUrl = readUploadUrl(data);
  const incidentId = readIncidentId(data);
  if (!uploadUrl || !incidentId) {
    throw new Error("AWS intake returned an unexpected response; it must include incident_id and a presigned upload URL.");
  }

  // Do not use the Axios API client here: its interceptor attaches the app's
  // bearer token, which must never be sent to an S3 pre-signed URL.
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": photo.type || "image/jpeg" },
    body: photo,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Image upload to AWS failed (${uploadResponse.status}).`);
  }

  return { incidentId, intake: data };
}
