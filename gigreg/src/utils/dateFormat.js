export function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

export function formatDueDateTime(value, fallback = "") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    hour: "numeric",
    hour12: true,
    timeZoneName: "short",
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const day = get("day");
  const month = get("month");
  const hour = get("hour");
  const dayPeriod = get("dayPeriod").toUpperCase();
  const tz = get("timeZoneName");
  return `${day} ${month} at ${hour}${dayPeriod}${tz ? ` ${tz}` : ""}`;
}

const getTimezoneOffsetMinutes = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second)
  );
  return Math.round((asUtc - date.getTime()) / 60000);
};

export function convertTimeBetweenTimezones(timeStr, fromTimezone, toTimezone) {
  if (!timeStr || typeof timeStr !== "string") return "";
  const [rawHours, rawMinutes] = timeStr.split(":").map(Number);
  if (!Number.isFinite(rawHours) || !Number.isFinite(rawMinutes)) return timeStr;

  const paddedFallback = `${String(rawHours).padStart(2, "0")}:${String(rawMinutes).padStart(2, "0")}`;
  if (!fromTimezone || !toTimezone || fromTimezone === toTimezone) {
    return paddedFallback;
  }

  try {
    const now = new Date();
    const approxUtc = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), rawHours, rawMinutes, 0)
    );
    const fromOffset = getTimezoneOffsetMinutes(approxUtc, fromTimezone);
    const instant = new Date(approxUtc.getTime() - fromOffset * 60000);

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: toTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(instant);

    const hour = String(Number(parts.find((p) => p.type === "hour")?.value || 0) % 24).padStart(2, "0");
    const minute = String(parts.find((p) => p.type === "minute")?.value || "00").padStart(2, "0");
    return `${hour}:${minute}`;
  } catch {
    return paddedFallback;
  }
}
