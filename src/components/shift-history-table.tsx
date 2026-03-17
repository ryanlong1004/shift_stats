import Link from "next/link";

import { DeleteShiftButton } from "@/components/delete-shift-button";
import { formatCurrency, formatDecimal } from "@/lib/formatters";
import type { ShiftRecord } from "@/lib/shift-records";

export function ShiftHistoryTable({ rows }: { rows: ShiftRecord[] }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-900/10 bg-white/85 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <table className="w-full border-collapse text-left text-sm">
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
                {formatCurrency(row.hourlyRate * row.hoursWorked)}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {row.location ?? "-"}
              </td>
              <td className="px-4 py-3 text-slate-700">{row.role ?? "-"}</td>
              <td className="px-4 py-3 text-slate-700">{row.notes ?? "-"}</td>
              <td className="px-4 py-3 text-slate-700">
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/shifts/${encodeURIComponent(row.id)}/edit`}
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
  );
}
