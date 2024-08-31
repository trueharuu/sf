/* eslint-disable @typescript-eslint/no-misused-promises */
import express from 'express';
import {
  preprocess_grid,
  render_grid,
  renderCacheGet,
  renderCacheSet,
} from './render.js';
import { pathfind } from './ren.js';
import {
  mirror_grid,
  mirror_of,
  parse_grid,
  Piece,
  piece_from_str,
  to_grid,
} from './piece.js';
import { DATA, resp } from './patterns.js';
import { find_2nd } from './2nd.js';
import { Image } from 'imagescript';
import * as fs from 'fs';
import { after_line_clear, areGridsEqual } from './common.js';
const app = express();

app.get('/render', async (req, res) => {
  res.set('Content-Type', 'image/gif');

  const [grid, loop, spec, lcs] = [
    String(req.query.grid),
    req.query.loop ? req.query.loop === 'true' : true,
    req.query.spec ? req.query.spec === 'true' : true,
    req.query.lcs ? req.query.lcs === 'true' : true,
  ];

  const g2 = to_grid(preprocess_grid(grid.split('|').map(x => x.split(''))));
  const cached = renderCacheGet(g2, loop, spec, lcs);

  if (cached !== undefined) {
    return res.send(cached);
  }

  const gif = Buffer.from(await render_grid(g2, loop, spec, lcs, 250));

  renderCacheSet(grid, loop, spec, lcs, gif);

  res.send(gif);
});

app.get('/listren/:res', (req, res) => {
  let txt = '';
  txt += `<h1>All ${req.params.res}-residual patterns</h1>`;
  const p = resp()[req.params.res];
  let v = 0;
  let b = 0;
  console.log(p.length);
  console.log(areGridsEqual([], parse_grid('eeee|jeee|jjje')));
  for (const r of p) {
    txt += `<h2><span class=meta>#</span>${r.id}</h2>`;
    v += 1;
    txt += `<img class=g4 src='/render?grid=${to_grid(r.grid)}&spec=false'><br>`;
    for (const c of r.continuations.sort((a, b) => a[0].localeCompare(b[0]))) {
      v += 1;
      const leads_to = after_line_clear(c[1], p)?.id || '?';
      if (leads_to === '?') {
        b += 1;
      }
      txt += `<div style='display:inline-block; padding-top: 2%'>
        <a href='/listren/${req.params.res}/${leads_to}'><img class=g4 src='/render?grid=${to_grid(c[1])}&spec=false'></a>
        <br><span class='mino' style='color:var(--${c[0].toLowerCase()}b)'>${c[0]}</span><span class='meta' style='padding-left: 10px'>${leads_to}</span>
      </div>`;
    }
  }
  const html = `<html><head><link rel=stylesheet href=\'../../static/main.css\'></head><body><i class=meta>There are <b>${v}</b> images on this page. It may take some time for your browser to load all of them.</i><br>${txt}</body></html>`;
  console.log(v, 'images rendered');
  console.log(b, 'unknown continuations');
  res.contentType('text/html');
  res.send(html);
});

app.get('/listren/:res/:at', (req, res) => {
  let txt = '';

  const p = resp()[req.params.res];
  const r = p.find(x => x.id === req.params.at);
  if (r === undefined) {
    return res.contentType('text/plain').send('unknown pattern');
  }

  txt += `<h1><span class=meta>#</span>${r.id}</h2>`;
  txt += `<a class=meta href='/listren/${req.params.res}'><i>${req.params.res}-residual patterns</i></a><br>`;
  txt += `<img class=g4 src='/render?grid=${to_grid(r.grid)}&spec=false'><br>`;

  txt += '<h2>Continuations</h2>';
  for (const c of r.continuations.sort((a, b) => a[0].localeCompare(b[0]))) {
    const leads_to = after_line_clear(c[1], p)?.id || '?';
    txt += `<div style='display:inline-block; padding-top: 2%'>
      <a href='/listren/${req.params.res}/${leads_to}'><img class=g4 src='/render?grid=${to_grid(c[1])}&spec=false'></a>
      <br><span class='mino' style='color:var(--${c[0].toLowerCase()}b)'>${c[0]}</span><span class='meta' style='padding-left: 10px'>${leads_to}</span>
    </div>`;
  }
  txt += '<h2>Sources</h2>';
  for (const b of p) {
    for (const c of b.continuations) {
      const alc = after_line_clear(c[1], p);
      if (alc && alc.id === r.id) {
        txt += `<div style='display:inline-block; padding-top: 2%'>
                  <a href='/listren/${req.params.res}/${b.id}'><img class=g4 src='/render?grid=${to_grid(c[1])}&spec=false'></a>
                  <br><span class='mino' style='color:var(--${c[0].toLowerCase()}b)'>${c[0]}</span><span class='meta' style='padding-left: 10px'>${b.id}</span>
                </div>`;
      }
    }
  }
  res.contentType('text/html');
  const html = `<html><head><link rel=stylesheet href=\'../../static/main.css\'></head><body>${txt}</body></html>`;
  res.send(html);
});

