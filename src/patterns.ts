import { Piece, piece_from_str } from './piece.js';
import { readFileSync } from 'fs';
export function DATA() {
  return readFileSync('data.txt', 'utf-8');
}
export function resp() {
  const resp: Record<string, Array<Pattern>> = {};
  for (const line of DATA().split('\n')) {
    const [_, r, id, grid, conts] = (/(\d+):(\w+)=(.+?)#(.*)/.exec(line)
      || []) as RegExpExecArray;
    // console.log(r);
    if (_ === undefined) {
      continue;
    }
    const g2 = grid
      .split('|')
      .map(x => x.split('').map(y => piece_from_str(y)));
    const c2 = conts
      .split(';')
      .filter(x => x !== '')
      .map(x => [
        piece_from_str(x.split(',')[0]),
        x
          .split(',')[1]
          .split('|')
          .map(y => y.split('').map(z => piece_from_str(z))),
      ]);
    resp[r] ||= [];
    resp[r].push({ id, grid: g2, continuations: c2 } as Pattern);
  }

  return resp;
}

export interface Pattern {
  id: string
  grid: Array<Array<Piece>>
  continuations: Array<[Piece, Array<Array<Piece>>]>
}
