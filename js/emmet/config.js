define(['jscookie', 'emmet/utils'], function(jsCookie, emmetUtils) {
    const CONSENT_COOKIE_KEY = "emmet-consent";
    const SETTINGS_COOKIE_KEY = "emmet-settings";
    const COOKIE_EXPIRY_DAYS = 365;

    var defaults = {};

    var liveCookieManager = {
        get: key => {
            var cookieContent = jsCookie.get(key);
            if (cookieContent === undefined) {
                return undefined;
            }
            // Refresh cookie
            jsCookie.set(key, cookieContent, {expires: COOKIE_EXPIRY_DAYS});
            return JSON.parse(atob(cookieContent));
        },
        set: (key, value) => jsCookie.set(key, btoa(JSON.stringify(value)), {expires: COOKIE_EXPIRY_DAYS}),
        exists: key => jsCookie.get(key) === undefined,
    };
    var noopCookieManager = {
        get: key => undefined,
        set: (key, value) => {},
        exists: key => false,
    }

    // Load consent
    var hasConsented = liveCookieManager.get(CONSENT_COOKIE_KEY);
    var cookieManager = hasConsented ? liveCookieManager : noopCookieManager;

    // Load settings
    var settings = cookieManager.get(SETTINGS_COOKIE_KEY) || {};

    return {
        configureSettings: function(newSettings) {
            for (let [key, value] of Object.entries(newSettings)) {
                defaults[key] = value;
            }
        },
        hasConsented: () => hasConsented,
        grantConsent: function() {
            hasConsented = true;
            liveCookieManager.set(CONSENT_COOKIE_KEY, true);
            liveCookieManager.set(SETTINGS_COOKIE_KEY, settings);
            cookieManager = liveCookieManager;
        },
        withdrawConsent: function() {
            hasConsented = false;
            liveCookieManager.set(CONSENT_COOKIE_KEY, false);
            jsCookie.remove(SETTINGS_COOKIE_KEY);
            cookieManager = noopCookieManager;
        },
        get: function(key) {
            if (key in settings) {
                return settings[key];
            } else if (key in defaults) {
                return defaults[key];
            } else {
                return undefined;
            }
        },
        set: function(key, value) {
            settings[key] = value;
            cookieManager.set(SETTINGS_COOKIE_KEY, settings);
        },
        cookieExists: function() {
            return cookieManager.exists(SETTINGS_COOKIE_KEY);
        },
    };
});