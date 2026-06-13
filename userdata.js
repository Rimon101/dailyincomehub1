// ===== Firebase Configuration & Init ===== //
const firebaseConfig = {
    apiKey: "AIzaSyCo2HnFmbXOJuslh3h5UkQKNZrpybVFdvo",
    authDomain: "daily-income-hub.firebaseapp.com",
    projectId: "daily-income-hub",
    storageBucket: "daily-income-hub.firebasestorage.app",
    messagingSenderId: "233636932488",
    appId: "1:233636932488:web:d6b88bb5e7220f17c3283d",
    measurementId: "G-TZL2B10MJM"
};

// Initialize Firebase (Compat)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Helper to generate a unique invite code (6 characters)
window.generateInviteCode = function() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Hashes a string using SHA-256 (returns a 64-character hex string)
window.hashPassword = async function (password) {
    if (!password) return '';
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ===== Firebase Data Handlers ===== //

// Gets basic UID and metadata from local cache (prevents flickering)
function getCurrentUser() {
    const raw = localStorage.getItem('loggedInUser');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
}

// Replaces requireAuth()
// Forces the page to wait until Firebase confirms authentication
function requireAuth(onAuthenticated) {
    auth.onAuthStateChanged(user => {
        if (user) {
            if (onAuthenticated) onAuthenticated(user);
        } else {
            localStorage.removeItem('loggedInUser');
            window.location.href = '/login';
        }
    });
}

// Replaces getUserData()
// Attaches a real-time listener to the user's document in Firestore.
// Whenever balance or tasks update in the cloud, the callback triggers.
let unsubsribeUserData = null;
function listenUserData(callback) {
    auth.onAuthStateChanged(user => {
        if (!user) return;

        if (unsubsribeUserData) unsubsribeUserData(); // Clean up existing listener if any

        unsubsribeUserData = db.collection('users').doc(user.uid).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (data.isFrozen === true) {
                    auth.signOut().then(() => {
                        localStorage.removeItem('loggedInUser');
                        window.location.href = '/login?error=frozen';
                    });
                    return;
                }
                callback(data);
            }
        }, (error) => {
            console.error("Error listening to user data:", error);
        });
    });
}

// Global System Configuration Listener
function listenSystemConfig(callback) {
    db.collection('globalConfig').doc('system').onSnapshot(doc => {
        if (doc.exists) {
            callback(doc.data());
        }
    });
}

// Replaces setUserData()
// Asynchronously updates specific fields in the user's Firestore document.
async function updateUserData(updates) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await db.collection('users').doc(user.uid).update(updates);
    } catch (error) {
        console.error("Error updating user data:", error);
        throw error;
    }
}

// Helper for atomic increments (e.g. adding balance safely)
async function incrementUserData(field, amount) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await db.collection('users').doc(user.uid).update({
            [field]: firebase.firestore.FieldValue.increment(amount)
        });
    } catch (error) {
        console.error("Error incrementing data:", error);
        throw error;
    }
}

