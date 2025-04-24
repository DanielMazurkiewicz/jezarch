import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '@/lib/api';
// Correct the import path assuming backend/src is sibling to frontend/src
import type { UserCredentials, UserRole } from '../../../backend/src/functionalities/user/models';
import { toast } from "sonner"; // Import toast

interface AuthState {
  token: string | null;
  user: { userId?: number; login: string; role: UserRole | null } | null; // Added userId potentially
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextProps extends AuthState {
  login: (credentials: UserCredentials) => Promise<boolean>; // Return boolean for success
  logout: () => Promise<void>;
  register: (credentials: UserCredentials) => Promise<boolean>; // Return boolean for success
  clearError: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start loading to check localStorage
  error: null,
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);

  // Check localStorage on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUserLogin = localStorage.getItem('authUserLogin');
    const storedUserRole = localStorage.getItem('authUserRole') as UserRole | null;
    const storedUserIdStr = localStorage.getItem('authUserId'); // Get User ID if stored

    console.log("AuthContext: Initial load check. Token:", !!storedToken, "Login:", storedUserLogin, "Role:", storedUserRole, "UserID Str:", storedUserIdStr);

    if (storedToken && storedUserLogin) {
        const parsedUserId = storedUserIdStr ? parseInt(storedUserIdStr, 10) : undefined;
        console.log("AuthContext: Initial load - Parsed UserID:", parsedUserId);

        if (storedUserRole === 'admin' || storedUserRole === 'regular_user') {
             // Check if parsedUserId is a valid number or undefined
             if (parsedUserId === undefined || !isNaN(parsedUserId)) {
                 console.log("AuthContext: Initial load - Setting state from storage.");
                 setState({
                    token: storedToken,
                    user: {
                        login: storedUserLogin,
                        role: storedUserRole,
                        userId: parsedUserId // Use the parsed value
                    },
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                 });
             } else {
                 console.error("AuthContext: Initial load - Invalid UserID found in storage:", storedUserIdStr);
                 // Clear invalid stored data
                 localStorage.removeItem('authToken');
                 localStorage.removeItem('authUserLogin');
                 localStorage.removeItem('authUserRole');
                 localStorage.removeItem('authUserId');
                 setState(prevState => ({ ...prevState, isLoading: false }));
             }
        } else {
            console.warn("AuthContext: Initial load - Invalid Role found in storage:", storedUserRole);
            // Clear invalid stored data
             localStorage.removeItem('authToken');
             localStorage.removeItem('authUserLogin');
             localStorage.removeItem('authUserRole');
             localStorage.removeItem('authUserId');
             setState(prevState => ({ ...prevState, isLoading: false }));
        }
    } else {
        console.log("AuthContext: Initial load - No token or login found.");
        setState(prevState => ({ ...prevState, isLoading: false }));
    }
  }, []);


  const login = useCallback(async (credentials: UserCredentials): Promise<boolean> => {
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));
    try {
      // Assuming backend login might return userId along with token, role, login
      const response = await api.login(credentials);
      const { token, role, login, userId } = response; // Destructure directly
      console.log("AuthContext: Login API response - Token:", !!token, "Role:", role, "Login:", login, "UserID:", userId); // Log received userId

      if (!token || !login) {
         throw new Error("Login response missing token or login name.");
      }
      // Basic validation for role if present
      if (role && !(role === 'admin' || role === 'regular_user')) {
          console.warn("AuthContext: Login received invalid role:", role);
          // Decide how to handle: reject login, default role, or ignore?
          // For now, let's proceed but log the warning. The context state will reflect the potentially null/invalid role.
      }
       // Basic validation for userId if present
      if (userId !== undefined && (typeof userId !== 'number' || isNaN(userId))) {
          console.error("AuthContext: Login received invalid userId type:", userId);
          throw new Error("Received invalid user ID format during login.");
      }

      localStorage.setItem('authToken', token);
      localStorage.setItem('authUserLogin', login);
      if (role) localStorage.setItem('authUserRole', role); else localStorage.removeItem('authUserRole');
      if (userId !== undefined) localStorage.setItem('authUserId', String(userId)); else localStorage.removeItem('authUserId'); // Store userId if returned, remove if not

      console.log("AuthContext: Setting state after successful login with UserID:", userId);
      setState({
        token,
        user: { login, role: role || null, userId }, // Include userId in state, handle potentially null role
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      toast.success(`Welcome back, ${login}!`);
      return true; // Indicate success
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      console.error("AuthContext: Login failed -", errorMessage);
      setState(prevState => ({
        ...prevState,
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
      return false; // Indicate failure
    }
  }, []);

  const logout = useCallback(async () => {
    const currentToken = state.token;
    const currentLogin = state.user?.login;
    console.log("AuthContext: logout called.");

     localStorage.removeItem('authToken');
     localStorage.removeItem('authUserLogin');
     localStorage.removeItem('authUserRole');
     localStorage.removeItem('authUserId');
     setState({ ...initialState, isLoading: false });

     if (currentLogin) toast.info(`User ${currentLogin} logged out.`);
     else toast.info("Logged out.");

    try {
        if (currentToken) {
           console.log("AuthContext: Calling logout API.");
           await api.logout(currentToken);
        }
    } catch (err: any) {
      console.error('AuthContext: Logout API call failed:', err);
       toast.warning("Logged out locally, but failed to notify the server.");
    }
  }, [state.token, state.user?.login]);

  const register = useCallback(async (credentials: UserCredentials): Promise<boolean> => {
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));
    try {
      await api.register(credentials);
      setState(prevState => ({ ...prevState, isLoading: false, error: null }));
      toast.success("Registration successful! Please log in.");
      return true; // Indicate success
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed';
       console.error("AuthContext: Registration failed -", errorMessage);
      setState(prevState => ({
        ...prevState,
        isLoading: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
      return false; // Indicate failure
    }
  }, []);

  const clearError = useCallback(() => {
      setState(prevState => ({ ...prevState, error: null }));
  }, []);


  return (
    <AuthContext.Provider value={{ ...state, login, logout, register, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

// Export useAuth hook from here for convenience
export { useAuth } from '@/hooks/useAuth';