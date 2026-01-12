# Render.com デプロイ修正手順

現在、アプリの登録時に「通信エラー」が発生しています。これは、Render.comで「Static Site」としてデプロイされているため、サーバー機能（Node.js/Express）が動作していないことが原因です。

以下の手順で、サーバー機能を含む **「Web Service」** として再作成してください。

## 正しい手順

1. Render.comのダッシュボードで、現在の「Static Site」サービスを特定し、削除するか無視してください。

2. 右上の **「New +」** ボタンをクリックし、必ず **「Web Service」** を選択してください。
   > ⚠️ 「Static Site」を選択しないでください。

3. GitHubリポジトリ `ohayo-oyasumi-app` を接続します。

4. 設定画面で以下を確認・入力してください：
   - **Name**: `ohayo-oyasumi-app-server` (名前は任意ですが変えると区別しやすいです)
   - **Runtime**: **Node** (自動選択されない場合は、Environment等の設定で確認)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

5. **「Create Web Service」** をクリックします。

6. デプロイが完了するのを待ちます。ログに `Server running on...` と表示されれば成功です。

7. 新しいURL（例: `https://ohayo-oyasumi-app-server.onrender.com`）にアクセスして動作確認してください。
