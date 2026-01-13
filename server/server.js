const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const push = require('./push');

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 初期化（非同期）
async function startServer() {
    await db.initializeDatabase();
    push.initializeVapid();

    // ==================== API エンドポイント ====================

    // VAPID公開キー取得
    app.get('/api/vapid-public-key', (req, res) => {
        res.json({ publicKey: push.getPublicKey() });
    });

    // ユーザー登録
    app.post('/api/register', async (req, res) => {
        try {
            const { name } = req.body;
            if (!name || name.trim().length === 0) {
                return res.status(400).json({ error: 'ニックネームを入力してください' });
            }
            const user = await db.createUser(name.trim());
            res.json({ success: true, user });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: '登録に失敗しました' });
        }
    });

    // ユーザー情報取得
    app.get('/api/user/:id', async (req, res) => {
        try {
            const user = await db.getUser(req.params.id);
            if (!user) {
                return res.status(404).json({ error: 'ユーザーが見つかりません' });
            }
            const partner = await db.getPartner(req.params.id);
            res.json({ user, partner });
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
        }
    });

    // ペアリング
    app.post('/api/pair', async (req, res) => {
        try {
            const { userId, partnerId } = req.body;
            if (!userId || !partnerId) {
                return res.status(400).json({ error: 'IDが不足しています' });
            }
            if (userId === partnerId) {
                return res.status(400).json({ error: '自分自身とはペアリングできません' });
            }
            const result = await db.createPair(userId, partnerId);
            res.json(result);
        } catch (error) {
            console.error('Pair error:', error);
            res.status(500).json({ error: 'ペアリングに失敗しました' });
        }
    });

    // プッシュ通知購読
    app.post('/api/subscribe', async (req, res) => {
        try {
            const { userId, subscription } = req.body;
            if (!userId || !subscription) {
                return res.status(400).json({ error: 'データが不足しています' });
            }
            await db.saveSubscription(userId, subscription);
            res.json({ success: true, message: '通知を有効にしました' });
        } catch (error) {
            console.error('Subscribe error:', error);
            res.status(500).json({ error: '通知の設定に失敗しました' });
        }
    });

    // メッセージ送信
    app.post('/api/send', async (req, res) => {
        try {
            const { userId, messageType } = req.body;
            if (!userId || !messageType) {
                return res.status(400).json({ error: 'データが不足しています' });
            }

            // 送信者情報取得
            const sender = await db.getUser(userId);
            if (!sender) {
                return res.status(404).json({ error: 'ユーザーが見つかりません' });
            }

            // パートナー取得
            const partner = await db.getPartner(userId);
            if (!partner) {
                return res.status(400).json({ error: 'ペアリングされていません' });
            }

            // パートナーのプッシュ購読取得
            const subscription = await db.getSubscription(partner.id);
            if (!subscription) {
                return res.status(400).json({ error: '相手が通知を許可していません' });
            }

            // メッセージ内容を決定
            const messages = {
                morning: {
                    title: '🌅 おはよう！',
                    body: `${sender.name}さんからおはようメッセージ！`,
                    greeting: 'おはようございます！良い一日を！'
                },
                night: {
                    title: '🌙 おやすみ！',
                    body: `${sender.name}さんからおやすみメッセージ！`,
                    greeting: 'おやすみなさい！良い夢を！'
                }
            };

            const message = messages[messageType];
            if (!message) {
                return res.status(400).json({ error: '無効なメッセージタイプです' });
            }

            // プッシュ通知送信
            const pushResult = await push.sendPushNotification(subscription, {
                title: message.title,
                body: message.body,
                icon: '/icons/icon-192.png',
                data: { messageType, senderId: userId, senderName: sender.name }
            });

            // メッセージログ保存
            await db.logMessage(userId, partner.id, messageType);

            res.json({
                success: true,
                message: 'メッセージを送信しました！',
                greeting: message.greeting,
                partnerName: partner.name
            });
        } catch (error) {
            console.error('Send error:', error);
            res.status(500).json({ error: 'メッセージの送信に失敗しました' });
        }
    });

    // メッセージ履歴取得
    app.get('/api/history/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const messages = await db.getReceivedMessages(userId, 20);
            res.json({ success: true, messages });
        } catch (error) {
            console.error('History error:', error);
            res.status(500).json({ error: '履歴の取得に失敗しました' });
        }
    });

    // SPA対応 - 静的ファイル以外のルートでindex.htmlを返す
    // 注意: express.staticで提供される静的ファイルはこのミドルウェアより先に処理される
    // ファイル拡張子を持つリクエストは404を返す（静的ファイルが見つからなかった場合）
    app.get('*', (req, res, next) => {
        // 音声、画像など静的ファイルへのリクエストの場合は404を返す
        const staticExtensions = ['.mp3', '.wav', '.ogg', '.jpg', '.png', '.gif', '.ico', '.css', '.js', '.json', '.webp', '.svg'];
        const hasExtension = staticExtensions.some(ext => req.path.toLowerCase().endsWith(ext));

        if (hasExtension) {
            // 静的ファイルが見つからなかった場合は404
            return res.status(404).send('File not found');
        }

        // その他のルートはindex.htmlを返す（SPA対応）
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // サーバー起動
    app.listen(PORT, () => {
        console.log(`
    ╔═══════════════════════════════════════════════╗
    ║  🌅 おはよう・おやすみボタンアプリ 🌙         ║
    ║  Server running on http://localhost:${PORT}      ║
    ╚═══════════════════════════════════════════════╝
        `);
    });
}

// サーバー開始
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
