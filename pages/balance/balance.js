requireAuth((user) => {
    listenUserData((data) => {
        if (!data) return;
        const balance = parseFloat(data.balance || 0).toFixed(2);
        document.querySelector('.balance-card .amount').textContent = '$' + balance;

        const transactions = data.transactions || [];
        const listEl = document.getElementById('transactionList');

        if (transactions.length > 0) {
            listEl.innerHTML = '';
            [...transactions].reverse().forEach(tx => {
                const isPositive = tx.type.includes('Deposit') || tx.type.includes('Recharge') || tx.type.includes('Commission');
                const iconClass = (tx.type.includes('Deposit') || tx.type.includes('Recharge')) ? 'deposit' : tx.type.includes('Withdrawal') ? 'withdraw' : 'commission';
                const iconChar = (tx.type.includes('Deposit') || tx.type.includes('Recharge')) ? '💳' : tx.type.includes('Withdrawal') ? '💸' : '💰';
                const sign = isPositive ? '+' : '-';
                const amountClass = isPositive ? 'positive' : 'negative';
                const txDate = tx.date ? (tx.date.toDate ? tx.date.toDate().toLocaleString() : tx.date) : new Date().toLocaleString();

                listEl.innerHTML += '<div class="transaction-item">' +
                    '<div class="transaction-icon ' + iconClass + '">' + iconChar + '</div>' +
                    '<div class="transaction-details">' +
                    '<div class="type">' + tx.type + '</div>' +
                    '<div class="date">' + txDate + '</div>' +
                    '</div>' +
                    '<div class="transaction-amount ' + amountClass + '">' + sign + '$' + Math.abs(parseFloat(tx.amount)).toFixed(2) + '</div>' +
                    '</div>';
            });
        } else {
            listEl.innerHTML = '<div class="transaction-item" style="justify-content:center;color:#bbb;font-size:14px;padding:24px;">No transactions yet</div>';
        }
    });
});
