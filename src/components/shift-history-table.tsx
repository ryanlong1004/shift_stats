import Link from "next/link";

import { DeleteShiftButton } from "@/components/delete-shift-button";
import { formatCurrency, formatDecimal } from "@/lib/formatters";
import type { ShiftRecord } from "@/lib/shift-records";

export function ShiftHistoryTable({
  rows,
  returnTo,
}: {
  rows: ShiftRecord[];
  returnTo?: string;
}) {
  const buildEditHref = (id: string) => {
    const baseHref = `/shifts/${encodeURIComponent(id)}/edit`;

    if (!returnTo) {
      return baseHref;
    }

    return `${baseHref}?returnTo=${encodeURIComponent(returnTo)}`;
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/85 px-5 py-10 text-center text-sm text-slate-600 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        No shifts match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-[1.25rem] border border-slate-900/10 bg-white/90 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Date
                </p>
                <p className="text-lg font-semibold text-slate-950">
                  {row.shiftDate}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Total
                </p>
                <p className="text-lg font-semibold text-slate-950">
                  {formatCurrency(row.totalEarned)}
                </p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Hours</dt>
                <dd className="font-medium text-slate-800">
                  {formatDecimal(row.hoursWorked)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">$/hr</dt>
                <dd className="font-medium text-slate-800">
                  {formatCurrency(row.hourlyRate)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Cash</dt>
                <dd className="font-medium text-slate-800">
                  {formatCurrency(row.cashTips)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Card</dt>
                <dd className="font-medium text-slate-800">
                  {formatCurrency(row.cardTips)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Base</dt>
                <dd className="font-medium text-slate-800">
                  {formatCurrency(row.basePay)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Location</dt>
                <dd className="font-medium text-slate-800">
                  {row.location ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Role</dt>
                <dd className="font-medium text-slate-800">
                  {row.role ?? "-"}
                </dd>
              </div>
            </dl>

            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap">{row.notes ?? "-"}</p>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Link
                href={buildEditHref(row.id)}
                className="inline-flex items-center rounded-full border border-slate-900/10 bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
              >
                Edit
              </Link>
              <DeleteShiftButton shiftId={row.id} />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-[1.5rem] border border-slate-900/10 bg-white/85 shadow-[0_18px_44px_rgba(15,23,42,0.08)] md:block">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-slate-950 text-white">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Hours</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">$/hr</th>
              <th className="px-4 py-3 font-medium">Cash</th>
              <th className="px-4 py-3 font-medium">Card</th>
              <th className="px-4 py-3 font-medium">Base</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200 align-top">
                <td className="px-4 py-3 font-medium text-slate-950">
                  {row.shiftDate}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDecimal(row.hoursWorked)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatCurrency(row.totalEarned)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatCurrency(row.hourlyRate)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatCurrency(row.cashTips)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatCurrency(row.cardTips)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatCurrency(row.basePay)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {row.location ?? "-"}
                </td>
                <td className="px-4 py-3 text-slate-700">{row.role ?? "-"}</td>
                <td className="px-4 py-3 text-slate-700">{row.notes ?? "-"}</td>
                <td className="px-4 py-3 text-slate-700">
                  <div className="flex flex-col gap-2">
                    <Link
                      href={buildEditHref(row.id)}
                      className="inline-flex items-center rounded-full border border-slate-900/10 bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                    >
                      Edit
                    </Link>
                    <DeleteShiftButton shiftId={row.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
