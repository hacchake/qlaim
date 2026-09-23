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
- 新機能を足したら `test/tests.js` にテストも追加する。
- テストはDOMを持たないNode上で動く(`test/shim.js` がcanvas等をスタブ化)。
  ブラウザAPIを新しく使う場合は shim.js にもスタブを足すこと。

## コード構成(index.html 内 <script> の上から順)
1. `CONFIG` — 数値バランス。盤面ごとの値は `CONFIG.SURF`(PLANE/CUBE/SPHERE)、TOURの順番は `CONFIG.TOUR`
2. `DIFFS` — 難易度プリセット / `MODES` — 盤面モード(TOUR/PLANE/CUBE/SPHERE、タイトルで←→)
3. `THEMES` — 配色テーマ4種(NEON/CRT-G/VAPOR/MONO)
4. `BGMDATA` — BGM譜面。音名で記述(♭は#で書く)。`play`=平面用 Am-F-G-E、`orbit`=立体用 Dm-B♭-C-A
5. `store` / `settings` / `hiScores`(ハイスコアはモード別。v2の値はPLANEへ引継ぎ)
6. `Snd` — 効果音、`Bgm` — 先読みシーケンサ
7. 盤面(サーフェス): `makePlaneSurface` / `makeCubeSurface('CUBE'|'SPHERE')`、`getSurface` でキャッシュ
8. カメラ(`cam`・`camFollow`・`camRotate`): 立体面で自機を画面中央に追い、格子が画面の縦横にそろうよう傾きも補正
9. ゲーム状態・フィールド(`grid`: OPEN/WALL/TRAIL、`colA`: 0=線 1..8=占領色 9=HOME)、`claimFill`、`visitedFrom`(BFS)
10. プレイヤー(`chooseMove`→`playerStep`)・`closeTrail`(QIX分断→即クリア)・導火線・QIX・SPARX
11. 進行: 状態は title / options / ready / play / pause / clear / over
12. 描画(`render2D` / `render3D` / `renderHUD` / `renderOverlay`)、入力

## 盤面(サーフェス)の考え方
- どの盤面も「セルのグラフ」。ロジックは `surf.nb`(4近傍)と `surf.nb8`(斜め込み)しか見ない。
  - `nb[c*4+k]` の k=0..3 は一周する順で、k と k+2 が向かい合う(=直進)。
  - 立方体と球は同じつながり(立方体6面×n×n)で、形と見た目だけ違う(球は等角割り付け)。
- セル番号は平面なら `y*GW+x`、立体なら `面*n*n + j*n + i`。
- QIXの位置表現だけ盤面ごとに違う(平面: x,y,head / 立体: 単位ベクトル p と接ベクトル h)。
  盤面側の `qixSpawn/qixMove/qixTurn/qixArm/segEach/qixCell/qixScreen` で吸収している。
- 立体面の方向キーは「隣の4セルを画面へ投影して押した向きに近いもの」を選ぶ。
  同じキーを押し続けている間は直進を優先(面の継ぎ目で向きがぶれないように)。
- 立体面は初期陣地(HOME: 手前の面の中央の四角)の縁から始まる。

## 設計上の約束
- 占領率の整合: `claimed === initOpen - 空きセル数` を常に保つ(軌跡セルも占領に計上)。
- 状態遷移のうちフレーム依存のものは `tickMeta(dt)` に置く(テストから呼べるように。カメラ更新もここ)。
- AudioContext はユーザー操作後に生成。`Bgm.play()` はAC未生成なら予約だけする。
- テストのプレイヤー操作は `playerMove('up')` など(画面の向きで指定)。
