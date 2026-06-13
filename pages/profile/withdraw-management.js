requireAuth((user) => {
    listenUserData((data) => {
        if (data) {
            document.getElementById('dispWalletType').textContent = (data.walletType || 'TRC20').toUpperCase();
            document.getElementById('dispWalletAddress').textContent = data.walletAddress || 'Not set';
            document.getElementById('dispRealName').textContent = data.realName || '-';
            document.getElementById('dispPhone').textContent = data.phoneNumber || '-';
        } else {
            // No data, maybe user not logged in or deleted
            window.location.href = '/pages/profile/index.html';
        }
    });
});
