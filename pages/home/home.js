requireAuth((firebaseUser) => {
    listenSystemConfig((sys) => {
        if (sys.siteName) {
            const header = document.getElementById("siteNameHeader");
            const balance = document.getElementById("siteNameBalance");
            if (header) header.textContent = sys.siteName;
            if (balance) balance.textContent = sys.siteName + " Balance";
            document.title = sys.siteName + " - Daily Income Hub";
        }
    });

    listenUserData((data) => {
        if (!data) return;

        const firstName = (data.fullName || data.username || 'User').split(' ')[0];
        const greetingEl = document.getElementById('greetingName');
        if (greetingEl) greetingEl.textContent = firstName;

        const profileEl = document.getElementById('headerProfile');
        if (profileEl && data.profilePic) {
            profileEl.style.backgroundImage = `url('${data.profilePic}')`;
        }

        const balance = parseFloat(data.balance || 0).toFixed(2);
        const homeBalance = document.querySelector('.home-balance-card .balance');
        if (homeBalance) homeBalance.textContent = '$' + balance;

        if (document.getElementById('earnToday'))     document.getElementById('earnToday').textContent     = '$' + parseFloat(data.earnToday || 0).toFixed(2);
        if (document.getElementById('earnYesterday')) document.getElementById('earnYesterday').textContent = '$' + parseFloat(data.earnYesterday || 0).toFixed(2);
        if (document.getElementById('earnTotal'))     document.getElementById('earnTotal').textContent     = '$' + parseFloat(data.earnTotal || 0).toFixed(2);
    });

    if (sessionStorage.getItem('showTaskClosedNotice') === 'true') {
        const notice = document.getElementById('taskClosedNotice');
        if (notice) notice.style.display = 'flex';
        sessionStorage.removeItem('showTaskClosedNotice');
    }
});

function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('loggedInUser');
        window.location.href = '/login';
    });
}
