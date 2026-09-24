
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
assert('モード切替 TOUR→DAILY', settings.mode === 'DAILY' && surf.key === dailyList()[0]);
cycleMode(1);
assert('モード切替 DAILY→PLANE', settings.mode === 'PLANE' && surf.key === 'PLANE');
cycleMode(1); cycleMode(1);
assert('モード切替 →SPHERE で盤面も球に', settings.mode === 'SPHERE' && surf.key === 'SPHERE');
for (let i = 4; i < MODES.length; i++) cycleMode(1);
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
    const ok = ns.filter(b => b >= 0);
    if (new Set(ok).size !== ok.length || ok.includes(c) || (!S.border && ok.length !== 4)) bad++;
    for (const b of ok) if (!nbOf(b).includes(c)) asym++;
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
for (const [key, loopU] of [['TORUS', 1], ['KLEIN', 2], ['MOBIUS', 2], ['KNOT', 1]]) {
  const S = getSurface(key), nbOf = c => Array.from(S.nb.slice(c * 4, c * 4 + 4));
  const walk = (start, k0, len) => {
    let prev = start, c = S.nb[start * 4 + k0];
    for (let s = 1; s < len; s++) { const kp = nbOf(c).indexOf(prev); prev = c; c = S.nb[c * 4 + ((kp + 2) & 3)]; }
    return c;
  };
  const st = 5 * S.NU + 7;
  assert(key + ': u方向に直進すると' + (loopU === 2 ? '2周で(裏返って)' : '1周で') + '戻る',
    walk(st, 1, loopU * S.NU) === st && (loopU === 1 || walk(st, 1, S.NU) !== st));
  if (!S.border) assert(key + ': v方向に直進すると1周で戻る', walk(st, 2, S.NV) === st);
  else assert(key + ': 縁の外は -1(行き止まり)', S.nb[st % S.NU * 4] === -1 || S.nb[(st % S.NU) * 4] === -1);
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


// ---- 32) アイテム: 囲むと手に入る ----
function claimBox() { // HOMEから外へ4 → 横へ3 → 戻る(立体・平面どちらも格子の向きで)
  for (let i = 0; i < 4; i++) stepK(0); for (let i = 0; i < 3; i++) stepK(1);
  for (let i = 0; i < 20 && player.drawing; i++) stepK(2);
}
settings.mode = 'SPHERE'; startGame(); stTimer = 2; tickMeta(0.016); player.invuln = 99;
{
  // 囲まれる予定の場所(HOMEのすぐ外側の内側セル)にアイテムを置く
  const c0 = player.c, a1 = surf.nb[c0 * 4], a2 = surf.nb[a1 * 4], inside = surf.nb[a2 * 4 + 1];
  items = [{ c: inside, k: 'slow', t: 0 }, { c: surf.nb[surf.nb[inside * 4] * 4], k: 'star', t: 0 }];
  const livesB = lives;
  claimBox();
  assert('囲んだアイテムを取得(SLOW発動)', slowT > 0 && !items.some(it => it.k === 'slow'), 'slowT=' + slowT.toFixed(1));
  assert('SLOW中は敵の速さが下がる', enemySlow() < 1);
  items = [{ c: 0, k: 'life', t: 0 }]; grid[0] = WALL; collectItems();
  assert('1UPで残機+1', lives === livesB + 1);
  items = [{ c: 0, k: 'shield', t: 0 }]; collectItems();
  assert('SHIELDを持つ', player.shield === true);
  player.invuln = 0; const l0 = lives; death();
  assert('SHIELDでミスを防ぐ(GUARD)', guarded && deathTimer > 0);
  for (let i = 0; i < 60 && deathTimer > 0; i++) update(1/30);
  assert('SHIELD使用後も残機は減らない・SHIELDは消える', lives === l0 && !player.shield && !guarded, lives + '/' + l0);
}
{
  items = []; itemTimer = 0; updateItems(0.01);
  assert('時間でアイテムが出現(空き地に)', items.length === 1 && grid[items[0].c] === OPEN);
  items[0].t = CONFIG.ITEM_LIFE; updateItems(0.01);
  assert('時間切れでアイテムが消える', items.length === 0);
}

// ---- 33) コンボとSTAR ----
settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016); player.invuln = 99; held.fast = false;
{
  const s0 = score; steps(0, -1, 3); steps(-1, 0, 3); steps(0, 1, 5);
  const p1 = score - s0;
  assert('1回目はコンボなし', combo === 0 && comboT > 0);
  const s1 = score; steps(-1, 0, 4); steps(0, -1, 3); steps(-1, 0, 3); steps(0, 1, 5);
  assert('続けて囲むとコンボ', combo === 1, 'combo=' + combo + ' +' + (score - s1));
  comboT = 0; starT = 5; const s2 = score;
  steps(-1, 0, 4); steps(0, -1, 3); steps(-1, 0, 3); steps(0, 1, 5);
  assert('STAR中は得点2倍(同じ大きさの囲みで2倍)', score - s2 === p1 * 2, (score - s2) + ' vs ' + p1 * 2);
}

