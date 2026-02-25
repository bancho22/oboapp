import { getLocalityDescription } from "@oboapp/shared";

export const LOCALITY_ENV_ERROR_MESSAGE =
  "NEXT_PUBLIC_LOCALITY environment variable is required but not set";

export function getConfiguredLocality(): string {
  const locality = process.env.NEXT_PUBLIC_LOCALITY;
  if (!locality) {
    throw new Error(LOCALITY_ENV_ERROR_MESSAGE);
  }
  return locality;
}

export function getConfiguredLocalityDescription(): string {
  return getLocalityDescription(getConfiguredLocality());
}
