import api from './api';
import { showToast } from '../components/ui/toast-handler';
// Correctly import types from the backend models file
import type { User, UserCredentials, CreateUserInput } from '../../../backend/src/functionalities/user/models';

// Define event names as constants
export const AUTH_EVENTS = {
    AUTH_STATE_CHANGED: 'authStateChanged',
};

type AuthState = {
    token: string | null;
    user: Omit<User, "password"> | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isAdmin: boolean;
    error: string | null;
};

/**
 * Manages authentication state, token storage, and provides methods for login, logout, etc.
 * Emits 'authStateChanged' events when the authentication state changes.
 */
class AuthService extends EventTarget {
    private static readonly TOKEN_KEY = 'authToken';
    private static readonly USER_KEY = 'authUser';

    private _token: string | null = null;
    private _user: Omit<User, "password"> | null = null;
    private _isLoading: boolean = true;
    private _error: string | null = null;
    private _isAuthenticated: boolean = false;
    private _isAdmin: boolean = false;

    private checkTokenInterval: number | null = null;
    private initializationPromise: Promise<void> | null = null;

    constructor() {
        super();
        this._isLoading = true; // Start in loading state
        this.initializationPromise = this._initialize();
    }

    // --- Public Getters ---

    get token(): string | null { return this._token; }
    get user(): Omit<User, "password"> | null { return this._user; }
    get isAuthenticated(): boolean { return this._isAuthenticated; }
    get isLoading(): boolean { return this._isLoading; }
    get isAdmin(): boolean { return this._isAdmin; }
    get error(): string | null { return this._error; }

    // --- Public Methods ---

    /**
     * Ensure the service is initialized before accessing state in components.
     * Typically called once during application setup.
     */
    async ensureInitialized(): Promise<void> {
        if (!this.initializationPromise) {
            this.initializationPromise = this._initialize();
        }
        return this.initializationPromise;
    }

    /**
     * Performs login using user credentials.
     * Stores token and user data on success.
     * @param credentials - User login credentials.
     */
    async login(credentials: UserCredentials): Promise<void> {
        if (this._isLoading) {
             console.warn("Login attempt while already loading.");
             return; // Avoid concurrent logins
        }
        this._isLoading = true;
        this._error = null;
        this.dispatchStateChange(); // Notify start loading

        try {
            const { token, user } = await api.login(credentials);
            this._setSession(token, user);
            showToast("Login successful!", "success");
        } catch (err: any) {
            console.error("Login failed:", err);
            this._error = err.message || "Login failed";
            // Provide default message if error is null/undefined
            showToast(this._error || "Login failed", "error");
            this._clearSession(); // Clear any partial state on login failure
        } finally {
            this._isLoading = false;
            this.dispatchStateChange(); // Notify end loading (success or failure)
        }
    }

    /**
     * Performs user registration.
     * Stores token and user data on success (logs the user in).
     * @param userData - User registration details.
     */
    async register(userData: CreateUserInput): Promise<void> {
         if (this._isLoading) {
             console.warn("Register attempt while already loading.");
             return; // Avoid concurrent actions
         }
         this._isLoading = true;
         this._error = null;
         this.dispatchStateChange();

         try {
             // Assuming registration doesn't auto-login.
             // If it should auto-login, the API needs to return a token.
             // For now, let's assume registration only creates the user.
             // const newUser = await api.register(userData);
             // showToast(`User "${newUser.login}" registered successfully. Please log in.`, "success");
             // --- OR --- If registration API *does* return a token (preferred):
             await api.register(userData); // Wait for registration
             showToast(`User "${userData.login}" registered successfully. Logging in...`, "info");
             // Now attempt login automatically
             await this.login({ login: userData.login, password: userData.password });
             // Login handles setting session, final loading state, and dispatching

         } catch (err: any) {
             console.error("Registration failed:", err);
             this._error = err.message || "Registration failed";
              // Provide default message if error is null/undefined
             showToast(this._error || "Registration failed", "error");
              this._isLoading = false; // Set loading false before dispatch
             this.dispatchStateChange(); // Dispatch final state after error
         }
         // Note: If login is called, it handles the final _isLoading=false and dispatch
    }

    /**
     * Logs the user out, clearing token and user data.
     */
    logout(): void {
        this._clearSession();
        showToast("Logout successful.", "info");
        this.dispatchStateChange();
    }

