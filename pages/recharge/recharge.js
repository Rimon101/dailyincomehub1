let sysConfig = null;
let walletList = [];
let userDataCache = null;

// Show cached balance instantly
(function() {
    const cached = typeof getCachedUserData === 'function' ? getCachedUserData() : null;
    if (cached) {
        const el = document.querySelector('.balance-card .amount');
        if (el) el.textContent = '$' + parseFloat(cached.balance || 0).toFixed(2);
    }
})();

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
    }, user);

    // Load wallets from Firestore
    loadRechargeWallets();
});

async function loadRechargeWallets() {
    let hasWalletConfig = false;
    try {
        const doc = await db.collection('globalConfig').doc('wallets').get();
        if (doc.exists && Array.isArray(doc.data().list)) {
            hasWalletConfig = true;
            // Older wallet records may not have a visible flag yet.
            walletList = doc.data().list.filter(w => w && w.visible !== false);
        }
    } catch (e) {
        console.warn('Could not load wallets from Firestore, using defaults.', e);
    }

    // Fallback to defaults only before the admin has configured wallets.
    if (!hasWalletConfig) {
        walletList = [
            { name: 'TRON (TRC20)', address: 'THPmUqNpmeASTyydeKfbiXtrLjiykfX4t5', qr: '/images/TRC20qr.jpg' },
            { name: 'Ethereum (ERC20)', address: '0x3EC1C382b996Ed3794e806366c4a5a92Ee1494D4', qr: '/images/erc20qr.jpg' },
            //{ name: 'BTC', address: '13vu7bkBABq5914M7RsyNxP81GSyRqk59c', qr: '/images/btc_qr.jpg' },
            //{ name: 'BTC 2', address: 'bc1q5f848r66248ymjen6wgsa4unrl77hsd7ck4n3e', qr: '/images/usdt_qr2.jpg' }
        ];
    }

    // Build the dropdown
    const select = document.getElementById('paymentMethod');
    select.innerHTML = '';
    if (walletList.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No payment wallet available';
        select.appendChild(opt);
        updateWalletInfo();
        return;
    }

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
    const addrElem = document.getElementById('walletAddr');
    const qrElem = document.getElementById('qrImage');
    const labelElem = document.getElementById('walletLabel');
    const submitBtn = document.getElementById('submitRechargeBtn');
    const copyBtn = document.querySelector('.copy-btn-inner');

    if (!wallet) {
        labelElem.textContent = 'Payment wallet unavailable';
        addrElem.textContent = 'Please contact customer service.';
        qrElem.removeAttribute('src');
        qrElem.style.display = 'none';
        if (submitBtn) submitBtn.disabled = true;
        if (copyBtn) copyBtn.disabled = true;
        return;
    }

    labelElem.textContent = wallet.name + ' Address';
    addrElem.textContent = wallet.address;
    if (submitBtn) submitBtn.disabled = false;
    if (copyBtn) copyBtn.disabled = false;
    if (wallet.qr) {
        qrElem.src = wallet.qr;
        qrElem.alt = wallet.name + ' QR code';
        qrElem.style.display = 'block';
    } else {
        qrElem.style.display = 'none';
    }
}

function copyAddress() {
    const idx = parseInt(document.getElementById('paymentMethod').value, 10);
    const wallet = walletList[idx];
    if (!wallet || !wallet.address) return;
    const addr = wallet.address;
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
