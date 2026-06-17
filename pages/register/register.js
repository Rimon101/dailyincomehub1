async function handleRegister(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const submitBtn = form.querySelector('.auth-submit');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');

    const fullName        = form.querySelector('#fullName').value.trim();
    const email           = form.querySelector('#email').value.trim();
    const username        = form.querySelector('#username').value.trim();
    const phone           = window.phoneInput ? window.phoneInput.getNumber() : form.querySelector('#phone').value.trim();
    const password        = form.querySelector('#password').value;
    const confirmPassword = form.querySelector('#confirmPassword').value;
    const referralCode    = form.querySelector('#referralCode').value.trim();

    errorMsg.classList.remove('show');
    successMsg.classList.remove('show');

    if (!fullName || !email || !username || !phone || !password || !confirmPassword) {
        errorMsg.textContent = 'Please fill in all required fields';
        errorMsg.classList.add('show');
        return;
    }
    if (password.length < 6) {
        errorMsg.textContent = 'Password must be at least 6 characters';
        errorMsg.classList.add('show');
        return;
    }
    if (password !== confirmPassword) {
        errorMsg.textContent = 'Passwords do not match';
        errorMsg.classList.add('show');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';

    try {
        const usernameSnapshot = await db.collection('users').where('username', '==', username).limit(1).get();
        if (!usernameSnapshot.empty) {
            errorMsg.textContent = 'Username already taken';
            errorMsg.classList.add('show');
            submitBtn.textContent = 'Register';
            submitBtn.disabled = false;
            return;
        }

        // 1. Look up inviter BEFORE creating the new user
        let inviterUid = '';
        if (referralCode) {
            const referralUpper = referralCode.toUpperCase();
            const inviterSnapshot = await db.collection('users').where('inviteCode', '==', referralUpper).limit(1).get();
            if (!inviterSnapshot.empty) {
                inviterUid = inviterSnapshot.docs[0].id;
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

        successMsg.textContent = 'Account created! Redirecting to login...';
        successMsg.classList.add('show');
        setTimeout(() => { window.location.href = '/login'; }, 2000);
    } catch (error) {
        errorMsg.textContent = error.code === 'auth/email-already-in-use'
            ? 'Email already registered'
            : error.code === 'auth/weak-password'
                ? 'Password is too weak'
                : 'Failed to create account: ' + error.message;
        errorMsg.classList.add('show');
        submitBtn.textContent = 'Register';
        submitBtn.disabled = false;
    }
}