// ---- 34) 記録・ポーズメニュー・なぞり操作・裏側ビュー ----
{
  settings.mode = 'CUBE'; startGame(); stTimer = 2; tickMeta(0.016);
  claimed = Math.ceil(initOpen * 0.8); startClear(false);
  assert('クリアで盤面の最高占領率を記録', bestPct.CUBE >= 80 && store.get('qlaim.best', {}).CUBE >= 80, bestPct.CUBE);
  startGame(); stTimer = 2; tickMeta(0.016);
  togglePause();
  assert('ポーズでメニュー', state === 'pause' && pauseSel === 0);
  pauseChoose(1);
  assert('「はじめから」でAREA1から', state === 'ready' && level === 1);
  stTimer = 2; tickMeta(0.016); togglePause(); pauseChoose(2);
  assert('「タイトルへ」', state === 'title');
  assert('なぞりの向き', dirFromDrag(30, 5) === 'right' && dirFromDrag(-3, -40) === 'up' && dirFromDrag(-50, 10) === 'left' && dirFromDrag(2, 9) === 'down');
  let err = null;
  try { for (const md of ['CUBE', 'KLEIN', 'TORUS']) { settings.mode = md; startGame(); stTimer = 2; tickMeta(0.016); items = [{ c: 5, k: 'star', t: 0 }]; render(); } }
  catch (e) { err = e.stack; }
  assert('裏側ビュー・アイテム・状態表示の描画が例外なし', !err, err);
}

