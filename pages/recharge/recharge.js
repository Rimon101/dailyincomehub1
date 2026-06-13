let sysConfig = null;
let walletList = [];

requireAuth((user) => {
    listenSystemConfig((sys) => {
        sysConfig = sys;
        if (sys.siteName) document.getElementById("sitePageTitle").textContent = "Recharge - " + sys.siteName;
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
