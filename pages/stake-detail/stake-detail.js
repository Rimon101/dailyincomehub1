const COIN_CONFIG = {
    BTC: { name: "Bitcoin", baseRate: 1.2, color: "#F7931A" },
    ETH: { name: "Ethereum", baseRate: 1.5, color: "#627EEA" },
    SOL: { name: "Solana", baseRate: 1.8, color: "#14F195" },
    BNB: { name: "BNB", baseRate: 1.6, color: "#F3BA2F" },
    ADA: { name: "Cardano", baseRate: 1.0, color: "#0033AD" },
    XRP: { name: "Ripple", baseRate: 1.1, color: "#23292F" }
};

let currentStake = null;
let userDataCache = null;

// Show cached stake details instantly (before Firebase responds)
(function showCachedStakeImmediately() {
    const cached = typeof getCachedUserData === 'function' ? getCachedUserData() : null;
    if (!cached) return;

    const params = new URLSearchParams(window.location.search);
    const stakeId = params.get('id');
    if (!stakeId || !cached.stakes || !Array.isArray(cached.stakes)) return;

    const stake = cached.stakes.find(s => s.id === stakeId);
    if (!stake) return;

    currentStake = stake;
    // renderStakeDetails is hoisted so we can call it here
    renderStakeDetails(stake);
})();

requireAuth((user) => {
    listenUserData((data) => {
        if (!data) return;
        userDataCache = data;

        const params = new URLSearchParams(window.location.search);
        const stakeId = params.get('id');

        if (!stakeId || !data.stakes || !Array.isArray(data.stakes)) {
            window.location.href = '/tasks';
            return;
        }

        const stake = data.stakes.find(s => s.id === stakeId);
        if (!stake) {
            showCustomAlert('Stake order not found.', () => {
                window.location.href = '/tasks';
            });
            return;
        }

        currentStake = stake;
        renderStakeDetails(stake);
    }, user);
});

