# QLAIM ─ Qix風 陣取りアーケード

## このプロジェクトについて
- 依存なしの単一HTMLブラウザゲーム。本体は `index.html` の1ファイルのみ(CSS/JS全部入り)。
- GitHub Pages にそのまま置いて動かす前提。ビルド工程・外部ライブラリは導入しないこと。
- 音はすべて WebAudio で合成(音声ファイルなし)。

## オーナーについて
- オーナー(はちや)は自分でコードを書いたり直したりしない。
  変更内容は「何が変わって、遊ぶとどう感じが変わるか」を日本語で簡潔に説明すること。
- ギターを弾くので、BGMの話は音名・コード進行で伝えると通じやすい。

## 変更したら必ず
```
node test/run-tests.js
```
- 全テスト合格を確認してから完了報告する。失敗したら直してから報告。
- 大きく変えたときは `node test/fuzz.js`(ランダム操作で数万フレーム回す)も実行して problems 0 を確認する。
- 新機能を足したら `test/tests.js` にテストも追加する。
- テストはDOMを持たないNode上で動く(`test/shim.js` がcanvas等をスタブ化)。
  ブラウザAPIを新しく使う場合は shim.js にもスタブを足すこと。

## コード構成(index.html 内 <script> の上から順)
1. `SURF3D` / `CONFIG` — 数値バランス。盤面ごとの値は `CONFIG.SURF`(17種)、TOURの順番は `CONFIG.TOUR`
2. `DIFFS` — 難易度 / `MODES` — 盤面モード(TOUR+各盤面、タイトルで←→) / `MUSIC_KEYS` — BGMの選択肢
3. `THEMES` — 配色テーマ6種。`anim` 付き(PRISM/AURORA)は占領色が時間で移ろう(`tickTheme`)
4. `BGMDATA` — BGM譜面7曲(title/play/orbit/chip/drone/ambient/idm)。音名で記述(♭は#)。
   音色パラメータ a/r/det/echo/ed/pr/oj、ドラム blip あり。`at(len,{step:'音名'})` は疎な譜面の略記
   `form` = 曲の構成(セクションの並び。n回数/t移調/alt別メロs2・別リズムp2/mute/drums:false/boost)。
   セクション切替前は自動でスネアのフィル。`ITEMS` — アイテム4種(SLOW/SHIELD/STAR/1UP)
5. `store` / `settings` / `hiScores`(ハイスコアはモード別。v2の値はPLANEへ引継ぎ)
6. `Snd` — 効果音+BGM音源、`Bgm` — 先読みシーケンサ(確率・やまびこ対応)
7. 盤面(サーフェス):
   - `makePlaneSurface` — 平面
   - `makeRadialSurface` — キューブスフィア割り付けのセルを、形 `SHAPES[shape]` の表面へ放射状に貼る
     (多面体・切頂・準正・星型・球)。形は凸な部品(平面の集まり)の和で、`radialOf` が表面までの距離と法線を返す
   - `makeParamSurface` — (u,v)格子を貼り合わせた曲面(ドーナツ・クラインの壺)。`PARAM_SHAPES`
   - `getSurface` でキャッシュ
8. カメラ(`cam`・`camFollow`・`camRotate`): 立体面で自機を画面中央に追い、格子が画面の縦横にそろうよう傾きも補正
9. ゲーム状態・フィールド(`grid`: OPEN/WALL/TRAIL、`colA`: 0=線 1..8=占領色 9=HOME)、`claimFill`、`visitedFrom`
   `claimAt` — 塗りの波(各セルに波が届く時刻。`markClaim`)
10. プレイヤー(`chooseMove`→`playerStep`)・`closeTrail`(QIX分断→即クリア)・導火線・QIX・SPARX
11. 進行: 状態は title / options / ready / play / pause / clear / over
12. 描画: `render2D` / `render3D`(へこみのある形は奥行きを層に分けて奥から) / `drawBackdrop`(星雲・星)
    `drawTrailGlow` / `drawClawd`(自機のドット絵) / `renderHUD` / `renderOverlay`、入力

## v4 の遊び要素
- アイテム: 空き地に出現し、線で囲む(=占領でセルが空き地でなくなる)と `collectItems` で取得。
- コンボ: `COMBO_TIME` 秒以内に続けて囲むと倍率アップ。STAR 中はさらに2倍。
- SHIELD: `death()` で消費され、`guarded` の間は残機を減らさない(線は消える)。
- 記録: `bestPct`(盤面ごとのクリア時最高占領率, localStorage `qlaim.best`)。
- 裏側ビュー `drawBackView`、効果表示 `drawStatus`、ポーズメニュー `PAUSE_ITEMS`、なぞり操作 `dirFromDrag`。

## v4.1〜 追加分(どこを見ればいいか)
- ゲームパッド: `padKeys` / `pollPad`(押した瞬間に `onKeyDown` を呼ぶ)。キー処理は `onKeyDown` / `onKeyUp` に関数化済み
- 発光: `drawBloom`(縮小→拡大の加算合成)。`perf` / `watchPerf` が重いと自動で切る(設定は保存しない)
- 盤面は23種。曲面は `PARAM_SHAPES`(`border` で縁あり=メビウスの帯、`flipOff` で反転のしかた)。三葉結び目は `trefoilTube`
- ランキング: `ranks` / `addRank` / `qualifies`、名前入力は state 'entry'(`entry`)
- DAILY: `dailyList`(日付のハッシュで3面)、記録キーは `modeKey()`('DAILY:YYYYMMDD')
- チュートリアル: `TUTOR_TEXT` / `tutorAdvance`(settings.tutor で完了)
- スクリーンショット: `saveShot`(Cキー)
- SEEKER: `spawnSeeker` / `stepSeeker` / `updateSeekers` / `crushSeekers`(AREA 4〜)
- 音の反応: `Snd.react`(BGMローパス・効果音パン)、`Snd.sweep`(囲んだ瞬間)、`Bgm.pulse()`(キックの脈動)
- コンティニュー: `canContinue` / `continueGame` / `giveUp`
- 実績: `ACHV` / `unlock` / `checkClearAchv`、一覧は state 'achv'
- 年輪模様: `ringA`(占領時に閉じた場所からの距離の縞)
- タイトルのデモ: `demoT` / `demoLv`(TOUR/DAILYで背景の盤面が巡る)
- BONUS AREA: `isBonus` / `bonusT`(5エリアごと)、`cancelTrail`
- 曲: synth / lofi を追加。`swing` で裏拍を遅らせる
- テスト用スタブ(test/shim.js)に Path2D と measureText を追加済み
- Clawdの色: `CLAWD_SKINS` / `skinsOpen` / `clawdCol`(実績で解除)
- 全体を見る: X(held.slow)を押す間 `updateCamera` がカメラを引く。スマホは「全体」ボタン
- ZEN: `isZen()`(ミス・導火線・SPARX/SEEKER・記録なし)
- あそんだ記録: `stats` / `saveStats` / `favSurface`、画面は state 'stats'
- QIXのリボン: `drawQixRibbons` / `qixEnds`
- OPTIONSはポーズからも開ける(`optsFrom`)
- ワープ入場: 立体面のエリア開始時 `cam.D = 9` から寄る。状態を先に切り替えてから `initLevel` すること
- 花火 `updateFireworks`、効果音のハモり `Bgm.root()`、クリア音 `Snd.clear_(root)`
- スマホ横向きレイアウト: CSS の landscape メディアクエリと `isLandscapeTouch` / `fitCanvas`
- テーマAUTO: `settings.theme === THEMES.length`、`AUTO_THEME` の対応表
- 結果の共有: `resultText` / `shareResult`(ゲームオーバー画面、Sキー)
- QIXの突進: `QIX_DASH_FROM`、各盤面の `qixAim`
- Clawdのひとこと: `say` / `speech` / `drawSpeech`
- 危険の知らせ: `calcDanger` / `drawDangerEdge`(SPARX・SEEKERが近いと「!」と赤いふち)
- TOURの最高到達エリア: `stats.maxArea`
- 最後の1機の鼓動: `heartT` / `Snd.heart`
- アイテムZAP: SPARX一掃・SEEKERの `stun`
- エンディング: `startEnding` / `finishEnding` / `drawEnding`(state 'ending'、TOUR 1周)
- Clawdの色 RAINBOW(col:null は虹色)
- 盤面の豆知識: `SURF_INFO`(READY画面)
- あそびかた: `openHelp` / `closeHelp` / `drawHelp`(state 'help'、タイトルのH・ポーズメニュー)
- ゲームオーバーで R = すぐもう一度
- 振動 `buzz`(settings.shake で ON/OFF)、ニアミス `nearMiss`(`NEAR_MISS_PTS`)、SPARX接近のチリチリ音
- タブ/アプリ切替で自動ポーズ(visibilitychange)、曲名 `SONG_LABEL`(READY画面)、Clawdのきょろきょろ(3秒静止)
- ポーズ画面に盤面・占領率・スコア、ハイスコア更新表示 `startHi`、初めての盤面の表示(stats.plays === 1)
- コンボで効果音が半音ずつ上がる、タイトルのClawdが盤面名を言う

## 操作
- 方向キーで空き地へ進むと、ボタン無しでゆっくり線を引く(×2点)。Z/スペースを押している間だけ速い(×1点)。
- タッチは FAST ボタンのみ。

## 盤面(サーフェス)の考え方
- どの盤面も「セルのグラフ」。ロジックは `surf.nb`(4近傍)と `surf.nb8`(斜め込み)しか見ない。
  - `nb[c*4+k]` の k=0..3 は一周する順で、k と k+2 が向かい合う(=直進)。
- セル番号: 平面 `y*GW+x` / 放射型 `面*n*n + j*n + i` / 曲面 `j*NU + i`。
- QIXの位置表現だけ盤面ごとに違う(平面・曲面: x,y,head / 放射型: 単位ベクトル p と接ベクトル h)。
  盤面側の `qixSpawn/qixMove/qixTurn/qixArm/segEach/qixCell/qixScreen/ptCell/world` で吸収。
- クラインの壺は u の端をまたぐと v が反転する(u=π の (π,v) が (0,π−v) につながる)。両面描画・半透明。
- 立体面の方向キーは「隣の4セルを画面へ投影して押した向きに近いもの」。同じキーを押し続ける間は直進優先。
- 星型の数値: 小星型12面体は芯(正12面体)の外接半径 0.5628、大星型12面体は芯(正20面体)0.4195(先端=1)。

## 見た目の決まり(オーナーの要望)
- **画面をチカチカ・フラッシュさせない。** 点滅(オン/オフの切り替え)、白い閃光、拍に合わせた画面全体の明滅、
  速い色替わりは使わない。目立たせたいときは、ふちどり・大きさ・ゆっくりしたフェードで。
- 平面が「Qixの丸パクリ」に見えないように: 陣地は丸いインクの塗り(`redrawField`)、描く線は太いインクの帯(`drawInkTrail`)、
  Clawd はローラーで塗る(`drawRoller`)。白い四角のドット線には戻さない。
- 敵はキャラクター: QIX=クラゲ「ヌメリン」(`drawNumerin`)、SPARX=火の玉「バチッコ」(`drawSparx`)、
  SEEKER=一つ目スライム「オイカケ」(`drawSeeker`)。既存の有名キャラに似せない。

## buddy たち(v6)
- Claude Code の /buddy の18種が登場(`BUDDIES` / `BUDDY_ORDER`)。エリアごとに2〜3匹(`buddiesFor`)、9エリアで全員
- 役割(role): ally=迷子の味方(囲むと助けて perk) / eater=陣地をかじる(`erode`、最初の壁 `baseA` はかじらない) /
  squirt=タコの墨 / thief=アイテム泥棒 / block=通せんぼ(`buddyBlocks`) / spike・hop・slide・ghost・dragon=線に触れるとミス
- 囲んだとき `catchBuddies`(味方は `rescue`、いたずら組はつかまえる)。カタツムリ・キノコはさわると `shoo`
- 陣地を減らすときも `claimed === initOpen - 空きセル数` を守る(`erode` で claimed--)
- 絵は `drawBuddy`(すべて図形)。図鑑は state 'dex'(タイトルの B、OPTIONS)、会った記録は `buddyMet`
- テストの前半は `buddiesOn = false` にして、ランダムに出る buddy が他の検証を邪魔しないようにしている
- キャラ設定は `BUDDY_PROFILE`(nick / rar / st=[DEBUGGING,PATIENCE,CHAOS,WISDOM,SNARK] / bio / lines)。カメ=ワーブルはオーナーの /buddy カードそのまま
- ステータスが動きに効く: 速さ `spdK = 1.25 - PATIENCE/200`、いたずら間隔 `cdK = 1.3 - CHAOS/166`
- buddy のセリフは `buddySay(b, kind)`(hello/idle/act/bye。`buddyTalkCD` で話が重ならない)。去りぎわは `buddyBye`
- 色違い(1/40、`buddyShiny` に記録)はごほうび2倍。見た目は金の輪と止まったきらめき(点滅しない)
- 図鑑は 'dex'(一覧・カーソル `dexSel`)→ 'dexcard'(★レア度・ステータスのカード)

## Clawd のセリフ
- `sayLine(場面)` が `CLAWD_LINES[場面]` から選ぶ(直前と同じものは避ける)。約4%で `RARE_LINES`(★つき・金ぶち)
- 時事ネタ: `dateLines(date)` が日付・季節・曜日・時間のセリフを返す(start/idle/clear で約18%)。オフラインなので本物のニュースは取れない。流行りの話題は `TOPICAL_LINES` に書き足す
- 盤面ごとの感想は `SURF_LINES`。待機7秒・長い線・残機0でもひとこと。吹き出しは `drawBubble`(長い文は2行)

## 音楽の仕組み(v5)
- 音の経路: 各音 → (左右パン) → BGMバス → ローパス → コンプレッサー → マスター。リバーブへは `send` で送る
- `Snd.note(..., x)` の x: flt(フィルター開閉)/ vib(ビブラート)/ pn(左右)/ rv(リバーブ)。省略時はシーケンサが決める
- 打楽器: kick / snare / hat / ohat / clap / tom / blip / crash。セクション頭にクラッシュ、変わり目はタムのフィル
- 平面の曲は splash(ファンク)

## 設計上の約束
- 占領率の整合: `claimed === initOpen - 空きセル数` を常に保つ(軌跡セルも占領に計上)。
- 状態遷移のうちフレーム依存のものは `tickMeta(dt)` に置く(テストから呼べるように。カメラ更新もここ)。
- AudioContext はユーザー操作後に生成。`Bgm.play()` はAC未生成なら予約だけする。
- テストのプレイヤー操作は `playerMove('up')` など(画面の向き)か、`playerStep(surf.nb[c*4+k])`(格子の向き)。
- テストは全盤面を作って遊ぶので少し時間がかかる(数十秒)。
