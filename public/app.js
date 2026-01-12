// ==================== State Management ====================
const state = {
    userId: localStorage.getItem('userId'),
    userName: localStorage.getItem('userName'),
    partnerId: localStorage.getItem('partnerId'),
    partnerName: localStorage.getItem('partnerName'),
    pushSubscription: null
};

// ==================== DOM Elements ====================
const screens = {
    register: document.getElementById('screen-register'),
    pair: document.getElementById('screen-pair'),
    main: document.getElementById('screen-main')
};

const elements = {
    // Register
    nicknameInput: document.getElementById('nickname'),
    btnRegister: document.getElementById('btn-register'),

    // Pair
    myId: document.getElementById('my-id'),
    btnCopyId: document.getElementById('btn-copy-id'),
    partnerIdInput: document.getElementById('partner-id'),
    btnPair: document.getElementById('btn-pair'),

    // Main
    userName: document.getElementById('user-name'),
    userIdSmall: document.getElementById('user-id-small'),
    partnerName: document.getElementById('partner-name'),
    btnMorning: document.getElementById('btn-morning'),
    btnNight: document.getElementById('btn-night'),
    messageFeedback: document.getElementById('message-feedback'),

    // Settings
    btnSettings: document.getElementById('btn-settings'),
    settingsPanel: document.getElementById('settings-panel'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    settingsMyId: document.getElementById('settings-my-id'),
    settingsPartnerIdInput: document.getElementById('settings-partner-id'),
    btnChangePair: document.getElementById('btn-change-pair'),
    btnReset: document.getElementById('btn-reset')
};

// ==================== API Functions ====================
const API_BASE = '';

async function api(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(API_BASE + endpoint, options);
    return response.json();
}

// ==================== Screen Navigation ====================
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

// ==================== Initialize App ====================
async function initApp() {
    // 登録済みかチェック
    if (state.userId) {
        // Renderのスリープ対策: APIを待たずに、まずローカル情報で画面を表示
        if (state.partnerName) {
            showMainScreen();
        } else {
            showPairScreen();
        }

        // 裏でユーザー情報を取得して更新
        api(`/api/user/${state.userId}`)
            .then(data => {
                if (data.user) {
                    state.userName = data.user.name;
                    const serverPartnerId = data.partner?.id || null;
                    const serverPartnerName = data.partner?.name || null;
                    
                    // データ更新があれば保存
                    if (state.userName !== localStorage.getItem('userName') ||
                        state.partnerName !== serverPartnerName) {
                        
                        state.partnerId = serverPartnerId;
                        state.partnerName = serverPartnerName;
                        
                        localStorage.setItem('userName', state.userName);
                        if (state.partnerId) {
                            localStorage.setItem('partnerId', state.partnerId);
                            localStorage.setItem('partnerName', state.partnerName);
                        }
                        
                        // 画面更新
                        if (state.partnerName) {
                            elements.userName.textContent = state.userName;
                            elements.partnerName.textContent = state.partnerName;
                            // もしペアリング画面にいたらメインへ
                            if (!document.getElementById('screen-main').classList.contains('hidden') === false) {
                                showMainScreen();
                            }
                        } else {
                            // ペアリングが解消されていた場合など
                            if (!document.getElementById('screen-pair').classList.contains('hidden') === false) {
                                showPairScreen();
                            }
                        }
                    }
                }
            })
            .catch(e => {
                console.error('Background sync failed:', e);
            });

    } else {
        showScreen('register');
    }

    // Service Workerの登録
    registerServiceWorker();
}

function showPairScreen() {
    elements.myId.textContent = state.userId;
    showScreen('pair');
}

function showMainScreen() {
    elements.userName.textContent = state.userName;
    elements.userIdSmall.textContent = `ID: ${state.userId}`;
    elements.partnerName.textContent = state.partnerName;
    elements.settingsMyId.textContent = state.userId;
    showScreen('main');

    // プッシュ通知の購読
    subscribeToPush();
}

// ==================== Service Worker & Push ====================
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registered:', registration.scope);
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    }
}

async function subscribeToPush() {
    if (!('PushManager' in window)) {
        console.log('Push notifications not supported');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // VAPID公開キーを取得
        const { publicKey } = await api('/api/vapid-public-key');

        // 購読
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
        }

        // サーバーに購読情報を送信
        await api('/api/subscribe', 'POST', {
            userId: state.userId,
            subscription: subscription.toJSON()
        });

        state.pushSubscription = subscription;
        console.log('✅ Push notification subscribed');
    } catch (error) {
        console.error('❌ Push subscription failed:', error);
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// ==================== Event Handlers ====================

// 登録ボタン
elements.btnRegister.addEventListener('click', async () => {
    const name = elements.nicknameInput.value.trim();
    if (!name) {
        showToast('ニックネームを入力してください', 'error');
        return;
    }

    elements.btnRegister.disabled = true;

    try {
        const data = await api('/api/register', 'POST', { name });
        if (data.success) {
            state.userId = data.user.id;
            state.userName = data.user.name;
            localStorage.setItem('userId', state.userId);
            localStorage.setItem('userName', state.userName);
            showToast('登録完了！');
            showPairScreen();
        } else {
            showToast(data.error || '登録に失敗しました', 'error');
        }
    } catch (error) {
        showToast('通信エラーが発生しました', 'error');
    } finally {
        elements.btnRegister.disabled = false;
    }
});

// IDコピーボタン
elements.btnCopyId.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(state.userId);
        showToast('IDをコピーしました');
    } catch (error) {
        showToast('コピーに失敗しました', 'error');
    }
});

