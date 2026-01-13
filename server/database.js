const { createClient } = require('@supabase/supabase-js');

// Supabase設定（環境変数から取得、フォールバックとして直接値を使用）
const supabaseUrl = process.env.SUPABASE_URL || 'https://epkebntxvmshlhilkftc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwa2VibnR4dm1zaGxoaWxrZnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxOTQyMDUsImV4cCI6MjA4Mzc3MDIwNX0.hRTgpT7BvbdzeUTtKePPZ1VxuKC5_EeHR6yrGUTnreQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// データベース初期化（テーブル作成はSupabase側で行う）
async function initializeDatabase() {
    console.log('✅ Supabase client initialized');
    // テーブルが存在しない場合は作成を試みる（RLS無効の場合のみ動作）
    // 本番環境ではSupabaseダッシュボードでテーブルを作成することを推奨
}

// 6桁のランダム識別番号を生成
function generateUserId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ユーザー登録
async function createUser(name) {
    let id;
    let attempts = 0;

    while (attempts < 10) {
        id = generateUserId();
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .single();

        if (!existing) break;
        attempts++;
    }

    const { data, error } = await supabase
        .from('users')
        .insert([{ id, name }])
        .select()
        .single();

    if (error) {
        console.error('Create user error:', error);
        throw error;
    }

    return { id: data.id, name: data.name };
}

// ユーザー取得
async function getUser(id) {
    const { data, error } = await supabase
        .from('users')
        .select('id, name, created_at')
        .eq('id', id)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}

// ペアリング
async function createPair(userId, partnerId) {
    // 相手が存在するか確認
    const partner = await getUser(partnerId);
    if (!partner) {
        return { success: false, error: '相手のIDが見つかりません' };
    }

    // 既にペアリング済みか確認
    const { data: existing } = await supabase
        .from('pairs')
        .select('*')
        .eq('user_id', userId)
        .eq('partner_id', partnerId)
        .single();

    if (existing) {
        return { success: true, message: '既にペアリング済みです', partner };
    }

    // ペアリング作成（双方向）
    const { error: error1 } = await supabase
        .from('pairs')
        .upsert([{ user_id: userId, partner_id: partnerId }]);

    const { error: error2 } = await supabase
        .from('pairs')
        .upsert([{ user_id: partnerId, partner_id: userId }]);

    if (error1 || error2) {
        console.error('Pair error:', error1 || error2);
        return { success: false, error: 'ペアリングに失敗しました' };
    }

    return { success: true, message: 'ペアリングしました', partner };
}

// パートナー取得
async function getPartner(userId) {
    const { data: pair } = await supabase
        .from('pairs')
        .select('partner_id')
        .eq('user_id', userId)
        .single();

    if (!pair) {
        return null;
    }

    return await getUser(pair.partner_id);
}

// プッシュ購読を保存
async function saveSubscription(userId, subscription) {
    const { error } = await supabase
        .from('subscriptions')
        .upsert([{
            user_id: userId,
            endpoint: subscription.endpoint,
            keys_p256dh: subscription.keys.p256dh,
            keys_auth: subscription.keys.auth
        }]);

    if (error) {
        console.error('Save subscription error:', error);
        throw error;
    }
}

// プッシュ購読を取得
async function getSubscription(userId) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('endpoint, keys_p256dh, keys_auth')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        return null;
    }

    return {
        endpoint: data.endpoint,
        keys: {
            p256dh: data.keys_p256dh,
            auth: data.keys_auth
        }
    };
}

// メッセージログを保存
async function logMessage(senderId, receiverId, messageType) {
    await supabase
        .from('message_logs')
        .insert([{
            sender_id: senderId,
            receiver_id: receiverId,
            message_type: messageType
        }]);
}

// 受信メッセージ履歴を取得
async function getReceivedMessages(userId, limit = 20) {
    const { data, error } = await supabase
        .from('message_logs')
        .select('id, sender_id, message_type, created_at')
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error || !data) {
        return [];
    }

    // 送信者名を取得
    const messagesWithSenderNames = await Promise.all(
        data.map(async (msg) => {
            const sender = await getUser(msg.sender_id);
            return {
                id: msg.id,
                senderName: sender?.name || '不明',
                messageType: msg.message_type,
                createdAt: msg.created_at
            };
        })
    );

    return messagesWithSenderNames;
}

module.exports = {
    initializeDatabase,
    createUser,
    getUser,
    createPair,
    getPartner,
    saveSubscription,
    getSubscription,
    logMessage,
    getReceivedMessages
};
