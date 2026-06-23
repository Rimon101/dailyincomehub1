let userDataCache = null;

requireAuth(async (user) => {
    listenUserData(async (data) => {
        if (data) {
            const today = new Date().toDateString();
            if (data.lastEarnResetDate !== today) {
                const lastReset = data.lastEarnResetDate ? new Date(data.lastEarnResetDate) : null;
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const isConsecutiveDay = lastReset && lastReset.toDateString() === yesterday.toDateString();

                try {
                    await updateUserData({
                        earnYesterday: isConsecutiveDay ? (data.earnToday || 0) : 0,
                        earnToday: 0,
                        tasksCompleted: 0,
                        lastEarnResetDate: today
                    });
                } catch (e) { console.warn('Reset failed:', e); }
                return;
            }
            userDataCache = data;
            updateDisplay();
        }
    });
});

const TOTAL_TASKS = 25;
const MIN_ORDER_BALANCE = 10;
let currentEarned = 0;

function getCompleted() {
    return userDataCache ? parseInt(userDataCache.tasksCompleted || 0) : 0;
}

function getCurrentBalance() {
    if (!userDataCache) return 0;
    const balance = parseFloat(userDataCache.balance || 0);
    return Number.isFinite(balance) ? balance : 0;
}

function getCashGapForTask(taskNo) {
    if (!userDataCache) return 0;

    if (userDataCache.cashGaps && Array.isArray(userDataCache.cashGaps) && userDataCache.cashGaps.length > 0) {
        const match = userDataCache.cashGaps.find(g => parseInt(g.taskNum) === taskNo);
        return match ? parseFloat(match.amount || 0) : 0;
    }

    const rawCashGap = parseFloat(userDataCache.cashGap || 0);
    const cashGapTaskNum = parseInt(userDataCache.cashGapTaskNum || 0);
    return (cashGapTaskNum > 0 && taskNo === cashGapTaskNum) ? rawCashGap : 0;
}

function showNoBalanceAlert() {
    showCustomAlert(`Insufficient account balance. You need at least $${MIN_ORDER_BALANCE.toFixed(2)} to submit an order.`);
}

// Returns commission % based on user's grade (balance), unless admin overrides via customCommission
function getGradeCommission() {
    // Admin override takes priority
    const custom = parseFloat(userDataCache.customCommission);
    if (!isNaN(custom) && custom > 0) return custom;

    const balance = parseFloat(userDataCache.balance || 0);
    if (balance >= 2000) return 8;   // Grade 3 — Premium
    if (balance >= 500)  return 5;   // Grade 2 — Silver
    if (balance >= 20)   return 3;   // Grade 1 — Gold
    return 3; // default
}

function updateDisplay() {
    const completed = getCompleted();
    
    if (document.getElementById('taskCountVal')) document.getElementById('taskCountVal').textContent = completed;
    
    if (document.getElementById('taskAvailVal')) {
        let available = 25 - (completed % 25);
        if (completed >= TOTAL_TASKS) {
            available = 0;
        }
        document.getElementById('taskAvailVal').textContent = available;
    }

    if (!userDataCache) return;
    const balance = parseFloat(userDataCache.balance || 0).toFixed(2);
    const earnToday = parseFloat(userDataCache.earnToday || 0).toFixed(2);
    const earnYesterday = parseFloat(userDataCache.earnYesterday || 0).toFixed(2);
    const earnTotal = parseFloat(userDataCache.earnTotal || 0).toFixed(2);

    if (document.getElementById('totalTxAmount')) document.getElementById('totalTxAmount').textContent = balance;
    if (document.getElementById('todayCommission')) document.getElementById('todayCommission').textContent = earnToday;
    if (document.getElementById('yesterdayCommission')) document.getElementById('yesterdayCommission').textContent = earnYesterday;
    if (document.getElementById('totalCommission')) document.getElementById('totalCommission').textContent = earnTotal;

    // Update commission rate badge
    const commRateEl = document.getElementById('commRateDisplay');
    if (commRateEl) {
        const rate = getGradeCommission();
        commRateEl.textContent = `${rate}%`;
    }
}

