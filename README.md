# image-shift

`image-shift` は、ブラウザ内だけで画像の形式を変換する完全静的サイトです。
画像は外部サーバーへ送信されず、GitHub Pages にそのまま配置できます。

## できること

- ドラッグ&ドロップ / ファイル選択で画像を読み込み
- ブラウザが読み込める画像形式全般を入力として利用
- ブラウザが実際に書き出せる形式だけを自動検出
- PNG / JPEG / WebP / AVIF / BMP / ICO などへ変換
- 幅・高さは元画像と同じまま維持
- Before / After プレビュー
- 品質スライダー
- Lossless モードのオン / オフ
- JPEG など透過非対応形式へ変換するときの背景色指定

## Lossless モードについて

ブラウザ標準の Canvas API で Lossless として扱える形式は限られます。
このツールでは PNG / BMP / ICO は Lossless 書き出しとして扱い、JPEG / WebP / AVIF など
Lossless 保証がない形式では品質 100% の通常書き出しに寄せます。

ICO は形式仕様に合わせて 256 x 256px 以下の画像のみ対応します。

## ローカル確認

```bash
npm run serve
```

その後、以下を開きます。

```text
http://localhost:4173/
```

## GitHub Pages

ビルド工程は不要です。リポジトリのルートを GitHub Pages の公開元に設定すれば、
`index.html` と `assets/` がそのまま配信されます。

## 構成

```text
/
  index.html
  package.json
  /assets
    /css
      reset.css
      base.css
      layout.css
      components.css
    /js
      app.js
      bytes.js
      converter.js
      download.js
      formats.js
      image-io.js
      ui.js
```
