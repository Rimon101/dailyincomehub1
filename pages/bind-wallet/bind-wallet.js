const countryCodes = [
    { n: "Afghanistan", c: "+93", f: "🇦🇫" }, { n: "Albania", c: "+355", f: "🇦🇱" }, { n: "Algeria", c: "+213", f: "🇩🇿" },
    { n: "Andorra", c: "+376", f: "🇦🇩" }, { n: "Angola", c: "+244", f: "🇦🇴" }, { n: "Argentina", c: "+54", f: "🇦🇷" },
    { n: "Armenia", c: "+374", f: "🇦🇲" }, { n: "Australia", c: "+61", f: "🇦🇺" }, { n: "Austria", c: "+43", f: "🇦🇹" },
    { n: "Azerbaijan", c: "+994", f: "🇦🇿" }, { n: "Bahamas", c: "+1", f: "🇧🇸" }, { n: "Bahrain", c: "+973", f: "🇧🇭" },
    { n: "Bangladesh", c: "+880", f: "🇧🇩" }, { n: "Barbados", c: "+1", f: "🇧🇧" }, { n: "Belarus", c: "+375", f: "🇧🇾" },
    { n: "Belgium", c: "+32", f: "🇧🇪" }, { n: "Belize", c: "+501", f: "🇧🇿" }, { n: "Benin", c: "+229", f: "🇧🇯" },
    { n: "Bhutan", c: "+975", f: "🇧🇹" }, { n: "Bolivia", c: "+591", f: "🇧🇴" }, { n: "Bosnia", c: "+387", f: "🇧🇦" },
    { n: "Botswana", c: "+267", f: "🇧🇼" }, { n: "Brazil", c: "+55", f: "🇧🇷" }, { n: "Brunei", c: "+673", f: "🇧🇳" },
    { n: "Bulgaria", c: "+359", f: "🇧🇬" }, { n: "Burkina Faso", c: "+226", f: "🇧🇫" }, { n: "Burundi", c: "+257", f: "🇧🇮" },
    { n: "Cambodia", c: "+855", f: "🇰🇭" }, { n: "Cameroon", c: "+237", f: "🇨🇲" }, { n: "Canada", c: "+1", f: "🇨🇦" },
    { n: "Cape Verde", c: "+238", f: "🇨🇻" }, { n: "Chad", c: "+235", f: "🇹🇩" }, { n: "Chile", c: "+56", f: "🇨🇱" },
    { n: "China", c: "+86", f: "🇨🇳" }, { n: "Colombia", c: "+57", f: "🇨🇴" }, { n: "Comoros", c: "+269", f: "🇰🇲" },
    { n: "Congo", c: "+242", f: "🇨🇬" }, { n: "Costa Rica", c: "+506", f: "🇨🇷" }, { n: "Croatia", c: "+385", f: "🇭🇷" },
    { n: "Cuba", c: "+53", f: "🇨🇺" }, { n: "Cyprus", c: "+357", f: "🇨🇾" }, { n: "Czech Rep", c: "+420", f: "🇨🇿" },
    { n: "Denmark", c: "+45", f: "🇩🇰" }, { n: "Djibouti", c: "+253", f: "🇩🇯" }, { n: "Dominica", c: "+1", f: "🇩🇲" },
    { n: "Dominican Rep", c: "+1", f: "🇩🇴" }, { n: "Ecuador", c: "+593", f: "🇪🇨" }, { n: "Egypt", c: "+20", f: "🇪🇬" },
    { n: "El Salvador", c: "+503", f: "🇸🇻" }, { n: "Equatorial Guinea", c: "+240", f: "🇬🇶" }, { n: "Eritrea", c: "+291", f: "🇪🇷" },
    { n: "Estonia", c: "+372", f: "🇪🇪" }, { n: "Ethiopia", c: "+251", f: "🇪🇹" }, { n: "Fiji", c: "+679", f: "🇫🇯" },
    { n: "Finland", c: "+358", f: "🇫🇮" }, { n: "France", c: "+33", f: "🇫🇷" }, { n: "Gabon", c: "+241", f: "🇬🇦" },
    { n: "Gambia", c: "+220", f: "🇬🇲" }, { n: "Georgia", c: "+995", f: "🇬🇪" }, { n: "Germany", c: "+49", f: "🇩🇪" },
    { n: "Ghana", c: "+233", f: "🇬🇭" }, { n: "Greece", c: "+30", f: "🇬🇷" }, { n: "Grenada", c: "+1", f: "🇬🇩" },
    { n: "Guatemala", c: "+502", f: "🇬🇹" }, { n: "Guinea", c: "+224", f: "🇬🇳" }, { n: "Guyana", c: "+592", f: "🇬🇾" },
    { n: "Haiti", c: "+509", f: "🇭🇹" }, { n: "Honduras", c: "+504", f: "🇭🇳" }, { n: "Hong Kong", c: "+852", f: "🇭🇰" },
    { n: "Hungary", c: "+36", f: "🇭🇺" }, { n: "Iceland", c: "+354", f: "🇮🇸" }, { n: "India", c: "+91", f: "🇮🇳" },
    { n: "Indonesia", c: "+62", f: "🇮🇩" }, { n: "Iran", c: "+98", f: "🇮🇷" }, { n: "Iraq", c: "+964", f: "🇮🇶" },
    { n: "Ireland", c: "+353", f: "🇮🇪" }, { n: "Israel", c: "+972", f: "🇮🇱" }, { n: "Italy", c: "+39", f: "🇮🇹" },
    { n: "Ivory Coast", c: "+225", f: "🇨🇮" }, { n: "Jamaica", c: "+1", f: "🇯🇲" }, { n: "Japan", c: "+81", f: "🇯🇵" },
    { n: "Jordan", c: "+962", f: "🇯🇴" }, { n: "Kazakhstan", c: "+7", f: "🇰🇿" }, { n: "Kenya", c: "+254", f: "🇰🇪" },
    { n: "Kuwait", c: "+965", f: "🇰🇼" }, { n: "Kyrgyzstan", c: "+996", f: "🇰🇬" }, { n: "Laos", c: "+856", f: "🇱🇦" },
    { n: "Latvia", c: "+371", f: "🇱🇻" }, { n: "Lebanon", c: "+961", f: "🇱🇧" }, { n: "Lesotho", c: "+266", f: "🇱🇸" },
    { n: "Liberia", c: "+231", f: "🇱🇷" }, { n: "Libya", c: "+218", f: "🇱🇾" }, { n: "Liechtenstein", c: "+423", f: "🇱🇮" },
    { n: "Lithuania", c: "+370", f: "🇱🇹" }, { n: "Luxembourg", c: "+352", f: "🇱🇺" }, { n: "Macau", c: "+853", f: "🇲🇴" },
    { n: "Macedonia", c: "+389", f: "🇲🇰" }, { n: "Madagascar", c: "+261", f: "🇲🇬" }, { n: "Malawi", c: "+265", f: "🇲🇼" },
    { n: "Malaysia", c: "+60", f: "🇲🇾" }, { n: "Maldives", c: "+960", f: "🇲🇻" }, { n: "Mali", c: "+223", f: "🇲🇱" },
    { n: "Malta", c: "+356", f: "🇲🇹" }, { n: "Mauritania", c: "+222", f: "🇲🇷" }, { n: "Mauritius", c: "+230", f: "🇲🇺" },
    { n: "Mexico", c: "+52", f: "🇲🇽" }, { n: "Moldova", c: "+373", f: "🇲🇩" }, { n: "Monaco", c: "+377", f: "🇲🇨" },
    { n: "Mongolia", c: "+976", f: "🇲🇳" }, { n: "Montenegro", c: "+382", f: "🇲🇪" }, { n: "Morocco", c: "+212", f: "🇲🇦" },
    { n: "Mozambique", c: "+258", f: "🇲🇿" }, { n: "Myanmar", c: "+95", f: "🇲🇲" }, { n: "Namibia", c: "+264", f: "🇳🇦" },
    { n: "Nepal", c: "+977", f: "🇳🇵" }, { n: "Netherlands", c: "+31", f: "🇳🇱" }, { n: "New Zealand", c: "+64", f: "🇳🇿" },
    { n: "Nicaragua", c: "+505", f: "🇳🇮" }, { n: "Niger", c: "+227", f: "🇳🇪" }, { n: "Nigeria", c: "+234", f: "🇳🇬" },
    { n: "Norway", c: "+47", f: "🇳🇴" }, { n: "Oman", c: "+968", f: "🇴🇲" }, { n: "Pakistan", c: "+92", f: "🇵🇰" },
    { n: "Palestine", c: "+970", f: "🇵🇸" }, { n: "Panama", c: "+507", f: "🇵🇦" }, { n: "Paraguay", c: "+595", f: "🇵🇾" },
    { n: "Peru", c: "+51", f: "🇵🇪" }, { n: "Philippines", c: "+63", f: "🇵🇭" }, { n: "Poland", c: "+48", f: "🇵🇱" },
    { n: "Portugal", c: "+351", f: "🇵🇹" }, { n: "Qatar", c: "+974", f: "🇶🇦" }, { n: "Romania", c: "+40", f: "🇷🇴" },
    { n: "Russia", c: "+7", f: "🇷🇺" }, { n: "Rwanda", c: "+250", f: "🇷🇼" }, { n: "Saudi Arabia", c: "+966", f: "🇸🇦" },
    { n: "Senegal", c: "+221", f: "🇸🇳" }, { n: "Serbia", c: "+381", f: "🇷🇸" }, { n: "Seychelles", c: "+248", f: "🇸🇨" },
    { n: "Sierra Leone", c: "+232", f: "🇸🇱" }, { n: "Singapore", c: "+65", f: "🇸🇬" }, { n: "Slovakia", c: "+421", f: "🇸🇰" },
    { n: "Slovenia", c: "+386", f: "🇸🇮" }, { n: "Somalia", c: "+252", f: "🇸🇴" }, { n: "South Africa", c: "+27", f: "🇿🇦" },
    { n: "South Korea", c: "+82", f: "🇰🇷" }, { n: "South Sudan", c: "+211", f: "🇸🇸" }, { n: "Spain", c: "+34", f: "🇪🇸" },
    { n: "Sri Lanka", c: "+94", f: "🇱🇰" }, { n: "Sudan", c: "+249", f: "🇸🇩" }, { n: "Suriname", c: "+597", f: "🇸🇷" },
    { n: "Sweden", c: "+46", f: "🇸🇪" }, { n: "Switzerland", c: "+41", f: "🇨🇭" }, { n: "Syria", c: "+963", f: "🇸🇾" },
    { n: "Taiwan", c: "+886", f: "🇹🇼" }, { n: "Tajikistan", c: "+992", f: "🇹🇯" }, { n: "Tanzania", c: "+255", f: "🇹🇿" },
    { n: "Thailand", c: "+66", f: "🇹🇭" }, { n: "Togo", c: "+228", f: "🇹🇬" }, { n: "Trinidad", c: "+1", f: "🇹🇹" },
    { n: "Tunisia", c: "+216", f: "🇹🇳" }, { n: "Turkey", c: "+90", f: "🇹🇷" }, { n: "Turkmenistan", c: "+993", f: "🇹🇲" },
    { n: "Uganda", c: "+256", f: "🇺🇬" }, { n: "Ukraine", c: "+380", f: "🇺🇦" }, { n: "UAE", c: "+971", f: "🇦🇪" },
    { n: "UK", c: "+44", f: "🇬🇧" }, { n: "USA", c: "+1", f: "🇺🇸" }, { n: "Uruguay", c: "+598", f: "🇺🇾" },
    { n: "Uzbekistan", c: "+998", f: "🇺🇿" }, { n: "Vatican", c: "+379", f: "🇻🇦" }, { n: "Venezuela", c: "+58", f: "🇻🇪" },
    { n: "Vietnam", c: "+84", f: "🇻🇳" }, { n: "Yemen", c: "+967", f: "🇾🇪" }, { n: "Zambia", c: "+260", f: "🇿🇲" },
    { n: "Zimbabwe", c: "+263", f: "🇿🇼" }
].sort((a, b) => a.n.localeCompare(b.n));