app.get('/render/clear', (req, res) => {
  fs.rmdirSync('cache', { recursive: true });
  fs.mkdirSync('cache');
  res.send('ok');
});

app.get('/ren/:res/checks', async (req, res) => {
  let stdout = '';
  const v = resp()[req.params.res];
  const plist = new Map<string, string>();
  let noc = 0;
  for (const p of v) {
    const has_i_flat_cont = p.continuations.find(x =>
      x[1].some(y => y.every(z => z === Piece.I)),
    );

    if (!has_i_flat_cont) {
      stdout += `${p.id} has no flat I continuation\n`;
    }

    const h = plist.get(to_grid(p.grid));
    if (h !== undefined) {
      stdout += `${p.id} is a duplicate of ${h}\n`;
    } else {
      plist.set(to_grid(p.grid), p.id);
    }

    const counts: Partial<Record<Piece, number>> = {};
    for (let i = 0; i < p.continuations.length; i++) {
      const c = p.continuations[i];
      counts[c[0]] ??= -1;
      counts[c[0]]!++;
      const alc = after_line_clear(c[1], v);
      // console.log(alc);
      if (alc === undefined) {
        noc += 1;
        stdout += `${p.id}#${c[0]}${counts[c[0]] || 0} has no path\n`;
      }
    }
  }

  const tot = v.map(x => x.continuations.length).reduce((p, v) => p + v, 0);
  const stats = `[${req.params.res}res] ${v.length} total patterns\n${noc}/${tot} (${((100 * noc) / tot).toFixed(2)}%) continuations have no path`;
  res.contentType('text/plain');

  res.send(`${stats}\n\n${stdout || 'all good!'}`);
});

app.get('/ren/:res/:at', async (req, res) => {
  const v = resp()[req.params.res].find(x => x.id === req.params.at);
  // console.log(v);
  res.contentType('image/gif');
  const x = Buffer.from(await render_grid(to_grid(v!.grid), false));
  res.send(x);
});

app.get('/ren/:res/latest/mirror', async (req, res) => {
  const v = resp()[req.params.res].reverse()[0];
  res.contentType('text/plain');
  res.send(
    `${req.params.res}:${v?.id.endsWith('M') ? v.id.slice(0, -1) : v?.id + 'M'}=${to_grid(mirror_grid(v.grid))}#${v.continuations.map(x => `${mirror_of(x[0]).toLowerCase()},${to_grid(mirror_grid(x[1]))}`).join(';')}`,
  );
});