// ---- 35) 曲の構成(セクションが巡る) ----
{
  let bad = [];
  for (const k in BGMDATA) {
    const sg = BGMDATA[k];
    if (!sg.form || sg.form.length < 3) bad.push(k + ':formなし');
    else for (const sec of sg.form) {
      if (!(sec.n >= 1)) bad.push(k + ':n');
      if (sec.mute && sec.mute.some(i => i < 0 || i >= sg.tracks.length)) bad.push(k + ':mute');
    }
    for (const tr of sg.tracks) {
      if (tr.s2 && tr.s2.length !== sg.len) bad.push(k + ':s2長');
      if (tr.s2) for (const nm of tr.s2) if (nm && !/^([A-G])(#?)(-?\d)$/.test(nm)) bad.push(k + ':' + nm);
      if (tr.p2 && tr.p2.some(x => x >= sg.len)) bad.push(k + ':p2');
    }
    if (!sg.form || !sg.form.some(x => x.alt || x.t || x.drums === false || x.mute)) bad.push(k + ':変化なし');
  }
  assert('全曲に構成があり、別メロ・転調・ブレイクなどの変化を含む', bad.length === 0, bad.join(','));
  Bgm._load('play');
  const seen = [];
  for (let i = 0; i < 20; i++) { seen.push(Bgm.section); Bgm._advance(); }
  assert('曲を進めるとセクションが順に巡って頭に戻る', seen.join('') === '00112334400112334400', seen.join(''));
  Bgm.stop();
}


// ---- 36) ゲームパッド・発光・画面揺れ ----
{
  const gp = { buttons: [{ pressed: true }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { pressed: true }, {}], axes: [0, 0.9] };
  const ks = padKeys(gp);
  assert('ゲームパッド: A=z, 十字左, スティック下', ks.has('z') && ks.has('ArrowLeft') && ks.has('ArrowDown'), [...ks].join(','));
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016);
  onKeyDown({ key: 'ArrowUp', repeat: false, preventDefault() {} });
  assert('キー処理の関数化(onKeyDown→方向)', currentDir() === 'up');
  onKeyUp({ key: 'ArrowUp', preventDefault() {} });
  assert('onKeyUpで離す', currentDir() === null);
  assert('OPTIONSに発光と画面揺れ', OPT_ITEMS.some(o => o.k === 'glow') && OPT_ITEMS.some(o => o.k === 'shake'));
  let err = null; settings.glow = true;
  try { render(); } catch (e) { err = e.stack; }
  assert('発光つき描画が例外なし', !err, err);
}


// ---- 37) ランキングと名前入力 ----
{
  settings.mode = 'TETRA'; ranks.TETRA = [];
  startGame(); stTimer = 2; tickMeta(0.016);
  score = 5000; lives = 0; player.invuln = 0; death(); for (let i = 0; i < 60 && deathTimer > 0; i++) update(1/30);
  assert('ランキング入りで名前入力へ', state === 'entry', state);
  const ev = key => ({ key, repeat: false, preventDefault() {} });
  onKeyDown(ev('ArrowUp'));
  const c0 = entry.name[0];
  onKeyDown(ev('z')); onKeyDown(ev('q')); onKeyDown(ev('z'));
  assert('名前を決めて登録', state === 'over' && rankOf('TETRA')[0].s === 5000 && entry.rank === 0, JSON.stringify(rankOf('TETRA')));
  assert('文字キーで直接入力', rankOf('TETRA')[0].n[1] === 'Q' && rankOf('TETRA')[0].n[0] === c0);
  for (const sc of [100, 9000, 300, 50, 7000, 20]) addRank('ZZZ', sc, 1);
  const r = rankOf('TETRA');
  assert('上位5件を高い順に保持', r.length === 5 && r[0].s === 9000 && r[4].s === 100 && !qualifies(90) && qualifies(20000), r.map(e => e.s).join(','));
  let err = null; try { render(); setState('entry'); render(); } catch (e) { err = e.stack; }
  assert('ランキング・名前入力の描画が例外なし', !err, err);
}


// ---- 38) DAILY(今日の3面) ----
{
  const a = dailyList('20260924'), b = dailyList('20260924'), c = dailyList('20260925');
  assert('DAILY: 同じ日は同じ3面・別の日は別', a.join() === b.join() && a.join() !== c.join() && new Set(a).size === 3 && !a.includes('PLANE'), a.join() + ' / ' + c.join());
  settings.mode = 'DAILY';
  const d = dailyList();
  assert('DAILY: エリア1〜3が今日の3面', surfaceFor(1) === d[0] && surfaceFor(2) === d[1] && surfaceFor(3) === d[2] && surfaceFor(4) === d[0]);
  assert('DAILY: 記録は日付つきのキー', modeKey() === 'DAILY:' + todayStr());
  startGame(); score = 777; saveHi();
  assert('DAILY: ハイスコアは今日の分として保存', hiOf('DAILY:' + todayStr()) === 777 && hiOf('DAILY') === 0);
  setState('title'); let err = null; try { render(); } catch (e) { err = e.stack; }
  assert('DAILY: タイトル描画', !err, err);
}


// ---- 39) チュートリアル ----
{
  settings.tutor = false; settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016);
  assert('初回はチュートリアル開始', tutorStep === 0);
  held.fast = false; player.invuln = 99;
  steps(-1, 0, 1);
  assert('歩くと次のヒント', tutorStep === 1);
  steps(0, -1, 2);
  assert('線を引くと次のヒント', tutorStep === 2);
  steps(-1, 0, 2); steps(0, 1, 5);
  assert('囲むと次のヒント', tutorStep === 3);
  for (let i = 0; i < 400 && tutorStep >= 0; i++) update(1/60);
  assert('最後のヒントは時間で終わり、以後出ない', tutorStep === -1 && settings.tutor === true);
  startGame();
  assert('2回目はチュートリアルなし', tutorStep === -1);
  let err = null; settings.tutor = false; startGame(); stTimer = 2; tickMeta(0.016);
  try { render(); } catch (e) { err = e.stack; }
  assert('チュートリアル描画が例外なし', !err, err);
  settings.tutor = true; tutorStep = -1;
  assert('スクリーンショットはtoBlobが無い環境では何もしない', saveShot() === false);
}


