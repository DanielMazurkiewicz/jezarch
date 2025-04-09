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

    if (storedToken && storedUserLogin) {
        // Basic validation - might want to add a checkToken API call here for robustness
        if (storedUserRole === 'admin' || storedUserRole === 'regular_user') {
             setState({
                token: storedToken,
                user: {
                    login: storedUserLogin,
                    role: storedUserRole,
                    userId: storedUserIdStr ? parseInt(storedUserIdStr, 10) : undefined // Parse stored User ID
                },
                isAuthenticated: true,
                isLoading: false,
                error: null,
             });
        } else {
            // Clear invalid stored data
             localStorage.removeItem('authToken');
             localStorage.removeItem('authUserLogin');
             localStorage.removeItem('authUserRole');
             localStorage.removeItem('authUserId');
             setState(prevState => ({ ...prevState, isLoading: false }));
        }
    } else {
        setState(prevState => ({ ...prevState, isLoading: false }));
    }
  }, []);


  const login = useCallback(async (credentials: UserCredentials): Promise<boolean> => {
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));
    try {
      // Assuming backend login might return userId along with token, role, login
      const { token, role, login, userId } = await api.login(credentials) as any; // Cast to any or update API type if userId returned
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUserLogin', login);
      localStorage.setItem('authUserRole', role || ''); // Store role
      if (userId) localStorage.setItem('authUserId', String(userId)); // Store userId if returned

      setState({
        token,
        user: { login, role, userId }, // Include userId in state
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      toast.success(`Welcome back, ${login}!`);
      return true; // Indicate success
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setState(prevState => ({
        ...prevState,
        token: null, // Ensure token/user are null on failure
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
    const currentToken = state.token; // Get token before clearing state
    const currentLogin = state.user?.login;

     // Clear local state and storage immediately
     localStorage.removeItem('authToken');
     localStorage.removeItem('authUserLogin');
     localStorage.removeItem('authUserRole');
     localStorage.removeItem('authUserId'); // Clear userId too
     setState({ ...initialState, isLoading: false }); // Reset to initial, set loading false
     if (currentLogin) {
        toast.info(`User ${currentLogin} logged out.`); // Use previous login name for message
     } else {
        toast.info("Logged out.");
     }


    try {
        if (currentToken) {
           await api.logout(currentToken);
           // API call succeeded, state already updated
        }
    } catch (err: any) {
      // Log error but don't block logout on the frontend
      console.error('Logout API call failed:', err);
       // State is already reset
       toast.warning("Logged out locally, but failed to notify the server.");
    } finally {
        // Ensure loading is false even if API fails
        // Already set to false when resetting state above
    }
  }, [state.token, state.user?.login]); // Depend on token and user for message

  const register = useCallback(async (credentials: UserCredentials): Promise<boolean> => {
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));
    try {
      await api.register(credentials);
      setState(prevState => ({ ...prevState, isLoading: false, error: null }));
      toast.success("Registration successful! Please log in.");
      return true; // Indicate success
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed';
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