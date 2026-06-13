requireAuth((firebaseUser) => {
    listenSystemConfig((sys) => {
        if (sys.siteName) document.getElementById("sitePageTitle").textContent = "Edit Profile - " + sys.siteName;
    });

    listenUserData((data) => {
        if (data) {
            document.getElementById('editEmail').value = data.email || '';
            document.getElementById('editUsername').value = data.username || '';
            document.getElementById('editFullName').value = data.fullName || '';

            if (data.profilePic) {
                document.getElementById('defaultPic').style.display = 'none';
                document.getElementById('profilePicPreview').src = data.profilePic;
                document.getElementById('profilePicPreview').style.display = 'block';
            }
        }
    });
});

document.getElementById('profilePicContainer').addEventListener('click', () => {
    document.getElementById('profilePicInput').click();
});

document.getElementById('profilePicInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            const base64 = e.target.result;
            document.getElementById('defaultPic').style.display = 'none';
            document.getElementById('profilePicPreview').src = base64;
            document.getElementById('profilePicPreview').style.display = 'block';
            try {
                await updateUserData({ profilePic: base64 });
                showCustomAlert('Profile picture updated!');
            } catch (err) {
                showCustomAlert('Error updating photo: ' + err.message);
            }
        };
        reader.readAsDataURL(file);
    }
});

async function handleUpdate(e) {
    e.preventDefault();
    const fullName = document.getElementById('editFullName').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (submitBtn) submitBtn.disabled = true;

    try {
        await updateUserData({ fullName });
        showCustomAlert('Profile updated successfully!');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } catch (err) {
        showCustomAlert('Error: ' + err.message);
        if (submitBtn) submitBtn.disabled = false;
    }
}
