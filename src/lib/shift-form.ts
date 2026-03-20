import Decimal from "decimal.js";
import { z } from "zod";

import type { ShiftRecord } from "@/lib/shift-records";

export const shiftInputModes = ["hours", "timeRange"] as const;

export type ShiftInputMode = (typeof shiftInputModes)[number];

export type ShiftFormValues = {
  shiftDate: string;
  inputMode: ShiftInputMode;
  hoursWorked: string;
  startTime: string;
  endTime: string;
  cashTips: string;
  cardTips: string;
  basePay: string;
  otherIncome: string;
  salesAmount: string;
  location: string;
  role: string;
  notes: string;
};

export type ShiftPreview = {
  hoursWorked: number;
  totalTips: number;
  totalEarned: number;
  hourlyRate: number;
  hasTimeRangeError: boolean;
};

const moneyPattern = /^\d+(?:\.\d{0,2})?$/;
const hoursPattern = /^\d+(?:\.\d{0,2})?$/;

const optionalMoneyField = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || moneyPattern.test(value),
    "Use a non-negative amount with up to two decimals.",
  );

export const shiftFormSchema = z
  .object({
    shiftDate: z.string().min(1, "Shift date is required."),
    inputMode: z.enum(shiftInputModes),
    hoursWorked: z.string().trim(),
    startTime: z.string().trim(),
    endTime: z.string().trim(),
    cashTips: optionalMoneyField,
    cardTips: optionalMoneyField,
    basePay: optionalMoneyField,
    otherIncome: optionalMoneyField,
    salesAmount: optionalMoneyField,
    location: z.string().max(100, "Location must be 100 characters or fewer."),
    role: z.string().max(100, "Role must be 100 characters or fewer."),
    notes: z.string().max(1000, "Notes must be 1000 characters or fewer."),
  })
  .superRefine((values, context) => {
    if (values.inputMode === "hours") {
      if (!values.hoursWorked.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hoursWorked"],
          message: "Hours worked is required when using total hours.",
        });
        return;
      }

      if (!hoursPattern.test(values.hoursWorked.trim())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hoursWorked"],
          message: "Use a positive hour value with up to two decimals.",
        });
        return;
      }

      const hoursWorked = new Decimal(values.hoursWorked.trim());

      if (hoursWorked.lte(0)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hoursWorked"],
          message: "Hours worked must be greater than zero.",
        });
      }

      if (hoursWorked.gt(24)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hoursWorked"],
          message: "Hours worked cannot exceed 24.00.",
        });
      }
    }

    if (values.inputMode === "timeRange") {
      if (!values.startTime) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startTime"],
          message: "Start time is required when using a time range.",
        });
      }

      if (!values.endTime) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: "End time is required when using a time range.",
        });
      }

      if (values.startTime && values.endTime) {
        const computedHours = calculateHoursFromTimeRange(
          values.startTime,
          values.endTime,
        );

        if (computedHours === null) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["endTime"],
            message:
              "End time must be after start time. Overnight shifts are not supported yet.",
          });
        }
      }
    }
  });

function parseOptionalDecimal(value: string) {
  return new Decimal(value.trim() || "0");
}

export function calculateHoursFromTimeRange(
  startTime: string,
  endTime: string,
) {
  if (!startTime || !endTime) {
    return null;
  }

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) {
    return null;
  }

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  if (endTotalMinutes <= startTotalMinutes) {
    return null;
  }

  return new Decimal(endTotalMinutes - startTotalMinutes)
    .div(60)
    .toDecimalPlaces(2);
}

export function calculateShiftPreview(values: ShiftFormValues): ShiftPreview {
  const cashTips = parseOptionalDecimal(values.cashTips);
  const cardTips = parseOptionalDecimal(values.cardTips);
  const basePay = parseOptionalDecimal(values.basePay);
  const otherIncome = parseOptionalDecimal(values.otherIncome);

  const computedHours =
    values.inputMode === "hours"
      ? values.hoursWorked.trim() &&
        hoursPattern.test(values.hoursWorked.trim())
        ? new Decimal(values.hoursWorked.trim())
        : new Decimal(0)
      : (calculateHoursFromTimeRange(values.startTime, values.endTime) ??
        new Decimal(0));

  const totalTips = cashTips.plus(cardTips);
  const baseCompensation = basePay.times(computedHours);
  const totalEarned = totalTips.plus(baseCompensation).plus(otherIncome);
  const hourlyRate = computedHours.gt(0)
    ? totalEarned.div(computedHours)
    : new Decimal(0);

  return {
    hoursWorked: Number(computedHours.toDecimalPlaces(2).toString()),
    totalTips: Number(totalTips.toDecimalPlaces(2).toString()),
    totalEarned: Number(totalEarned.toDecimalPlaces(2).toString()),
    hourlyRate: Number(hourlyRate.toDecimalPlaces(2).toString()),
    hasTimeRangeError:
      values.inputMode === "timeRange" &&
      Boolean(values.startTime) &&
      Boolean(values.endTime) &&
      calculateHoursFromTimeRange(values.startTime, values.endTime) === null,
  };
}

export function getDefaultShiftFormValues(): ShiftFormValues {
  return {
    shiftDate: "",
    inputMode: "hours",
    hoursWorked: "",
    startTime: "",
    endTime: "",
    cashTips: "0.00",
    cardTips: "0.00",
    basePay: "0.00",
    otherIncome: "0.00",
    salesAmount: "",
    location: "",
    role: "",
    notes: "",
  };
}

export function getShiftFormValuesFromShiftRecord(
  row: ShiftRecord,
): ShiftFormValues {
  return {
    shiftDate: row.shiftDate,
    inputMode: "hours",
    hoursWorked: row.hoursWorked.toFixed(2),
    startTime: "",
    endTime: "",
    cashTips: row.cashTips.toFixed(2),
    cardTips: row.cardTips.toFixed(2),
    basePay: row.basePay.toFixed(2),
    otherIncome: row.otherIncome.toFixed(2),
    salesAmount: row.salesAmount !== null ? row.salesAmount.toFixed(2) : "",
    location: row.location ?? "",
    role: row.role ?? "",
    notes: row.notes ?? "",
  };
}
