async function handleForgot(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const submitBtn = form.querySelector('.auth-submit');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');

    errorMsg.classList.remove('show');
    successMsg.classList.remove('show');

    const email = document.getElementById('email').value.trim();
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!email || !emailLooksValid) {
        errorMsg.textContent = 'Please enter a valid email address';
        errorMsg.classList.add('show');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    // Hardcoded production origin so reset links always point at the real
    // domain, regardless of whether the user is on dailyincomehub.store, a
    // Vercel preview URL, or localhost. Firebase would otherwise reject
    // any origin that isn't in the Authorized Domains list.
    const PRODUCTION_ORIGIN = 'https://dailyincomehub.store';

    const actionCodeSettings = {
        url: PRODUCTION_ORIGIN + '/reset-password',
        handleCodeInApp: true
    };

    try {
        await auth.sendPasswordResetEmail(email, actionCodeSettings);
        successMsg.textContent = 'Check your inbox! If an account exists for ' + email + ', we sent a reset link.';
        successMsg.classList.add('show');
        submitBtn.textContent = 'Resend link';
        submitBtn.disabled = false;
    } catch (error) {
        // Privacy: don't reveal whether the account exists.
        // auth/user-not-found is treated like a success.
        if (error.code === 'auth/user-not-found') {
            successMsg.textContent = 'Check your inbox! If an account exists for ' + email + ', we sent a reset link.';
            successMsg.classList.add('show');
            submitBtn.textContent = 'Resend link';
            submitBtn.disabled = false;
            return;
        }

        const msg =
            error.code === 'auth/invalid-email'
                ? 'Please enter a valid email address'
                : error.code === 'auth/too-many-requests'
                    ? 'Too many attempts. Please wait a few minutes and try again.'
                    : error.code === 'auth/network-request-failed'
                        ? 'Network error. Please check your connection and try again.'
                        : 'Failed to send reset email: ' + error.message;
        errorMsg.textContent = msg;
        errorMsg.classList.add('show');
        submitBtn.textContent = 'Send reset link';
        submitBtn.disabled = false;
    }
}