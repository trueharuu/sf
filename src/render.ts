import { Frame, GIF, Image } from 'imagescript';
import {
  Grid,
  Piece,
  piece_color,
  piece_color_bright,
  piece_from_str,
} from './piece.js';
import { applyFilters, parallel } from './common.js';

const BW = 20 / 4;
const BH = 20 / 4;
const HL = 4 / 4;
const SHADING = 4 / 4;
const PADDING = 8 / 4;
const SHADOW = 0x26262aff;
export async function render_grid(
  g: string,
  lp: boolean = true,
  spec: boolean = true,
  lcs: boolean = true,
  delay: number = 250,
  scale: number = 4,
): Promise<Uint8Array> {
  const frames: Array<Frame> = [];
  const grids = g.split(';');
  await parallel(grids, async (m, i) => {
    const [g, comment] = m.split('@');
    const grid = g.split('|').map(x => [...x]);
    const ng = preprocess_grid(grid);

    const img = new Image(
      Math.max(
        ng[0].length * BW + 2 * PADDING + SHADING,
        comment ? comment.length * 6 + PADDING - 1 : 0,
      ),
      ng.length * BH
      + 2 * PADDING
      + HL
      + SHADING
      + (comment === undefined ? 0 : 7),
    );

    // console.log(comment);
    if (comment) {
      for (let i = 0; i < comment.length; i++) {
        const c = comment[i];
        const xo = PADDING + 6 * i;
        const yo = ng.length * BH + 2 * PADDING + HL + SHADING;
        if (c.toLowerCase() in chars) {
          const v = chars[c.toLowerCase()];
          for (const [x, y] of v) {
            img.setPixelAt(xo + x, yo + y, 0xffffffff);
          }
        }
      }
    }

    await parallel(Array(ng.length).fill(0), async (_, i) => {
      const r = ng[i];
      await parallel(Array(r.length).fill(0), async (_, j) => {
        const c = r[j];
        const has_air = (i - 1 >= 0 ? ng[i - 1][j] : Piece.E) == Piece.E;
        const is_line_clear = !r.includes(Piece.E);
        const p = c;
        const pix = piece_color(p);
        const col = lcs && is_line_clear ? applyFilters(pix, 1.2, 0.8) : pix;
        for (let pi = i * BW; pi < (i + 1) * BW; pi++) {
          for (let pj = j * BW; pj < (j + 1) * BW; pj++) {
            img.setPixelAt(pj + PADDING + 1, pi + PADDING, col);
          }
        }

        const hl = piece_color_bright(p);
        if (has_air && spec) {
          for (let pi = i * BW; pi < i * BW + HL; pi++) {
            for (let pj = j * BW; pj < (j + 1) * BW; pj++) {
              img.setPixelAt(pj + PADDING + 1, pi + PADDING - HL, hl);
            }
          }
        }

        const cpy = img.clone();
        for (const [x, y, p] of cpy.iterateWithColors()) {
          try {
            const s = cpy.getPixelAt(x + SHADING, y + SHADING);
            if ((s & 0xff) == 0 && (p & 0xff) != 0 && p != SHADOW) {
              img.setPixelAt(x + SHADING, y + SHADING, SHADOW);
            }
          } catch (_) {
            continue;
          }
        }
      });
    });

    frames[i] = Frame.from(img, delay, 0, 0, Frame.DISPOSAL_BACKGROUND);
  });

  const gv = new GIF(frames, lp ? -1 : 0);

  gv.resize(gv.width * scale, gv.height * scale);
  return await gv.encode();
}

export function preprocess_grid(
  grid: Array<Array<string>>,
): Grid {
  const ng: Array<Array<string>> = [];
  for (const i of grid) {
    const nr = [];
    for (let j = 0; j < i.length; j++) {
      const c = i[j];
      const t = Number(c);
      if (!Number.isNaN(t)) {
        if (t === 0) {
          continue;
        }

        for (let v = 0; v < t - 1; v++) {
          nr.push(i[j - 1]);
        }
      } else {
        nr.push(c);
      }
    }

    ng.push(nr);
  }

  const longest = Math.max(...ng.map(x => x.length));
  for (const i of ng) {
    while (i.length < longest) {
      i.push('e');
    }
  }
  return [
    // Array(longest).fill(Piece.E) as Piece[],
    // Array(longest).fill(Piece.E) as Piece[],
    ...ng.map(x => x.map(y => piece_from_str(y))),
  ];
}

import * as fs from 'fs';
export function renderCacheGet(
  grid: string,
  loop: boolean,
  spec: boolean,
  lcs: boolean,
) {
  try {
    return fs.readFileSync(
      `cache/${grid.replaceAll('|', '~').toLowerCase()}-${loop}-${spec}-${lcs}.gif`,
    );
  } catch {
    return undefined;
  }
}