app.get('/txt/ren', async (req, res) => {
  const rs = String(req.query.res || '6');
  const at = String(req.query.at || '1');
  const hold = req.query.hold
    ? piece_from_str(String(req.query.hold))
    : undefined;
  const k = resp()[rs];
  const q = String(req.query.queue)
    .split('')
    .map(x => piece_from_str(x));
  const board = k.find(x => x.id === at)!;

  if (board === undefined) {
    return res.contentType('text/plain').send('unknown pattern');
  }
  const path = await pathfind({
    board,
    patterns: k,
    queue: q,
    hold,
  });

  let txt = '';

  txt += `<h2>${rs}-Residual Combo Finder</h2>`;
  txt += `<i class=meta>
  Combo for pattern
    <select style='background-color:var(--bg);border:none;color:white;font-family:Inter' id=s>
      ${k.map(x => `<option ${x.id === at ? 'selected' : ''}>${x.id}</option>`).join('')}
    </select>
    with queue
    <input size=7 id=fx class=mino style='text-transform:uppercase;caret-color: var(--i);outline:none;background-color:var(--bg);border:0px solid var(--i);color:white;width:fit-content;border-bottom-width:1px;'>
    </input>
    and
    <input size=1 id=hx class=mino style='text-transform:uppercase;caret-color: var(--i);outline:none;background-color:var(--bg);border:0px solid var(--i);color:white;width:fit-content;border-bottom-width:1px;'>
    </input>
    in hold
  </i>
  <br><br>
  <a class=meta style='padding-left:20px;filter:brightness(125%);' href='/txt/ren?res=3&at=1&queue='>3-Residual Combo Finder</a>
  <a class=meta style='padding-left:20px;filter:brightness(125%);' href='/txt/ren?res=4&at=1&queue='>4-Residual Combo Finder</a>
  <a class=meta style='padding-left:20px;filter:brightness(125%);' href='/txt/ren?res=6&at=1&queue='>6-Residual Combo Finder</a>`;

  txt += `<h3>Starting board</h3><div><img class=g4 src='/render?grid=${to_grid(board.grid)}&spec=false'><br><span class=meta>${board.id}</span></div>`;

  txt += '<br><h3>Path</h3>';
  for (const p of path) {
    if (p[2] !== undefined) {
      const bc = after_line_clear(p[2], k)?.id;
      txt += `<a href='/txt/ren?res=${rs}&at=${bc}&queue=&hold='><div style='display:inline-block'>
        <img class=g4 src='/render?grid=${to_grid(p[2])}&spec=false'>
        <br>
        <span class='mino' style='color:var(--${p[1].toLowerCase()}b)'>${p[1]}</span>
        <span class=meta style='padding-left: 10px'>${bc || '?'}
      </div></a>`;
    }
  }

  txt += `<script>
    let ci = '';
    const fx = document.getElementById('fx');
    const hx = document.getElementById('hx');
    fx.value = '${String(req.query.queue || '').toUpperCase()}'
    hx.value = '${String(req.query.hold || '').toUpperCase()}'
    fx.oninput = (t) => {
      const target = t.target;
      const c = /^[IJOLZST]*$/gi;
      c.test(target.value) ? (ci = target.value.toUpperCase()) : (target.value = ci.toUpperCase())
      window.location.href = \`/txt/ren?res=${rs}&at=\${s.value}&queue=\${fx.value.toUpperCase() || ''}&hold=\${hx.value}\`
    };

    hx.oninput = (t) => {
      const target = t.target;
      const c = /^[IJOLZST]$/gi;
      c.test(target.value) ? (ci = target.value.toUpperCase()) : (target.value = ci.toUpperCase())
      window.location.href = \`/txt/ren?res=${rs}&at=\${s.value}&queue=\${fx.value.toUpperCase() || ''}&hold=\${hx.value}\`
    };

    fx.focus();
    const s = document.getElementById('s');
    s.oninput = (t) => { window.location.href = \`/txt/ren?res=${rs}&at=\${s.value}&queue=\${fx.value.toUpperCase() || ''}&hold=\${hx.value}\` };
    </script>`;

  res.contentType('text/html');
  const html = `<html><head><link rel=stylesheet href=\'../../../../static/main.css\'></head><body>${txt}</body></html>`;
  res.send(html);
});

app.get('/ren/:res/:at/mirror', async (req, res) => {
  const v = resp()[req.params.res].find(x => x.id === req.params.at)!;
  res.contentType('text/plain');
  res.send(
    `${req.params.res}:${v?.id.endsWith('M') ? v.id.slice(0, -1) : v?.id + 'M'}=${to_grid(mirror_grid(v.grid))}#${v.continuations.map(x => `${mirror_of(x[0]).toLowerCase()},${to_grid(mirror_grid(x[1]))}`).join(';')}`,
  );
});

app.get('/ren/:res/:at/:queue', async (req, res) => {
  const q = String(req.params.queue)
    .split('')
    .map(x => piece_from_str(x));
  const path = await pathfind({
    board: resp()[req.params.res].find(x => x.id === req.params.at) as never,
    patterns: resp()[req.params.res],
    queue: q,
  });

  console.log(
    'given queue',
    q,
    'path used',
    path.map(x => x[1]),
  );

  const v = path.map(x => to_grid(x[2])).join(';');
  res.contentType('image/gif');
  res.set('X-Max-Ren', (path.length - 1).toString());
  const x = Buffer.from(await render_grid(v, false));
  res.send(x);
});
app.get('/ren/:res/:at/with/:piece', async (req, res) => {
  const path = resp()
    [req.params.res].find(x => x.id === req.params.at)
    ?.continuations.filter(
      x => String(x[0]) === req.params.piece.toUpperCase()[0],
    )[Number(req.params.piece[1]) || 0];
  res.contentType('image/gif');
  const x = Buffer.from(await render_grid(to_grid(path![1]), false));
  res.send(x);
});

