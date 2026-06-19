let sysConfig = null;
let walletList = [];
let userDataCache = null;

requireAuth((user) => {
    listenSystemConfig((sys) => {
        sysConfig = sys;
        if (sys.siteName) document.getElementById("sitePageTitle").textContent = "Recharge - " + sys.siteName;
        if (sys.currency) {
            const cur = sys.currency;
            const prefix = document.getElementById('rechargeCurrency');
            if (prefix) prefix.textContent = cur;
        }
    });
    listenUserData((data) => {
        if (data) {
            userDataCache = data;
            document.querySelector('.balance-card .amount').textContent = '$' + parseFloat(data.balance || 0).toFixed(2);
        }
    });

    // Load wallets from Firestore
    loadRechargeWallets();
});

async function loadRechargeWallets() {
    try {
        const doc = await db.collection('globalConfig').doc('wallets').get();
        if (doc.exists && doc.data().list) {
            // Only show visible wallets
            walletList = doc.data().list.filter(w => w.visible === true);
        }
    } catch (e) {
        console.warn('Could not load wallets from Firestore, using defaults.', e);
    }

    // Fallback to defaults if no wallets configured
    if (walletList.length === 0) {
        walletList = [
            { name: 'USDT (TRC20)', address: 'TH1bpxgFfMFYV1mpKYuwPGmwxJPNcUd8fS', qr: '/images/usdt_qr.jpg' },
            { name: 'USDT (TRC20) 2', address: 'TYvxcH6mEcCtuQgd6L6igWrtrBtEwQs9Zh', qr: '/images/usdtqr2.jpg' },
            { name: 'BTC', address: '13vu7bkBABq5914M7RsyNxP81GSyRqk59c', qr: '/images/btc_qr.jpg' },
            { name: 'BTC 2', address: 'bc1q5f848r66248ymjen6wgsa4unrl77hsd7ck4n3e', qr: '/images/usdt_qr2.jpg' }
        ];
    }

    // Build the dropdown
    const select = document.getElementById('paymentMethod');
    select.innerHTML = '';
    walletList.forEach((w, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = w.name;
        select.appendChild(opt);
    });

    // Show the first wallet
    updateWalletInfo();
}

function updateWalletInfo() {
    const idx = parseInt(document.getElementById('paymentMethod').value);
    const wallet = walletList[idx];
    if (!wallet) return;

    const addrElem = document.getElementById('walletAddr');
    const qrElem = document.getElementById('qrImage');
    const labelElem = document.getElementById('walletLabel');

    labelElem.textContent = wallet.name + ' Address';
    addrElem.textContent = wallet.address;
    if (wallet.qr) {
        qrElem.src = wallet.qr;
        qrElem.style.display = 'block';
    } else {
        qrElem.style.display = 'none';
    }
}

function copyAddress() {
    const addr = document.getElementById('walletAddr').textContent;
    if (addr === '---') return;
    navigator.clipboard.writeText(addr).then(() => {
        showCustomAlert('Wallet address copied to clipboard!');
    }).catch(() => {
        const textArea = document.createElement("textarea");
        textArea.value = addr;
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); showCustomAlert('Wallet address copied to clipboard!'); } catch (e) { console.error(e); }
        document.body.removeChild(textArea);
    });
}

async function submitRecharge() {
    const btn = document.getElementById('submitRechargeBtn');
    const errEl = document.getElementById('rechargeError');
    const okEl = document.getElementById('rechargeSuccess');
    errEl.style.display = 'none';
    okEl.style.display = 'none';

    const amount = parseFloat(document.getElementById('rechargeAmount').value);
    const txId = (document.getElementById('rechargeTxId').value || '').trim();
    const idx = parseInt(document.getElementById('paymentMethod').value);
    const wallet = walletList[idx];

    if (!wallet) {
        errEl.textContent = 'Please select a payment method.';
        errEl.style.display = 'block';
        return;
    }
    if (!isFinite(amount) || amount <= 0) {
        errEl.textContent = 'Please enter the amount you sent.';
        errEl.style.display = 'block';
        return;
    }

    const user = firebase.auth().currentUser;
    if (!user) {
        errEl.textContent = 'You must be signed in to submit a recharge.';
        errEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Submitting…';

    try {
        await db.collection('recharges').add({
            uid: user.uid,
            username: userDataCache?.username || user.email,
            amount: amount,
            currency: (sysConfig && sysConfig.currency) || '$',
            walletName: wallet.name,
            walletAddress: wallet.address,
            txId: txId,
            status: 'Pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('rechargeStatus').textContent = 'Awaiting verification';
        okEl.textContent = 'Thanks! Your recharge is queued for verification. We will credit your balance once the transfer is confirmed.';
        okEl.style.display = 'block';
        document.getElementById('rechargeAmount').value = '';
        document.getElementById('rechargeTxId').value = '';
    } catch (e) {
        console.error('Recharge submit failed', e);
        errEl.textContent = 'Could not submit your recharge. Please try again or contact support.';
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'I have sent the payment';
    }
}
