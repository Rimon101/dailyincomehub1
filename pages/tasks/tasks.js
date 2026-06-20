const COIN_CONFIG = {
    BTC: { name: "Bitcoin", baseRate: 1.2, color: "#F7931A" },
    ETH: { name: "Ethereum", baseRate: 1.5, color: "#627EEA" },
    SOL: { name: "Solana", baseRate: 1.8, color: "#14F195" },
    BNB: { name: "BNB", baseRate: 1.6, color: "#F3BA2F" },
    ADA: { name: "Cardano", baseRate: 1.0, color: "#0033AD" },
    XRP: { name: "Ripple", baseRate: 1.1, color: "#23292F" }
};

let userDataCache = null;
let selectedCoin = "BTC";
let selectedDuration = 7;

requireAuth(async (user) => {
    listenUserData(async (data) => {
        if (data) {
            userDataCache = data;
            await checkAndProcessExpiredStakes(data);
            updateDisplay();
        }
    }, user);
});

window.selectCoin = function(coinSymbol) {
    selectedCoin = coinSymbol;
    
    // Update UI active class
    document.querySelectorAll('.coin-option').forEach(el => {
        el.classList.remove('active');
    });
    const activeBtn = document.getElementById(`coinOpt-${coinSymbol}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    calculateStakedReturn();
};

window.selectDuration = function(days) {
    selectedDuration = days;
    
    // Update UI active class
    document.querySelectorAll('.duration-btn').forEach(el => {
        el.classList.remove('active');
    });
    const activeBtn = document.getElementById(`durOpt-${days}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    calculateStakedReturn();
};

window.stakeMax = function() {
    if (!userDataCache) return;
    const bal = parseFloat(userDataCache.balance || 0);
    const input = document.getElementById('stakeAmount');
    if (input) {
        input.value = bal > 0 ? bal.toFixed(8) : ""; // Using precise decimal values
        calculateStakedReturn();
    }
};

window.calculateStakedReturn = function() {
    const amountInput = document.getElementById('stakeAmount');
    const amount = parseFloat(amountInput.value) || 0;
    
    const config = COIN_CONFIG[selectedCoin];
    let rateMultiplier = 1.0;
    if (selectedDuration === 15) rateMultiplier = 1.25;
    else if (selectedDuration === 30) rateMultiplier = 1.50;
    
    const dailyRate = config.baseRate * rateMultiplier;
    const dailyYield = amount * (dailyRate / 100);
    const totalInterest = dailyYield * selectedDuration;
    const totalReturn = amount + totalInterest;
    
    document.getElementById('calcCoin').textContent = selectedCoin;
    document.getElementById('calcRate').textContent = dailyRate.toFixed(2) + '%';
    document.getElementById('calcPeriod').textContent = selectedDuration + ' Days';
    document.getElementById('calcDailyYield').textContent = '$' + dailyYield.toFixed(2);
    document.getElementById('calcTotalInterest').textContent = '$' + totalInterest.toFixed(2);
    document.getElementById('calcTotalReturn').textContent = '$' + totalReturn.toFixed(2);
};

let isCheckingStakes = false;
async function checkAndProcessExpiredStakes(data) {
    if (isCheckingStakes) return;
    if (!data || !data.stakes || !Array.isArray(data.stakes)) return;

    const now = Date.now();
    let hasExpired = false;
    let totalReturn = 0;
    const newTransactions = [];

    const updatedStakes = data.stakes.map(stake => {
        if (stake.status === 'active') {
            const endMs = stake.endDate && stake.endDate.seconds ? 
                          (stake.endDate.seconds * 1000) : 
                          new Date(stake.endDate || 0).getTime();
            if (now >= endMs) {
                hasExpired = true;
                totalReturn += parseFloat(stake.expectedReturn || 0);
                
                newTransactions.push({
                    type: 'Staking Return',
                    amount: parseFloat(stake.expectedReturn || 0),
                    date: firebase.firestore.Timestamp.now(),
                    coin: stake.coin,
                    duration: stake.duration
                });

                return { ...stake, status: 'completed' };
            }
        }
        return stake;
    });

    if (hasExpired) {
        isCheckingStakes = true;
        try {
            const user = auth.currentUser;
            if (user) {
                const userRef = db.collection('users').doc(user.uid);
                const updates = {
                    balance: firebase.firestore.FieldValue.increment(totalReturn),
                    stakes: updatedStakes
                };
                if (newTransactions.length > 0) {
                    updates.transactions = firebase.firestore.FieldValue.arrayUnion(...newTransactions);
                }
                await userRef.update(updates);
            }
        } catch (e) {
            console.error("Error processing expired stakes:", e);
        } finally {
            isCheckingStakes = false;
        }
    }
}

window.submitStake = async function() {
    if (!userDataCache) return;
    const amountInput = document.getElementById('stakeAmount');
    const amount = parseFloat(amountInput.value) || 0;
    const mainBalance = parseFloat(userDataCache.balance || 0);

    if (isNaN(amount) || amount < 1) {
        showCustomAlert("Please enter a valid amount to stake (Minimum $1.00).");
        return;
    }

    if (amount > mainBalance) {
        showCustomAlert("Insufficient balance. Your available balance is $" + mainBalance.toFixed(2));
        return;
    }

    const config = COIN_CONFIG[selectedCoin];
    let rateMultiplier = 1.0;
    if (selectedDuration === 15) rateMultiplier = 1.25;
    else if (selectedDuration === 30) rateMultiplier = 1.50;
    const dailyRate = config.baseRate * rateMultiplier;
    const dailyYield = amount * (dailyRate / 100);
    const totalInterest = dailyYield * selectedDuration;
    const expectedReturn = amount + totalInterest;

    const confirmMessage = `Are you sure you want to stake $${amount.toFixed(2)} on ${selectedCoin} for ${selectedDuration} days?\n\n` +
                           `• Daily Yield Rate: ${dailyRate.toFixed(2)}%\n` +
                           `• Est. Daily Yield: $${dailyYield.toFixed(2)}\n` +
                           `• Total Profit: +$${totalInterest.toFixed(2)}\n` +
                           `• Expected Payout: $${expectedReturn.toFixed(2)}`;

    showCustomConfirm(confirmMessage, async () => {
        const btn = document.getElementById('stakeNowBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = "Processing...";
            btn.style.opacity = "0.7";
        }

        try {
            const user = auth.currentUser;
            if (user) {
                const userRef = db.collection('users').doc(user.uid);
                
                const stakeId = "stake_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                const startDate = firebase.firestore.Timestamp.now();
                const durationMs = selectedDuration * 24 * 60 * 60 * 1000;
                const endDate = firebase.firestore.Timestamp.fromMillis(startDate.toMillis() + durationMs);

                const newStake = {
                    id: stakeId,
                    coin: selectedCoin,
                    amount: amount,
                    duration: selectedDuration,
                    dailyRate: dailyRate,
                    startDate: startDate,
                    endDate: endDate,
                    expectedReturn: expectedReturn,
                    status: "active"
                };

                const newTx = {
                    type: "Staking Deposit",
                    amount: -amount,
                    date: startDate,
                    coin: selectedCoin,
                    duration: selectedDuration
                };

                await userRef.update({
                    balance: firebase.firestore.FieldValue.increment(-amount),
                    stakes: firebase.firestore.FieldValue.arrayUnion(newStake),
                    transactions: firebase.firestore.FieldValue.arrayUnion(newTx)
                });

                if (amountInput) amountInput.value = "";
                calculateStakedReturn();
                showCustomAlert(`Staked $${amount.toFixed(2)} on ${selectedCoin} successfully!`);
            }
        } catch (err) {
            console.error("Error staking:", err);
            showCustomAlert("Failed to complete staking operation: " + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = "Stake Now";
                btn.style.opacity = "1";
            }
        }
    });
};

window.updateDisplay = function() {
    if (!userDataCache) return;
    
    const balance = parseFloat(userDataCache.balance || 0);
    const availBalEl = document.getElementById('availBalance');
    if (availBalEl) availBalEl.textContent = balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    calculateStakedReturn();

    // Render active stakes list
    const listEl = document.getElementById('activeStakesList');
    if (!listEl) return;

    const stakes = userDataCache.stakes || [];
    if (stakes.length === 0) {
        listEl.innerHTML = `
            <div class="empty-stakes-card">
                <div class="empty-icon">🔒</div>
                <p>No active staking operations found.</p>
                <span>Select an asset and terms above to start earning high-yield daily returns.</span>
            </div>
        `;
        return;
    }

    // Sort: active first, then by startDate descending
    const sortedStakes = [...stakes].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        
        const timeA = a.startDate && a.startDate.seconds ? a.startDate.seconds : new Date(a.startDate || 0).getTime() / 1000;
        const timeB = b.startDate && b.startDate.seconds ? b.startDate.seconds : new Date(b.startDate || 0).getTime() / 1000;
        return timeB - timeA;
    });

    const now = Date.now();
    
    listEl.innerHTML = sortedStakes.map(stake => {
        const startMs = stake.startDate && stake.startDate.seconds ? (stake.startDate.seconds * 1000) : new Date(stake.startDate || 0).getTime();
        const endMs = stake.endDate && stake.endDate.seconds ? (stake.endDate.seconds * 1000) : new Date(stake.endDate || 0).getTime();
        
        let progressPercent = 0;
        let remainingText = "";
        
        if (stake.status === 'active') {
            const elapsed = now - startMs;
            const totalDuration = endMs - startMs;
            progressPercent = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
            
            const remainingMs = endMs - now;
            if (remainingMs <= 0) {
                remainingText = "Ready to claim";
                progressPercent = 100;
            } else {
                const remDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
                const remHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                if (remDays > 0) {
                    remainingText = `${remDays}d ${remHours}h remaining`;
                } else {
                    const remMins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
                    remainingText = `${remHours}h ${remMins}m remaining`;
                }
            }
        } else {
            progressPercent = 100;
            remainingText = "Term Completed";
        }

        const statusClass = stake.status === 'active' ? 'active-pulse' : 'completed-check';
        const statusLabel = stake.status === 'active' ? 'ACTIVE' : 'RELEASED';
        const coinName = COIN_CONFIG[stake.coin] ? COIN_CONFIG[stake.coin].name : stake.coin;
        const formattedStart = new Date(startMs).toLocaleDateString();
        const formattedEnd = new Date(endMs).toLocaleDateString();
        
        let svgColor = "#F7931A";
        if (COIN_CONFIG[stake.coin]) svgColor = COIN_CONFIG[stake.coin].color;

        return `
            <div class="stake-card ${stake.status}">
                <div class="sc-top">
                    <div class="sc-coin">
                        <div class="sc-coin-logo" style="background: ${svgColor}20; color: ${svgColor}">
                            ${stake.coin.substring(0, 2)}
                        </div>
                        <div class="sc-coin-meta">
                            <span class="sc-symbol">${stake.coin}</span>
                            <span class="sc-name">${coinName}</span>
                        </div>
                    </div>
                    <div class="sc-status-badge ${stake.status}">
                        <span class="pulse-dot ${statusClass}"></span>
                        ${statusLabel}
                    </div>
                </div>
                
                <div class="sc-details-grid">
                    <div class="sc-detail">
                        <span class="sc-det-label">Amount Staked</span>
                        <span class="sc-det-val">$${parseFloat(stake.amount).toFixed(2)}</span>
                    </div>
                    <div class="sc-detail">
                        <span class="sc-det-label">Daily Yield</span>
                        <span class="sc-det-val interest-txt">${parseFloat(stake.dailyRate).toFixed(2)}%</span>
                    </div>
                    <div class="sc-detail">
                        <span class="sc-det-label">Est. Profit</span>
                        <span class="sc-det-val interest-txt">+$${(parseFloat(stake.expectedReturn) - parseFloat(stake.amount)).toFixed(2)}</span>
                    </div>
                    <div class="sc-detail">
                        <span class="sc-det-label">Payout Return</span>
                        <span class="sc-det-val payout-txt">$${parseFloat(stake.expectedReturn).toFixed(2)}</span>
                    </div>
                </div>

                <div class="sc-timeline">
                    <div class="sc-time-row">
                        <span>Start: ${formattedStart}</span>
                        <span>End: ${formattedEnd}</span>
                    </div>
                    <div class="sc-progress-bar">
                        <div class="sc-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="sc-footer-row">
                        <span class="term-badge">${stake.duration} Days Term</span>
                        <span class="time-remaining">${remainingText}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};
