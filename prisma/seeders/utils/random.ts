export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomElement<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

export function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const FIRST_NAMES = ['An', 'Bình', 'Công', 'Dũng', 'Em', 'Phúc', 'Gia', 'Hải', 'Linh', 'Minh', 'Ngọc', 'Phương', 'Quân', 'Sơn', 'Tài', 'Uyên', 'Vinh', 'Xuân', 'Yến'];
const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi'];
const MIDDLE_NAMES = ['Văn', 'Thị', 'Đức', 'Hữu', 'Thanh', 'Hải', 'Gia', 'Minh'];

export function generateVNName() {
  const last = randomElement(LAST_NAMES);
  const middle = randomElement(MIDDLE_NAMES);
  const first = randomElement(FIRST_NAMES);
  return `${last} ${middle} ${first}`;
}

export function generateIdNumber() {
  return `079${randomInt(100000000, 999999999)}`;
}

export function generatePhone() {
  return `09${randomInt(10000000, 99999999)}`;
}

export function generateCoordinates(centerLat: number, centerLng: number, radiusKm: number = 0.5) {
  const radiusInDegrees = radiusKm / 111.0;
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  const newLng = x / Math.cos(centerLat * Math.PI / 180);
  return {
    lat: centerLat + y,
    lng: centerLng + newLng
  };
}