async function startAutoTask() {
    if (!userDataCache) { setTimeout(startAutoTask, 100); return; }

    if (getCurrentBalance() < MIN_ORDER_BALANCE) {
        showNoBalanceAlert();
        return;
    }

    const completed = getCompleted();
    if (completed >= TOTAL_TASKS) {
        showCustomAlert("You have completed all 25 tasks for today. Please come back tomorrow.");
        return;
    }

    // Ensure product images are loaded so the task can show real product photos
    await loadProductImages();

    let taskConfig = { commission: 2.5, status: 'open' };
    try {
        const configDoc = await db.collection('globalConfig').doc('tasks').get();
        if (configDoc.exists) taskConfig = configDoc.data();
    } catch (e) { console.log("Using default task config."); }

    const userTaskStatus = userDataCache.taskStatusOverride || 'default';
    if (userTaskStatus === 'closed' || (taskConfig.status === 'closed' && userTaskStatus !== 'open')) {
        sessionStorage.setItem('showTaskClosedNotice', 'true');
        window.location.href = '/';
        return;
    }

    document.getElementById('timerBox').style.display = 'flex';
    document.getElementById('adSpace').style.display = 'none';
    document.getElementById('taskPresentation').style.display = 'none';
    document.getElementById('successBox').style.display = 'none';

    let seconds = 3;
    const countdownEl = document.getElementById('countdown');
    countdownEl.textContent = seconds;

    if (window.taskPhaseInterval) clearInterval(window.taskPhaseInterval);
    window.taskPhaseInterval = setInterval(() => {
        seconds--;
        countdownEl.textContent = seconds;
        if (seconds <= 0) { clearInterval(window.taskPhaseInterval); showRandomTask(taskConfig); }
    }, 1000);
}

// Product images served from /images/product images/WEBP IMAGE/.
// The manifest lists all available filenames (URL-encoded at render time).
let PRODUCT_IMAGES = [];
let productImagesPromise = null;

const PRODUCT_IMAGE_BASE = '/images/' + encodeURIComponent('product images') + '/' + encodeURIComponent('WEBP IMAGE') + '/';

// Friendly display names derived from the raw filename.
function productDisplayName(fileName) {
    return fileName
        .replace(/\.webp$/i, '')
        .replace(/[_+]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60) || 'Product';
}

function loadProductImages() {
    if (productImagesPromise) return productImagesPromise;
    productImagesPromise = fetch('/images/product-manifest.json?v=1', { cache: 'force-cache' })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => {
            PRODUCT_IMAGES = Array.isArray(data.files) ? data.files : [];
            return PRODUCT_IMAGES;
        })
        .catch(() => { PRODUCT_IMAGES = []; return PRODUCT_IMAGES; });
    return productImagesPromise;
}

// Pick N unique random products; falls back to movies if none loaded.
function pickRandomProducts(n) {
    if (PRODUCT_IMAGES.length === 0) {
        return Array.from({ length: n }, (_, i) => ({
            name: 'Product ' + (i + 1),
            img: '/images/amz-earbuds.webp'
        }));
    }
    const pool = [...PRODUCT_IMAGES];
    const picked = [];
    while (picked.length < n && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        const fileName = pool.splice(idx, 1)[0];
        picked.push({
            name: productDisplayName(fileName),
            img: PRODUCT_IMAGE_BASE + encodeURIComponent(fileName)
        });
    }
    return picked;
}

// Kick off loading as soon as the script runs so it's ready when a task opens.
loadProductImages();

function generateOrderNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    return 'UB' + y + mo + d + h + mi + s + rand;
}

function formatMatchTime() {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return y + '-' + mo + '-' + d + ' ' + h + ':' + mi + ':' + s;
}

function showRandomTask(taskConfig) {
    // Use grade-based commission (admin customCommission takes priority inside getGradeCommission)
    let commPct = getGradeCommission();

    const currentBal = getCurrentBalance();
    if (currentBal < MIN_ORDER_BALANCE) {
        showNoBalanceAlert();
        closeWidget();
        return;
    }
    
    const nextTaskNum = getCompleted() + 1; // The task about to be shown (1-based)
    const cashGap = getCashGapForTask(nextTaskNum);
    let orderAmount = currentBal + cashGap;

    currentEarned = orderAmount * (commPct / 100);

    // Fill in match time and order number
    document.getElementById('taskMatchTime').textContent = formatMatchTime();
    document.getElementById('taskOrderNumber').textContent = generateOrderNumber();

    // Pick 3 unique products at random (loaded from the product image manifest)
    const picked = pickRandomProducts(3);

    // Generate random price portions that sum to orderAmount
    let portions = [];
    let total = 0;
    for (let i = 0; i < picked.length; i++) {
        const v = Math.random() + 0.2;
        portions.push(v);
        total += v;
    }
    portions = portions.map(p => p / total);

    const products = picked.map((product, i) => ({
        name: product.name,
        price: parseFloat((orderAmount * portions[i]).toFixed(2)),
        qty: Math.floor(Math.random() * 3),
        img: product.img
    }));

    // Build product list HTML
    const listEl = document.getElementById('taskProductList');
    listEl.innerHTML = products.map(p => `
        <div class="tp-product-item">
            <img class="tp-product-img" src="${p.img}" alt="${p.name}">
            <div class="tp-product-info">
                <div class="tp-product-name">${p.name}</div>
                <div class="tp-product-price">${p.price.toFixed(2)} <span class="tp-product-qty">x ${p.qty}</span></div>
            </div>
        </div>
    `).join('');

    // Fill financial summary
    document.getElementById('taskTotalAmount').textContent = '$' + orderAmount.toFixed(2);
    document.getElementById('taskCommissionAmount').textContent = '$' + currentEarned.toFixed(2);
    document.getElementById('taskExpectedReturn').textContent = '$' + (orderAmount + currentEarned).toFixed(2);
    document.getElementById('taskCashGap').textContent = '$' + cashGap.toFixed(2);

    // Also update ad image for fallback
    document.getElementById('adImage').src = products[0].img;

    document.getElementById('timerBox').style.display = 'none';
    document.getElementById('adSpace').style.display = 'none';
    document.getElementById('taskPresentation').style.display = 'block';
}

