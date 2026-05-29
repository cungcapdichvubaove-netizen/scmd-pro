const DEFAULT_OPERATIONAL_TIMEZONE = 'Asia/Ho_Chi_Minh';

function getOperationalTimezone(): string {
  return process.env.APP_TIMEZONE || DEFAULT_OPERATIONAL_TIMEZONE;
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function getOperationalDayStart(referenceDate = new Date(), timeZone = getOperationalTimezone()): Date {
  const parts = getTimeZoneParts(referenceDate, timeZone);
  return zonedDateTimeToUtc(parts.year, parts.month, parts.day, 0, 0, 0, timeZone);
}

export function shiftLocalDateTimeToUtc(date: string, time: string, timeZone = getOperationalTimezone()): Date {
  const [rawYear, rawMonth, rawDay] = date.split('-').map(Number);
  const [rawHour, rawMinute] = time.split(':').map(Number);

  if (
    rawYear === undefined ||
    rawMonth === undefined ||
    rawDay === undefined ||
    rawHour === undefined ||
    rawMinute === undefined ||
    !Number.isFinite(rawYear) ||
    !Number.isFinite(rawMonth) ||
    !Number.isFinite(rawDay) ||
    !Number.isFinite(rawHour) ||
    !Number.isFinite(rawMinute)
  ) {
    throw new Error('INVALID_LOCAL_DATETIME');
  }

  const year = rawYear;
  const month = rawMonth;
  const day = rawDay;
  const hour = rawHour;
  const minute = rawMinute;

  return zonedDateTimeToUtc(year, month, day, hour, minute, 0, timeZone);
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, 0));
  const actualParts = getTimeZoneParts(utcGuess, timeZone);
  const actualAsUtc = Date.UTC(
    actualParts.year,
    actualParts.month - 1,
    actualParts.day,
    actualParts.hour,
    actualParts.minute,
    actualParts.second,
    0
  );
  const intendedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  return new Date(utcGuess.getTime() - (actualAsUtc - intendedAsUtc));
}
