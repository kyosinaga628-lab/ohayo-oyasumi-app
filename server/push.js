const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const keysPath = path.join(__dirname, 'vapid-keys.json');

let vapidKeys;

// VAPIDキーを読み込み or 生成
function initializeVapid() {
    if (fs.existsSync(keysPath)) {
        vapidKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
        console.log('✅ VAPID keys loaded');
    } else {
        vapidKeys = webpush.generateVAPIDKeys();
        fs.writeFileSync(keysPath, JSON.stringify(vapidKeys, null, 2));
        console.log('✅ VAPID keys generated and saved');
    }

    webpush.setVapidDetails(
        'mailto:example@example.com',
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
}

// 公開キーを取得
function getPublicKey() {
    return vapidKeys.publicKey;
}

// プッシュ通知を送信
async function sendPushNotification(subscription, payload) {
    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log('✅ Push notification sent');
        return { success: true };
    } catch (error) {
        console.error('❌ Push notification failed:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    initializeVapid,
    getPublicKey,
    sendPushNotification
};
