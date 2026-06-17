async function handleLogin(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const submitBtn = form.querySelector('.auth-submit');
    const errorMsg = document.getElementById('errorMsg');

    const username = form.querySelector('#username').value.trim();
    const password = form.querySelector('#password').value;

    if (!username || !password) {
        errorMsg.textContent = 'Please fill in all fields';
        errorMsg.classList.add('show');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        if (userQuery.empty) {
            errorMsg.textContent = 'Invalid username or password';
            errorMsg.classList.add('show');
            submitBtn.textContent = 'Login';
            submitBtn.disabled = false;
            return;
        }

        const userData = userQuery.docs[0].data();
        if (userData.isFrozen === true) {
            errorMsg.textContent = 'Your account has been frozen. Please contact support.';
            errorMsg.classList.add('show');
            submitBtn.textContent = 'Login';
            submitBtn.disabled = false;
            return;
        }

        const userCredential = await auth.signInWithEmailAndPassword(userData.email, password);

        localStorage.setItem('loggedInUser', JSON.stringify({
            uid: userCredential.user.uid,
            username: userData.username,
            email: userData.email,
            fullName: userData.fullName,
            profilePic: userData.profilePic || null
        }));
        window.location.href = '/';
    } catch (error) {
        errorMsg.textContent = (error.code === 'auth/wrong-password'
            || error.code === 'auth/user-not-found'
            || error.code === 'auth/invalid-credential')
            ? 'Invalid username or password'
            : 'Login failed: ' + error.message;
        errorMsg.classList.add('show');
        submitBtn.textContent = 'Login';
        submitBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') !== 'frozen') return;

    const errorMsg = document.getElementById('errorMsg');
    if (!errorMsg) return;

    errorMsg.textContent = 'Your account has been frozen. Please contact support.';
    errorMsg.classList.add('show');
});