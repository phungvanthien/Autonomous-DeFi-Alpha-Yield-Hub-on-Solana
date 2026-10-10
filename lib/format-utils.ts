/**
 * Standard Web3 & Financial Number Formatting Utilities
 * Standardizes commas as thousand separators and dots as decimal points ($23,422,478.09)
 */

export function formatCurrency(
  value: number | string | undefined | null,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
  }
): string {
  if (value === undefined || value === null || value === "") return "$0.00";
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value;
  if (isNaN(num)) return "$0.00";

  const minDigits = options?.minimumFractionDigits ?? 2;
  const maxDigits = options?.maximumFractionDigits ?? 2;

  if (options?.compact) {
    return formatCurrencyCompact(num, maxDigits);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(num);
}

/**
 * Standard compact USD format for financial tables ($14.25M, $1.50B, $350.5K, $12.50)
 * Uses standard US commas, handles billion/million/thousand suffixes, and never truncates decimals unexpectedly.
 */
export function formatCurrencyCompact(
  value: number | string | undefined | null,
  decimals = 2
): string {
  if (value === undefined || value === null || value === "") return "$0.00";
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value;
  if (isNaN(num)) return "$0.00";

  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: decimals,
    })}K`;
  }
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatNumber(
  value: number | string | undefined | null,
  decimals = 2
): string {
  if (value === undefined || value === null || value === "") return "0";
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value;
  if (isNaN(num)) return "0";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatSol(
  value: number | string | undefined | null,
  decimals = 3
): string {
  if (value === undefined || value === null || value === "") return "0.000 SOL";
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value;
  if (isNaN(num)) return "0.000 SOL";

  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)} SOL`;
}

export interface FormattedPercentResult {
  formatted: string;
  isPositive: boolean;
  isNegative: boolean;
  isNeutral: boolean;
  value: number;
}

export function parseAndFormatPercent(
  raw: string | number | undefined | null
): FormattedPercentResult {
  if (raw === undefined || raw === null || raw === "" || raw === "N/A") {
    return {
      formatted: "N/A",
      isPositive: false,
      isNegative: false,
      isNeutral: true,
      value: 0,
    };
  }

  let num = 0;
  if (typeof raw === "number") {
    num = raw;
  } else {
    const isNegativeSign = raw.trim().startsWith("-");
    const parsed = parseFloat(raw.replace(/[^0-9.]/g, ""));
    num = isNaN(parsed) ? 0 : isNegativeSign ? -parsed : parsed;
  }

  const isPositive = num > 0;
  const isNegative = num < 0;
  const isNeutral = num === 0;

  const sign = isPositive ? "+" : isNegative ? "-" : "";
  const formatted = `${sign}${Math.abs(num).toFixed(1)}%`;

  return {
    formatted,
    isPositive,
    isNegative,
    isNeutral,
    value: num,
  };
}

export function parseWinRate(raw: string | undefined | null): {
  formatted: string;
  value: number;
  isHigh: boolean;
  isMedium: boolean;
  isLow: boolean;
} {
  if (!raw || raw === "N/A") {
    return { formatted: "N/A", value: 0, isHigh: false, isMedium: false, isLow: false };
  }
  const val = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (isNaN(val)) {
    return { formatted: raw, value: 0, isHigh: false, isMedium: false, isLow: false };
  }

  return {
    formatted: `${val.toFixed(1)}%`,
    value: val,
    isHigh: val >= 60,
    isMedium: val >= 50 && val < 60,
    isLow: val < 50,
  };
}
