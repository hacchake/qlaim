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
1. `CONFIG` — 数値バランス(グリッド128×160、セル5px、速度、残機、ボーナス等)
2. `DIFFS` — 難易度プリセット(EASY/NORMAL/HARD の速度・導火線倍率)
3. `THEMES` — 配色テーマ4種(NEON/CRT-G/VAPOR/MONO)
4. `BGMDATA` — BGM譜面。音名('A2','G#4')で記述。`l`=盛り上がりレイヤー(0〜3)
5. `store` / `settings` — localStorage保存(不可なら内部メモリにフォールバック)
6. `Snd` — 効果音(SFXバスとBGMバス分離)、`Bgm` — 先読みシーケンサ
7. ゲーム状態・フィールド(`grid`: OPEN/WALL/TRAIL)、占領 `claimFill`、`visitedFrom`(BFS)
8. プレイヤー・`closeTrail`(QIX2体の分断判定→即クリアもここ)・導火線・QIX(`qixes`配列)・SPARX
9. 進行: 状態は title / options / ready / play / pause / clear / over
10. 描画(`render` / `renderHUD` / `renderOverlay`)、入力(キーボード・タッチパッド・キャンバスタップ)

## 設計上の約束
- 占領率の整合: `claimed === initOpen - 空きセル数` を常に保つ(軌跡セルも占領に計上)。
- 状態遷移のうちフレーム依存のものは `tickMeta(dt)` に置く(テストから呼べるように)。
- AudioContext はユーザー操作後に生成。`Bgm.play()` はAC未生成なら予約だけする。
