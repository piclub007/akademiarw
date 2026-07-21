// src/js/security.js
import { auth } from './firebase-config.js';

class SecurityManager {
    constructor() {
        this.maxInputLength = 500;
        this.maxRequestsPerMinute = 30;
        this.rateLimitMap = new Map();
        this.csrfToken = null;
    }

    init() {
        this.generateCSRFToken();
        this.setupEventListeners();
        this.preventRightClickOnSensitiveElements();
        console.log('🔒 Security initialized');
    }

    generateCSRFToken() {
        this.csrfToken = crypto.randomUUID();
        sessionStorage.setItem('csrfToken', this.csrfToken);
        
        // Add to all fetch requests
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            if (args[1]) {
                args[1].headers = {
                    ...args[1].headers,
                    'X-CSRF-Token': this.csrfToken
                };
            } else {
                args[1] = {
                    headers: {
                        'X-CSRF-Token': this.csrfToken
                    }
                };
            }
            return originalFetch(...args);
        };
    }

    setupEventListeners() {
        // Sanitize all inputs on the fly
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                e.target.value = this.sanitizeInput(e.target.value);
            }
        }, true);

        // Prevent XSS in URL parameters
        window.addEventListener('popstate', () => {
            this.sanitizeURLParams();
        });
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .slice(0, this.maxInputLength) // Limit length
            .replace(/[<>]/g, '') // Remove HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }

    sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }

    sanitizeURLParams() {
        const params = new URLSearchParams(window.location.search);
        let hasInvalidParams = false;

        params.forEach((value, key) => {
            const sanitized = this.sanitizeInput(value);
            if (sanitized !== value) {
                params.set(key, sanitized);
                hasInvalidParams = true;
            }
        });

        if (hasInvalidParams) {
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState({}, '', newUrl);
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email) && email.length <= 254;
    }

    validatePassword(password) {
        return password.length >= 8 && 
               password.length <= 128 &&
               /[A-Z]/.test(password) &&  // Has uppercase
               /[a-z]/.test(password) &&  // Has lowercase
               /[0-9]/.test(password);    // Has number
    }

    checkRateLimit(action, userId = 'anonymous') {
        const key = `${userId}_${action}`;
        const now = Date.now();
        
        if (!this.rateLimitMap.has(key)) {
            this.rateLimitMap.set(key, []);
        }

        const timestamps = this.rateLimitMap.get(key);
        const recent = timestamps.filter(t => now - t < 60000); // Last minute

        if (recent.length >= this.maxRequestsPerMinute) {
            return false;
        }

        recent.push(now);
        this.rateLimitMap.set(key, recent);
        return true;
    }

    preventRightClickOnSensitiveElements() {
        document.addEventListener('contextmenu', (e) => {
            if (e.target.matches('[data-sensitive], .code-editor, .auth-form')) {
                e.preventDefault();
                return false;
            }
        });
    }

    // Check if user has valid session
    async validateSession() {
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(!!user && user.emailVerified);
            });
        });
    }

    // Secure redirect
    secureRedirect(url) {
        const allowedDomains = [
            window.location.origin,
            'https://akademiarw-40450.firebaseapp.com'
        ];

        try {
            const urlObj = new URL(url, window.location.origin);
            if (allowedDomains.some(domain => urlObj.origin === domain)) {
                window.location.href = urlObj.href;
            } else {
                console.error('Blocked redirect to untrusted domain:', url);
            }
        } catch (e) {
            console.error('Invalid URL:', url);
        }
    }
}

const security = new SecurityManager();
export default security;