// ---- 40) SEEKER ----
{
  settings.mode = 'PLANE'; settings.tutor = true;
  startGame(); initLevel(3);
  assert('AREA3までSEEKERなし', seekers.length === 0);
  initLevel(4); setState('play');
  assert('AREA4でSEEKER出現(空き地)', seekers.length === 1 && grid[seekers[0].c] === OPEN);
  for (let i = 0; i < 300; i++) updateSeekers(1/60);
  assert('SEEKERは空き地を動く', grid[seekers[0].c] === OPEN);
  // 追跡: 線を引いている最中は自機へ近づく
  player.invuln = 99; held.fast = false; steps(0, -1, 3);
  const P = surf.pos, dist = c => Math.hypot(P[c * 3] - P[player.c * 3], P[c * 3 + 1] - P[player.c * 3 + 1]);
  const d0 = dist(seekers[0].c);
  for (let i = 0; i < 20; i++) stepSeeker(seekers[0]);
  assert('線を引いている間は自機へ近づく', dist(seekers[0].c) < d0, d0.toFixed(1) + '→' + dist(seekers[0].c).toFixed(1));
  // 囲んで倒す: SEEKERを自機の近くに置いて囲う
  applyDeath(); player.invuln = 99; lives = 3;
  const x0 = player.c % GW;
  seekers[0].c = idx(x0 - 2, GH - 3);
  const sc0 = score;
  steps(0, -1, 4); steps(-1, 0, 4); steps(0, 1, 6);
  assert('囲むとSEEKERを倒してボーナス', seekers.length === 0 && score - sc0 >= CONFIG.SEEKER_BONUS, 'n=' + seekers.length);
  // 描きかけの線に触れるとミス
  initLevel(4); setState('play'); player.invuln = 0; steps(0, -1, 3);
  seekers[0].c = trail[1]; seekers[0].acc = 0; player.invuln = 0;
  grid[trail[1]] = TRAIL;
  seekers[0].c = surf.nb[trail[1] * 4 + 1]; seekers[0].prev = -1;
  if (grid[seekers[0].c] === OPEN) { seekers[0].acc = 0; for (let i = 0; i < 50 && deathTimer <= 0; i++) { stepSeeker(seekers[0]); if (grid[seekers[0].c] === TRAIL || seekers[0].c === player.c) death(); } }
  assert('線に触れるとミス', deathTimer > 0);
  let err = null; try { render(); settings.mode = 'SPHERE'; startGame(); initLevel(5); setState('play'); render(); } catch (e) { err = e.stack; }
  assert('SEEKERの描画が例外なし', !err, err);
}


// ---- 41) 音の反応(AudioContext無しでも安全) ----
{
  let err = null;
  try { Snd.react(900, 0.5); Snd.sweep(); setState('pause'); tickMeta(0.016); setState('play'); tickMeta(0.016); } catch (e) { err = e.stack; }
  assert('BGMのこもり・効果音の左右がAC無しでも安全', !err, err);
}


