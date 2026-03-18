import { notFound } from "next/navigation";

import { ShiftForm } from "@/components/shift-form";
import { getShiftFormValuesFromShiftRecord } from "@/lib/shift-form";
import { sanitizeReturnTo } from "@/lib/shifts-query-state";
import {
  getShiftRecordById,
  isDatabaseConfigured,
} from "@/lib/shift-repository";

type EditShiftPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function EditShiftPage({
  params,
  searchParams,
}: EditShiftPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const returnTo = sanitizeReturnTo(resolvedSearchParams.returnTo);
  const row = await getShiftRecordById(decodeURIComponent(id));

  if (!row) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Edit Shift
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          Update shift details
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Make changes to hours, pay, tips, or notes and save when ready.
        </p>
      </section>

      <ShiftForm
        mode="edit"
        shiftId={row.id}
        initialValues={getShiftFormValuesFromShiftRecord(row)}
        persistenceEnabled={isDatabaseConfigured()}
        returnTo={returnTo}
      />
    </div>
  );
}