let userDataCache = null;

requireAuth((user) => {
    populateCountrySelector();
    listenUserData((data) => {
        if (data) { userDataCache = data; populateFields(); }
    });
});

function populateCountrySelector() {
    const selector = document.getElementById('countryCodeSelect');
    selector.innerHTML = countryCodes.map(item =>
        `<option value="${item.c}">${item.f} ${item.c}</option>`
    ).join('');
}

function populateFields() {
    if (!userDataCache) return;
    const realNameInput = document.getElementById('realName');
    const phoneInput = document.getElementById('phoneNumber');
    const codeSelect = document.getElementById('countryCodeSelect');
    const walletAddrInput = document.getElementById('walletAddress');
    const withdrawPasswordInput = document.getElementById('withdrawPassword');
    const submitBtn = document.getElementById('submitBtn');

    realNameInput.value = userDataCache.realName || userDataCache.fullName || '';

    // Handle existing phone number split
    if (userDataCache.phoneNumber) {
        const parts = userDataCache.phoneNumber.split(' ');
        if (parts.length > 1) {
            codeSelect.value = parts[0];
            phoneInput.value = parts.slice(1).join(' ');
        } else {
            phoneInput.value = userDataCache.phoneNumber;
        }
    }

    if (userDataCache.walletAddress) {
        walletAddrInput.value = userDataCache.walletAddress;
        realNameInput.disabled = true;
        phoneInput.disabled = true;
        codeSelect.disabled = true;
        walletAddrInput.disabled = true;
        if (withdrawPasswordInput) {
            withdrawPasswordInput.value = '********';
            withdrawPasswordInput.disabled = true;
        }
        submitBtn.textContent = 'Please contact admin for update';
        submitBtn.classList.remove('active'); submitBtn.disabled = true;
    } else {
        submitBtn.textContent = 'Submit';
        submitBtn.classList.add('active'); submitBtn.disabled = false;
    }
}

