const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');

let db = null;

// データベース初期化
async function initializeDatabase() {
    const SQL = await initSqlJs();

    // 既存のDBファイルがあれば読み込む
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // テーブル作成
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS pairs (
            user_id TEXT NOT NULL,
            partner_id TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (user_id, partner_id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            user_id TEXT PRIMARY KEY,
            endpoint TEXT NOT NULL,
            keys_p256dh TEXT NOT NULL,
            keys_auth TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS message_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            message_type TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    saveDb();
    console.log('✅ Database initialized');
}

// DBをファイルに保存
function saveDb() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

// 6桁のランダム識別番号を生成
function generateUserId() {
    const id = Math.floor(100000 + Math.random() * 900000).toString();
    // 重複チェック
    const result = db.exec(`SELECT id FROM users WHERE id = '${id}'`);
    if (result.length > 0 && result[0].values.length > 0) {
        return generateUserId(); // 再帰的に再生成
    }
    return id;
}

// ユーザー登録
function createUser(name) {
    const id = generateUserId();
    db.run(`INSERT INTO users (id, name) VALUES (?, ?)`, [id, name]);
    saveDb();
    return { id, name };
}

// ユーザー取得
function getUser(id) {
    const result = db.exec(`SELECT id, name, created_at FROM users WHERE id = ?`, [id]);
    if (result.length === 0 || result[0].values.length === 0) {
        return null;
    }
    const row = result[0].values[0];
    return { id: row[0], name: row[1], created_at: row[2] };
}

// ペアリング
function createPair(userId, partnerId) {
    // 相手が存在するか確認
    const partner = getUser(partnerId);
    if (!partner) {
        return { success: false, error: '相手のIDが見つかりません' };
    }

    // 既にペアリング済みか確認
    const existing = db.exec(`SELECT * FROM pairs WHERE user_id = ? AND partner_id = ?`, [userId, partnerId]);
    if (existing.length > 0 && existing[0].values.length > 0) {
        return { success: true, message: '既にペアリング済みです', partner };
    }

    // ペアリング作成（双方向）
    db.run(`INSERT OR IGNORE INTO pairs (user_id, partner_id) VALUES (?, ?)`, [userId, partnerId]);
    db.run(`INSERT OR IGNORE INTO pairs (user_id, partner_id) VALUES (?, ?)`, [partnerId, userId]);
    saveDb();

    return { success: true, message: 'ペアリングしました', partner };
}

// パートナー取得
function getPartner(userId) {
    const result = db.exec(`
        SELECT u.id, u.name, u.created_at FROM pairs p 
        JOIN users u ON p.partner_id = u.id 
        WHERE p.user_id = ?
    `, [userId]);
    if (result.length === 0 || result[0].values.length === 0) {
        return null;
    }
    const row = result[0].values[0];
    return { id: row[0], name: row[1], created_at: row[2] };
}

// プッシュ購読を保存
function saveSubscription(userId, subscription) {
    db.run(`
        INSERT OR REPLACE INTO subscriptions (user_id, endpoint, keys_p256dh, keys_auth)
        VALUES (?, ?, ?, ?)
    `, [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]);
    saveDb();
}

// プッシュ購読を取得
function getSubscription(userId) {
    const result = db.exec(`SELECT endpoint, keys_p256dh, keys_auth FROM subscriptions WHERE user_id = ?`, [userId]);
    if (result.length === 0 || result[0].values.length === 0) {
        return null;
    }
    const row = result[0].values[0];
    return {
        endpoint: row[0],
        keys: {
            p256dh: row[1],
            auth: row[2]
        }
    };
}

// メッセージログを保存
function logMessage(senderId, receiverId, messageType) {
    db.run(`INSERT INTO message_logs (sender_id, receiver_id, message_type) VALUES (?, ?, ?)`,
        [senderId, receiverId, messageType]);
    saveDb();
}

module.exports = {
    initializeDatabase,
    createUser,
    getUser,
    createPair,
    getPartner,
    saveSubscription,
    getSubscription,
    logMessage
};
