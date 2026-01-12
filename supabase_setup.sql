-- Supabaseでテーブルを作成するSQL
-- Supabaseダッシュボードの「SQL Editor」で実行してください

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ペアリングテーブル
CREATE TABLE IF NOT EXISTS pairs (
    user_id TEXT NOT NULL,
    partner_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, partner_id)
);

-- プッシュ通知購読テーブル
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- メッセージログテーブル
CREATE TABLE IF NOT EXISTS message_logs (
    id BIGSERIAL PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    message_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) を無効化（開発用、本番では適切に設定すること）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- 全員がアクセスできるポリシーを作成（開発用）
CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to pairs" ON pairs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to subscriptions" ON subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to message_logs" ON message_logs FOR ALL USING (true) WITH CHECK (true);
