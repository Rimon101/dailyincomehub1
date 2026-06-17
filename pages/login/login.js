async function handleLogin(e) {
    if (e) e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');

    if (!username || !password) { errorMsg.textContent = 'Please fill in all fields'; errorMsg.classList.add('show'); return; }

    try {
        const submitBtn = document.querySelector('.login-btn');
        submitBtn.textContent = 'Logging in...'; submitBtn.disabled = true;

        const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        if (userQuery.empty) {
            errorMsg.textContent = 'Invalid username or password'; errorMsg.classList.add('show');
            submitBtn.textContent = 'Login'; submitBtn.disabled = false; return;
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        if (userData.isFrozen === true) {
            errorMsg.textContent = 'Your account has been frozen. Please contact support.';
            errorMsg.classList.add('show');
            submitBtn.textContent = 'Login'; submitBtn.disabled = false; return;
        }
        const userCredential = await auth.signInWithEmailAndPassword(userData.email, password);

        localStorage.setItem('loggedInUser', JSON.stringify({
            uid: userCredential.user.uid, username: userData.username,
            email: userData.email, fullName: userData.fullName, profilePic: userData.profilePic || null
        }));
        window.location.href = '/';

    } catch (error) {
        const submitBtn = document.querySelector('.login-btn');
        submitBtn.textContent = 'Login'; submitBtn.disabled = false;
        errorMsg.textContent = (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential')
            ? 'Invalid username or password' : 'Login failed: ' + error.message;
        errorMsg.classList.add('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'frozen') {
        const errorMsg = document.getElementById('errorMsg');
        if (errorMsg) {
            errorMsg.textContent = 'Your account has been frozen. Please contact support.';
            errorMsg.classList.add('show');
        }
    }
});
