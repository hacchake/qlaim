
// ================= ヘッドレス検証 =================
let fails = 0;
function assert(name, cond, info) {
  if (cond) console.log('OK  ' + name + (info !== undefined ? '  [' + info + ']' : ''));
  else { console.log('NG  ' + name + '  [' + info + ']'); fails++; }
}
function steps(dx, dy, n) { let c = 0; for (let i = 0; i < n; i++) { if (!playerStep(dx, dy)) break; c++; } return c; }
const openAt = q => !blockedCell(q.x, q.y);

// ---- 1) 初期状態 ----
assert('初期位置が境界上', isBoundary(player.x, player.y), player.x + ',' + player.y);
assert('初期占領率0%', percent() === 0);

// ---- 2) 壁沿い移動 ----
let m = steps(-1, 0, 10);
assert('壁沿いに10歩移動', m === 10, m);

// ---- 3) 描画→停止→導火線→ミス ----
held.fast = true;
m = steps(0, -1, 20);
assert('上へ20歩描画', m === 20 && player.drawing && trail.length === 20, m + '/' + trail.length);
for (let i = 0; i < 120 && deathTimer <= 0; i++) updateFuse(1/30, false);
assert('導火線点火', fuse.lit);
assert('導火線でミス発生', deathTimer > 0, deathTimer.toFixed(2));
applyDeath();
let trailLeft = 0; for (let i = 0; i < GW*GH; i++) if (grid[i] === TRAIL) trailLeft++;
assert('軌跡が消えている', trailLeft === 0 && !player.drawing);
assert('残機が減少', lives === settings.lives - 1, lives);
assert('描画開始地点に復帰', player.x === trailStart.x && player.y === trailStart.y, player.x + ',' + player.y);

// ---- 4) 囲んで占領 ----
player.invuln = 0; held.fast = true;
const beforeClaimed = claimed;
steps(0, -1, 20); steps(-1, 0, 15);
m = steps(0, 1, 25);
assert('軌跡が閉じた', !player.drawing, 'down歩数=' + m);
assert('占領が発生', claimed > beforeClaimed, 'claimed=' + claimed + ' (' + percent().toFixed(2) + '%)');
trailLeft = 0; let openC = 0;
for (let i = 0; i < GW*GH; i++) { if (grid[i] === TRAIL) trailLeft++; if (grid[i] === OPEN) openC++; }
assert('TRAILセル残存なし', trailLeft === 0);
assert('占領数の整合', claimed === initOpen - openC, claimed + ' vs ' + (initOpen - openC));
assert('QIXは空き地に居る', qixes.every(openAt));
assert('占領後も境界上', isBoundary(player.x, player.y), player.x + ',' + player.y);

// ---- 5) SPARX巡回 ----
for (let i = 0; i < 300; i++) sparxes.forEach(stepSparx);
assert('SPARXが境界上を巡回', sparxes.every(s => isBoundary(s.x, s.y)),
       sparxes.map(s => s.x + ',' + s.y).join(' / '));

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

// ---- 10) テーマ切替 ----
let wallsBefore = 0; for (let i = 0; i < GW*GH; i++) if (grid[i] === WALL) wallsBefore++;
settings.theme = 2; applyTheme();
let wallsAfter = 0; for (let i = 0; i < GW*GH; i++) if (grid[i] === WALL) wallsAfter++;
assert('テーマ切替でグリッド不変', wallsBefore === wallsAfter && themePal.length === 8,
       wallsBefore + '/' + themePal.length);
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
assert('startGameでready状態', state === 'ready' && level === 1);
stTimer = 2; tickMeta(0.016);
assert('READY経過でplayへ', state === 'play');

// ---- 14) AREA3: QIX2体・同一領域なら通常占領 ----
initLevel(3);
assert('AREA3でQIX2体', qixes.length === 2);
setState('play');
qixes[0].x = 40; qixes[0].y = 30; qixes[1].x = 88; qixes[1].y = 30;
player.x = GW >> 1; player.y = GH - 1; player.drawing = false; player.invuln = 0; trail = [];
held.fast = true;
steps(0, -1, 10); steps(1, 0, 8); steps(0, 1, 12);
assert('2QIX同領域→通常閉鎖', !player.drawing && !wasSplit && state === 'play',
       'pct=' + percent().toFixed(2));
assert('両QIXとも空き地', qixes.every(openAt));

// ---- 15) QIX分断 → 即クリア(最後に実行) ----
initLevel(3); setState('play');
qixes[0].x = 20; qixes[0].y = 80; qixes[1].x = 108; qixes[1].y = 80;
player.x = GW >> 1; player.y = GH - 1; player.invuln = 0;
held.fast = true;
m = steps(0, -1, 200);
assert('縦断ラインで閉鎖', m === GH - 1, m);
assert('分断で即クリア', state === 'clear' && wasSplit, 'pct=' + percent().toFixed(1));
assert('圧殺されたQIXが除去', qixes.length === 1);
assert('SPLITボーナス加算', lastBonus >= CONFIG.SPLIT_BONUS, lastBonus);

console.log(fails === 0 ? '\n=== 全テスト合格 ===' : '\n=== 失敗 ' + fails + ' 件 ===');
process.exit(fails === 0 ? 0 : 1);
