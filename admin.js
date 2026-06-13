// --- Authentication & Access Control --- //

// Check Auth and Admin Status
requireAuth(async (user) => {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        if (userData && userData.isAdmin === true) {
            // User is Admin, grant access
            document.getElementById('adminLoginOverlay').style.display = 'none';
            initAdmin();
        } else {
            // User is not Admin, deny access and redirect
            alert("Access Denied: You do not have administrative privileges.");
            window.location.href = '/';
        }
    } catch (error) {
        console.error("Error verifying admin status:", error);
        alert("An error occurred while verifying your status. Please try again.");
        window.location.href = '/';
    }
});

function logoutAdmin() {
    auth.signOut().then(() => {
        localStorage.removeItem('loggedInUser');
        window.location.href = '/';
    });
}


// --- Navigation --- //
function switchTab(tabId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(el => {
        el.classList.remove('active');
    });

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
    });

    // Show selected section
    document.getElementById(tabId + '-tab').classList.add('active');

    // Highlight nav item
    const clickedNav = Array.from(document.querySelectorAll('.nav-item')).find(el => el.textContent.toLowerCase().includes(tabId) || el.getAttribute('onclick').includes(tabId));
    if (clickedNav) clickedNav.classList.add('active');

    // Load data based on tab
    if (tabId === 'users') {
        renderUsersTable();
    } else if (tabId === 'financials') {
        renderFinancials();
    } else if (tabId === 'tasks') {
        loadTaskSettings();
    } else if (tabId === 'settings') {
        loadSystemSettings();
    } else if (tabId === 'withdraw-details') {
        renderWithdrawDetailsTable();
    } else if (tabId === 'wallets') {
        loadWallets();
    } else if (tabId === 'cashgap') {
        loadCashGapOverview();
    }
}

// --- Init --- //
let cachedUsers = []; // Keep a memory list of user docs for easy modal editing

function initAdmin() {
    renderUsersTable();
}

// --- User Management --- //

async function fetchAllUsers() {
    const querySnapshot = await db.collection('users').get();
    cachedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return cachedUsers;
}