// ---- 42) コンティニュー ----
{
  settings.mode = 'PLANE'; ranks.PLANE = [{ n: 'TOP', s: 99999999, a: 99 }, { n: 'TOP', s: 99999998, a: 99 }, { n: 'TOP', s: 99999997, a: 99 }, { n: 'TOP', s: 99999996, a: 99 }, { n: 'TOP', s: 99999995, a: 99 }];
  startGame(); initLevel(5); level = 5; setState('play'); score = 1234;
  lives = 0; player.invuln = 0; death(); for (let i = 0; i < 60 && deathTimer > 0; i++) update(1/30);
  assert('ゲームオーバーでコンティニュー受付', state === 'over' && canContinue());
  stTimer = 1; onAction();
  assert('Zで同じエリアから続ける(残機回復・スコア維持)', state === 'ready' && level === 5 && lives === settings.lives && score === 1234 && continues === 1);
  setState('play'); lives = 0; player.invuln = 0; death(); for (let i = 0; i < 60 && deathTimer > 0; i++) update(1/30);
  stTimer = 1; giveUp();
  assert('Xでやめるとカウントダウン終了', !canContinue());
  onAction();
  assert('その後Zでタイトルへ', state === 'title');
  let err = null; try { setState('over'); stTimer = 2; render(); } catch (e) { err = e.stack; }
  assert('コンティニュー表示が例外なし', !err, err);
}


// ---- 43) 実績 ----
{
  for (const k in achvGot) delete achvGot[k];
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016);
  areaTime = 30; claimed = Math.ceil(initOpen * 0.92); startClear(false);
  assert('クリアで実績(初クリア・ノーミス・スピード・90%・Z不使用)',
    ['first', 'nomiss', 'speed', 'pct90', 'slowonly'].every(id => achvGot[id]), Object.keys(achvGot).join(','));
  assert('実績のお知らせが出る', achvToasts.length >= 1);
  for (let i = 0; i < 3000 && achvToasts.length; i++) updateFloats(1/30);
  assert('お知らせは時間で消える', achvToasts.length === 0);
  assert('同じ実績は二度出ない', unlock('first') === false);
  for (const k of Object.keys(ITEMS)) itemsGot[k] = 1;
  startGame(); stTimer = 2; tickMeta(0.016); items = [{ c: 0, k: 'star', t: 0 }]; grid[0] = WALL; collectItems();
  assert('アイテム4種で「コレクター」', !!achvGot.items);
  for (const k of ['TETRA', 'CUBE', 'OCTA', 'DODECA', 'ICOSA']) bestPct[k] = 80;
  checkClearAchv(false);
  assert('正多面体5種で「プラトンの立体」', !!achvGot.platonic && !achvGot.all);
  setState('options'); optSel = OPT_ITEMS.findIndex(o => o.k === '_achv'); adjustOpt(1);
  assert('OPTIONSから実績一覧へ', state === 'achv');
  let err = null; try { render(); } catch (e) { err = e.stack; }
  assert('実績一覧の描画が例外なし', !err, err);
  onKeyDown({ key: 'z', repeat: false, preventDefault() {} });
  assert('Zで戻る', state === 'options');
}


// ---- 44) 年輪模様とズーム ----
{
  settings.mode = 'SPHERE'; settings.tutor = true; startGame(); stTimer = 2; tickMeta(0.016); player.invuln = 99;
  for (let i = 0; i < 8; i++) stepK(0); for (let i = 0; i < 4; i++) stepK(1);
  const D0 = cam.D; for (let i = 0; i < 60; i++) tickMeta(1/60);
  assert('線を引いている間はカメラが引く', cam.D > D0 + 0.2, D0.toFixed(2) + '→' + cam.D.toFixed(2));
  for (let i = 0; i < 30 && player.drawing; i++) stepK(2);
  let r0 = 0, r1 = 0;
  for (let c = 0; c < surf.N; c++) if (claimAt[c] > -1e8 && colA[c] > 0 && colA[c] <= 8) { if (ringA[c]) r1++; else r0++; }
  assert('囲んだ陣地に年輪の縞(両方の色がある)', r0 > 0 && r1 > 0, r0 + '/' + r1);
  for (let i = 0; i < 120; i++) tickMeta(1/60);
  assert('描き終わるとカメラが戻る', Math.abs(cam.D - 3.4) < 0.05, cam.D.toFixed(2));
}


// ---- 45) タイトルのデモ ----
{
  settings.mode = 'TOUR'; backToTitle(); cycleMode(0);
  const k0 = surf.key;
  for (let i = 0; i < 9 * 60; i++) tickMeta(1/60);
  assert('タイトル(TOUR)で背景の盤面が巡る', surf.key !== k0 && state === 'title', k0 + '→' + surf.key);
  startGame();
  assert('スタートするとAREA1の盤面から', surf.key === surfaceFor(1) && level === 1);
  settings.mode = 'CUBE'; backToTitle(); cycleMode(0);
  for (let i = 0; i < 9 * 60; i++) tickMeta(1/60);
  assert('単独の盤面を選んでいるときは巡らない', surf.key === 'CUBE');
}


