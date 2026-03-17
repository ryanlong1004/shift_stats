"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import {
  userSettingsSchema,
  type UserSettings,
  type UserSettingsFormValues,
} from "@/lib/settings-repository";

type SettingsFormProps = {
  initialSettings: UserSettings;
};

type FormErrors = Partial<Record<keyof UserSettingsFormValues, string>>;

const timezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Australia/Sydney",
  "UTC",
];

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [values, setValues] = useState<UserSettingsFormValues>({
    currencyCode: initialSettings.currencyCode,
    timezone: initialSettings.timezone,
    trackBasePay: initialSettings.trackBasePay,
    splitTipsByType: initialSettings.splitTipsByType,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateValue<Key extends keyof UserSettingsFormValues>(
    field: Key,
    nextValue: UserSettingsFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [field]: nextValue }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setStatusMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = userSettingsSchema.safeParse(values);

    if (!result.success) {
      const flattenedErrors = result.error.flatten().fieldErrors;
      const nextErrors: FormErrors = {};

      for (const [field, messages] of Object.entries(flattenedErrors)) {
        const firstMessage = messages?.[0];

        if (firstMessage) {
          nextErrors[field as keyof UserSettingsFormValues] = firstMessage;
        }
      }

      setErrors(nextErrors);
      setStatusMessage(
        "Validation failed. Fix the highlighted fields and try again.",
      );
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as {
        message?: string;
        fieldErrors?: Partial<Record<keyof UserSettingsFormValues, string[]>>;
      };

      if (!response.ok) {
        const nextErrors: FormErrors = {};

        if (payload.fieldErrors) {
          for (const [field, messages] of Object.entries(payload.fieldErrors)) {
            const firstMessage = messages?.[0];

            if (firstMessage) {
              nextErrors[field as keyof UserSettingsFormValues] = firstMessage;
            }
          }
        }

        setErrors(nextErrors);
        setStatusMessage(
          payload.message ?? "Unable to save settings right now.",
        );
        return;
      }

      setStatusMessage("Settings saved successfully.");
    } catch {
      setStatusMessage(
        "The request failed before the settings could be saved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-[1.75rem] border border-slate-900/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Currency code" error={errors.currencyCode}>
          <input
            type="text"
            value={values.currencyCode}
            onChange={(event) =>
              updateValue("currencyCode", event.target.value.toUpperCase())
            }
            placeholder="USD"
            maxLength={3}
            className={inputClassName(errors.currencyCode)}
          />
        </Field>

        <Field label="Timezone" error={errors.timezone}>
          <select
            value={values.timezone}
            onChange={(event) => updateValue("timezone", event.target.value)}
            className={inputClassName(errors.timezone)}
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:bg-slate-50 transition">
          <input
            type="checkbox"
            checked={values.trackBasePay}
            onChange={(event) =>
              updateValue("trackBasePay", event.target.checked)
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm font-medium text-slate-700">
            Track base pay
          </span>
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:bg-slate-50 transition">
          <input
            type="checkbox"
            checked={values.splitTipsByType}
            onChange={(event) =>
              updateValue("splitTipsByType", event.target.checked)
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm font-medium text-slate-700">
            Split cash and card tips
          </span>
        </label>
      </div>

      {statusMessage ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{statusMessage}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </label>
  );
}

function inputClassName(error?: string) {
  return `w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 ${
    error ? "border-rose-300 focus:border-rose-500" : "border-slate-200"
  }`;
}
