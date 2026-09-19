export function toDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfDay(date = new Date()): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date = new Date()): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function startOfWeek(date = new Date()): Date {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? 6 : day - 1;
  next.setDate(next.getDate() - diff);
  return next;
}

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function formatDateTime(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

export function formatTime(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

export function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(new Date(ms));
}

export type DateFilter = "today" | "yesterday" | "week" | "month" | "custom";

export function rangeForFilter(
  filter: DateFilter,
  customStart?: string,
  customEnd?: string,
): { start: number; end: number } {
  const now = new Date();
  if (filter === "today") {
    return { start: startOfDay(now).getTime(), end: endOfDay(now).getTime() };
  }
  if (filter === "yesterday") {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return { start: startOfDay(y).getTime(), end: endOfDay(y).getTime() };
  }
  if (filter === "week") {
    return { start: startOfWeek(now).getTime(), end: endOfDay(now).getTime() };
  }
  if (filter === "month") {
    return { start: startOfMonth(now).getTime(), end: endOfDay(now).getTime() };
  }
  const start = customStart ? startOfDay(new Date(customStart)).getTime() : startOfDay(now).getTime();
  const end = customEnd ? endOfDay(new Date(customEnd)).getTime() : endOfDay(now).getTime();
  return { start, end };
}
