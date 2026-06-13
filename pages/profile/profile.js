requireAuth((firebaseUser) => {
    listenSystemConfig((sys) => {
        if (sys.siteName) document.getElementById("sitePageTitle").textContent = "Profile - " + sys.siteName;
    });

    listenUserData((data) => {
        if (data) {
            document.getElementById('displayUsername').textContent = data.username || 'User';
            document.getElementById('displayEmail').textContent = data.email || '';

            if (data.profilePic) {
                document.getElementById('defaultPic').style.display = 'none';
                document.getElementById('profilePicPreview').src = data.profilePic;
                document.getElementById('profilePicPreview').style.display = 'block';
            }
            
            const bindBtn = document.getElementById('bindWalletMenuBtn');
            const withdrawMgmtBtn = document.getElementById('withdrawManagementBtn');
            const hasWallet = !!data.walletAddress;

            if (bindBtn) bindBtn.style.display = hasWallet ? 'none' : 'flex';
            if (withdrawMgmtBtn) withdrawMgmtBtn.style.display = hasWallet ? 'flex' : 'none';

            if (document.getElementById('cpBalance')) {
                document.getElementById('cpBalance').textContent = '$' + Number(data.balance || 0).toFixed(4);
            }

            // --- Invitation Code Logic ---
            const inviteCodeElem = document.getElementById('cpInviteCode');
            if (inviteCodeElem) {
                console.log("Current user data:", data);
                if (data.inviteCode) {
                    console.log("Setting invite code to:", data.inviteCode);
                    inviteCodeElem.textContent = data.inviteCode;
                } else {
                    console.log("Invite code missing, generating new one...");
                    if (window.generateInviteCode) {
                        const newCode = window.generateInviteCode();
                        console.log("Generated code:", newCode);
                        updateUserData({ inviteCode: newCode }).catch(err => console.error("Update error:", err));
                        inviteCodeElem.textContent = newCode;
                    } else {
                        console.error("generateInviteCode function NOT FOUND on window!");
                    }
                }
            }
        }
    });
});

function copyInviteCode() {
    const code = document.getElementById('cpInviteCode').textContent;
    if (code && code !== '------') {
        navigator.clipboard.writeText(code).then(() => {
            if (window.showCustomAlert) {
                showCustomAlert('Invitation code copied!');
            } else {
                alert('Invitation code copied!');
            }
        });
    }
}

function handleAuthAction() {
    const user = getCurrentUser();
    if (user) {
        showCustomConfirm('Are you sure you want to log out?', () => {
            auth.signOut().then(() => { window.location.href = '/login'; });
        });
    } else {
        window.location.href = '/login';
    }
}

document.getElementById('profilePicContainer').addEventListener('click', () => {
    // In the dashboard, clicking the pic also takes you to edit profile
    window.location.href = '/edit-profile';
});

