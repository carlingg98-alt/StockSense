import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { getFieldErrors } from '../api/client';

// When the API rejects a form with per-field errors (for example a duplicate SKU),
// show each message under its own input. Returns true if at least one field matched.
// REQUIREMENT [Core Req 3 - Frontend Application]: per-field error messages - also shows the API validation errors (e.g. duplicate SKU) under the matching input.
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[]
) {
  const serverErrors = getFieldErrors(error);
  let matched = false;
  for (const field of fields) {
    const message = serverErrors[field];
    if (message) {
      setError(field, { type: 'server', message });
      matched = true;
    }
  }
  return matched;
}
