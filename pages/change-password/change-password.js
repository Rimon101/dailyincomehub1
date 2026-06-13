requireAuth();

async function handleChangePassword(e) {
    e.preventDefault();
    const currentPass = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmNewPassword').value;
    const submitBtn = document.querySelector('.auth-submit');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    errorMsg.classList.remove('show'); successMsg.classList.remove('show');

    if (!currentPass || !newPass || !confirmPass) { showError('All fields are required'); return; }
    if (newPass.length < 6) { showError('New password must be at least 6 characters'); return; }
    if (newPass !== confirmPass) { showError('New passwords do not match'); return; }

    submitBtn.textContent = 'Updating...'; submitBtn.disabled = true;

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("No user logged in.");
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPass);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPass);
        successMsg.textContent = 'Password changed successfully!'; successMsg.classList.add('show');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
    } catch (error) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            showError('Current password is incorrect');
        } else { showError(error.message); }
    } finally {
        submitBtn.textContent = 'Change Password'; submitBtn.disabled = false;
    }
}

function showError(msg) {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = msg; errorMsg.classList.add('show');
}