document.getElementById('submitBtn').addEventListener('click', async () => {
    if (!userDataCache || userDataCache.walletAddress) return;
    const realName = document.getElementById('realName').value.trim();
    const countryCode = document.getElementById('countryCodeSelect').value;
    const phoneNum = document.getElementById('phoneNumber').value.trim();
    const walletAddress = document.getElementById('walletAddress').value.trim();
    const withdrawPasswordCheck = document.getElementById('withdrawPassword');
    const withdrawPassword = withdrawPasswordCheck ? withdrawPasswordCheck.value.trim() : '';
    const submitBtn = document.getElementById('submitBtn');

    if (!realName || !phoneNum || !walletAddress || !withdrawPassword) { showCustomAlert('Please fill in all fields.'); return; }
    if (withdrawPassword.length < 6) { showCustomAlert('Fund password must be at least 6 characters.'); return; }

    const phoneNumber = `${countryCode} ${phoneNum}`;

    try {
        submitBtn.textContent = 'Binding...'; submitBtn.disabled = true;
        await updateUserData({ realName, phoneNumber, walletAddress, withdrawPassword, walletType: 'trc20' });
        showCustomAlert('Wallet address bound successfully!', () => { window.location.href = '/profile'; });
    } catch (error) {
        showCustomAlert('Error binding wallet: ' + error.message);
        submitBtn.textContent = 'Submit'; submitBtn.disabled = false;
    }
});


