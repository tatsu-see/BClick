
<!-- Ctrl + K V -->

# ProjectPolicy.md（プロジェクトに関わる人/AI向け）

 ProjectPolicy.md はプロジェクト全体のルールが書かれています。
 このアプリの開発は、ProjectPolicy.md に書かれたルールに沿って進めること。
 プロジェクト全体のルールの内、特にAIに関するものについては CLAUDE.md を参照してください。

## アプリ名：B.Click

### アプリの目的

- 一定リズムのクリック音を聞きながら、画面に出てくるコード譜を見つつギターを演奏することで、ギターの上達が可能になる。
- ギターのリズム練習用のアプリ

### 想定するデバイス

- Windows PC, Mac, iPhone, Android

## GDPR対応（方針）

- 解析用途で Google Analytics を使用するため、同意バナーを表示する（index.htmlが面だけに）
- 同意前は計測・広告関連のストレージを `denied` とし、同意後に `granted` へ更新する（Google Consent Mode v2）
- 同意の保存は Cookie で行い、有効期限は 12 か月とする
- Google Analyticsのデータ保持期間はGA設定値に従う
- 表示対象地域は原則「全地域」向けに表示する（EU/EEA 判定による出し分けは行わない）
- 同意の撤回・再選択ができる導線を用意する（terms 画面内に用意する）
 （terms 画面内のプライバシーポリシーの章にリンクを用意。チェックボックスが出てくるdialogタグI/Fで操作）
- 利用規約・プライバシーポリシーに、収集目的・第三者提供・Cookie・保管期間・問い合わせ先を明記する
  (問い合わせ先は、index画面のフッターに用意した "メッセージ" からメッセージをもらう)

GDPR対応の仕様

１：同意バナーの選択肢をどうするか？ → 「 同意する / 拒否する」 の2択とする。
２：バナーの文言（AIにお任せで。特段おかしな文でなければOK ）
  EN: "We use analytics cookies to improve this app. You can accept or decline. You can change your choice anytime in Terms."
  JA: "本アプリの改善のため解析用Cookieを使用します。同意または拒否が可能です。設定は利用規約ページからいつでも変更できます。"
３：表示タイミングは、初回アクセス時のみ表示（同意/拒否が未保存のときに出す）、とする。
  表示バナーの位置は、アプリ画面(index.html)の最下部にでる。
４：同意保存の仕様
  キー名: bclick.consent.analytics
  値:     granted / denied
  期限:   12か月
５：Consent Mode v2 の初期値と更新値
  初期（同意前）: ad_storage: denied, analytics_storage: denied, ad_user_data: denied, ad_personalization: denied
  同意後: 上記をすべて granted
６：同意撤回/再選択の導線（terms 画面内）
  terms.html の「プライバシーポリシー」章に Consent settings / 同意設定 のリンク（ボタン）を追加し、クリックで dialog を開き、
  同意する / 拒否する の2ボタンのみ（現在状態も表示）
７：GAコードの読み込み場所・タイミング
  同意前は gtag.js を読み込まない
  同意が granted のときのみ動的に gtag.js を読み込み、gtag('config', 'G-...') を実行
  index.html のみに設置（他ページは遷移時に index.html 経由）
８：その他
  Android, iPhone, Windows11, Mac のブラウザ画面で見ても適切な位置やサイズ、文言であることは実装後に確認する。


## 見た目のデザイン

- 緑を基調とした色遣いとする。
- 表示部、ボタン部、など同じ機能であれば、基本的に同じ見た目にする。

- 設定項目ラベル   背景：深緑、文字：白系
- 画面遷移ボタン   背景：mintcream、文字と縁取：太線＋緑系  （ただし、小節番号選択から小節編集画面への遷移だけは別）
- 画面内操作ボタン 背景：灰色、文字と縁取：細線＋黒系（editScore画面のchipButton属性）

### 画面共通のデザイン

- 画面上部のヘッダ―と、画面下部のフッターは共通とする。
- 何らかの設定をする画面には、ヘッダーの部の左に "< Back" ボタンを用意する。
  "< Back" ボタンは設定値の編集を保存せずに前の画面に戻る。
- 何らかの設定をする画面には、ヘッダーの部の右に "Done" または "Save" ボタンを配置する。
  "Done" は設定を保存して "< Back" 相当の画面遷移がある。"Save" は設定を保存して、画面線をしない。
  設定変更を終了し画面遷移が妥当な場合は "Done" を選択し、保存しながらも編集を続ける場合は "Save" を選択する。

## ソースコード
- 基本的にはAIに依頼するが、人間がコードを書く場合でも、CLAUDE.md に書かれたコード作成ルールに沿って作成すること。

## ライセンスに関して
- 利用規約にヒト向けに説明する文章を載せる。
- Webサイトやデジタルコンテンツの 利用条件（ライセンス）を“機械が読める形”で表すXML文書（RSL Document）は必要になった時に作成する。

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


## フォルダ運用

www  - stable版フォルダ（ミニファイ前）
dist - stable版 Release のフォルダ。wwwをミニファイしており、ユーザはこれを使う。

（以下のフォルダは過去と未来のバージョン対応）

www\releases
 index.html - nextやver*.*フォルダ内にあるindex.htmlへのリンクを説明する画面。next・過去版いずれも自己責任。
 +- \next   - stable版をリリースした後に次の開発を進めるフォルダ（ユーザ使用に影響を与えないため）
 +- \v1.0   - stable版を複数リリースした後、過去版を使用可能にするためのフォルダ（何かあったとき用）
 +- \v1.1   - (同様の過去ver.)
 +- \v2.1   - (同様の過去ver.)


## 検討段階（いずれ使っていきたい）

- npm run ci
- Playwright
