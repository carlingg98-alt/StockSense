import axios from 'axios';

// The one axios instance used by the whole app.
// Every request goes through here, so the base URL lives in a single place.
// REQUIREMENT [Core Req 3 - Frontend Application]: ALL API calls go through this single configured axios instance (axios.create with a baseURL).
// The base URL comes from VITE_API_URL (see frontend/.env.example).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  timeout: 15000,
});

// Turn any thrown error into a sentence we can show to the user.
// The API always answers errors as { message: "..." }.
// REQUIREMENT [Core Req 3 - Frontend Application]: no silent failures - turns any error into a message for the screen. Reads the { "message" } format from the API.
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (!error.response) return 'Cannot reach the server. Check that the API is running.';
    return `Request failed (${error.response.status})`;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

// Validation errors also carry one message per field: { errors: { sku: "..." } }
// REQUIREMENT [Core Req 3 - Frontend Application]: per-field error messages - reads the { errors: { field: "..." } } object that the API sends on a 400.
export function getFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError(error)) {
    const errors = error.response?.data?.errors;
    if (errors && typeof errors === 'object') return errors as Record<string, string>;
  }
  return {};
}
