const navAuth = document.getElementById('navAuth');

requireAuth((firebaseUser) => {
    listenSystemConfig((sys) => {
        if (sys.siteName) {
            document.getElementById("siteNameHeader").textContent = sys.siteName;
            document.getElementById("siteNameBalance").textContent = sys.siteName + " Balance";
            document.title = sys.siteName + " - Universalmovies";
        }
    });

    listenUserData((data) => {
        if (!data) return;

        const firstName = (data.fullName || data.username || 'User').split(' ')[0];
        navAuth.innerHTML = '<span class="nav-user">Hi, ' + firstName + '</span><a href="/profile" class="nav-login" style="padding: 4px 10px; font-size: 12px;">Profile</a><a href="#" class="nav-logout" onclick="logout()">Logout</a>';

        if (data.isAdmin === true && !document.getElementById('navAdminLink')) {
            const adminLink = document.createElement('a');
            adminLink.href = '/admin';
            adminLink.className = 'nav-login';
            adminLink.id = 'navAdminLink';
            adminLink.style.cssText = 'padding:4px 10px;font-size:12px;background:#000;color:#fff;border-color:#000;margin-left:8px;';
            adminLink.textContent = 'Admin';
            navAuth.appendChild(adminLink);
        }

        if (document.getElementById('taskCount')) document.getElementById('taskCount').textContent = `${parseInt(data.tasksCompleted || 0)}/25`;

        const balance = parseFloat(data.balance || 0).toFixed(2);
        document.querySelector('.balance-amount').textContent = '$' + balance;
        if (document.getElementById('totalTxAmount')) document.getElementById('totalTxAmount').textContent = balance;

        if (document.getElementById('earnToday')) document.getElementById('earnToday').textContent = '$' + parseFloat(data.earnToday || 0).toFixed(2);
        if (document.getElementById('earnYesterday')) document.getElementById('earnYesterday').textContent = '$' + parseFloat(data.earnYesterday || 0).toFixed(2);
        if (document.getElementById('earnTotal')) document.getElementById('earnTotal').textContent = '$' + parseFloat(data.earnTotal || 0).toFixed(2);
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

