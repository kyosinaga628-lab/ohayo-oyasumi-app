# Render.com へのデプロイ方法

## 前提条件

1. GitHubアカウント
2. Render.comアカウント（無料）

## 手順

### Step 1: GitHubリポジトリ作成

```bash
cd c:\Users\yosin\.gemini\antigravity\playground\prograde-eagle
git init
git add .
git commit -m "Initial commit: おはよう・おやすみボタンアプリ"
```

GitHubで新しいリポジトリを作成し、プッシュ:

```bash
git remote add origin https://github.com/YOUR_USERNAME/ohayo-oyasumi-app.git
git branch -M main
git push -u origin main
```

### Step 2: Render.comでデプロイ

1. https://render.com にアクセス
2. 「New +」→「Web Service」を選択
3. GitHubリポジトリを接続
4. 以下の設定を入力:
   - **Name**: `ohayo-oyasumi-app`
   - **Region**: Singapore (アジアに近い)
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

5. 「Create Web Service」をクリック

### Step 3: 完了

数分でデプロイが完了し、以下のようなURLが発行されます:
```
https://ohayo-oyasumi-app.onrender.com
```

このURLにスマホからアクセスして、PWAをホーム画面に追加できます。

---

> [!NOTE]
> 無料プランでは15分間アクセスがないとサーバーがスリープします。
> 最初のアクセス時に数秒の待ち時間が発生することがあります。