// HTML escaping utility to prevent XSS
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Global Custom Alert Function (Animated Overlay)
window.showCustomAlert = function (message, callback) {
    if (document.querySelector('.custom-alert-overlay')) {
        document.querySelector('.custom-alert-overlay').remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';

    const box = document.createElement('div');
    box.className = 'custom-alert-box';

    const icon = document.createElement('div');
    icon.className = 'custom-alert-icon';
    icon.innerHTML = '✓'; // Using a simple checkmark

    const msg = document.createElement('div');
    msg.className = 'custom-alert-message';
    msg.innerHTML = escapeHTML(message).replace(/\n/g, '<br>');

    const btn = document.createElement('button');
    btn.className = 'custom-alert-btn';
    btn.textContent = 'OK';

    btn.onclick = function () {
        overlay.classList.remove('show');
        setTimeout(() => {
            if (overlay.parentNode === document.body) {
                document.body.removeChild(overlay);
            }
            if (callback) callback();
        }, 300);
    };

    box.appendChild(icon);
    box.appendChild(msg);
    box.appendChild(btn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);


    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
};

// Global Custom Confirm Function
window.showCustomConfirm = function (message, onConfirm) {
    if (document.querySelector('.custom-alert-overlay')) {
        document.querySelector('.custom-alert-overlay').remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';

    const box = document.createElement('div');
    box.className = 'custom-alert-box';

    const icon = document.createElement('div');
    icon.className = 'custom-alert-icon';
    icon.innerHTML = '?';
    icon.style.background = '#ff9800';

    const msg = document.createElement('div');
    msg.className = 'custom-alert-message';
    msg.innerHTML = escapeHTML(message).replace(/\n/g, '<br>');

    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '10px';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'custom-alert-btn';
    btnCancel.style.background = '#ccc';
    btnCancel.style.color = '#333';
    btnCancel.textContent = 'Cancel';

    const btnOk = document.createElement('button');
    btnOk.className = 'custom-alert-btn';
    btnOk.textContent = 'Confirm';

    btnCancel.onclick = function () {
        overlay.classList.remove('show');
        setTimeout(() => document.body.removeChild(overlay), 300);
    };

    btnOk.onclick = function () {
        overlay.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(overlay);
            if (onConfirm) onConfirm();
        }, 300);
    };

    btnContainer.appendChild(btnCancel);
    btnContainer.appendChild(btnOk);

    box.appendChild(icon);
    box.appendChild(msg);
    box.appendChild(btnContainer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    setTimeout(() => overlay.classList.add('show'), 10);
};

// --- Start of Telegram Support Button ---
if (!window.location.pathname.includes('admin')) {
    (function () {
        var csLink = 'https://t.me/Universalmoviess22';
        db.collection('globalConfig').doc('system').onSnapshot(doc => {
            if (doc.exists && doc.data().csLink) {
                csLink = doc.data().csLink;
                const contactBtn = document.querySelector('.contact-btn');
                if (contactBtn) contactBtn.href = csLink;
            }
        });

        var btn = document.createElement('div');
        btn.id = 'draggable-chat-btn';
        btn.innerHTML = '💬';
        btn.title = 'Chat on Telegram';

        var saved = JSON.parse(localStorage.getItem('chatBtnPos') || 'null');
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: (saved ? 'auto' : '24px'),
            right:   (saved ? 'auto' : '20px'),
            left:    (saved ? saved.left + 'px' : 'auto'),
            top:     (saved ? saved.top  + 'px' : 'auto'),
            width: '52px', height: '52px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0088cc, #0077b5)',
            color: '#fff', fontSize: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,136,204,0.45)',
            cursor: 'grab', zIndex: '99999',
            userSelect: 'none', transition: 'box-shadow 0.2s',
        });

        document.body.appendChild(btn);

        var dragging = false, moved = false, ox = 0, oy = 0;

        btn.addEventListener('mousedown', function (e) {
            dragging = true; moved = false;
            ox = e.clientX - btn.getBoundingClientRect().left;
            oy = e.clientY - btn.getBoundingClientRect().top;
            btn.style.cursor = 'grabbing';
            btn.style.transition = 'none';
            e.preventDefault();
        });

        btn.addEventListener('touchstart', function (e) {
            dragging = true; moved = false;
            var t = e.touches[0];
            ox = t.clientX - btn.getBoundingClientRect().left;
            oy = t.clientY - btn.getBoundingClientRect().top;
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            moved = true;
            btn.style.left = (e.clientX - ox) + 'px';
            btn.style.top  = (e.clientY - oy) + 'px';
            btn.style.right = 'auto'; btn.style.bottom = 'auto';
        });

        document.addEventListener('touchmove', function (e) {
            if (!dragging) return;
            moved = true;
            var t = e.touches[0];
            btn.style.left = (t.clientX - ox) + 'px';
            btn.style.top  = (t.clientY - oy) + 'px';
            btn.style.right = 'auto'; btn.style.bottom = 'auto';
        }, { passive: false });

        function stopDrag() {
            if (!dragging) return;
            dragging = false;
            btn.style.cursor = 'grab';
            btn.style.transition = 'box-shadow 0.2s';
            if (moved) {
                localStorage.setItem('chatBtnPos', JSON.stringify({
                    left: parseInt(btn.style.left),
                    top:  parseInt(btn.style.top)
                }));
            }
        }

        document.addEventListener('mouseup', function () {
            if (dragging && !moved) {
                window.open(csLink, '_blank');
            }
            stopDrag();
        });

        document.addEventListener('touchend', function () {
            if (dragging && !moved) {
                window.open(csLink, '_blank');
            }
            stopDrag();
        });
    })();
}
// --- End of Telegram Support Button ---