app.get('/find/:res/:grid', async (req, res) => {
  const v = resp()[req.params.res];
  return res.send(after_line_clear(parse_grid(req.params.grid), v)?.id);
});

app.get('/pc/:queue', async (req, res) => {
  const q = req.params.queue;
  const pc = DATA()
    .split('\n')
    .filter(x => x.startsWith('pc4:') || x.startsWith('pn4:'))
    .filter(
      x =>
        /p(?:c|n)4:(\w+).+/.exec(x)?.[1].split('').sort().join('')
        === String(q).split('').sort().join(''),
    );
  if (pc.length) {
    const r = pc
      .map(x => /p(?:c|n)4:(\w+)=(.+)/g.exec(x))
      .map(x => x?.[2] || '')[0];
    return res
      .contentType('image/gif')
      .send(Buffer.from(await render_grid(r, false, true, false)));
  }
});

app.get('/test', async (req, res) => {
  res.contentType('image/png');
  const v = await Image.renderText(fs.readFileSync('pixel.ttf'), 20, 'IJOLZST');
  res.send(Buffer.from(await v.encode()));
});

app.get('/2nd/:queue', async (req, res) => {
  const pc = find_2nd(String(req.params.queue));
  if (pc) {
    res.contentType('image/gif');
    res.send(Buffer.from(await render_grid(pc[1])));
  } else {
    res.send('No 2nd PC found.');
  }
});

app.use('/static', express.static('static'));

app.get('/tools/grid', async (req, res) => {
  const wid = Number(req.query.width || '4');
  const hei = Number(req.query.height || '5');

  res.contentType('text/html');
  let txt = '<style>.box { width: 40px; height: 40px; border: none; }</style>';
  for (const p in Piece) {
    txt += `<button class='box' style='background-color:var(--${p.toLowerCase()}b);color:transparent' onclick='setcolor("${p}")'>${p}</button>`;
  }

  txt += '<br><br><br>';
  for (let i = 0; i < hei; i++) {
    for (let j = 0; j < wid; j++) {
      txt += `<button class='box' id='box-${i}${j}' onclick='paint(${i}, ${j})'></button>`;
    }

    txt += '<br>';
  }

  txt += `<script>
    let selectedcolor = 'e';

    const btns = [];
    for (let i = 0; i < ${hei}; i++) {
      btns[i] ||= []
      for (let j = 0; j < ${wid}; j++) {
        btns[i][j] = document.getElementById(\`box-\${i}\${j}\`);
        paint(i, j);
      }
    }

    function paint(i, j) {
      if (btns[i][j].cc === selectedcolor) {
        btns[i][j].style.backgroundColor = \`var(--eb)\`;
        btns[i][j].cc = 'e';
      } else {
        btns[i][j].style.backgroundColor = \`var(--\${selectedcolor}b)\`;
        btns[i][j].cc = selectedcolor;
      }
    }

    function setcolor(c) {
      selectedcolor = c.toLowerCase();
    }

    document.onkeydown = (k) => {
      if (k.ctrlKey && k.key === 's') {
        k.preventDefault();
        const text = btns.map(x=>x.map(y=>y.cc).join('')).join('|');
        const p = text.match(/[ijolzst]/g)?.[0] || 'e';
        const type = "text/plain";
        const blob = new Blob([p==='e'?text:p+','+text+';'], { type });
        const data = [new ClipboardItem({ [type]: blob })];
        navigator.clipboard.write(data);
      } else if (k.ctrlKey & k.key === 'z') {
        for (const row of btns) {
          for (const col of row) {
            if (col.cc !== 'e' && col.cc !== 'g') {
              col.style.backgroundColor = \`var(--eb)\`;
              col.cc = 'e';
            }
          }
        }
      }
    };
  </script>`;
  const html = `<html><head><link rel=stylesheet href=\'../../static/main.css\'></head><body>${txt}</body></html>`;
  res.send(html);
});

app.listen(3000);
