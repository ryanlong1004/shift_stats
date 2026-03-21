"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import {
  accountFormSchema,
  type AccountFormValues,
  type AccountProfile,
} from "@/lib/account-repository";

type AccountFormProps = {
  initialProfile: AccountProfile;
};

type FormErrors = Partial<Record<keyof AccountFormValues, string>>;

export function AccountForm({ initialProfile }: AccountFormProps) {
  const [values, setValues] = useState<AccountFormValues>({
    name: initialProfile.name,
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPassword, setHasPassword] = useState(initialProfile.hasPassword);

  function updateValue<Key extends keyof AccountFormValues>(
    field: Key,
    nextValue: AccountFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [field]: nextValue }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setStatusMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = accountFormSchema.safeParse(values);

    if (!result.success) {
      const flattenedErrors = result.error.flatten().fieldErrors;
      const nextErrors: FormErrors = {};

      for (const [field, messages] of Object.entries(flattenedErrors)) {
        const firstMessage = messages?.[0];
        if (firstMessage) {
          nextErrors[field as keyof AccountFormValues] = firstMessage;
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
      const response = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as {
        message?: string;
        fieldErrors?: Partial<Record<keyof AccountFormValues, string[]>>;
        profile?: AccountProfile;
      };

      if (!response.ok) {
        const nextErrors: FormErrors = {};

        if (payload.fieldErrors) {
          for (const [field, messages] of Object.entries(payload.fieldErrors)) {
            const firstMessage = messages?.[0];
            if (firstMessage) {
              nextErrors[field as keyof AccountFormValues] = firstMessage;
            }
          }
        }

        setErrors(nextErrors);
        setStatusMessage(payload.message ?? "Unable to save account settings.");
        return;
      }

      if (payload.profile) {
        setHasPassword(payload.profile.hasPassword);
        setValues((current) => ({
          ...current,
          name: payload.profile?.name ?? current.name,
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        }));
      }

      setStatusMessage("Account settings saved successfully.");
    } catch {
      setStatusMessage(
        "The request failed before account settings could be saved.",
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
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Account
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Profile & password
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Update your display name and change your password. Signed-in email:
          <span className="ml-1 font-medium text-slate-900">
            {initialProfile.email}
          </span>
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Name" error={errors.name}>
          <input
            type="text"
            value={values.name}
            onChange={(event) => updateValue("name", event.target.value)}
            className={inputClassName(errors.name)}
            minLength={2}
            maxLength={80}
            required
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={initialProfile.email}
            disabled
            className={`${inputClassName()} cursor-not-allowed bg-slate-50 text-slate-500`}
          />
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Field
          label={
            hasPassword ? "Current password" : "Current password (not required)"
          }
          error={errors.currentPassword}
        >
          <input
            type="password"
            value={values.currentPassword}
            onChange={(event) =>
              updateValue("currentPassword", event.target.value)
            }
            className={inputClassName(errors.currentPassword)}
            autoComplete="current-password"
          />
        </Field>

        <Field label="New password" error={errors.newPassword}>
          <input
            type="password"
            value={values.newPassword}
            onChange={(event) => updateValue("newPassword", event.target.value)}
            className={inputClassName(errors.newPassword)}
            autoComplete="new-password"
          />
        </Field>

        <Field label="Confirm new password" error={errors.confirmNewPassword}>
          <input
            type="password"
            value={values.confirmNewPassword}
            onChange={(event) =>
              updateValue("confirmNewPassword", event.target.value)
            }
            className={inputClassName(errors.confirmNewPassword)}
            autoComplete="new-password"
          />
        </Field>
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
        {isSubmitting ? "Saving..." : "Save account"}
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
