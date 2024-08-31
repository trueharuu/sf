import { Pattern } from './patterns.js';
import { Piece } from './piece.js';

export function applyFilters(
  color: number,
  brightness: number,
  saturation: number,
): number {
  // Extract the RGBA components
  const r: number = (color >> 24) & 0xff;
  const g: number = (color >> 16) & 0xff;
  const b: number = (color >> 8) & 0xff;
  const a: number = color & 0xff;

  const [r2, g2, b2, a2] = [r * brightness, g * brightness, b * brightness, a];

  // Convert RGB to HSL
  // eslint-disable-next-line prefer-const
  let [h, s, l]: [number, number, number] = rgbToHsl(r2, g2, b2);

  // Apply brightness and saturation adjustments
  s = Math.min(Math.max(s * saturation, 0), 100); // Clamping between 0 and 100

  // Convert HSL back to RGB
  const [newR, newG, newB]: [number, number, number] = hslToRgb(h, s, l);

  // Recombine the components into a single color value
  const newColor: number = (newR << 24) | (newG << 16) | (newB << 8) | a2;

  return newColor;
}

// Helper function to convert RGB to HSL
export function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max: number = Math.max(r, g, b);
  const min: number = Math.min(r, g, b);
  const l: number = (max + min) / 2;

  let h: number, s: number;
  if (max === min) {
    h = s = 0; // Achromatic
  } else {
    const delta: number = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case r:
        h = (g - b) / delta + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      case b:
        h = (r - g) / delta + 4;
        break;
      default:
        h = 0;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// Helper function to convert HSL back to RGB
export function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // Achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q: number = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p: number = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function after_line_clear(
  g: Array<Array<Piece>>,
  patterns: Array<Pattern>,
): Pattern | undefined {
  const v = g.filter(x => x.includes(Piece.E));

  const grey = v.map(x => x.map(y => (y === Piece.E ? Piece.E : Piece.G)));

  return patterns.find(x => areGridsEqual(x.grid, grey));
}

export function areGridsEqual(
  grid1: Array<Array<Piece>>,
  grid2: Array<Array<Piece>>,
): boolean {
  // console.log(grid1, grid2);
  if (grid1.length === 0) {
    return grid2.length === 0;
  }
  if (grid2.length === 0) {
    return grid1.length === 0;
  }
  while (grid1[0] && grid1[0].every(x => x === Piece.E)) {
    grid1 = grid1.slice(1);
  }
  while (grid2[0] && grid2[0].every(x => x === Piece.E)) {
    grid2 = grid2.slice(1);
  }
  for (let i = 0; i < grid1.length; i++) {
    if (grid1[i].length !== grid2[i].length) return false;
    for (let j = 0; j < grid1[i].length; j++) {
      if (grid1[i][j] !== grid2[i][j]) return false;
    }
  }
  return true;
}

export async function parallel<T, U>(
  v: Array<T>,
  f: (t: T, idx: number) => Promise<U>,
): Promise<Array<U>> {
  return await Promise.all(v.map((x, i) => f(x, i)));
}
