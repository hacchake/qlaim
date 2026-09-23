
// ================= ヘッドレス検証 =================
let fails = 0;
function assert(name, cond, info) {
  if (cond) console.log('OK  ' + name + (info !== undefined ? '  [' + info + ']' : ''));
  else { console.log('NG  ' + name + '  [' + info + ']'); fails++; }
}
const DNAME = { '0,-1':'up', '1,0':'right', '0,1':'down', '-1,0':'left' };
function steps(dx, dy, n) { const d = DNAME[dx + ',' + dy]; let c = 0; for (let i = 0; i < n; i++) { if (!playerMove(d)) break; c++; } return c; }
const openAt = q => grid[surf.qixCell(q)] === OPEN;
const pxy = () => (player.c % GW) + ',' + ((player.c / GW) | 0);
const nbs = c => Array.from(surf.nb.slice(c * 4, c * 4 + 4));
function countCells(v) { let n = 0; for (let i = 0; i < surf.N; i++) if (grid[i] === v) n++; return n; }

settings.mode = 'PLANE'; initLevel(1);

// ---- 1) 初期状態 ----
assert('初期位置が境界上', isBoundary(player.c), pxy());
assert('初期占領率0%', percent() === 0);

// ---- 2) 壁沿い移動 ----
let m = steps(-1, 0, 10);
assert('壁沿いに10歩移動', m === 10, m);

// ---- 3) 描画→停止→導火線→ミス ----
held.fast = false;
m = steps(0, -1, 1);
assert('方向キーだけで空き地へ進むと遅い線(×2)を引き始める', m === 1 && player.drawing && !player.usedFast);
held.fast = true;
m = steps(0, -1, 19);
assert('Zを押すと速い線(×1)になる', m === 19 && trail.length === 20 && player.usedFast, m + '/' + trail.length);
for (let i = 0; i < 120 && deathTimer <= 0; i++) updateFuse(1/30, false);
assert('導火線点火', fuse.lit);
assert('導火線でミス発生', deathTimer > 0, deathTimer.toFixed(2));
applyDeath();
assert('軌跡が消えている', countCells(TRAIL) === 0 && !player.drawing);
assert('残機が減少', lives === settings.lives - 1, lives);
assert('描画開始地点に復帰', player.c === trailStart, pxy());

// ---- 4) 囲んで占領 ----
player.invuln = 0; held.fast = true;
const beforeClaimed = claimed;
steps(0, -1, 20); steps(-1, 0, 15);
m = steps(0, 1, 25);
assert('軌跡が閉じた', !player.drawing, 'down歩数=' + m);
assert('占領が発生', claimed > beforeClaimed, 'claimed=' + claimed + ' (' + percent().toFixed(2) + '%)');
assert('TRAILセル残存なし', countCells(TRAIL) === 0);
assert('占領数の整合', claimed === initOpen - countCells(OPEN), claimed + ' vs ' + (initOpen - countCells(OPEN)));
assert('QIXは空き地に居る', qixes.every(openAt));
assert('占領後も境界上', isBoundary(player.c), pxy());

// ---- 5) SPARX巡回 ----
for (let i = 0; i < 300; i++) sparxes.forEach(stepSparx);
assert('SPARXが境界上を巡回', sparxes.every(s => isBoundary(s.c)), sparxes.map(s => s.c).join(' / '));

// ---- 6) QIX移動(壁抜けなし) ----
for (let i = 0; i < 600; i++) updateQixes(1/60);
assert('QIXが空き地に留まる', qixes.every(openAt),
       qixes.map(q => q.x.toFixed(1) + ',' + q.y.toFixed(1)).join(' / '));

// ---- 7) 75%クリア ----
claimed = Math.ceil(initOpen * 0.76);
startClear(false);
assert('75%でクリア遷移', state === 'clear' && !wasSplit, 'bonus=' + lastBonus);

// ---- 8) 設定保存フォールバック ----
store.set('t.x', 5);
assert('storeフォールバック', store.get('t.x', 0) === 5);