async function confirmTask() {
    const currentBal = getCurrentBalance();
    if (currentBal < MIN_ORDER_BALANCE) {
        showNoBalanceAlert();
        return;
    }

    const nextTaskNum = getCompleted() + 1;
    const cashGap = getCashGapForTask(nextTaskNum);

    if (cashGap > 0) {
        showCustomAlert("Insufficient account balance. Please recharge to clear the cash gap of $" + cashGap.toFixed(2) + " before submitting the order.");
        return;
    }

    const btn = document.getElementById('confirmTaskBtn');
    btn.textContent = 'Submitting...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        let currentCount = getCompleted();
        if (currentCount >= TOTAL_TASKS) {
            showCustomAlert("You have completed all your tasks for today!");
            document.getElementById('taskPresentation').style.display = 'none';
            btn.textContent = 'Submit Order';
            btn.disabled = false;
            btn.style.opacity = '1';
            return;
        }

        // Save order record to transaction history
        const user = auth.currentUser;
        if (user) {
            const increment = firebase.firestore.FieldValue.increment;
            const userRef = db.collection('users').doc(user.uid);
            
            const prevCompleted = getCompleted();
            const newTaskNo = prevCompleted + 1;
            const prevBalance = parseFloat(userDataCache.balance || 0);

            const orderRecord = {
                type: 'Order Commission',
                amount: parseFloat(currentEarned.toFixed(2)),
                date: firebase.firestore.Timestamp.now(),
                orderAmount: parseFloat((prevBalance + cashGap).toFixed(2)),
                taskNo: newTaskNo
            };

            await userRef.update({
                tasksCompleted: increment(1),
                balance: increment(currentEarned),
                earnToday: increment(currentEarned),
                earnTotal: increment(currentEarned),
                transactions: firebase.firestore.FieldValue.arrayUnion(orderRecord)
            });
        }

        document.getElementById('taskPresentation').style.display = 'none';
        document.getElementById('successBox').style.display = 'flex';

        let seconds2 = 3;
        const countdown2El = document.getElementById('countdown2');
        countdown2El.textContent = seconds2;

        if (window.taskPhaseInterval) clearInterval(window.taskPhaseInterval);
        window.taskPhaseInterval = setInterval(() => {
            seconds2--;
            countdown2El.textContent = seconds2;
            if (seconds2 <= 0) { 
                clearInterval(window.taskPhaseInterval); 
                document.getElementById('successBox').style.display = 'none';
                updateDisplay();
                
                btn.textContent = 'Submit Order';
                btn.disabled = false;
                btn.style.opacity = '1';
                
                startAutoTask(); // Auto-start next task!
            }
        }, 1000);
    } catch (error) {
        showCustomAlert("Error saving task: " + error.message);
        btn.textContent = 'Submit Order';
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

window.closeWidget = function() {
    if (window.taskPhaseInterval) clearInterval(window.taskPhaseInterval);
    document.getElementById('timerBox').style.display = 'none';
    document.getElementById('taskPresentation').style.display = 'none';
    document.getElementById('successBox').style.display = 'none';
    
    const btn = document.getElementById('confirmTaskBtn');
    if (btn) {
        btn.textContent = 'Submit Order';
        btn.disabled = false;
        btn.style.opacity = '1';
    }
};

window.showGradeInfo = function() {
    document.getElementById('gradeModal').style.display = 'block';
};

window.closeGradeInfo = function() {
    document.getElementById('gradeModal').style.display = 'none';
};
