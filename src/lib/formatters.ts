import { parseISO } from "date-fns";
import { format } from "date-fns";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatDecimal(value: number) {
  return decimalFormatter.format(value);
}

export function formatWeekday(dateString: string) {
  return format(parseISO(dateString), "EEEE");
}
