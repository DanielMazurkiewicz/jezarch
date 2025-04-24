import van, { State } from 'vanjs-core';
import api from '@/lib/api';
import { navigate } from '@/lib/router'; // Assuming router is in lib
import type { UserCredentials, UserRole } from '../../../backend/src/functionalities/user/models';

// --- Types ---
interface User {
  userId?: number;
  login: string;
  role: UserRole | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// --- Initial State ---
const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as true to check storage
  error: null,
};

// --- VanJS States ---
// We create individual states for each piece of the AuthState
export const authToken = van.state<string | null>(initialState.token);
export const authUser = van.state<User | null>(initialState.user);
export const authIsAuthenticated = van.state<boolean>(initialState.isAuthenticated);
export const authIsLoading = van.state<boolean>(initialState.isLoading);
export const authError = van.state<string | null>(initialState.error);

// --- Actions ---
const setLoading = (loading: boolean) => authIsLoading.val = loading;
const setError = (error: string | null) => authError.val = error;
const clearError = () => authError.val = null;

const setUserAndToken = (token: string | null, user: User | null) => {
    authToken.val = token;
    authUser.val = user;
    authIsAuthenticated.val = !!token && !!user;

    // Update localStorage
    if (token && user) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('authUserLogin', user.login);
        if (user.role) localStorage.setItem('authUserRole', user.role);
        else localStorage.removeItem('authUserRole');
        if (user.userId !== undefined) localStorage.setItem('authUserId', String(user.userId));
        else localStorage.removeItem('authUserId');
        console.log("AuthStore: Stored UserID:", user.userId);
    } else {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUserLogin');
        localStorage.removeItem('authUserRole');
        localStorage.removeItem('authUserId');
    }
};

const login = async (credentials: UserCredentials): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.login(credentials);
      const { token, role, login, userId } = response;
      console.log("AuthStore: Login Response UserID:", userId);

      if (!token || !login) throw new Error("Login response missing token or login name.");
      if (userId !== undefined && (typeof userId !== 'number' || isNaN(userId))) {
           throw new Error("Received invalid user ID format during login.");
      }

      const user: User = { login, role: role || null, userId };
      setUserAndToken(token, user);
      // toast.success(`Welcome back, ${login}!`); // Toast handled in component/App
      setLoading(false);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      console.error("AuthStore: Login failed -", errorMessage);
      setUserAndToken(null, null); // Clear state on error
      setError(errorMessage);
      // toast.error(errorMessage); // Toast handled in component/App
      setLoading(false);
      return false;
    }
};

const logout = async () => {
    const currentToken = authToken.val;
    const currentLogin = authUser.val?.login;

    setUserAndToken(null, null); // Clear state and localStorage immediately
    setLoading(false); // Ensure loading is false after clearing state
    setError(null);

    // Navigate to login after clearing state
    navigate('/login', { replace: true });

    // Try to inform backend (best effort)
    if (currentToken) {
        try {
           await api.logout(currentToken);
           console.log("AuthStore: Logout API call successful.");
        } catch (err: any) {
           console.error('AuthStore: Logout API call failed:', err);
           // toast.warning("Logged out locally, but failed to notify the server."); // Toast handled elsewhere
        }
    }
    // Toast handled elsewhere
    // if (currentLogin) toast.info(`User ${currentLogin} logged out.`);
    // else toast.info("Logged out.");
};

const register = async (credentials: UserCredentials): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await api.register(credentials);
      // toast.success("Registration successful! Please log in."); // Toast handled elsewhere
      setLoading(false);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed';
      console.error("AuthStore: Registration failed -", errorMessage);
      setError(errorMessage);
      // toast.error(errorMessage); // Toast handled elsewhere
      setLoading(false);
      return false;
    }
};

// --- Initialization ---
const initializeAuth = () => {
  try {
    const storedToken = localStorage.getItem('authToken');
    const storedUserLogin = localStorage.getItem('authUserLogin');
    const storedUserRole = localStorage.getItem('authUserRole') as UserRole | null;
    const storedUserIdStr = localStorage.getItem('authUserId');
    const parsedUserId = storedUserIdStr ? parseInt(storedUserIdStr, 10) : undefined;

    console.log("AuthStore Init: Token?", !!storedToken, "Login:", storedUserLogin, "Role:", storedUserRole, "UserIDStr:", storedUserIdStr, "ParsedID:", parsedUserId);

    if (storedToken && storedUserLogin && (storedUserRole === 'admin' || storedUserRole === 'regular_user') && (parsedUserId === undefined || !isNaN(parsedUserId)) ) {
       setUserAndToken(storedToken, { login: storedUserLogin, role: storedUserRole, userId: parsedUserId });
       console.log("AuthStore Init: Restored session.");
    } else {
      // Clear potentially inconsistent storage
      setUserAndToken(null, null);
      console.log("AuthStore Init: No valid session found in storage.");
    }
  } catch (e) {
    console.error("AuthStore Init: Error reading from localStorage", e);
    setUserAndToken(null, null);
  } finally {
    setLoading(false); // Mark loading as complete
  }
};

initializeAuth(); // Check storage on script load

// --- Export Store Interface ---
export const authStore = {
  // States (readonly access recommended outside)
  token: authToken,
  user: authUser,
  isAuthenticated: authIsAuthenticated,
  isLoading: authIsLoading,
  error: authError,

  // Actions
  login,
  logout,
  register,
  clearError,
};