export function renderCacheSet(
  grid: string,
  loop: boolean,
  spec: boolean,
  lcs: boolean,
  data: Buffer,
) {
  return fs.writeFileSync(
    `cache/${grid.replaceAll('|', '~').toLowerCase()}-${loop}-${spec}-${lcs}.gif`,
    data,
  );
}

export const chars: Record<string, Array<[number, number]>> = {
  'a': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],

    [0, 1],
    [4, 1],

    [0, 3],
    [4, 3],

    [0, 4],
    [4, 4],
  ],
  'b': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],

    [4, 1],
    [4, 3],

    [1, 2],
    [2, 2],
    [3, 2],
  ],
  'c': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],

    [0, 1],
    [0, 2],
    [0, 3],
  ],
  'd': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    // [4, 0],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    // [4, 4],

    [0, 1],
    [0, 2],
    [0, 3],

    [4, 1],
    [4, 2],
    [4, 3],
  ],
  'e': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    // [4, 2],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],

    [0, 1],
    [0, 3],
  ],
  'f': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    // [4, 2],

    [0, 4],

    [0, 1],
    [0, 3],
  ],
  'g': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],

    [0, 1],
    [0, 2],
    [0, 3],

    [2, 2],
    [3, 2],
    [4, 2],
    [4, 3],
  ],
  'h': [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],

    [1, 2],
    [2, 2],
    [3, 2],

    [4, 0],
    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4],
  ],
  'i': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [2, 1],
    [2, 2],
    [2, 3],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ],
  'j': [
    [4, 0],
    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
  ],
  'k': [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],

    [1, 2],
    [2, 2],

    [4, 0],
    [3, 1],
    [3, 3],
    [4, 4],
  ],
  'l': [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ],
  'm': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],

    [2, 1],
    [2, 2],

    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4],
  ],
  'n': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],

    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4],
  ],
  'o': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 1],
    [0, 2],
    [0, 3],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],

    [4, 1],
    [4, 2],
    [4, 3],
  ],
  'p': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],

    [4, 1],
    [4, 2],

    [1, 2],
    [2, 2],
    [3, 2],
  ],
  'q': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    // [4, 0],

    [0, 1],
    [0, 2],
    [0, 3],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],

    [3, 1],
    [3, 2],
    [3, 3],
  ],
  'r': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],

    [4, 1],
    [4, 2],

    [1, 2],
    [2, 2],
    [3, 2],

    [3, 3],
    [4, 4],
    [3, 4],
  ],
  's': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 1],

    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],

    [4, 3],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ],
  't': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
  ],
  'u': [
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],

    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],

    [4, 0],
    [4, 1],
    [4, 2],
    [4, 3],
  ],
  'v': [
    [1, 3],
    // [1, 4],
    [2, 4],
    // [3, 4],
    [3, 3],

    [0, 0],
    [0, 1],
    [0, 2],
    // [0, 3],

    [4, 0],
    [4, 1],
    [4, 2],
    // [4, 3],
  ],
  'w': [
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],

    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],

    [2, 2],
    [2, 3],

    [4, 0],
    [4, 1],
    [4, 2],
    [4, 3],
  ],
  'x': [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [4, 0],
    [3, 1],
    [1, 3],
    [0, 4],
  ],
  'y': [
    [0, 0],
    [4, 0],
    [0, 1],
    [4, 1],
    [0, 2],
    [1, 2],
    [3, 2],
    [4, 2],
    [2, 2],
    [2, 3],
    [2, 4],
  ],
  'z': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [3, 1],
    [2, 2],
    [1, 3],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ],
  '1': [
    [1, 0],
    [2, 0],
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
    [1, 4],
    [3, 4],
  ],
  '2': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],

    [4, 1],
    [0, 3],
  ],
  '3': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    // [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],

    [4, 1],
    [4, 3],
  ],
  '4': [
    [0, 0],
    [4, 0],
    [0, 1],
    [4, 1],
    [0, 2],
    [1, 2],
    [3, 2],
    [4, 2],
    [2, 2],
    [4, 3],
    [4, 4],
  ],
  '5': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 1],

    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    // [4, 2],

    [4, 3],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ],
  '6': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 1],

    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],

    [0, 3],
    [4, 3],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ],
  '7': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4],

    [0, 1],
  ],
  '8': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 1],
    [4, 1],

    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],

    [0, 3],
    [4, 3],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ],
  '9': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 1],
    [4, 1],

    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],

    // [0, 3],
    [4, 3],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ],
  '0': [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],

    [0, 1],
    [0, 2],
    [0, 3],

    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],

    [4, 1],
    [4, 2],
    [4, 3],

    [2, 2],
  ],
  '[': [
    [2, 0],
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
    [3, 0],
    [3, 4],
  ],
  ']': [
    [2, 0],
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
    [1, 0],
    [1, 4],
  ],
  '%': [
    [0, 0],
    [4, 4],
    [4, 0],
    [3, 1],
    [2, 2],
    [1, 3],
    [0, 4],
  ],
  '+': [
    [1, 2],
    [2, 1],
    [2, 2],
    [3, 2],
    [2, 3],
  ],
};