// ---- 46) 自動軽量化 ----
{
  settings.mode = 'PLANE'; startGame(); stTimer = 2; tickMeta(0.016); settings.glow = true; perf.lite = false; perf.avg = 1 / 60;
  for (let i = 0; i < 200; i++) watchPerf(1 / 60);
  assert('軽いときは発光のまま', settings.glow === true);
  for (let i = 0; i < 200; i++) watchPerf(0.05);
  assert('重い状態が続くと発光を自動でOFF(設定は変えない)', settings.glow === true && perf.lite);
  perf.lite = false;
  settings.glow = true;
}


// ---- 47) 追加曲(シンセウェイブ・ローファイ) ----
{
  assert('SYNTH/LOFI が選べて盤面にも割り当て', BGMDATA.synth && BGMDATA.lofi && MUSIC_KEYS.includes('LOFI')
    && CONFIG.SURF.MOBIUS.music === 'lofi' && BGMDATA.lofi.swing > 0);
}


// ---- 48) 音に合わせた脈動 ----
assert('脈動はAC無しなら0', Bgm.pulse() === 0);


// ---- 49) BONUS AREA ----
{
  settings.mode = 'PLANE'; settings.tutor = true; startGame(); level = 5; initLevel(5); setState('play');
  assert('AREA5はBONUS AREA(SPARX/SEEKERなし・制限時間あり)', bonusT > 0 && sparxes.length === 0 && seekers.length === 0, bonusT);
  player.invuln = 99; held.fast = true; steps(0, -1, 20); steps(-1, 0, 20); steps(0, 1, 30);
  const pct = percent(), sc = score;
  for (let i = 0; i < 60 * 45 && state === 'play'; i++) update(1/60);
  assert('時間切れでクリア、占領率に応じたボーナス', state === 'clear' && lastBonus >= Math.round(pct * CONFIG.BONUS_PTS), 'bonus=' + lastBonus + ' pct=' + pct.toFixed(1));
  // 描いている最中に時間切れ → 残機は減らず線だけ消える
  level = 5; initLevel(5); setState('play'); player.invuln = 99; held.fast = true; steps(0, -1, 5);
  const lv0 = lives; bonusT = 0.01; update(1/60);
  assert('描画中の時間切れでも残機は減らない', state === 'clear' && lives === lv0 && countCells(TRAIL) === 0 && !player.drawing);
  nextLevel();
  assert('次のエリアは通常(制限時間なし)', level === 6 && bonusT === 0 && sparxes.length > 0);
  let err = null; try { level = 10; initLevel(10); setState('ready'); render(); } catch (e) { err = e.stack; }
  assert('BONUS AREAのREADY表示が例外なし', !err, err);
}


// ---- 50) Clawdの色 ----
{
  for (const k in achvGot) delete achvGot[k];
  settings.skin = 'ORANGE';
  setState('options'); optSel = OPT_ITEMS.findIndex(o => o.k === 'skin'); adjustOpt(1);
  assert('実績なしではORANGEだけ', settings.skin === 'ORANGE' && skinsOpen().length === 1);
  achvGot.first = 'x'; achvGot.klein = 'x';
  adjustOpt(1);
  assert('実績で色が増えて選べる', settings.skin === 'MINT' && clawdCol() === '#5fd6b0');
  adjustOpt(1); assert('次はGHOST(未解除は飛ばす)', settings.skin === 'GHOST');
  delete achvGot.klein;
  assert('選べない色になったら元の色', clawdCol() === CLAWD_COL);
  let err = null; try { render(); } catch (e) { err = e.stack; }
  assert('OPTIONS描画が例外なし', !err, err);
}

console.log(fails === 0 ? '\n=== 全テスト合格 ===' : '\n=== 失敗 ' + fails + ' 件 ===');
process.exit(fails === 0 ? 0 : 1);
