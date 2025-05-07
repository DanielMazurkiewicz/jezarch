import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '@/lib/api';
// Correct the import path assuming backend/src is sibling to frontend/src
// UserRole now includes 'employee' and 'user', User now includes preferredLanguage
import type { UserCredentials, UserRole, SupportedLanguage } from '../../../backend/src/functionalities/user/models';
import { toast } from "sonner"; // Import toast

interface UserState {
    userId: number;
    login: string;
    role: UserRole | null;
    preferredLanguage: SupportedLanguage;
}

interface AuthState {
  token: string | null;
  user: UserState | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextProps extends AuthState {
  login: (credentials: UserCredentials) => Promise<boolean>; // Return boolean for success
  logout: () => Promise<void>;
  register: (credentials: UserCredentials) => Promise<boolean>; // Return boolean for success
  clearError: () => void;
  // --- NEW: Function to update user state in context (e.g., after admin changes language) ---
  updateContextUser: (updatedUser: Partial<UserState>) => void;
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
    const storedUserIdStr = localStorage.getItem('authUserId');
    const storedPreferredLanguage = localStorage.getItem('authPreferredLanguage') as SupportedLanguage | null;

    console.log("AuthContext: Initial load check. Token:", !!storedToken, "Login:", storedUserLogin, "Role:", storedUserRole, "UserID Str:", storedUserIdStr, "Lang:", storedPreferredLanguage);

    if (storedToken && storedUserLogin && storedUserIdStr) {
        const parsedUserId = parseInt(storedUserIdStr, 10);
        // Ensure language defaults to 'en' if not found or invalid in storage
        const language: SupportedLanguage = storedPreferredLanguage && ['en'].includes(storedPreferredLanguage) ? storedPreferredLanguage : 'en';

        const validRoles: (UserRole | null)[] = ['admin', 'employee', 'user', null];
        if (validRoles.includes(storedUserRole) && !isNaN(parsedUserId)) {
            console.log("AuthContext: Initial load - Setting state from storage.");
            setState({
                token: storedToken,
                user: {
                    login: storedUserLogin,
                    role: storedUserRole,
                    userId: parsedUserId,
                    preferredLanguage: language, // Use determined language
                },
                isAuthenticated: true,
                isLoading: false,
                error: null,
             });
        } else {
            console.error("AuthContext: Initial load - Invalid UserID or Role found in storage. Role:", storedUserRole, "UserID:", parsedUserId);
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUserLogin');
            localStorage.removeItem('authUserRole');
            localStorage.removeItem('authUserId');
            localStorage.removeItem('authPreferredLanguage');
            setState(prevState => ({ ...prevState, isLoading: false }));
        }
    } else {
        console.log("AuthContext: Initial load - Missing token, login, or userId.");
        localStorage.removeItem('authPreferredLanguage'); // Clean up language if other parts missing
        setState(prevState => ({ ...prevState, isLoading: false }));
    }
  }, []);


  const login = useCallback(async (credentials: UserCredentials): Promise<boolean> => {
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));
    try {
      const response = await api.login(credentials);
      const { token, role, login, userId, preferredLanguage } = response;
      console.log("AuthContext: Login API response - Token:", !!token, "Role:", role, "Login:", login, "UserID:", userId, "Lang:", preferredLanguage);

      if (!token || !login || userId === undefined || typeof userId !== 'number' || isNaN(userId)) {
         throw new Error("Login response missing token, login name, or valid User ID.");
      }
      const validRoles: (UserRole | null)[] = ['admin', 'employee', 'user', null];
      if (!validRoles.includes(role)) {
          console.warn("AuthContext: Login received invalid role:", role);
           throw new Error("Received invalid user role during login.");
      }
      const langToStore: SupportedLanguage = preferredLanguage && ['en'].includes(preferredLanguage) ? preferredLanguage : 'en';


      localStorage.setItem('authToken', token);
      localStorage.setItem('authUserLogin', login);
      localStorage.setItem('authUserRole', role);
      localStorage.setItem('authUserId', String(userId));
      localStorage.setItem('authPreferredLanguage', langToStore);

      console.log("AuthContext: Setting state after successful login with UserID:", userId, "Lang:", langToStore);
      setState({
        token,
        user: { login, role, userId, preferredLanguage: langToStore },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      toast.success(`Welcome back, ${login}!`);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      console.error("AuthContext: Login failed -", errorMessage);
       localStorage.removeItem('authToken');
       localStorage.removeItem('authUserLogin');
       localStorage.removeItem('authUserRole');
       localStorage.removeItem('authUserId');
       localStorage.removeItem('authPreferredLanguage');
      setState(prevState => ({
        ...prevState,
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
      return false;
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
     localStorage.removeItem('authPreferredLanguage');
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
      const newUser = await api.register(credentials);
      setState(prevState => ({ ...prevState, isLoading: false, error: null }));
      toast.success(`Registration successful for ${newUser.login}! Please log in.`);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed';
       console.error("AuthContext: Registration failed -", errorMessage);
      setState(prevState => ({
        ...prevState,
        isLoading: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
      setState(prevState => ({ ...prevState, error: null }));
  }, []);

  // --- NEW: Function to update user state in context ---
  const updateContextUser = useCallback((updatedUserPartial: Partial<UserState>) => {
    setState(prevState => {
        if (prevState.user) {
            const newUserState = { ...prevState.user, ...updatedUserPartial };
             // Update localStorage if relevant fields changed
            if (updatedUserPartial.preferredLanguage && updatedUserPartial.preferredLanguage !== prevState.user.preferredLanguage) {
                localStorage.setItem('authPreferredLanguage', updatedUserPartial.preferredLanguage);
            }
            if (updatedUserPartial.role !== undefined && updatedUserPartial.role !== prevState.user.role) {
                localStorage.setItem('authUserRole', updatedUserPartial.role || ''); // Store empty string for null
            }
            // Login and userId are not expected to change this way
            return { ...prevState, user: newUserState };
        }
        return prevState;
    });
  }, []);
  // --- END NEW ---


  return (
    <AuthContext.Provider value={{ ...state, login, logout, register, clearError, updateContextUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;