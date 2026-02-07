
<!-- Ctrl + K V -->

# ProjectPolicy.md（プロジェクトに関わる人/AI向け）

 ProjectPolicy.md はプロジェクト全体のルールが書かれています。
 このアプリの開発は、ProjectPolicy.md に書かれたルールに沿って進めること。
 プロジェクト全体のルールの内、特にAIに関するものについては AGENTS.md を参照してください。

## アプリ名：B.Click

### アプリの目的

 ギターのリズム練習用のアプリ

## 見た目のデザイン

- 緑を基調とした色遣いとする。
- 表示部、ボタン部、など同じ機能であれば、基本的に同じ見た目にする。

- 設定項目ラベル   背景：深緑、文字：白系
- 画面遷移ボタン   背景：mintcream、文字と縁取：太線＋緑系  （ただし、小節番号選択から小節編集画面への遷移だけは別）
- 画面内操作ボタン 背景：灰色、文字と縁取：細線＋黒系（editScore画面のchipButton属性）

### 画面共通のデザイン

- 画面上部のヘッダ―と、画面下部のフッターは共通とする。
- 何らかの設定をする画面には、ヘッダーの部の左に "< Back" ボタン、ヘッダー部の右に "Done" ボタンを配置する。
- "< Back" ボタンは設定値の編集を保存せずに前の画面に戻り、"Done" ボタンは設定値の編集を保存して前の画面に戻る。

## ソースコード
- 基本的にはAIに依頼するが、人間がコードを書く場合でも、AGENTS.md に書かれたコード作成ルールに沿って作成すること。

## ライブラリに関して

- 使用しているライブラリは、特段の理由がない限りは、利用規約に列挙すること。
- ライセンスが変更なり使えなくなったライブラリは使わないこと。

- 内部で alphaTab を使用している個所は、仕様の参照は以下のサイトから行う。
https://www.alphatab.net/docs/introduction/

alphaTab の Chord 表記の例は下記から、{ch "C"} を検索。
https://next.alphatab.net/docs/alphatex/beat-properties

alphaTab/alphaTex の1段ごとの小節数の表記の例は下記から。
https://alphatab.net/docs/alphatex/score-metadata#defaultsystemslayout

拍子について
https://www.alphatab.net/docs/alphatex/bar-metadata#ts
 
休符について
https://alphatab.net/docs/alphatex/document-structure#beat-content-required

音符表現について
https://alphatab.net/docs/alphatex/document-structure#beats

付点表現については、以下から { d } や { dd } を検索。
https://alphatab.net/docs/alphatex/beat-properties

テンポについて（tempoで検索）
https://alphatab.net/docs/alphatex/bar-metadata

- 内部で ABCJS を使用している個所は、仕様の参照は以下のサイトから行う。
https://docs.abcjs.net/


- 内部で pdf-lib を使用している個所は、仕様の参照は以下のサイトから行う。


## 保存ファイルについて

- PDFで保存される。保存データの実態はPDF添付の*.jsonファイルです。
- PDFに描画される楽譜は、画像として描画されています。
- PDFのページ数は1です。小節数が多くなると全てを1ページに収めようと縮小しますが、少なくなっても倍率1.0が最大です。


## リリース時の圧縮（と難読化）に関して

- アプリのリリースにおいては、圧縮ツールは GitHub Actions の runner 上で実行する。
- runner 上の作業ディレクトリからAzureにスクリプトを送りアプリを公開する。
- このリリースのため *.yml と package.json などのファイルを用意する。
- ファイルが用意出来たら ローカルで確認（ npm install → npm run build ）し、AIに指示を出して確認してもらう。
  例）
    www をミニファイした dist フォルダの中身が、意味は変えずにサイズだけ小さくなっているかチェックしてほしい。
    フォルダ構成と存在するファイルが同一であることの他に、簡易チェックでいいので、チェック方法は任せる。
    （今のところ、スクショ比較 や DOM比較は不要です。）

- コマンド（npm install → npm run build）はrepoフォルダで実行するが、その際に生成される dist , node_modules フォルダは git 管理対象外。
- 手動で npm run build した後は、npm run lint で、静的チェックする。

- 難読化は将来に対応する予定。


## リリース前の静的チェックに関して

- npm run lint

一行入力時は以下のコマンド

- npm run build && npm run lint


## サーバー設定
- キャッシュを有効にする。（時々設定を見直すこと）
- *.html 「キャッシュはするが毎回 revalidate」の設定とする。

- WEB検索から index.html 以外の画面を直接開いたら inded.html へ転送する。


## フォルダ運用（一部構想中）

www  - 開発フォルダ
dist - リリース版のフォルダ。wwwをミニファイした stable版のフォルダで、ユーザはこれを使う。

（以下のフォルダは構想中）

ver
 +- next    - stable版をリリースした後に次の開発を進めるフォルダ（ユーザ使用に影響を与えないため）
 +- ver1.0  - stable版を複数リリースした後、過去版を使用可能にするためのフォルダ（何かあったとき用）
 +- ver1.1  - (過去版)
 +- ver2.1  - (過去版)


## 検討段階（いずれ使っていきたい）

- npm run ci
- Playwright