    /**
     * Refreshes the current user data from the API using the stored token.
     * Useful for ensuring user data is up-to-date.
     */
    async refreshUser(): Promise<void> {
         if (!this._token || this._isLoading) {
             console.log("Skipping user refresh:", { hasToken: !!this._token, isLoading: this._isLoading });
             return;
         }
         this._isLoading = true;
         this._error = null;
         // Don't dispatch here, wait for result

         try {
             const user = await api.getCurrentUser();
             this._setUser(user);
             console.log("User data refreshed successfully.");
         } catch (err: any) {
             console.error("Failed to refresh user data:", err);
             // If refresh fails (e.g., token expired), log the user out
             if (err.status === 401 || err.status === 403) {
                 console.warn("Token likely expired or invalid during refresh. Logging out.");
                 this.logout(); // Logout handles state changes
                 return; // Exit early as logout handles dispatch
             } else {
                 this._error = err.message || "Failed to refresh user data";
                  // Provide default message if error is null/undefined
                 showToast(this._error || "Failed to refresh user data", "warning");
             }
         } finally {
            // Only set isLoading false and dispatch if logout didn't happen
            if (this._token) { // Check if token still exists (didn't get logged out)
                this._isLoading = false;
                this.dispatchStateChange();
            }
         }
    }


    // --- Private Helpers ---

    private async _initialize(): Promise<void> {
        // console.log("AuthService Initializing...");
        this._loadSession(); // Load token/user from storage first
        // console.log("Session loaded:", { token: this._token ? 'yes' : 'no', user: !!this._user });

        if (this._token) {
            // If token exists, try to validate it by fetching user data
            await this.refreshUser(); // refreshUser handles loading state and potential logout
        } else {
            // No token, definitely not authenticated
            this._isLoading = false; // Initialization complete
            this.dispatchStateChange();
        }
        // console.log("AuthService Initialization Complete.");

        // Start periodic token check if needed (e.g., for expiration)
        // this.startTokenCheckInterval();
    }

    /** Loads token and user data from localStorage. */
    private _loadSession(): void {
        try {
            const token = localStorage.getItem(AuthService.TOKEN_KEY);
            const userJson = localStorage.getItem(AuthService.USER_KEY);

            if (token) {
                this._token = token;
                if (userJson) {
                    this._user = JSON.parse(userJson);
                }
                this._updateAuthState(); // Update flags based on loaded data
            } else {
                 this._clearSession(); // Ensure clean state if no token
            }
        } catch (e) {
            console.error("Failed to load session from localStorage:", e);
            this._clearSession(); // Clear potentially corrupted state
        }
    }

    /** Sets token and user data, updates state, and saves to localStorage. */
    private _setSession(token: string, user: Omit<User, "password">): void {
        this._token = token;
        this._user = user;
        this._error = null;
        this._updateAuthState(); // Update derived state (isAuthenticated, isAdmin)
        try {
            localStorage.setItem(AuthService.TOKEN_KEY, token);
            localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
        } catch (e) {
            console.error("Failed to save session to localStorage:", e);
            showToast("Could not save session locally.", "warning");
        }
    }

    /** Updates just the user data part of the session. */
    private _setUser(user: Omit<User, "password">): void {
         this._user = user;
         this._updateAuthState();
         try {
             localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
         } catch (e) {
             console.error("Failed to save updated user to localStorage:", e);
         }
    }

    /** Clears token, user data, and state flags, removing from localStorage. */
    private _clearSession(): void {
        this._token = null;
        this._user = null;
        this._error = null; // Clear errors on logout
        this._updateAuthState(); // Update derived state
        try {
            localStorage.removeItem(AuthService.TOKEN_KEY);
            localStorage.removeItem(AuthService.USER_KEY);
        } catch (e) {
            console.error("Failed to clear session from localStorage:", e);
        }
    }

    /** Updates derived authentication states based on token and user data. */
    private _updateAuthState(): void {
        this._isAuthenticated = !!this._token && !!this._user;
        this._isAdmin = !!this._user && this._user.role === 'admin';
    }

    /** Dispatches the 'authStateChanged' event with the current state. */
    private dispatchStateChange(): void {
        const state: AuthState = {
            token: this._token,
            user: this._user,
            isAuthenticated: this.isAuthenticated,
            isLoading: this._isLoading,
            isAdmin: this.isAdmin,
            error: this._error,
        };
        // console.log("Dispatching authStateChanged:", state);
        this.dispatchEvent(new CustomEvent(AUTH_EVENTS.AUTH_STATE_CHANGED, { detail: state }));
    }

    // Optional: Periodic check for token validity/expiration
    private startTokenCheckInterval(intervalMs = 60 * 1000 * 5): void { // Check every 5 minutes
        if (this.checkTokenInterval !== null) {
            clearInterval(this.checkTokenInterval);
        }
        this.checkTokenInterval = window.setInterval(() => {
            // Basic check: If we have a token but are not marked as authenticated (e.g., after failed refresh)
            // or if we simply want to periodically re-validate.
            if (this._token && this._isAuthenticated) {
                // console.log("Periodic token check: Refreshing user data...");
                // this.refreshUser(); // Refresh to implicitly check token validity
            } else if (this._token && !this._isAuthenticated && !this._isLoading) {
                 // Might indicate an issue, attempt refresh or logout
                 console.warn("Periodic token check: Token exists but not authenticated. Attempting refresh.");
                 this.refreshUser();
            }
        }, intervalMs);
    }
}

// Export a singleton instance
export const authService = new AuthService();