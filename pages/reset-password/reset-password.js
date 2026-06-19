// ===== Reset password =====
let resetOobCode = null;

function showInvalidLink(message) {
    const form = document.getElementById('resetForm');
    const backLink = document.getElementById('formBackLink');
    const invalidCta = document.getElementById('invalidLinkCta');
    const subtitle = document.getElementById('statusSubtitle');
    const errorMsg = document.getElementById('errorMsg');

    form.classList.add('hidden');
    backLink.style.display = 'none';
    invalidCta.style.display = '';
    subtitle.textContent = 'Invalid or expired reset link';
    errorMsg.textContent = message;
    errorMsg.classList.add('show');
}

function showForm(email) {
    const form = document.getElementById('resetForm');
    const backLink = document.getElementById('formBackLink');
    const invalidCta = document.getElementById('invalidLinkCta');
    const subtitle = document.getElementById('statusSubtitle');

    form.classList.remove('hidden');
    invalidCta.style.display = 'none';
    backLink.style.display = '';
    subtitle.textContent = email
        ? 'Choose a strong new password for ' + email
        : 'Choose a strong new password';
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('oobCode');

    if (!code) {
        showInvalidLink('No reset code found in this link. Please request a new one.');
        return;
    }

    resetOobCode = code;

    try {
        const email = await auth.verifyPasswordResetCode(code);
        showForm(email);
    } catch (error) {
        if (error.code === 'auth/invalid-action-code' || error.code === 'auth/expired-action-code') {
            showInvalidLink('This reset link is invalid or has expired. Please request a new one.');
        } else if (error.code === 'auth/network-request-failed') {
            showInvalidLink('Network error. Please check your connection and try again.');
        } else {
            showInvalidLink('We couldn\'t verify your reset link. Please try again.');
        }
    }
});

async function handleReset(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const submitBtn = form.querySelector('.auth-submit');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    const invalidCta = document.getElementById('invalidLinkCta');

    errorMsg.classList.remove('show');
    successMsg.classList.remove('show');

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!newPassword || !confirmPassword) {
        errorMsg.textContent = 'Please fill in both password fields';
        errorMsg.classList.add('show');
        return;
    }
    if (newPassword.length < 6) {
        errorMsg.textContent = 'Password must be at least 6 characters';
        errorMsg.classList.add('show');
        return;
    }
    if (newPassword !== confirmPassword) {
        errorMsg.textContent = 'Passwords do not match';
        errorMsg.classList.add('show');
        return;
    }

    if (!resetOobCode) {
        showInvalidLink('This reset link is no longer valid. Please request a new one.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    try {
        await auth.confirmPasswordReset(resetOobCode, newPassword);
        form.classList.add('hidden');
        invalidCta.style.display = '';
        successMsg.textContent = 'Password updated! Redirecting to login...';
        successMsg.classList.add('show');
        document.getElementById('statusSubtitle').textContent = 'Password updated';
        setTimeout(() => { window.location.href = '/login?reset=success'; }, 1500);
    } catch (error) {
        if (error.code === 'auth/weak-password') {
            errorMsg.textContent = 'Password is too weak. Please choose a stronger one (at least 6 characters).';
        } else if (error.code === 'auth/expired-action-code' || error.code === 'auth/invalid-action-code') {
            showInvalidLink('This reset link has expired. Please request a new one.');
            return;
        } else if (error.code === 'auth/too-many-requests') {
            errorMsg.textContent = 'Too many attempts. Please wait a few minutes and try again.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMsg.textContent = 'Network error. Please check your connection and try again.';
        } else {
            errorMsg.textContent = 'Failed to update password: ' + error.message;
        }
        errorMsg.classList.add('show');
        submitBtn.textContent = 'Update password';
        submitBtn.disabled = false;
    }
}