# 音声ファイル設定ガイド

## フォルダ構造

```
public/audio/
├── morning/     # おはよう用音声
│   ├── 1.mp3
│   ├── 2.mp3
│   ├── 3.mp3
│   └── ...
└── night/       # おやすみ用音声
    ├── 1.mp3
    ├── 2.mp3
    ├── 3.mp3
    └── ...
```

## 音声ファイルの追加方法

1. VOICEVOXやCOEIROINKで音声を生成
2. MP3形式でエクスポート
3. `1.mp3`, `2.mp3`, `3.mp3`... と番号をつけて保存
4. `morning/` または `night/` フォルダに配置

## 音声ファイル数の設定

`public/app.js` の `audioConfig` で音声ファイル数を設定：

```javascript
const audioConfig = {
    morning: {
        count: 8,  // ← ここを実際のファイル数に変更
        path: '/audio/morning/'
    },
    night: {
        count: 8,  // ← ここを実際のファイル数に変更
        path: '/audio/night/'
    }
};
```

## 注意事項

- 音声ファイルがない場合は、自動的にWeb Speech APIにフォールバックします
- ファイル名は必ず `1.mp3`, `2.mp3`, ... の形式にしてください
