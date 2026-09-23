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
1. `SURF3D` / `CONFIG` — 数値バランス。盤面ごとの値は `CONFIG.SURF`(17種)、TOURの順番は `CONFIG.TOUR`
2. `DIFFS` — 難易度 / `MODES` — 盤面モード(TOUR+各盤面、タイトルで←→) / `MUSIC_KEYS` — BGMの選択肢
3. `THEMES` — 配色テーマ6種。`anim` 付き(PRISM/AURORA)は占領色が時間で移ろう(`tickTheme`)
4. `BGMDATA` — BGM譜面7曲(title/play/orbit/chip/drone/ambient/idm)。音名で記述(♭は#)。
   音色パラメータ a/r/det/echo/ed/pr/oj、ドラム blip あり。`at(len,{step:'音名'})` は疎な譜面の略記
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

## 設計上の約束
- 占領率の整合: `claimed === initOpen - 空きセル数` を常に保つ(軌跡セルも占領に計上)。
- 状態遷移のうちフレーム依存のものは `tickMeta(dt)` に置く(テストから呼べるように。カメラ更新もここ)。
- AudioContext はユーザー操作後に生成。`Bgm.play()` はAC未生成なら予約だけする。
- テストのプレイヤー操作は `playerMove('up')` など(画面の向き)か、`playerStep(surf.nb[c*4+k])`(格子の向き)。
- テストは全盤面を作って遊ぶので少し時間がかかる(数十秒)。
