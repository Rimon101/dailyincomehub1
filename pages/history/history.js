requireAuth((user) => {
    // Check if we should filter to order records only
    const params = new URLSearchParams(window.location.search);
    const filterType = params.get('type'); // 'order' or null

    // Update page title/heading if filtering
    if (filterType === 'order') {
        const h1 = document.querySelector('.header h1');
        if (h1) h1.textContent = 'Order Record';
        const titleEl = document.getElementById('sitePageTitle');
        if (titleEl) titleEl.textContent = 'Order Record';
    }

    listenUserData((data) => {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';

        let transactions = data && data.transactions ? [...data.transactions] : [];

        // Filter based on view type
        if (filterType === 'order') {
            // Order Record page: show only order commission records
            transactions = transactions.filter(tx => tx.type && tx.type.toLowerCase().includes('order'));
        } else {
            // Transaction History page (from Profile): show only deposit/recharge and withdrawal records
            transactions = transactions.filter(tx => {
                if (!tx.type) return false;
                const t = tx.type.toLowerCase();
                return t.includes('recharge') || t.includes('deposit') || t.includes('withdraw');
            });
        }

        if (transactions.length === 0) {
            const emptyMsg = filterType === 'order' ? 'No completed orders yet.' : 'No deposit or withdrawal records yet.';
            historyList.innerHTML = `<div class="form-container" style="text-align:center;padding:40px 20px;"><div style="font-size:40px;margin-bottom:10px;">📋</div><p style="color:#666;">${emptyMsg}</p></div>`;
            return;
        }

        const sorted = transactions.sort((a, b) => {
            const da = a.date && a.date.toDate ? a.date.toDate() : new Date(a.date || 0);
            const db2 = b.date && b.date.toDate ? b.date.toDate() : new Date(b.date || 0);
            return db2 - da;
        });

        sorted.forEach(tx => {
            const rawDate = tx.date && tx.date.toDate ? tx.date.toDate() : new Date(tx.date || 0);
            const date = rawDate.toLocaleString();
            const card = document.createElement('div');
            card.className = 'form-container';
            card.style.marginBottom = '12px';

            const isOrder = tx.type && tx.type.toLowerCase().includes('order');
            const isWithdrawal = tx.type && tx.type.toLowerCase().includes('withdraw');
            const isNegative = isWithdrawal || tx.amount < 0;
            const sign = isNegative ? '-' : '+';
            const color = isNegative ? '#c62828' : '#2e7d32';

            // Badge colour
            let badgeBg = '#1565c0';
            if (isOrder) badgeBg = '#6a1b9a';
            if (isWithdrawal) badgeBg = '#c62828';
            if (tx.type && tx.type.toLowerCase().includes('recharge')) badgeBg = '#1b5e20';

            // Extra detail line for order records
            let extraLine = '';
            if (isOrder) {
                const taskNo = tx.taskNo ? `Task #${tx.taskNo}` : '';
                const orderAmt = tx.orderAmount != null ? ` | Order: $${parseFloat(tx.orderAmount).toFixed(2)}` : '';
                if (taskNo || orderAmt) {
                    extraLine = `<div style="font-size:12px;color:#aaa;margin-top:2px;">${taskNo}${orderAmt}</div>`;
                }
            }

            card.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div>
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <span style="background:${badgeBg};color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;white-space:nowrap;">${tx.type}</span>
                        </div>
                        <div style="font-size:12px;color:#888;">${date}</div>
                        ${extraLine}
                    </div>
                    <div style="font-weight:700;color:${color};white-space:nowrap;margin-left:10px;">
                        ${sign}$${Math.abs(tx.amount).toFixed(2)}
                    </div>
                </div>`;
            historyList.appendChild(card);
        });
    });
});
