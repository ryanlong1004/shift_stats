"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock3, DollarSign, ReceiptText } from "lucide-react";
import { format, parseISO } from "date-fns";

import { formatCurrency, formatDecimal } from "@/lib/formatters";
import {
  calculateShiftPreview,
  getDefaultShiftFormValues,
  type ShiftFormValues,
  shiftFormSchema,
} from "@/lib/shift-form";

type ShiftFormProps = {
  mode: "create" | "edit";
  initialValues?: ShiftFormValues;
  shiftId?: string;
  persistenceEnabled: boolean;
  returnTo?: string;
  locationOptions?: string[];
  roleOptions?: string[];
  shiftTypeOptions?: string[];
  showSalesField?: boolean;
};

type FormErrors = Partial<Record<keyof ShiftFormValues, string>>;

export function ShiftForm({
  mode,
  initialValues,
  shiftId,
  persistenceEnabled,
  returnTo,
  locationOptions = [],
  roleOptions = [],
  shiftTypeOptions = [],
  showSalesField = false,
}: ShiftFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ShiftFormValues>(
    initialValues ?? getDefaultShiftFormValues(),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preview = useMemo(() => calculateShiftPreview(values), [values]);
  const previewDayLabel = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.shiftDate)) {
      return null;
    }

    try {
      return format(parseISO(values.shiftDate), "EEEE");
    } catch {
      return null;
    }
  }, [values.shiftDate]);

  function updateValue<Key extends keyof ShiftFormValues>(
    field: Key,
    nextValue: ShiftFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [field]: nextValue }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setStatusMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = shiftFormSchema.safeParse(values);

    if (!result.success) {
      const flattenedErrors = result.error.flatten().fieldErrors;
      const nextErrors: FormErrors = {};

      for (const [field, messages] of Object.entries(flattenedErrors)) {
        const firstMessage = messages?.[0];

        if (firstMessage) {
          nextErrors[field as keyof ShiftFormValues] = firstMessage;
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
      const endpoint =
        mode === "create"
          ? "/api/shifts"
          : `/api/shifts/${encodeURIComponent(shiftId ?? "")}`;
      const method = mode === "create" ? "POST" : "PUT";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as {
        message?: string;
        fieldErrors?: Partial<Record<keyof ShiftFormValues, string[]>>;
      };

      if (!response.ok) {
        const nextErrors: FormErrors = {};

        if (payload.fieldErrors) {
          for (const [field, messages] of Object.entries(payload.fieldErrors)) {
            const firstMessage = messages?.[0];

            if (firstMessage) {
              nextErrors[field as keyof ShiftFormValues] = firstMessage;
            }
          }
        }

        setErrors(nextErrors);
        setStatusMessage(
          payload.message ?? "Unable to save the shift right now.",
        );
        return;
      }

      setStatusMessage(
        mode === "create"
          ? "Shift saved. Redirecting to history."
          : "Shift updated. Redirecting to history.",
      );
      const nextHref =
        returnTo && returnTo.startsWith("/shifts") ? returnTo : "/shifts";
      router.push(nextHref);
      router.refresh();
    } catch {
      setStatusMessage(
        "The request failed before the app could save the shift.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-[1.75rem] border border-slate-900/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Shift date" error={errors.shiftDate}>
            <input
              type="date"
              value={values.shiftDate}
              onChange={(event) => updateValue("shiftDate", event.target.value)}
              className={inputClassName(errors.shiftDate)}
            />
          </Field>

          <Field label="Input mode">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              {[
                { value: "hours", label: "Total hours" },
                { value: "timeRange", label: "Start / end time" },
              ].map((option) => {
                const isActive = values.inputMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      updateValue(
                        "inputMode",
                        option.value as ShiftFormValues["inputMode"],
                      )
                    }
                    className={`rounded-[1rem] px-3 py-2 text-sm font-medium transition ${
                      isActive ? "bg-slate-950 text-white" : "text-slate-700"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        {values.inputMode === "hours" ? (
          <Field label="Hours worked" error={errors.hoursWorked}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="6.50"
              value={values.hoursWorked}
              onChange={(event) =>
                updateValue("hoursWorked", event.target.value)
              }
              className={inputClassName(errors.hoursWorked)}
            />
          </Field>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Start time" error={errors.startTime}>
              <input
                type="time"
                value={values.startTime}
                onChange={(event) =>
                  updateValue("startTime", event.target.value)
                }
                className={inputClassName(errors.startTime)}
              />
            </Field>
            <Field
              label="End time"
              error={
                errors.endTime ||
                (preview.hasTimeRangeError
                  ? "End time must be after start time."
                  : undefined)
              }
            >
              <input
                type="time"
                value={values.endTime}
                onChange={(event) => updateValue("endTime", event.target.value)}
                className={inputClassName(
                  errors.endTime ||
                    (preview.hasTimeRangeError ? "error" : undefined),
                )}
              />
            </Field>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            Compensation formula: (Base hourly rate x Hours worked) + Cash tips
            + Card tips + Other income = Total earned.
          </div>
          <Field label="Cash tips" error={errors.cashTips}>
            <MoneyInput
              value={values.cashTips}
              onChange={(nextValue) => updateValue("cashTips", nextValue)}
              error={errors.cashTips}
            />
          </Field>
          <Field label="Card tips" error={errors.cardTips}>
            <MoneyInput
              value={values.cardTips}
              onChange={(nextValue) => updateValue("cardTips", nextValue)}
              error={errors.cardTips}
            />
          </Field>
          <Field
            label="Base hourly rate"
            hint="Example: enter 9.00 for $9/hour"
            error={errors.basePay}
          >
            <MoneyInput
              value={values.basePay}
              onChange={(nextValue) => updateValue("basePay", nextValue)}
              error={errors.basePay}
            />
          </Field>
          <Field label="Other income" error={errors.otherIncome}>
            <MoneyInput
              value={values.otherIncome}
              onChange={(nextValue) => updateValue("otherIncome", nextValue)}
              error={errors.otherIncome}
            />
          </Field>
        </div>

        {showSalesField ? (
          <Field
            label="Sales (optional)"
            hint="Used to compute your tip percentage"
            error={errors.salesAmount}
          >
            <MoneyInput
              value={values.salesAmount}
              onChange={(nextValue) => updateValue("salesAmount", nextValue)}
              error={errors.salesAmount}
            />
          </Field>
        ) : null}

        <div className="grid gap-5 md:grid-cols-3">
          <Field
            label="Location"
            hint={
              locationOptions.length
                ? "Type a new location or pick a saved one."
                : undefined
            }
            error={errors.location}
          >
            <>
              <input
                type="text"
                list="location-options"
                placeholder="Select or type a location..."
                value={values.location}
                onChange={(event) =>
                  updateValue("location", event.target.value)
                }
                className={inputClassName(errors.location)}
              />
              {locationOptions.length ? (
                <datalist id="location-options">
                  {locationOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              ) : null}
            </>
          </Field>
          <Field
            label="Role"
            hint={
              roleOptions.length
                ? "Type a new role or pick a saved one."
                : undefined
            }
            error={errors.role}
          >
            <>
              <input
                type="text"
                list="role-options"
                placeholder="Select or type a role..."
                value={values.role}
                onChange={(event) => updateValue("role", event.target.value)}
                className={inputClassName(errors.role)}
              />
              {roleOptions.length ? (
                <datalist id="role-options">
                  {roleOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              ) : null}
            </>
          </Field>
          <Field
            label="Shift type"
            hint={
              shiftTypeOptions.length
                ? "Type a new shift type or pick a saved one."
                : undefined
            }
            error={errors.shiftType}
          >
            <>
              <input
                type="text"
                list="shift-type-options"
                placeholder="Select or type a shift type..."
                value={values.shiftType}
                onChange={(event) =>
                  updateValue("shiftType", event.target.value)
                }
                className={inputClassName(errors.shiftType)}
              />
              {shiftTypeOptions.length ? (
                <datalist id="shift-type-options">
                  {shiftTypeOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              ) : null}
            </>
          </Field>
        </div>

        <Field label="Notes" error={errors.notes}>
          <textarea
            rows={5}
            placeholder="Busy patio shift, private event, weather impact, etc."
            value={values.notes}
            onChange={(event) => updateValue("notes", event.target.value)}
            className={`${inputClassName(errors.notes)} min-h-32 resize-y`}
          />
        </Field>

        {statusMessage ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{statusMessage}</span>
          </div>
        ) : null}

        {!persistenceEnabled ? (
          <div className="flex items-start gap-3 rounded-2xl border border-sky-300/60 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>
              Saving is temporarily unavailable. You can still review
              calculations before submitting once storage is available.
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {isSubmitting
              ? "Saving..."
              : mode === "create"
                ? "Save shift"
                : "Update shift"}
          </button>
          <p className="text-sm text-slate-500">
            Totals update live as you edit hours, base pay, and tips.
          </p>
        </div>
      </form>

      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Live preview
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Calculated shift totals
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Day of week:{" "}
            <span className="font-medium text-white">
              {previewDayLabel ?? "Pick a shift date"}
            </span>
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <PreviewCard
              icon={<Clock3 className="h-4 w-4" />}
              label="Hours worked"
              value={formatDecimal(preview.hoursWorked)}
            />
            <PreviewCard
              icon={<ReceiptText className="h-4 w-4" />}
              label="Total tips"
              value={formatCurrency(preview.totalTips)}
            />
            <PreviewCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Total earned"
              value={formatCurrency(preview.totalEarned)}
            />
            <PreviewCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Hourly rate"
              value={formatCurrency(preview.hourlyRate)}
            />
            {showSalesField &&
            values.salesAmount.trim() &&
            Number(values.salesAmount) > 0 ? (
              <PreviewCard
                icon={<ReceiptText className="h-4 w-4" />}
                label="Tip %"
                value={`${((preview.totalTips / Number(values.salesAmount)) * 100).toFixed(1)}%`}
              />
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-900/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Form behavior
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <li>Checks required fields before saving.</li>
            <li>Supports total-hours entry or computed time-range entry.</li>
            <li>
              Calculates total tips, total compensation, and hourly rate live.
            </li>
            <li>Uses the same flow for adding and editing shifts.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hint ? (
        <span className="block text-xs text-slate-500">{hint}</span>
      ) : null}
      {children}
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </label>
  );
}

function MoneyInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClassName(error)} pl-8`}
      />
    </div>
  );
}

function PreviewCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <span className="rounded-full bg-white/10 p-2 text-cyan-200">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

function inputClassName(error?: string) {
  return `w-full rounded-2xl border bg-white px-4 py-3.5 text-base text-slate-950 outline-none transition focus:border-slate-950 md:py-3 md:text-sm ${
    error ? "border-rose-300 focus:border-rose-500" : "border-slate-200"
  }`;
}
