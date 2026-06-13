function changeLanguage(langCode) {
    // 1. Try to set the cookie for persistence across pages
    const domain = window.location.hostname;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${domain}`;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${domain}`;
    document.cookie = `googtrans=/en/${langCode}; path=/`;

    // 2. Try to find the Google Translate combo box and trigger it
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
        combo.value = langCode;
        combo.dispatchEvent(new Event('change'));
    }

    // 3. Optional: Brief delay and redirect back to profile to show it worked
    setTimeout(() => {
        window.location.href = '/profile';
    }, 500);
}
