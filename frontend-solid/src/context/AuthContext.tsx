import { createContext, useContext, createSignal, createEffect, Accessor, Setter, Component, JSX } from 'solid-js';
import { createStore, SetStoreFunction, Store } from 'solid-js/store';
import api from '@/lib/api';
import type { UserCredentials, UserRole } from '../../../backend/src/functionalities/user/models';
// Notifications handled via NotificationContext

interface AuthState {
    token: string | null;
    user: { userId?: number; login: string; role: UserRole | null } | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

interface AuthActions {
    login: (credentials: UserCredentials) => Promise<boolean>;
    logout: () => Promise<void>;
    register: (credentials: UserCredentials) => Promise<boolean>;
    clearError: () => void;
    _initStateFromStorage: () => void; // Internal action
}

// Combine state and actions for the context value
type AuthContextType = [Store<AuthState>, AuthActions];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: true, // Start true until checked
    error: null,
};

export const AuthProvider: Component<{ children: JSX.Element }> = (props) => {
    const [state, setState] = createStore<AuthState>(initialState);

    const _initStateFromStorage = () => {
        console.log("AuthContext: Checking local storage...");
        try {
            const storedToken = localStorage.getItem('authToken');
            const storedUserLogin = localStorage.getItem('authUserLogin');
            const storedUserRole = localStorage.getItem('authUserRole') as UserRole | null;
            const storedUserIdStr = localStorage.getItem('authUserId');

            if (storedToken && storedUserLogin) {
                const parsedUserId = storedUserIdStr ? parseInt(storedUserIdStr, 10) : undefined;
                // Role validation
                const isValidRole = storedUserRole === 'admin' || storedUserRole === 'regular_user' || storedUserRole === null; // Allow null role
                // User ID validation (must be number or undefined, not NaN)
                const isValidUserId = parsedUserId === undefined || !isNaN(parsedUserId);

                if (isValidRole && isValidUserId) {
                    console.log("AuthContext: Restoring state from storage:", { token: !!storedToken, login: storedUserLogin, role: storedUserRole, userId: parsedUserId });
                    setState({
                        token: storedToken,
                        user: {
                            login: storedUserLogin,
                            role: storedUserRole,
                            userId: parsedUserId,
                        },
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                } else {
                     console.warn("AuthContext: Invalid data found in storage. Clearing.", { role: storedUserRole, userIdStr: storedUserIdStr });
                     localStorage.removeItem('authToken');
                     localStorage.removeItem('authUserLogin');
                     localStorage.removeItem('authUserRole');
                     localStorage.removeItem('authUserId');
                     setState({ ...initialState, isLoading: false }); // Reset state but keep loading false
                }
            } else {
                 console.log("AuthContext: No valid auth data in storage.");
                 setState({ ...initialState, isLoading: false }); // Reset state but keep loading false
            }
        } catch (error) {
             console.error("AuthContext: Error reading from localStorage:", error);
             // Clear potentially corrupted storage
             localStorage.removeItem('authToken');
             localStorage.removeItem('authUserLogin');
             localStorage.removeItem('authUserRole');
             localStorage.removeItem('authUserId');
             setState({ ...initialState, isLoading: false, error: "Failed to initialize authentication state." }); // Reset state
        }
    };

    // Run initialization once on component mount
    _initStateFromStorage(); // Direct call instead of useEffect

    const login = async (credentials: UserCredentials): Promise<boolean> => {
        setState({ isLoading: true, error: null });
        try {
            // The API call now correctly expects the object structure defined in the type argument.
            // fetchApi already handles JSON parsing and error checking.
            const response = await api.login(credentials);

            // Log the response received from fetchApi (should be parsed object now)
            console.log("AuthContext: Parsed Login Response from api.login:", response);

            // Destructure AFTER validation, assuming fetchApi throws on invalid response
            const { token, role, login, userId } = response;

            // Additional paranoia checks (though fetchApi should catch most issues)
            if (!token || !login) {
                 console.error("AuthContext: Missing 'token' or 'login' after api.login:", response);
                 throw new Error("Login response missing token or login.");
            }
             if (userId !== undefined && (typeof userId !== 'number' || isNaN(userId))) {
                 console.error("AuthContext: Invalid 'userId' after api.login:", response);
                 throw new Error("Invalid userId received.");
             }
             if (role && !(role === 'admin' || role === 'regular_user')) {
                 console.warn("AuthContext: Invalid role received after api.login:", role);
                 // Optionally treat as null or regular_user instead of throwing
             }

            localStorage.setItem('authToken', token);
            localStorage.setItem('authUserLogin', login);
            if (role) localStorage.setItem('authUserRole', role); else localStorage.removeItem('authUserRole');
            if (userId !== undefined) localStorage.setItem('authUserId', String(userId)); else localStorage.removeItem('authUserId');

            setState({
                token,
                user: { login, role: role || null, userId }, // Use role or default to null
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });
            console.log(`Login successful: ${login}`);
            return true;
        } catch (err: any) {
            // Use the error message from ApiError if available
            const errorMessage = err instanceof Error ? err.message : 'Login failed';
            console.error("AuthContext: Login failed -", errorMessage, err);
            setState({ token: null, user: null, isAuthenticated: false, isLoading: false, error: errorMessage });
            console.error(`Login error: ${errorMessage}`);
            return false;
        }
    };

    const logout = async (): Promise<void> => {
        const currentToken = state.token;
        console.log("AuthContext: logout called.");
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUserLogin');
        localStorage.removeItem('authUserRole');
        localStorage.removeItem('authUserId');
        setState({ ...initialState, isLoading: false });
        console.log("Logged out locally.");

        if (currentToken) {
            try {
                 console.log("AuthContext: Calling logout API.");
                 await api.logout(currentToken);
            } catch (err: any) {
                 console.error('AuthContext: Logout API call failed:', err);
                 console.warn("Logged out locally, but failed to notify the server.");
            }
        }
    };

    const register = async (credentials: UserCredentials): Promise<boolean> => {
        setState({ isLoading: true, error: null });
        try {
            await api.register(credentials);
            setState({ isLoading: false, error: null });
            console.log("Registration successful! Please log in.");
            return true;
        } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : 'Registration failed';
            console.error("AuthContext: Registration failed -", errorMessage);
            setState({ isLoading: false, error: errorMessage });
             console.error(`Registration error: ${errorMessage}`);
            return false;
        }
    };

    const clearError = () => {
        setState({ error: null });
    };

    const actions: AuthActions = {
        login,
        logout,
        register,
        clearError,
        _initStateFromStorage
    };

    const contextValue: AuthContextType = [state, actions];

    return (
        <AuthContext.Provider value={contextValue}>
            {props.children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the Auth context
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}