// ペアリングボタン
elements.btnPair.addEventListener('click', async () => {
    const partnerId = elements.partnerIdInput.value.trim();
    if (!partnerId || partnerId.length !== 6) {
        showToast('6桁のIDを入力してください', 'error');
        return;
    }

    elements.btnPair.disabled = true;

    try {
        const data = await api('/api/pair', 'POST', {
            userId: state.userId,
            partnerId: partnerId
        });

        if (data.success) {
            state.partnerId = partnerId;
            state.partnerName = data.partner.name;
            localStorage.setItem('partnerId', state.partnerId);
            localStorage.setItem('partnerName', state.partnerName);
            showToast(`${state.partnerName}さんとペアリングしました！`);
            showMainScreen();
        } else {
            showToast(data.error || 'ペアリングに失敗しました', 'error');
        }
    } catch (error) {
        showToast('通信エラーが発生しました', 'error');
    } finally {
        elements.btnPair.disabled = false;
    }
});

// 朝ボタン
elements.btnMorning.addEventListener('click', () => sendGreeting('morning'));

// 夜ボタン
elements.btnNight.addEventListener('click', () => sendGreeting('night'));

async function sendGreeting(type) {
    const btn = type === 'morning' ? elements.btnMorning : elements.btnNight;

    // リップルエフェクト
    btn.classList.add('ripple');
    setTimeout(() => btn.classList.remove('ripple'), 600);

    btn.disabled = true;

    try {
        const data = await api('/api/send', 'POST', {
            userId: state.userId,
            messageType: type
        });

        if (data.success) {
            // 成功フィードバック表示
            showFeedback(data.greeting);

            // 音声再生
            speakGreeting(type);
        } else {
            showToast(data.error || '送信に失敗しました', 'error');
        }
    } catch (error) {
        showToast('通信エラーが発生しました', 'error');
    } finally {
        btn.disabled = false;
    }
}

function showFeedback(greeting) {
    elements.messageFeedback.classList.remove('hidden');
    elements.messageFeedback.querySelector('.feedback-text').textContent =
        `メッセージを送信しました！\n${greeting}`;

    setTimeout(() => {
        elements.messageFeedback.classList.add('show');
    }, 10);

    setTimeout(() => {
        elements.messageFeedback.classList.remove('show');
        setTimeout(() => {
            elements.messageFeedback.classList.add('hidden');
        }, 300);
    }, 3000);
}

// ==================== Speech Synthesis ====================
function speakGreeting(type) {
    if (!('speechSynthesis' in window)) {
        console.log('Speech synthesis not supported');
        return;
    }

    const messages = {
        morning: 'おはようございます！良い一日を！',
        night: 'おやすみなさい！良い夢を！'
    };

    const utterance = new SpeechSynthesisUtterance(messages[type]);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;

    // 日本語の声を選択
    const voices = speechSynthesis.getVoices();
    const japaneseVoice = voices.find(v => v.lang.includes('ja'));
    if (japaneseVoice) {
        utterance.voice = japaneseVoice;
    }

    speechSynthesis.speak(utterance);
}

// 音声リストが非同期で読み込まれる場合の対応
if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
        console.log('Voices loaded:', speechSynthesis.getVoices().length);
    };
}

// ==================== Settings ====================
elements.btnSettings.addEventListener('click', () => {
    elements.settingsPanel.classList.remove('hidden');
});

elements.btnCloseSettings.addEventListener('click', () => {
    elements.settingsPanel.classList.add('hidden');
});

elements.btnChangePair.addEventListener('click', async () => {
    const newPartnerId = elements.settingsPartnerIdInput.value.trim();
    if (!newPartnerId || newPartnerId.length !== 6) {
        showToast('6桁のIDを入力してください', 'error');
        return;
    }

    try {
        const data = await api('/api/pair', 'POST', {
            userId: state.userId,
            partnerId: newPartnerId
        });

        if (data.success) {
            state.partnerId = newPartnerId;
            state.partnerName = data.partner.name;
            localStorage.setItem('partnerId', state.partnerId);
            localStorage.setItem('partnerName', state.partnerName);
            elements.partnerName.textContent = state.partnerName;
            elements.settingsPartnerIdInput.value = '';
            showToast(`${state.partnerName}さんとペアリングしました！`);
            elements.settingsPanel.classList.add('hidden');
        } else {
            showToast(data.error || 'ペアリングに失敗しました', 'error');
        }
    } catch (error) {
        showToast('通信エラーが発生しました', 'error');
    }
});

elements.btnReset.addEventListener('click', () => {
    if (confirm('すべてのデータをリセットしますか？\n再度登録が必要になります。')) {
        localStorage.clear();
        location.reload();
    }
});

// ==================== Toast Notifications ====================
function showToast(message, type = 'success') {
    // 既存のトーストを削除
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== Initialize ====================
initApp();