function renderStakeDetails(stake) {
    const coinCfg = COIN_CONFIG[stake.coin] || { name: stake.coin, color: '#888' };
    const svgColor = coinCfg.color;
    const startMs = stake.startDate && stake.startDate.seconds ? (stake.startDate.seconds * 1000) : new Date(stake.startDate || 0).getTime();
    const endMs = stake.endDate && stake.endDate.seconds ? (stake.endDate.seconds * 1000) : new Date(stake.endDate || 0).getTime();
    const now = Date.now();

    // Status banner
    const banner = document.getElementById('statusBanner');
    const statusLabel = document.getElementById('statusLabel');
    const statusSub = document.getElementById('statusSub');

    if (stake.status === 'active') {
        banner.className = 'status-banner active';
        statusLabel.textContent = 'ACTIVE';
        statusSub.textContent = 'Earning yield in progress';
    } else if (stake.status === 'cancelled') {
        banner.className = 'status-banner cancelled';
        statusLabel.textContent = 'CANCELLED';
        statusSub.textContent = 'Stake was cancelled early';
    } else {
        banner.className = 'status-banner completed';
        statusLabel.textContent = 'COMPLETED';
        statusSub.textContent = 'Term finished — funds released';
    }

    // Coin info
    document.getElementById('coinLogo').textContent = stake.coin.substring(0, 2);
    document.getElementById('coinLogo').style.background = svgColor + '20';
    document.getElementById('coinLogo').style.color = svgColor;
    document.getElementById('detailCoinSymbol').textContent = stake.coin;
    document.getElementById('detailCoinName').textContent = coinCfg.name;

    // Order ID
    document.getElementById('orderId').textContent = '#' + (stake.id || '---').replace('stake_', '');

    // Amount
    document.getElementById('detailAmount').textContent = '$' + parseFloat(stake.amount).toFixed(2);

    // Details
    document.getElementById('detailRate').textContent = parseFloat(stake.dailyRate).toFixed(2) + '%';
    document.getElementById('detailDuration').textContent = stake.duration + ' Days';

    const dailyProfit = parseFloat(stake.amount) * (parseFloat(stake.dailyRate) / 100);
    const totalInterest = parseFloat(stake.expectedReturn) - parseFloat(stake.amount);
    document.getElementById('detailDailyProfit').textContent = '$' + dailyProfit.toFixed(2);
    document.getElementById('detailTotalInterest').textContent = '+$' + totalInterest.toFixed(2);
    document.getElementById('detailPayout').textContent = '$' + parseFloat(stake.expectedReturn).toFixed(2);

    // Timeline
    const startDate = new Date(startMs);
    const endDate = new Date(endMs);
    document.getElementById('detailStartDate').textContent = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('detailEndDate').textContent = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Progress
    let progressPercent = 0;
    const totalDuration = endMs - startMs;
    const elapsed = now - startMs;

    if (stake.status === 'active') {
        progressPercent = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    } else {
        progressPercent = 100;
    }

    // Animate progress bars
    setTimeout(() => {
        document.getElementById('progressFillLg').style.width = progressPercent + '%';
        document.getElementById('timelineProgressFill').style.width = progressPercent + '%';
    }, 100);

    document.getElementById('progressPercent').textContent = progressPercent.toFixed(1) + '%';

    // Time elapsed / remaining
    const elapsedDays = Math.floor(elapsed / (24 * 60 * 60 * 1000));
    const remainingMs = endMs - now;
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));

    document.getElementById('timeElapsed').textContent = elapsedDays + (elapsedDays === 1 ? ' day' : ' days') + ' elapsed';
    
    if (stake.status === 'active' && remainingMs > 0) {
        document.getElementById('timeRemaining').textContent = remainingDays + (remainingDays === 1 ? ' day' : ' days') + ' left';
    } else if (stake.status === 'cancelled') {
        document.getElementById('timeRemaining').textContent = 'Cancelled';
    } else {
        document.getElementById('timeRemaining').textContent = 'Term completed';
    }

    // Cancel section — only show for active stakes
    const cancelSection = document.getElementById('cancelSection');
    if (stake.status === 'active') {
        cancelSection.style.display = 'block';
    } else {
        cancelSection.style.display = 'none';
    }
}

window.cancelStake = async function() {
    if (!currentStake || !userDataCache) return;

    const amount = parseFloat(currentStake.amount).toFixed(2);

    showCustomConfirm(
        `Are you sure you want to cancel this stake?\\n\\nYou will receive back only the original $${amount}. All interest will be forfeited.`,
        async () => {
            const btn = document.getElementById('cancelStakeBtn');
            btn.disabled = true;
            btn.textContent = 'Cancelling...';

            try {
                const user = auth.currentUser;
                if (!user) return;

                const userRef = db.collection('users').doc(user.uid);

                // Update the stake status to 'cancelled' in the array
                const updatedStakes = userDataCache.stakes.map(s => {
                    if (s.id === currentStake.id) {
                        return { ...s, status: 'cancelled' };
                    }
                    return s;
                });

                // Refund the original staked amount to balance
                const refundAmount = parseFloat(currentStake.amount);

                const cancelTx = {
                    type: 'Stake Cancelled (Refund)',
                    amount: refundAmount,
                    date: firebase.firestore.Timestamp.now(),
                    coin: currentStake.coin,
                    stakeId: currentStake.id
                };

                await userRef.update({
                    balance: firebase.firestore.FieldValue.increment(refundAmount),
                    stakes: updatedStakes,
                    transactions: firebase.firestore.FieldValue.arrayUnion(cancelTx)
                });

                showCustomAlert('Stake cancelled successfully!\\n$' + refundAmount.toFixed(2) + ' has been refunded to your balance.', () => {
                    window.location.href = '/tasks';
                });

            } catch (err) {
                console.error('Error cancelling stake:', err);
                showCustomAlert('Failed to cancel stake: ' + err.message);
                btn.disabled = false;
                btn.textContent = 'Cancel Stake Order';
            }
        }
    );
};
