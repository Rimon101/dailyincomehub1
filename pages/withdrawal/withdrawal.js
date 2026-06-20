let currentBal = 0;
let userDataCache = null;

// Show cached data instantly
(function() {
    const cached = typeof getCachedUserData === 'function' ? getCachedUserData() : null;
    if (cached) {
        currentBal = parseFloat(cached.balance || 0);
        const el = document.querySelector('.balance-card .amount');
        if (el) el.textContent = '$' + currentBal.toFixed(2);
        if (cached.walletAddress) {
            const wa = document.getElementById('walletAddress');
            if (wa) wa.value = cached.walletAddress;
        }
    }
})();

requireAuth((user) => {
    listenSystemConfig((sys) => { if (sys.siteName) document.getElementById("sitePageTitle").textContent = "Withdrawal - " + sys.siteName; });
    listenUserData((data) => {
        if (data) {
            userDataCache = data;
            
            // Proactive Guard: If wallet is not bound, redirect to bind-wallet
            if (!data.walletAddress || data.walletAddress.trim() === "") {
                showCustomAlert("Please bind your withdrawal wallet address first.", () => {
                    window.location.href = "/bind-wallet";
                });
                return;
            }

            currentBal = parseFloat(data.balance || 0);
            document.querySelector('.balance-card .amount').textContent = '$' + currentBal.toFixed(2);
            if (data.walletAddress) document.getElementById('walletAddress').value = data.walletAddress;
        }
    }, user);

});

function withdrawAll() {
    if (currentBal > 0) {
        document.getElementById('withdrawAmount').value = currentBal.toFixed(2);
    }
}

async function submitWithdrawal() {
    if (!userDataCache) return;
    const btn = document.querySelector('.submit-btn.withdraw');
    btn.textContent = 'Processing...'; btn.disabled = true;

    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const address = document.getElementById('walletAddress').value;
    const password = document.getElementById('securityPassword').value;

    if (!amount || amount < 100) { showCustomAlert('Minimum $100.00'); resetBtn(); return; }
    if (amount > currentBal) { showCustomAlert('Insufficient balance. Available: $' + currentBal.toFixed(2)); resetBtn(); return; }
    if (!address) { showCustomAlert('Please configure your Wallet in Profile Settings first.'); resetBtn(); return; }
    if (!password) { showCustomAlert('Please enter your fund password'); resetBtn(); return; }
    
    // Strict enforcement of password rules
    if (!userDataCache.withdrawPassword) { 
        showCustomAlert('Please set a fund password by binding your wallet first.'); 
        resetBtn(); return; 
    }
    const hashedPassword = await window.hashPassword(password);
    if (hashedPassword !== userDataCache.withdrawPassword && password !== userDataCache.withdrawPassword) { 
        showCustomAlert('Incorrect fund password!'); 
        resetBtn(); return; 
    }

    try {
        await db.collection('withdrawals').add({
            uid: firebase.auth().currentUser.uid,
            username: userDataCache.username, amount: parseFloat(amount),
            status: 'Pending', method: 'trc20', wallet: address,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Deduct balance immediately
        const newBalance = currentBal - parseFloat(amount);
        const transactions = userDataCache.transactions || [];
        transactions.push({ type: 'Withdrawal Request (Pending)', amount: parseFloat(amount), date: firebase.firestore.Timestamp.now() });
        await updateUserData({ balance: newBalance, transactions });

        showCustomAlert('Withdrawal of $' + amount.toFixed(2) + ' submitted!\nWaiting for admin approval.', () => {
            window.location.href = '/';
        });
    } catch (error) { showCustomAlert('Error: ' + error.message); resetBtn(); }

    function resetBtn() { btn.textContent = 'Submit'; btn.disabled = false; }
}

