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

    // Load dynamic products for the sections
    loadDynamicProducts();
});

const PRODUCT_BASE_URL = '/images/product%20images/Product/';

function productDisplayName(fileName) {
    return fileName
        .replace(/\.webp$/i, '')
        .replace(/[_+]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 50) || 'Product';
}

async function loadDynamicProducts() {
    const alibabaRow = document.getElementById('alibabaPicksRow');
    const aliexpressRow = document.getElementById('aliexpressPicksRow');
    const amazonRow = document.getElementById('amazonPicksRow');

    if (!alibabaRow || !aliexpressRow || !amazonRow) return;

    let files = [];
    const cached = localStorage.getItem('homepage_product_files');

    if (cached) {
        try {
            files = JSON.parse(cached);
        } catch (e) {
            console.warn("Failed to parse cached product files:", e);
        }
    }

    if (!files || files.length === 0) {
        try {
            const response = await fetch('/images/product-manifest-product.json?v=1');
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data.files)) {
                    files = data.files;
                    localStorage.setItem('homepage_product_files', JSON.stringify(files));
                }
            }
        } catch (e) {
            console.error("Error fetching product manifest:", e);
        }
    }

    if (!files || files.length === 0) {
        return;
    }

    // Split files into three sections: Alibaba, AliExpress, Amazon
    const segmentSize = Math.ceil(files.length / 3);
    const alibabaList = files.slice(0, segmentSize);
    const aliexpressList = files.slice(segmentSize, segmentSize * 2);
    const amazonList = files.slice(segmentSize * 2);

    const renderRow = (rowElement, list) => {
        rowElement.innerHTML = list.map(fileName => {
            const displayName = productDisplayName(fileName);
            const imgUrl = PRODUCT_BASE_URL + encodeURIComponent(fileName);
            return `
                <div class="movie-card">
                    <img src="${imgUrl}" alt="${displayName}" loading="lazy" decoding="async">
                    <a href="/order">View More</a>
                </div>
            `;
        }).join('');
    };

    renderRow(alibabaRow, alibabaList);
    renderRow(aliexpressRow, aliexpressList);
    renderRow(amazonRow, amazonList);
}

function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('cachedUserData');
        window.location.href = '/login';
    });
}
