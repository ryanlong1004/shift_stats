const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnlyString(value: string) {
  return DATE_ONLY_PATTERN.test(value);
}

export function parseDateOnlyToUtc(value: string) {
  if (!isDateOnlyString(value)) {
    throw new Error(`Invalid date-only value: ${value}`);
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export function formatUtcDateToDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}
