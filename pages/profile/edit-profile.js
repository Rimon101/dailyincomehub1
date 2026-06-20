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
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showCustomAlert('Please select a valid image file.');
        return;
    }

    // Validate file size (max 5MB raw input)
    if (file.size > 5 * 1024 * 1024) {
        showCustomAlert('Image is too large. Please select an image under 5MB.');
        return;
    }

    compressImage(file, 200, 200, 0.6).then(async (base64) => {
        // Check compressed size — Firestore field should stay reasonable
        const sizeKB = Math.round((base64.length * 3) / 4 / 1024);
        if (sizeKB > 200) {
            showCustomAlert('Image is still too large after compression (' + sizeKB + 'KB). Please use a smaller image.');
            return;
        }

        document.getElementById('defaultPic').style.display = 'none';
        document.getElementById('profilePicPreview').src = base64;
        document.getElementById('profilePicPreview').style.display = 'block';

        try {
            await updateUserData({ profilePic: base64 });
            showCustomAlert('Profile picture updated!');
        } catch (err) {
            console.error('Profile pic update error:', err);
            if (err.code === 'resource-exhausted' || (err.message && err.message.includes('exceeds the maximum'))) {
                showCustomAlert('Your account data is too large to store a profile picture. Please contact support.');
            } else {
                showCustomAlert('Error updating photo: ' + err.message);
            }
        }
    }).catch(err => {
        console.error('Image processing error:', err);
        showCustomAlert('Error processing image. Please try a different photo.');
    });

    // Reset input so the same file can be re-selected
    this.value = '';
});

function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(new Error('Failed to read file'));

        reader.onload = event => {
            const img = new Image();

            img.onerror = () => reject(new Error('Failed to load image'));

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Scale down maintaining aspect ratio
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

                    // Ensure minimum dimensions
                    width = Math.max(1, width);
                    height = Math.max(1, height);

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const result = canvas.toDataURL('image/jpeg', quality);
                    resolve(result);
                } catch (canvasErr) {
                    reject(canvasErr);
                }
            };

            img.src = event.target.result;
        };

        reader.readAsDataURL(file);
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
