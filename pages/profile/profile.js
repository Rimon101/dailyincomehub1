requireAuth((firebaseUser) => {
    listenSystemConfig((sys) => {
        if (sys.siteName) document.getElementById("sitePageTitle").textContent = "Profile - " + sys.siteName;
    });

    listenUserData((data) => {
        if (!data) return;

        // Hero — username + email
        document.getElementById('displayUsername').textContent = data.username || 'User';
        document.getElementById('displayEmail').textContent = data.email || '';

        // Profile picture
        if (data.profilePic) {
            document.getElementById('defaultPic').style.display = 'none';
            const preview = document.getElementById('profilePicPreview');
            preview.src = data.profilePic;
            preview.style.display = 'block';
        }

        // Bind wallet / withdraw management visibility based on whether a wallet is bound
        const bindBtn = document.getElementById('bindWalletMenuBtn');
        const withdrawMgmtBtn = document.getElementById('withdrawManagementBtn');
        const hasWallet = !!data.walletAddress;

        if (bindBtn) bindBtn.style.display = hasWallet ? 'none' : 'flex';
        if (withdrawMgmtBtn) withdrawMgmtBtn.style.display = hasWallet ? 'flex' : 'none';

        // Total balance (USDT card)
        const balanceEl = document.getElementById('usdtBalance');
        if (balanceEl) balanceEl.textContent = '$' + Number(data.balance || 0).toFixed(4);

        // Invitation code — generate one if missing on this user record
        const inviteCodeElem = document.getElementById('usdtInviteCode');
        if (inviteCodeElem) {
            if (data.inviteCode) {
                inviteCodeElem.textContent = data.inviteCode;
            } else if (window.generateInviteCode) {
                const newCode = generateInviteCode();
                updateUserData({ inviteCode: newCode }).catch(err => console.error("Failed to save invite code:", err));
                inviteCodeElem.textContent = newCode;
            }
        }
    }, firebaseUser);
});

function copyInviteCode() {
    const code = document.getElementById('usdtInviteCode').textContent;
    if (!code || code === '------') return;

    navigator.clipboard.writeText(code).then(() => {
        if (window.showCustomAlert) {
            showCustomAlert('Invitation code copied!');
        } else {
            alert('Invitation code copied!');
        }
    });
}

function handleAuthAction() {
    const user = getCurrentUser();
    if (user) {
        showCustomConfirm('Are you sure you want to log out?', () => {
            auth.signOut().then(() => { localStorage.removeItem('cachedUserData'); localStorage.removeItem('loggedInUser'); window.location.href = '/login'; });
        });
    } else {
        window.location.href = '/login';
    }
}

document.getElementById('profilePicContainer').addEventListener('click', () => {
    window.location.href = '/edit-profile';
});
