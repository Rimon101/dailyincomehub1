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
    }, firebaseUser);
});

document.getElementById('profilePicContainer').addEventListener('click', () => {
    document.getElementById('profilePicInput').click();
});

document.getElementById('profilePicInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        compressImage(file, 128, 128, 0.7).then(async (base64) => {
            document.getElementById('defaultPic').style.display = 'none';
            document.getElementById('profilePicPreview').src = base64;
            document.getElementById('profilePicPreview').style.display = 'block';
            try {
                await updateUserData({ profilePic: base64 });
                showCustomAlert('Profile picture updated!');
            } catch (err) {
                showCustomAlert('Error updating photo: ' + err.message);
            }
        }).catch(err => {
            showCustomAlert('Error processing image: ' + err.message);
        });
    }
});

function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = error => reject(error);
        };
        img.onerror = error => reject(error);
    });
}

async function handleUpdate(e) {
    e.preventDefault();
    const fullName = document.getElementById('editFullName').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (submitBtn) submitBtn.disabled = true;

    try {
        await updateUserData({ fullName });
        showCustomAlert('Profile updated successfully!');
        setTimeout(() => {
            window.location.href = '/profile';
        }, 1500);
    } catch (err) {
        showCustomAlert('Error: ' + err.message);
        if (submitBtn) submitBtn.disabled = false;
    }
}