// ---- 9) 音名→周波数 ----
assert('hz(A4)=440', Math.abs(hz('A4') - 440) < 0.01, hz('A4').toFixed(2));
assert('hz(C4)≈261.63', Math.abs(hz('C4') - 261.63) < 0.05, hz('C4').toFixed(2));
assert('hz(G#3)≈207.65', Math.abs(hz('G#3') - 207.65) < 0.05, hz('G#3').toFixed(2));
const badNotes = [];
for (const k in BGMDATA) for (const tr of BGMDATA[k].tracks) if (tr.s)
  for (const nm of tr.s) if (nm && !/^([A-G])(#?)(-?\d)$/.test(nm)) badNotes.push(k + ':' + nm);
assert('BGM譜面の音名がすべて正しい', badNotes.length === 0, badNotes.join(','));
assert('orbitの各トラック長=len', BGMDATA.orbit.tracks.every(t => !t.s || t.s.length === BGMDATA.orbit.len));

// ---- 10) テーマ切替 ----
let wallsBefore = countCells(WALL);
settings.theme = 2; applyTheme();
let wallsAfter = countCells(WALL);
assert('テーマ切替でグリッド不変', wallsBefore === wallsAfter && themePal.length === 8,
       wallsBefore + '/' + themePal.length);
assert('立体用の色表が揃う', col3D.length === NCOL * LV && col3D.every(c => /^rgb\(\d+,\d+,\d+\)$/.test(c)), col3D.length);
settings.theme = 0; applyTheme();

// ---- 11) OPTIONS操作 ----
optSel = OPT_ITEMS.findIndex(o => o.k === 'diff');
settings.diff = 'NORMAL';
adjustOpt(1);
assert('難易度がHARDへ巡回', settings.diff === 'HARD', settings.diff);
const fuseHard = effFuseDelay();
settings.diff = 'NORMAL';
const fuseNorm = effFuseDelay();
assert('HARDは導火線猶予が短い', fuseHard < fuseNorm, fuseHard + ' < ' + fuseNorm);
optSel = 0; settings.bgm = 6; adjustOpt(1);
assert('BGM音量+1', settings.bgm === 7, settings.bgm);

// ---- 12) BGM(AudioContext無しでも安全) ----
Bgm.play('play');
assert('BGMはAC無しなら予約のみ', Bgm.want === 'play' && !Bgm.playing);

// ---- 13) READYフロー ----
startGame();
assert('startGameでready状態', state === 'ready' && level === 1 && surf.key === 'PLANE');
stTimer = 2; tickMeta(0.016);
assert('READY経過でplayへ', state === 'play');

// ---- 14) AREA3: QIX2体・同一領域なら通常占領 ----
initLevel(3);
assert('AREA3でQIX2体', qixes.length === 2);
setState('play');
qixes[0].x = 40; qixes[0].y = 30; qixes[1].x = 88; qixes[1].y = 30;
player.c = idx(GW >> 1, GH - 1); player.drawing = false; player.invuln = 0; trail = [];
held.fast = true;
steps(0, -1, 10); steps(1, 0, 8); steps(0, 1, 12);
assert('2QIX同領域→通常閉鎖', !player.drawing && !wasSplit && state === 'play',
       'pct=' + percent().toFixed(2));
assert('両QIXとも空き地', qixes.every(openAt));

// ---- 15) QIX分断 → 即クリア ----
initLevel(3); setState('play');
qixes[0].x = 20; qixes[0].y = 80; qixes[1].x = 108; qixes[1].y = 80;
player.c = idx(GW >> 1, GH - 1); player.invuln = 0;
held.fast = true;
m = steps(0, -1, 200);
assert('縦断ラインで閉鎖', m === GH - 1, m);
assert('分断で即クリア', state === 'clear' && wasSplit, 'pct=' + percent().toFixed(1));
assert('圧殺されたQIXが除去', qixes.length === 1);
assert('SPLITボーナス加算', lastBonus >= CONFIG.SPLIT_BONUS, lastBonus);

// ---- 16) TOURモードの盤面の巡回 ----
settings.mode = 'TOUR';
assert('TOUR: 平面→立方体→球…→一巡して平面', ['PLANE','CUBE','SPHERE'].every((k, i) => surfaceFor(i + 1) === k)
       && surfaceFor(CONFIG.TOUR.length + 1) === 'PLANE', CONFIG.TOUR.length);
assert('TOURは全盤面を含む', Object.keys(CONFIG.SURF).every(k => CONFIG.TOUR.includes(k)));
settings.mode = 'CUBE';
assert('単独モードは常に同じ盤面', surfaceFor(1) === 'CUBE' && surfaceFor(5) === 'CUBE');

// ---- 17) 立方体・球のつながり(グラフ)が正しい ----
for (const key of ['CUBE', 'SPHERE']) {
  const S = getSurface(key), n = S.n;
  const nbOf = c => Array.from(S.nb.slice(c * 4, c * 4 + 4));
  let bad = 0, asym = 0;
  for (let c = 0; c < S.N; c++) {
    const ns = nbOf(c);
    if (new Set(ns).size !== 4 || ns.some(b => b < 0 || b === c)) bad++;
    for (const b of ns) if (!nbOf(b).includes(c)) asym++;
  }
  assert(key + ': 全セルに異なる4近傍', bad === 0, 'N=' + S.N + ' bad=' + bad);
  assert(key + ': 隣り合いが対称', asym === 0, asym);
  // 直進を 4n 歩続けるとぐるっと一周して元に戻る(面の継ぎ目で向きが崩れないこと)
  let loops = 0;
  for (const start of [0, 5 * n * n + 3 * n + 7, 3 * n * n - 1]) for (let k0 = 0; k0 < 4; k0++) {
    let prev = start, c = S.nb[start * 4 + k0];
    for (let s = 1; s < 4 * n; s++) {
      const kp = nbOf(c).indexOf(prev);
      prev = c; c = S.nb[c * 4 + ((kp + 2) & 3)];
    }
    if (c === start) loops++;
  }
  assert(key + ': 直進4n歩で一周して戻る', loops === 12, loops + '/12');
  let d8 = 0;
  for (let c = 0; c < S.N; c++) { let k = 0; for (let j = 0; j < 8; j++) if (S.nb8[c * 8 + j] >= 0) k++; if (k < 7 || k > 8) d8++; }
  assert(key + ': 斜め込み近傍は7〜8個', d8 === 0, d8);
  let back = 0;
  for (let c = 0; c < S.N; c++) if (S.cellAt(S.dir[c * 3], S.dir[c * 3 + 1], S.dir[c * 3 + 2]) !== c) back++;
  assert(key + ': 方向→セルの逆引きが一致', back === 0, back);
}

// ---- 18) 球: 初期陣地・QIX・SPARX ----
settings.mode = 'SPHERE'; startGame(); stTimer = 2; tickMeta(0.016);
assert('球でplay開始', state === 'play' && surf.key === 'SPHERE' && surf.is3D);
assert('球: 初期位置がHOMEの縁', isBoundary(player.c) && grid[player.c] === WALL);
assert('球: 初期占領率0% / 空きセル整合', percent() === 0 && initOpen === countCells(OPEN), initOpen + '/' + surf.N);
assert('球: QIXは空き地から', qixes.every(openAt));
for (let i = 0; i < 900; i++) updateQixes(1/60);
assert('球: QIXが空き地に留まる', qixes.every(openAt));
for (let i = 0; i < 300; i++) sparxes.forEach(stepSparx);
assert('球: SPARXがHOMEの縁を巡回', sparxes.every(s => isBoundary(s.c)));

// ---- 18b) 立体面のSPARXは出現待ちの間は動かず当たらない ----
{
  startGame(); stTimer = 2; tickMeta(0.016);
  const s0 = sparxes[0], c0 = s0.c;
  assert('球: 開始時SPARXは1体・出現待ちあり', sparxes.length === 1 && s0.wait > 0, s0.wait);
  player.c = c0; player.invuln = 0;
  updateSparxes(0.5);
  assert('球: 出現待ち中は動かず当たらない', s0.c === c0 && deathTimer <= 0);
  for (let i = 0; i < 400; i++) updateSparxes(1/60);
  assert('球: 待ち時間後は動き出す', s0.wait <= 0 && (s0.c !== c0 || deathTimer > 0));
  deathTimer = 0; lives = settings.lives;
  startGame(); stTimer = 2; tickMeta(0.016);
}

// ---- 19) 球: カメラが自機を正面に捉え、画面の向きで移動を選ぶ ----
{
  const p = surf.screenOf(player.c);
  assert('球: 自機が画面中央付近', Math.abs(p.x - cam.cx) < 20 && Math.abs(p.y - cam.cy) < 60,
         p.x.toFixed(0) + ',' + p.y.toFixed(0));
  held.fast = false;
  const r = chooseMove('right'), l = chooseMove('left');
  const pr = surf.screenOf(r), pl = surf.screenOf(l);
  assert('球: →で右隣、←で左隣の線へ', r >= 0 && l >= 0 && pr.x > p.x && pl.x < p.x,
         pr.x.toFixed(0) + ' / ' + pl.x.toFixed(0));
  const dn = chooseMove('down');
  assert('球: 方向キーだけで空き地へ出られる', dn >= 0 && grid[dn] === OPEN, dn);
}

// ---- 20) 球: 線を引いて囲む(HOMEの下に四角く張り出す) ----
{
  player.invuln = 0; held.fast = true;
  const c0 = claimed;
  const a = steps(0, 1, 5);          // 下(HOME から離れる向き)
  const b = steps(1, 0, 3);          // 右
  for (let i = 0; i < 20 && player.drawing; i++) playerMove('up');
  assert('球: 画面の向きで描画できる', a === 5 && b === 3, a + '/' + b);
  assert('球: 囲んで閉じた', !player.drawing && countCells(TRAIL) === 0);
  assert('球: 占領が発生', claimed > c0, 'claimed=' + claimed + ' (' + percent().toFixed(2) + '%)');
  assert('球: 占領数の整合', claimed === initOpen - countCells(OPEN));
  assert('球: 占領後も境界上', isBoundary(player.c));
  assert('球: QIXは空き地に居る', qixes.every(openAt));
}

// ---- 21) 立方体: 面の継ぎ目をまたいで線を引ける ----
settings.mode = 'CUBE'; startGame(); stTimer = 2; tickMeta(0.016);
{
  held.fast = true; player.invuln = 0;
  const n = surf.n, face = c => (c / (n * n)) | 0;
  let crossed = false, moved = 0;
  for (let i = 0; i < 3 * n; i++) {
    if (!playerMove('down')) break;
    moved++;
    for (let j = 0; j < 3; j++) tickMeta(1/30);   // カメラが追いかける
    if (face(player.c) !== 0) { crossed = true; break; }
  }
  assert('立方体: 下へ描き進めると隣の面へ', crossed && player.drawing, 'moved=' + moved + ' face=' + face(player.c));
  const f1 = face(player.c);
  for (let i = 0; i < 5; i++) { playerMove('down'); tickMeta(1/30); }
  assert('立方体: 継ぎ目の先でも同じ面を直進', face(player.c) === f1 && player.drawing, face(player.c));
  // 導火線でミス → 軌跡は消える
  for (let i = 0; i < 400 && deathTimer <= 0; i++) updateFuse(1/30, false);
  applyDeath();
  assert('立方体: ミスで軌跡が消え陣地に戻る', countCells(TRAIL) === 0 && isBoundary(player.c) && face(player.c) === 0);
}

// ---- 22) 立方体: QIX2体の分断 → 即クリア ----
initLevel(3); setState('play');
{
  assert('立方体AREA3でQIX2体', qixes.length === 2);
  const n = surf.n;
  qixes[0].p = vnorm([-1, 0.1, -0.3]); qixes[1].p = vnorm([1, 0.1, -0.3]);
  // x≈0 の大円に沿った1マス幅の輪を壁にする(HOMEの真上の1マスだけ残し、そこを自機が描いて閉じる)
  const ring = [];
  for (let c = 0; c < surf.N; c++) {
    const x = surf.dir[c * 3];
    if (x >= 0 && x < 1 / n && grid[c] === OPEN) ring.push(c);
  }
  const gap = ring.find(c => nbs(c).some(b => isBoundary(b)));
  for (const c of ring) if (c !== gap) { grid[c] = WALL; colA[c] = 0; claimed++; }
  const onOpen = qixes.every(openAt);
  const from = nbs(gap).find(b => isBoundary(b));
  player.c = from; player.drawing = false; player.invuln = 0; held.fast = true;
  playerStep(gap);
  const to = nbs(gap).find(b => b !== from && grid[b] === WALL);
  if (player.drawing) playerStep(to);
  assert('立方体: QIXが輪の両側の空き地に居る', onOpen, 'ring=' + ring.length);
  assert('立方体: 分断で即クリア', state === 'clear' && wasSplit, 'state=' + state + ' pct=' + percent().toFixed(1));
  assert('立方体: 圧殺されたQIXが除去', qixes.length === 1);
}

// ---- 23) タイトルで盤面モード切替 ----
setState('title'); settings.mode = 'TOUR';
cycleMode(1);
assert('モード切替 TOUR→PLANE', settings.mode === 'PLANE' && surf.key === 'PLANE');
cycleMode(1); cycleMode(1);
assert('モード切替 →SPHERE で盤面も球に', settings.mode === 'SPHERE' && surf.key === 'SPHERE');
for (let i = 3; i < MODES.length; i++) cycleMode(1);
assert('モード切替は一周する', settings.mode === 'TOUR', MODES.length);
for (let i = 0; i < 60; i++) tickMeta(1/60);
assert('タイトル中も動作(カメラ回転で例外なし)', state === 'title');

// ---- 24) モード別ハイスコア ----
settings.mode = 'CUBE'; hiScore = hiOf('CUBE'); score = hiScore + 1234; saveHi();
assert('ハイスコアはモード別に保存', hiOf('CUBE') === score && store.get('qlaim.hi3', {}).CUBE === score);

// ---- 25) 描画(3D/2D)が例外なく走る ----
let renderErr = null;
try {
  for (const md of ['SPHERE', 'CUBE', 'PLANE']) { settings.mode = md; startGame(); stTimer = 2; tickMeta(0.016); render(); }
} catch (e) { renderErr = e.stack; }
assert('3D/2D描画が例外なし', !renderErr, renderErr);


// ---- 26) すべての立体の形: 形・つながり・遊べること ----
function stepK(k) { return playerStep(surf.nb[player.c * 4 + k]); }
for (const key of Object.keys(CONFIG.SURF)) {
  if (key === 'PLANE') continue;
  const S = getSurface(key), nbOf = c => Array.from(S.nb.slice(c * 4, c * 4 + 4));
  let bad = 0, asym = 0, rbad = 0;
  for (let c = 0; c < S.N; c++) {
    const ns = nbOf(c);
    if (new Set(ns).size !== 4 || ns.some(b => b < 0 || b === c)) bad++;
    for (const b of ns) if (!nbOf(b).includes(c)) asym++;
    const r = Math.hypot(S.pos[c * 3], S.pos[c * 3 + 1], S.pos[c * 3 + 2]);
    const nl = Math.hypot(S.nor[c * 3], S.nor[c * 3 + 1], S.nor[c * 3 + 2]);
    if (!(r < 1.001) || Math.abs(nl - 1) > 1e-3) rbad++;
  }
  assert(key + ': 4近傍が正しく対称', bad === 0 && asym === 0, 'N=' + S.N + ' bad=' + bad + ' asym=' + asym);
  assert(key + ': 表面の点が半径1以内・法線が単位長', rbad === 0, rbad);
  settings.mode = key; startGame(); stTimer = 2; tickMeta(0.016);
  const ok0 = state === 'play' && isBoundary(player.c) && qixes.every(openAt) && initOpen === countCells(OPEN);
  for (let i = 0; i < 300; i++) updateQixes(1/60);
  for (let i = 0; i < 100; i++) sparxes.forEach(stepSparx);
  const spOk = sparxes.every(s => isBoundary(s.c));
  // HOMEから外へ4マス → 横へ3マス → 戻って HOME にぶつかるまで
  player.invuln = 99; held.fast = false;
  const c0 = claimed;
  let a = 0; for (let i = 0; i < 4; i++) if (stepK(0)) a++;
  let b = 0; for (let i = 0; i < 3; i++) if (stepK(1)) b++;
  for (let i = 0; i < 20 && player.drawing; i++) stepK(2);
  assert(key + ': 開始・QIX/SPARXが正常・囲んで占領できる',
    ok0 && spOk && qixes.every(openAt) && a === 4 && b === 3
    && !player.drawing && claimed > c0 && claimed === initOpen - countCells(OPEN) && isBoundary(player.c),
    'ok0=' + ok0 + ' a/b=' + a + '/' + b + ' claimed=' + (claimed - c0));
  let err = null;
  try { for (let i = 0; i < 3; i++) { tickMeta(1/60); render(); } } catch (e) { err = e.stack; }
  assert(key + ': 描画が例外なし', !err, err);
}

// ---- 27) ドーナツ・クラインの壺の貼り合わせ ----
for (const [key, loopU] of [['TORUS', 1], ['KLEIN', 2]]) {
  const S = getSurface(key), nbOf = c => Array.from(S.nb.slice(c * 4, c * 4 + 4));
  const walk = (start, k0, len) => {
    let prev = start, c = S.nb[start * 4 + k0];
    for (let s = 1; s < len; s++) { const kp = nbOf(c).indexOf(prev); prev = c; c = S.nb[c * 4 + ((kp + 2) & 3)]; }
    return c;
  };
  const st = 5 * S.NU + 7;
  assert(key + ': u方向に直進すると' + (loopU === 2 ? '2周で(裏返って)' : '1周で') + '戻る',
    walk(st, 1, loopU * S.NU) === st && (loopU === 1 || walk(st, 1, S.NU) !== st));
  assert(key + ': v方向に直進すると1周で戻る', walk(st, 2, S.NV) === st);
}
{
  const S = getSurface('KLEIN');
  const c = S.cellIdx(S.NU - 1, 3), n = S.nb[c * 4 + 1];
  assert('KLEIN: 右端の先は左端の上下反転の位置', n === S.cellIdx(0, S.NV / 2 - 1 - 3), n);
}

// ---- 28) 塗りの波 ----
settings.mode = 'SPHERE'; startGame(); stTimer = 2; tickMeta(0.016);
player.invuln = 99;
for (let i = 0; i < 4; i++) stepK(0); for (let i = 0; i < 3; i++) stepK(1); for (let i = 0; i < 20 && player.drawing; i++) stepK(2);
{
  let later = 0, set = 0;
  for (let c = 0; c < surf.N; c++) if (claimAt[c] > -1e8) { set++; if (claimAt[c] > blinkT) later++; }
  assert('塗りの波: 囲んだセルに到達時刻が付き、遠くは後から光る', set > 0 && later > 0 && waveUntil > blinkT, set + '/' + later);
  assert('光の輪が出る', rings.length > 0);
}

// ---- 29) BGM: 全曲の譜面と選び方 ----
{
  let bad = [];
  for (const k in BGMDATA) for (const tr of BGMDATA[k].tracks) {
    if (tr.s && tr.s.length !== BGMDATA[k].len) bad.push(k + ' len');
    if (tr.p && tr.p.some(x => x >= BGMDATA[k].len)) bad.push(k + ' step');
  }
  assert('全曲: トラック長とステップがlen内', bad.length === 0, bad.join(','));
  assert('全盤面のAUTO曲が存在', Object.values(CONFIG.SURF).every(d => BGMDATA[d.music]));
  assert('BGM選択肢の曲が存在', Object.values(MUSIC_SONG).every(k => BGMDATA[k]));
  settings.music = 'IDM'; assert('BGM=IDM を選ぶとidm', bgmName() === 'idm');
  settings.music = 'AUTO'; settings.mode = 'KLEIN'; initLevel(1);
  assert('AUTOは盤面ごとの曲(クラインの壺=drone)', bgmName() === 'drone');
  optSel = OPT_ITEMS.findIndex(o => o.k === 'music'); adjustOpt(1);
  assert('OPTIONSでBGMを切替', settings.music === 'CLASSIC', settings.music);
  settings.music = 'AUTO';
}

// ---- 30) 動くテーマ ----
{
  settings.theme = THEMES.findIndex(t => t.name === 'PRISM'); applyTheme();
  const before = themePal.join();
  for (let i = 0; i < 30; i++) tickTheme(1/30);
  assert('PRISMテーマは色が移ろう', themePal.join() !== before && col3D.every(c => /^rgb\(/.test(c)));
  settings.theme = 0; applyTheme();
}

// ---- 31) Clawd ----
{
  let err = null;
  try { drawClawd(100, 100, 2, { moving: true, walkF: 1, drawing: true, look: -1 }); drawClawd(0, 0, 1, { dead: true }); }
  catch (e) { err = e.stack; }
  assert('Clawdが描ける', !err, err);
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016);
  held.fast = false; steps(-1, 0, 1);
  assert('歩くと向きと歩き時刻が変わる', player.look === -1 && player.moveT === blinkT);
}

console.log(fails === 0 ? '\n=== 全テスト合格 ===' : '\n=== 失敗 ' + fails + ' 件 ===');
process.exit(fails === 0 ? 0 : 1);
