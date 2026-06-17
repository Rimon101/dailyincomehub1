async function handleRegister(e) {
    if (e) e.preventDefault();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const phone = window.phoneInput ? window.phoneInput.getNumber() : document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const referralCode = document.getElementById('referralCode').value.trim();
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    errorMsg.classList.remove('show'); successMsg.classList.remove('show');

    if (!fullName || !email || !username || !phone || !password || !confirmPassword) { errorMsg.textContent = 'Please fill in all required fields'; errorMsg.classList.add('show'); return; }
    if (password.length < 6) { errorMsg.textContent = 'Password must be at least 6 characters'; errorMsg.classList.add('show'); return; }
    if (password !== confirmPassword) { errorMsg.textContent = 'Passwords do not match'; errorMsg.classList.add('show'); return; }

    try {
        const submitBtn = document.querySelector('.login-btn');
        submitBtn.textContent = 'Registering...'; submitBtn.disabled = true;

        const usernameSnapshot = await db.collection('users').where('username', '==', username).limit(1).get();
        if (!usernameSnapshot.empty) {
            errorMsg.textContent = 'Username already taken'; errorMsg.classList.add('show');
            submitBtn.textContent = 'Register'; submitBtn.disabled = false; return;
        }

        // 1. Look up inviter BEFORE creating the new user
        let inviterUid = '';
        if (referralCode) {
            const referralUpper = referralCode.toUpperCase();
            console.log("Checking referral code:", referralUpper);
            const inviterSnapshot = await db.collection('users').where('inviteCode', '==', referralUpper).limit(1).get();
            if (!inviterSnapshot.empty) {
                inviterUid = inviterSnapshot.docs[0].id;
                console.log("Found inviter UID:", inviterUid);
            } else {
                console.warn("No inviter found for code:", referralUpper);
            }
        }

        // 2. Create the user in Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const myInviteCode = generateInviteCode();

        // 3. Create the user document in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            fullName, email, username, phone, 
            referralCodeEntered: referralCode.toUpperCase(), // Store in uppercase for easier querying
            referredBy: inviterUid,                           // UID of the person who invited them
            inviteCode: myInviteCode,                        // Their own code to share
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            balance: 0, tasksCompleted: 0, earnToday: 0, earnYesterday: 0, earnTotal: 0,
            honorPoints: 2, vipLevel: 'VIP 1'
        });

        successMsg.textContent = 'Account created! Redirecting to login...'; successMsg.classList.add('show');
        setTimeout(() => { window.location.href = '/login'; }, 2000);

    } catch (error) {
        const submitBtn = document.querySelector('.login-btn');
        submitBtn.textContent = 'Register'; submitBtn.disabled = false;
        errorMsg.textContent = error.code === 'auth/email-already-in-use' ? 'Email already registered'
            : error.code === 'auth/weak-password' ? 'Password is too weak'
            : 'Failed to create account: ' + error.message;
        errorMsg.classList.add('show');
    }
}

