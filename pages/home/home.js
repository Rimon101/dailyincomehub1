// Show cached data instantly (before Firebase even loads)
(function showCachedDataImmediately() {
    const cached = typeof getCachedUserData === 'function' ? getCachedUserData() : null;
    if (!cached) return;

    const firstName = (cached.fullName || cached.username || 'User').split(' ')[0];
    const greetingEl = document.getElementById('greetingName');
    if (greetingEl) greetingEl.textContent = firstName;

    const balance = parseFloat(cached.balance || 0).toFixed(2);
    const homeBalance = document.querySelector('.home-balance-card .balance');
    if (homeBalance) homeBalance.textContent = '$' + balance;

    if (document.getElementById('earnToday'))     document.getElementById('earnToday').textContent     = '$' + parseFloat(cached.earnToday || 0).toFixed(2);
    if (document.getElementById('earnYesterday')) document.getElementById('earnYesterday').textContent = '$' + parseFloat(cached.earnYesterday || 0).toFixed(2);
    if (document.getElementById('earnTotal'))     document.getElementById('earnTotal').textContent     = '$' + parseFloat(cached.earnTotal || 0).toFixed(2);

    const profileEl = document.getElementById('headerProfile');
    if (profileEl && cached.profilePic) {
        profileEl.style.backgroundImage = `url('${cached.profilePic}')`;
    }
})();

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

    // Pass firebaseUser directly — no redundant onAuthStateChanged
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
    }, firebaseUser);

    if (sessionStorage.getItem('showTaskClosedNotice') === 'true') {
        const notice = document.getElementById('taskClosedNotice');
        if (notice) notice.style.display = 'flex';
        sessionStorage.removeItem('showTaskClosedNotice');
    }
});

function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('cachedUserData');
        window.location.href = '/login';
    });
}
