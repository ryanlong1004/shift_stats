import { shiftFormSchema, type ShiftFormValues } from "@/lib/shift-form";

const requiredHeaders = [
  "Date",
  "Hours Worked",
  "Cash Tips",
  "Card Tips",
  "Base Pay",
  "Other Income",
  "Location",
  "Role",
] as const;

type ParsedImportResult = {
  rows: ShiftFormValues[];
  warnings: string[];
};

function normalizeMoney(value: string | undefined) {
  if (!value) {
    return "0.00";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "0.00";
  }

  return trimmed.replace(/[$,]/g, "");
}

function parseCsvLine(line: string) {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields;
}

function parseCsv(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    throw new Error("CSV file is empty.");
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  return lines.map(parseCsvLine);
}

export function parseShiftImportCsv(csvText: string): ParsedImportResult {
  const rows = parseCsv(csvText);
  const [headerRow, ...dataRows] = rows;
  const headerMap = new Map(headerRow.map((header, index) => [header, index]));

  for (const header of requiredHeaders) {
    if (!headerMap.has(header)) {
      throw new Error(`CSV is missing required header: ${header}`);
    }
  }

  const warnings: string[] = [];

  const parsedRows = dataRows.map((columns, rowIndex) => {
    const getValue = (header: string) => {
      const columnIndex = headerMap.get(header);
      return columnIndex === undefined
        ? ""
        : (columns[columnIndex] ?? "").trim();
    };

    const values: ShiftFormValues = {
      shiftDate: getValue("Date"),
      inputMode: "hours",
      hoursWorked: getValue("Hours Worked"),
      startTime: "",
      endTime: "",
      cashTips: normalizeMoney(getValue("Cash Tips")),
      cardTips: normalizeMoney(getValue("Card Tips")),
      basePay: normalizeMoney(getValue("Base Pay")),
      otherIncome: normalizeMoney(getValue("Other Income")),
      salesAmount: "",
      location: getValue("Location"),
      role: getValue("Role"),
      shiftType: getValue("Shift Type"),
      notes: getValue("Notes"),
    };

    const parsed = shiftFormSchema.safeParse(values);

    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`Row ${rowIndex + 2} failed validation: ${issues}`);
    }

    const totalEarned = normalizeMoney(getValue("Total Earned"));
    const hourlyRate = normalizeMoney(getValue("Hourly Rate"));

    if (totalEarned === "0.00" && hourlyRate !== "0.00") {
      warnings.push(
        `Row ${rowIndex + 2} has a non-zero hourly rate but zero total earned. Imported values were derived from pay fields only.`,
      );
    }

    return parsed.data;
  });

  return {
    rows: parsedRows,
    warnings,
  };
}
