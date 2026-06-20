requireAuth((user) => {
    listenSystemConfig((sys) => {
        if (sys.siteName) document.getElementById("sitePageTitle").textContent = "My Team - " + sys.siteName;
    });

    const teamList = document.getElementById('teamList');
    const totalMembers = document.getElementById('totalMembers');

    // Get current user's data to know their invite code
    listenUserData((userData) => {
        if (!userData) return;
        const myInviteCode = (userData.inviteCode || "").toUpperCase();
        console.log("Loading team for user UID:", user.uid, "Invite Code:", myInviteCode);

        // We fetch both UID-linked and string-code-linked users to "recover" old tests
        const query1 = db.collection('users').where('referredBy', '==', user.uid).get();
        const query2 = myInviteCode ? db.collection('users').where('referralCodeEntered', '==', myInviteCode).get() : Promise.resolve({ empty: true });

        Promise.all([query1, query2]).then(([snap1, snap2]) => {
            const memberMap = new Map();

            snap1.forEach(doc => memberMap.set(doc.id, { id: doc.id, ...doc.data() }));
            if (!snap2.empty) {
                snap2.forEach(doc => memberMap.set(doc.id, { id: doc.id, ...doc.data() }));
            }

            if (memberMap.size === 0) {
                teamList.innerHTML = '<div class="empty-msg">You haven\'t invited anyone yet.</div>';
                totalMembers.textContent = '0';
                return;
            }

            totalMembers.textContent = memberMap.size;
            const members = Array.from(memberMap.values());
            
            // Sort by createdAt desc
            members.sort((a, b) => {
                const dateA = a.createdAt ? (a.createdAt.seconds || 0) : 0;
                const dateB = b.createdAt ? (b.createdAt.seconds || 0) : 0;
                return dateB - dateA;
            });

            let html = '';
            members.forEach(data => {
                const joinedDate = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : '---';
                html += `
                    <div class="team-member">
                        <div class="member-avatar">👤</div>
                        <div class="member-info">
                            <div class="member-name">${data.username} <span class="member-vip">${data.vipLevel || 'VIP 1'}</span></div>
                            <div class="member-date">Joined: ${joinedDate}</div>
                        </div>
                    </div>
                `;
            });
            teamList.innerHTML = html;
        }).catch(error => {
            console.error("Error loading team:", error);
            teamList.innerHTML = '<div class="empty-msg" style="color: red;">Error loading team members.</div>';
        });
    }, user);
});