async function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px;">Loading users...</td></tr>';

    try {
        const users = await fetchAllUsers();
        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px;">No users found.</td></tr>';
            return;
        }

        users.forEach(u => {
            const balance = parseFloat(u.balance || 0).toFixed(2);
            const honorPoints = u.honorPoints || 0;
            const vipLevel = u.vipLevel || 1;
            const isFrozen = u.isFrozen === true;

            const statusBadge = isFrozen
                ? '<span class="badge frozen">Frozen</span>'
                : '<span class="badge active">Active</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>@${u.username}</strong></td>
                <td>${u.fullName || '-'}</td>
                <td style="font-weight:700">$${balance}</td>
                <td>${honorPoints}</td>
                <td>V${vipLevel}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn" style="padding: 6px 10px; font-size:12px; background:#2e7d32;" onclick="openRechargeModal('${u.id}')">Recharge</button>
                        <button class="btn btn-outline" style="padding: 6px 10px; font-size:12px;" onclick="openEditModal('${u.id}')">Edit</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error fetching users: ${e.message}</td></tr>`;
    }
}

// Editing User
let currentEditingUserId = null;

function openEditModal(userId) {
    const user = cachedUsers.find(u => u.id === userId);
    if (!user) return;

    currentEditingUserId = userId;

    document.getElementById('editUserTitle').textContent = `@${user.username}`;
    document.getElementById('editUsername').value = user.username;

    document.getElementById('editBalance').value = parseFloat(user.balance || 0);
    document.getElementById('editHonorPoints').value = parseInt(user.honorPoints || 2);
    document.getElementById('editVipLevel').value = parseInt(user.vipLevel || 1);
    document.getElementById('editEarnToday').value = parseFloat(user.earnToday || 0);
    document.getElementById('editEarnYesterday').value = parseFloat(user.earnYesterday || 0);
    document.getElementById('editCashGap').value = parseFloat(user.cashGap || 0);
    document.getElementById('editCashGapTaskNum').value = parseInt(user.cashGapTaskNum || 0) || '';
    // Also populate from cashGaps array if it exists (new format takes priority in display)
    if (user.cashGaps && user.cashGaps.length > 0) {
        // Show the first entry in the legacy fields for quick view
        document.getElementById('editCashGap').value = user.cashGaps[0].amount || 0;
        document.getElementById('editCashGapTaskNum').value = user.cashGaps[0].taskNum || '';
    }
    document.getElementById('editPassword').value = '';

    document.getElementById('editStatus').value = user.isFrozen ? 'frozen' : 'active';

    document.getElementById('editUserModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editUserModal').style.display = 'none';
    currentEditingUserId = null;
}

async function saveUserEdits() {
    if (!currentEditingUserId) return;

    const user = cachedUsers.find(u => u.id === currentEditingUserId);
    if (!user) return;

    const newBalance = parseFloat(document.getElementById('editBalance').value || 0);
    const newHonorPts = parseInt(document.getElementById('editHonorPoints').value || 0);
    const newVip = parseInt(document.getElementById('editVipLevel').value || 1);
    const newEarnToday = parseFloat(document.getElementById('editEarnToday').value || 0);
    const newEarnYesterday = parseFloat(document.getElementById('editEarnYesterday').value || 0);
    const newCashGap = parseFloat(document.getElementById('editCashGap').value || 0);
    const newCashGapTaskNum = parseInt(document.getElementById('editCashGapTaskNum').value) || 0;
    const status = document.getElementById('editStatus').value;
    const isFrozen = status === 'frozen';

    const oldBalance = parseFloat(user.balance || 0);
    const diff = newBalance - oldBalance;

    try {
        const updateData = {
            balance: newBalance,
            honorPoints: newHonorPts,
            vipLevel: newVip,
            earnToday: newEarnToday,
            earnYesterday: newEarnYesterday,
            cashGap: newCashGap,
            cashGapTaskNum: newCashGapTaskNum,
            // Also update the cashGaps array to stay in sync
            // If admin sets values here, we create/update a single-entry array
            cashGaps: (newCashGapTaskNum > 0 && newCashGap > 0)
                ? (function() {
                    // Preserve existing cashGaps but update/add the one being edited
                    let existing = (user.cashGaps || []).filter(g => g.taskNum !== newCashGapTaskNum);
                    existing.push({ taskNum: newCashGapTaskNum, amount: newCashGap });
                    existing.sort((a, b) => a.taskNum - b.taskNum);
                    return existing;
                })()
                : (user.cashGaps || []),
            isFrozen: isFrozen
        };

        // If balance increased, log as a Recharge transaction
        if (diff > 0) {
            const txs = user.transactions || [];
            txs.push({
                type: 'Recharge',
                amount: diff,
                date: new Date()
            });
            updateData.transactions = txs;
        } else if (diff < 0) {
            // Optional: log as Adjustment or Withdrawal if needed, but user only asked for balance addition as recharge
            const txs = user.transactions || [];
            txs.push({
                type: 'System Adjustment',
                amount: diff,
                date: new Date()
            });
            updateData.transactions = txs;
        }

        await db.collection('users').doc(currentEditingUserId).update(updateData);

        closeEditModal();
        await renderUsersTable();
        showCustomAlert(`Saved changes and recorded transaction!`);
    } catch (e) {
        showCustomAlert("Error saving edits: " + e.message);
    }
}

// --- Manual Recharge Logic --- //

function openRechargeModal(userId) {
    const user = cachedUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('rechargeUserId').value = userId;
    document.getElementById('rechargeUserTitle').textContent = `@${user.username}`;
    document.getElementById('manualRechargeAmount').value = '';
    document.getElementById('rechargeUserModal').style.display = 'flex';
}

function closeRechargeModal() {
    document.getElementById('rechargeUserModal').style.display = 'none';
}

async function submitManualRecharge() {
    const userId = document.getElementById('rechargeUserId').value;
    const amountStr = document.getElementById('manualRechargeAmount').value;
    const amount = parseFloat(amountStr);

    if (!userId || isNaN(amount) || amount <= 0) {
        showCustomAlert("Please enter a valid recharge amount.");
        return;
    }

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) throw new Error("User not found");

        const userData = userDoc.data();
        const currentBalance = parseFloat(userData.balance || 0);
        const newBalance = currentBalance + amount;

        const txs = userData.transactions || [];
        txs.push({
            type: 'Manual Recharge',
            amount: amount,
            date: new Date()
        });

        await db.collection('users').doc(userId).update({
            balance: newBalance,
            transactions: txs
        });

        closeRechargeModal();
        await renderUsersTable();
        showCustomAlert(`Successfully recharged $${amount.toFixed(2)} to @${userData.username}`);
    } catch (e) {
        showCustomAlert("Error performing recharge: " + e.message);
    }
}


// --- Financial Management --- //

async function renderFinancials() {
    const rBody = document.getElementById('rechargeTableBody');
    const wBody = document.getElementById('withdrawTableBody');

    rBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';
    wBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';

    try {
        // Fetch Recharges
        const rSnap = await db.collection('recharges').where('status', '==', 'Pending').get();
        if (rSnap.empty) {
            rBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No pending recharges</td></tr>';
        } else {
            rBody.innerHTML = '';
            rSnap.forEach(doc => {
                const req = { id: doc.id, ...doc.data() };
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>@${req.username}</td>
                    <td>$${parseFloat(req.amount).toFixed(2)}</td>
                    <td><span class="badge" style="background:#fff3e0; color:#e65100;">Pending</span></td>
                    <td>
                        <button class="btn" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="handleRequest('recharges', '${req.id}', 'Approved', '${req.username}', ${req.amount})">Approve</button>
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="handleRequest('recharges', '${req.id}', 'Rejected', '${req.username}', ${req.amount})">Reject</button>
                    </td>
                `;
                rBody.appendChild(tr);
            });
        }

        // Fetch Withdrawals
        const wSnap = await db.collection('withdrawals').where('status', '==', 'Pending').get();
        if (wSnap.empty) {
            wBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No pending withdrawals</td></tr>';
        } else {
            wBody.innerHTML = '';
            wSnap.forEach(doc => {
                const req = { id: doc.id, ...doc.data() };
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>@${req.username}</td>
                    <td>$${parseFloat(req.amount).toFixed(2)}</td>
                    <td><span class="badge" style="background:#fff3e0; color:#e65100;">Pending</span></td>
                    <td>
                        <button class="btn" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="handleRequest('withdrawals', '${req.id}', 'Approved', '${req.username}', ${req.amount})">Approve</button>
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="handleRequest('withdrawals', '${req.id}', 'Rejected', '${req.username}', ${req.amount})">Reject</button>
                    </td>
                `;
                wBody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Error loading financials:", e);
    }
}

async function handleRequest(type, reqId, newStatus, username, amount) {
    showCustomConfirm(`Are you sure you want to ${newStatus} this ${type} request for $${amount}?`, async function () {
        try {
            // 1. Update Request Status in global table
            await db.collection(type).doc(reqId).update({ status: newStatus });

            if (newStatus === 'Approved') {
                // Find User Document by username to update balance
                const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
                if (userQuery.empty) throw new Error("User not found in database.");

                const userDoc = userQuery.docs[0];
                const userData = userDoc.data();

                let currentBalance = parseFloat(userData.balance || 0);
                let updateData = {};

                // Process depending on type
                if (type === 'recharges') {
                    updateData.balance = currentBalance + parseFloat(amount);

                    if (!userData.firstRechargeDone) {
                        const amt = parseFloat(amount);
                        let newPoints = 1;
                        if (amt >= 1000 && amt <= 9999) newPoints = 2;
                        else if (amt >= 10000) newPoints = 3;

                        updateData.honorPoints = newPoints;
                        updateData.firstRechargeDone = true;
                    }
                } else if (type === 'withdrawals') {
                    updateData.balance = Math.max(0, currentBalance - parseFloat(amount));
                }

                // Append to transactions array
                const txs = userData.transactions || [];
                const txTypeLabel = type === 'recharges' ? 'Successful Deposit' : 'Successful Withdrawal';
                const txDate = new Date();
                txs.push({ type: txTypeLabel, amount: parseFloat(amount), date: txDate });
                updateData.transactions = txs;

                // Execute User Cloud Update
                await db.collection('users').doc(userDoc.id).update(updateData);
            }

            renderFinancials();
        } catch (error) {
            showCustomAlert("Error processing request: " + error.message);
        }
    });
}

// --- Tasks Config --- //
async function loadTaskSettings() {
    try {
        const doc = await db.collection('globalConfig').doc('tasks').get();
        if (doc.exists) {
            const config = doc.data();
            document.getElementById('globalCommission').value = config.commission || "2.5";
            document.getElementById('globalTaskStatus').value = config.status || "open";
        }
    } catch (e) {
        console.error("Error loading task settings", e);
    }
}

async function saveTaskSettings() {
    const comm = document.getElementById('globalCommission').value;
    const stat = document.getElementById('globalTaskStatus').value;

    try {
        await db.collection('globalConfig').doc('tasks').set({
            commission: comm,
            status: stat
        }, { merge: true });

        const msg = document.getElementById('taskSettingsMsg');
        msg.style.display = 'inline';
        setTimeout(() => msg.style.display = 'none', 2000);
    } catch (e) {
        showCustomAlert("Error saving settings.");
    }
}

async function saveUserTaskOverride() {
    const username = document.getElementById('overrideUsername').value.trim();
    const status = document.getElementById('overrideTaskStatus').value;
    const commission = document.getElementById('overrideCommission').value.trim();

    if (!username) {
        showCustomAlert("Please enter a username");
        return;
    }

    try {
        const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        if (userQuery.empty) {
            showCustomAlert("User not found!");
            return;
        }

        const userDocId = userQuery.docs[0].id;
        let updateData = { taskStatusOverride: status };

        if (commission) {
            updateData.customCommission = parseFloat(commission);
            showCustomAlert(`Task status for @${username} is now ${status}. Custom commission set to ${commission}%.`);
        } else {
            updateData.customCommission = firebase.firestore.FieldValue.delete(); // Remove explicit override
            showCustomAlert(`Task status for @${username} is now ${status}. Using global commission.`);
        }

        await db.collection('users').doc(userDocId).update(updateData);

        document.getElementById('overrideUsername').value = '';
        document.getElementById('overrideCommission').value = '';

    } catch (e) {
        showCustomAlert("Error saving override: " + e.message);
    }
}


// --- System Settings --- //
async function loadSystemSettings() {
    try {
        const doc = await db.collection('globalConfig').doc('system').get();
        if (doc.exists) {
            const config = doc.data();
            document.getElementById('settingSiteName').value = config.siteName || "Universalmovies";
            document.getElementById('settingCsLink').value = config.csLink || "#";
            document.getElementById('settingCurrency').value = config.currency || "$";
        }
    } catch (e) {
        console.error("Error loading system settings", e);
    }
}

async function saveSystemSettings() {
    const siteName = document.getElementById('settingSiteName').value;
    const csLink = document.getElementById('settingCsLink').value;
    const currency = document.getElementById('settingCurrency').value;

    try {
        await db.collection('globalConfig').doc('system').set({
            siteName, csLink, currency
        }, { merge: true });

        const msg = document.getElementById('sysSettingsMsg');
        msg.style.display = 'inline';
        setTimeout(() => msg.style.display = 'none', 2000);
    } catch (e) {
        showCustomAlert("Error saving system settings.");
    }
}

// --- Withdraw Details --- //
async function renderWithdrawDetailsTable() {
    const tbody = document.getElementById('withdrawDetailsTableBody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';

    try {
        // Just cache all users if empty
        if (cachedUsers.length === 0) {
            await fetchAllUsers();
        }

        // Filter users who have at least set up a wallet or password
        const configuredUsers = cachedUsers.filter(u => u.walletType || u.walletAddress || u.withdrawPassword);
        tbody.innerHTML = '';

        if (configuredUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No customers have configured their withdraw details yet.</td></tr>';
            return;
        }

        configuredUsers.forEach(u => {
            const tr = document.createElement('tr');

            let wType = '-';
            if (u.walletType === 'usdt') wType = 'USDT (TRC20)';
            else if (u.walletType === 'crypto') wType = 'Cryptocurrency';
            else if (u.walletType === 'bank') wType = 'Bank Account';

            tr.innerHTML = `
                <td style="font-weight: 500;">@${u.username}</td>
                <td>${wType}</td>
                <td style="font-family: monospace;">${u.walletAddress || '-'}</td>
                <td>${u.withdrawPassword || '<span style="color:#999">Not set</span>'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Error loading details</td></tr>';
    }
}

// --- Wallet Management --- //
let cachedWallets = [];

async function loadWallets() {
    const tbody = document.getElementById('walletsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading wallets...</td></tr>';

    try {
        const doc = await db.collection('globalConfig').doc('wallets').get();
        cachedWallets = doc.exists && doc.data().list ? doc.data().list : [];

        // Auto-seed with existing wallets if Firestore is empty
        if (cachedWallets.length === 0) {
            cachedWallets = [
                { name: 'USDT (TRC20)', address: 'TH1bpxgFfMFYV1mpKYuwPGmwxJPNcUd8fS', qr: '/images/usdt_qr.jpg', visible: true },
                { name: 'USDT (TRC20) 2', address: 'TYvxcH6mEcCtuQgd6L6igWrtrBtEwQs9Zh', qr: '/images/usdtqr2.jpg', visible: true },
                { name: 'BTC', address: '13vu7bkBABq5914M7RsyNxP81GSyRqk59c', qr: '/images/btc_qr.jpg', visible: true },
                { name: 'BTC 2', address: 'bc1q5f848r66248ymjen6wgsa4unrl77hsd7ck4n3e', qr: '/images/usdt_qr2.jpg', visible: true }
            ];
            await db.collection('globalConfig').doc('wallets').set({ list: cachedWallets });
        }

        tbody.innerHTML = '';
        cachedWallets.forEach((w, idx) => {
            const tr = document.createElement('tr');
            const visibleBadge = w.visible
                ? '<span class="badge active">Visible</span>'
                : '<span class="badge frozen">Hidden</span>';
            const toggleLabel = w.visible ? 'Hide' : 'Show';
            const toggleColor = w.visible ? '#c62828' : '#2e7d32';

            tr.innerHTML = `
                <td><strong>${w.name}</strong></td>
                <td style="font-family: monospace; font-size: 12px; max-width: 250px; word-break: break-all;">${w.address}</td>
                <td>${w.qr ? '<img src="' + w.qr + '" style="width:50px;height:50px;border-radius:6px;object-fit:cover;border:1px solid #eee;">' : '<span style="color:#999">None</span>'}</td>
                <td>${visibleBadge}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn" style="padding: 4px 10px; font-size:12px; background:${toggleColor};" onclick="toggleWalletVisibility(${idx})">${toggleLabel}</button>
                        <button class="btn btn-outline" style="padding: 4px 10px; font-size:12px; color:#c62828; border-color:#c62828;" onclick="deleteWallet(${idx})">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error: ${e.message}</td></tr>`;
    }
}

async function addNewWallet() {
    const name = document.getElementById('newWalletName').value.trim();
    const address = document.getElementById('newWalletAddress').value.trim();
    const qr = document.getElementById('newWalletQR').value.trim();

    if (!name || !address) {
        showCustomAlert('Please enter at least a wallet name and address.');
        return;
    }

    const newWallet = { name, address, qr: qr || '', visible: true };

    try {
        const doc = await db.collection('globalConfig').doc('wallets').get();
        const existing = doc.exists && doc.data().list ? doc.data().list : [];
        existing.push(newWallet);

        await db.collection('globalConfig').doc('wallets').set({ list: existing });

        document.getElementById('newWalletName').value = '';
        document.getElementById('newWalletAddress').value = '';
        document.getElementById('newWalletQR').value = '';

        showCustomAlert(`Wallet "${name}" added successfully!`);
        loadWallets();
    } catch (e) {
        showCustomAlert('Error adding wallet: ' + e.message);
    }
}

async function toggleWalletVisibility(index) {
    try {
        const doc = await db.collection('globalConfig').doc('wallets').get();
        const list = doc.exists && doc.data().list ? doc.data().list : [];
        if (index < 0 || index >= list.length) return;

        list[index].visible = !list[index].visible;
        await db.collection('globalConfig').doc('wallets').set({ list });

        showCustomAlert(`Wallet "${list[index].name}" is now ${list[index].visible ? 'visible' : 'hidden'}.`);
        loadWallets();
    } catch (e) {
        showCustomAlert('Error toggling wallet: ' + e.message);
    }
}

async function deleteWallet(index) {
    showCustomConfirm('Are you sure you want to delete this wallet?', async function () {
        try {
            const doc = await db.collection('globalConfig').doc('wallets').get();
            const list = doc.exists && doc.data().list ? doc.data().list : [];
            if (index < 0 || index >= list.length) return;

            const removed = list.splice(index, 1);
            await db.collection('globalConfig').doc('wallets').set({ list });

            showCustomAlert(`Wallet "${removed[0].name}" deleted.`);
            loadWallets();
        } catch (e) {
            showCustomAlert('Error deleting wallet: ' + e.message);
        }
    });
}

// --- Cash Gap Management --- //

async function loadCashGapOverview() {
    const tbody = document.getElementById('cashGapOverviewBody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 24px;">Loading...</td></tr>';

    try {
        if (cachedUsers.length === 0) {
            await fetchAllUsers();
        }

        const rows = [];

        cachedUsers.forEach(u => {
            // Check new cashGaps array first
            if (u.cashGaps && Array.isArray(u.cashGaps) && u.cashGaps.length > 0) {
                u.cashGaps.forEach(g => {
                    rows.push({
                        userId: u.id,
                        username: u.username,
                        taskNum: g.taskNum,
                        amount: g.amount
                    });
                });
            } else if (parseFloat(u.cashGap || 0) > 0 && parseInt(u.cashGapTaskNum || 0) > 0) {
                // Fallback to old single fields
                rows.push({
                    userId: u.id,
                    username: u.username,
                    taskNum: parseInt(u.cashGapTaskNum),
                    amount: parseFloat(u.cashGap)
                });
            }
        });

        tbody.innerHTML = '';

        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 24px; color: #888;">No cash gaps configured for any user.</td></tr>';
            return;
        }

        // Sort by username then task number
        rows.sort((a, b) => a.username.localeCompare(b.username) || a.taskNum - b.taskNum);

        rows.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>@${r.username}</strong></td>
                <td>Task ${r.taskNum}</td>
                <td style="font-weight:700;">$${parseFloat(r.amount).toFixed(2)}</td>
                <td>
                    <button class="btn btn-outline" style="padding: 4px 10px; font-size:12px; color:#c62828; border-color:#c62828;" onclick="removeSingleCashGap('${r.userId}', ${r.taskNum})">Remove</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Error: ${e.message}</td></tr>`;
    }
}

function addCashGapRow() {
    const container = document.getElementById('cashGapRows');
    const row = document.createElement('div');
    row.className = 'cash-gap-row';
    row.style.cssText = 'display: flex; gap: 12px; align-items: flex-end; margin-bottom: 12px;';
    row.innerHTML = `
        <div class="form-group" style="margin-bottom: 0; flex: 1;">
            <label>Task Number (1-25)</label>
            <input type="number" class="cg-task-num" min="1" max="25" step="1" placeholder="e.g. 5">
        </div>
        <div class="form-group" style="margin-bottom: 0; flex: 1;">
            <label>Amount ($)</label>
            <input type="number" class="cg-amount" min="1" step="1" placeholder="e.g. 400">
        </div>
        <button class="btn btn-outline" style="padding: 8px 12px; font-size: 18px; color: #c62828; border-color: #c62828; height: 40px;" onclick="this.closest('.cash-gap-row').remove()" title="Remove row">&times;</button>
    `;
    container.appendChild(row);
}

async function saveCashGaps() {
    const username = document.getElementById('cashGapUsername').value.trim();
    if (!username) {
        showCustomAlert('Please enter a username.');
        return;
    }

    // Collect all rows
    const rowEls = document.querySelectorAll('#cashGapRows .cash-gap-row');
    const newEntries = [];

    for (const row of rowEls) {
        const taskNum = parseInt(row.querySelector('.cg-task-num').value);
        const amount = parseFloat(row.querySelector('.cg-amount').value);

        if (isNaN(taskNum) || taskNum < 1 || taskNum > 25) {
            showCustomAlert('Task numbers must be between 1 and 25.');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showCustomAlert('All amounts must be greater than $0.');
            return;
        }

        newEntries.push({ taskNum, amount });
    }

    if (newEntries.length === 0) {
        showCustomAlert('Please add at least one cash gap row.');
        return;
    }

    // Check for duplicate task numbers in the form
    const taskNums = newEntries.map(e => e.taskNum);
    if (new Set(taskNums).size !== taskNums.length) {
        showCustomAlert('Duplicate task numbers found. Each task number should be unique.');
        return;
    }

    try {
        // Find user by username
        const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        if (userQuery.empty) {
            showCustomAlert(`User "@${username}" not found.`);
            return;
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();

        // Merge with existing cashGaps
        let existing = userData.cashGaps || [];

        // If user only has old format, migrate it
        if (existing.length === 0 && parseFloat(userData.cashGap || 0) > 0 && parseInt(userData.cashGapTaskNum || 0) > 0) {
            existing = [{ taskNum: parseInt(userData.cashGapTaskNum), amount: parseFloat(userData.cashGap) }];
        }

        // Merge: update existing task numbers, add new ones
        newEntries.forEach(ne => {
            const idx = existing.findIndex(e => e.taskNum === ne.taskNum);
            if (idx >= 0) {
                existing[idx].amount = ne.amount; // Update
            } else {
                existing.push(ne); // Add
            }
        });

        // Sort by task number
        existing.sort((a, b) => a.taskNum - b.taskNum);

        // Save to Firestore
        await db.collection('users').doc(userDoc.id).update({
            cashGaps: existing,
            // Also update legacy fields with first entry for backward compatibility
            cashGap: existing.length > 0 ? existing[0].amount : 0,
            cashGapTaskNum: existing.length > 0 ? existing[0].taskNum : 0
        });

        // Clear form
        document.getElementById('cashGapUsername').value = '';
        const container = document.getElementById('cashGapRows');
        container.innerHTML = `
            <div class="cash-gap-row" style="display: flex; gap: 12px; align-items: flex-end; margin-bottom: 12px;">
                <div class="form-group" style="margin-bottom: 0; flex: 1;">
                    <label>Task Number (1-25)</label>
                    <input type="number" class="cg-task-num" min="1" max="25" step="1" placeholder="e.g. 2">
                </div>
                <div class="form-group" style="margin-bottom: 0; flex: 1;">
                    <label>Amount ($)</label>
                    <input type="number" class="cg-amount" min="1" step="1" placeholder="e.g. 100">
                </div>
                <button class="btn btn-outline" style="padding: 8px 12px; font-size: 18px; color: #c62828; border-color: #c62828; height: 40px;" onclick="this.closest('.cash-gap-row').remove()" title="Remove row">&times;</button>
            </div>
        `;

        // Refresh the cached users and overview table
        await fetchAllUsers();
        showCustomAlert(`Cash gaps saved for @${username}!\n\n` + existing.map(e => `Task ${e.taskNum}: $${e.amount.toFixed(2)}`).join('\n'));
        loadCashGapOverview();
    } catch (e) {
        showCustomAlert('Error saving cash gaps: ' + e.message);
    }
}

async function removeSingleCashGap(userId, taskNum) {
    showCustomConfirm(`Remove the cash gap at Task ${taskNum}?`, async function () {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) throw new Error('User not found');

            const userData = userDoc.data();
            let cashGaps = userData.cashGaps || [];

            // If using old format only, migrate first
            if (cashGaps.length === 0 && parseFloat(userData.cashGap || 0) > 0 && parseInt(userData.cashGapTaskNum || 0) > 0) {
                cashGaps = [{ taskNum: parseInt(userData.cashGapTaskNum), amount: parseFloat(userData.cashGap) }];
            }

            // Remove the entry
            cashGaps = cashGaps.filter(g => g.taskNum !== taskNum);

            await db.collection('users').doc(userId).update({
                cashGaps: cashGaps,
                // Update legacy fields
                cashGap: cashGaps.length > 0 ? cashGaps[0].amount : 0,
                cashGapTaskNum: cashGaps.length > 0 ? cashGaps[0].taskNum : 0
            });

            await fetchAllUsers();
            showCustomAlert(`Cash gap at Task ${taskNum} removed.`);
            loadCashGapOverview();
        } catch (e) {
            showCustomAlert('Error removing cash gap: ' + e.message);
        }
    });
}
