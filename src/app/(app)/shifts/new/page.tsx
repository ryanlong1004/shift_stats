import { ShiftForm } from "@/components/shift-form";
import { isDatabaseConfigured, listShiftRecords } from "@/lib/shift-repository";
import { getUserSettings } from "@/lib/settings-repository";
import { getDefaultShiftFormValues } from "@/lib/shift-form";

type NewShiftPageSearchParams = {
  date?: string;
};

export default async function NewShiftPage({
  searchParams,
}: {
  searchParams: Promise<NewShiftPageSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const dateParam = resolvedSearchParams.date;
  const prefillDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;
  const allRows = await listShiftRecords();
  const locationOptions = Array.from(
    new Set(allRows.map((row) => row.location).filter(Boolean)),
  ) as string[];
  const roleOptions = Array.from(
    new Set(allRows.map((row) => row.role).filter(Boolean)),
  ) as string[];
  const shiftTypeOptions = Array.from(
    new Set(allRows.map((row) => row.shiftType).filter(Boolean)),
  ) as string[];
  const showSalesField = isDatabaseConfigured()
    ? await getUserSettings()
        .then((s) => s.trackSales)
        .catch(() => false)
    : false;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Add Shift
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          Add a new shift
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Enter your shift details to calculate total earnings and hourly rate
          before saving.
        </p>
      </section>

      <ShiftForm
        mode="create"
        initialValues={
          prefillDate
            ? { ...getDefaultShiftFormValues(), shiftDate: prefillDate }
            : undefined
        }
        persistenceEnabled={isDatabaseConfigured()}
        locationOptions={locationOptions}
        roleOptions={roleOptions}
        shiftTypeOptions={shiftTypeOptions}
        showSalesField={showSalesField}
      />
    </div>
  );
}
