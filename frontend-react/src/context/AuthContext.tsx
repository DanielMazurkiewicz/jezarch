import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '@/lib/api';
// Correct the import path assuming backend/src is sibling to frontend/src
// UserRole now includes 'employee' and 'user'
import type { UserCredentials, UserRole } from '../../../backend/src/functionalities/user/models';
import { toast } from "sonner"; // Import toast

interface AuthState {
  token: string | null;
  // Include userId in the user object type
  user: { userId: number; login: string; role: UserRole | null } | null;
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
    // Cast the role correctly based on the updated UserRole type
    const storedUserRole = localStorage.getItem('authUserRole') as UserRole | null;
    const storedUserIdStr = localStorage.getItem('authUserId');

    console.log("AuthContext: Initial load check. Token:", !!storedToken, "Login:", storedUserLogin, "Role:", storedUserRole, "UserID Str:", storedUserIdStr);

    if (storedToken && storedUserLogin && storedUserIdStr) {
        const parsedUserId = parseInt(storedUserIdStr, 10);
        console.log("AuthContext: Initial load - Parsed UserID:", parsedUserId);

        // Validate role and userId
        const validRoles: (UserRole | null)[] = ['admin', 'employee', 'user', null];
        if (validRoles.includes(storedUserRole) && !isNaN(parsedUserId)) {
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
            console.error("AuthContext: Initial load - Invalid UserID or Role found in storage. Role:", storedUserRole, "UserID:", parsedUserId);
            // Clear invalid stored data
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUserLogin');
            localStorage.removeItem('authUserRole');
            localStorage.removeItem('authUserId');
            setState(prevState => ({ ...prevState, isLoading: false }));
        }
    } else {
        console.log("AuthContext: Initial load - Missing token, login, or userId.");
        // Ensure isLoading is set to false even if nothing is loaded
        setState(prevState => ({ ...prevState, isLoading: false }));
    }
  }, []); // Run only once on mount


  const login = useCallback(async (credentials: UserCredentials): Promise<boolean> => {
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));
    try {
      const response = await api.login(credentials);
      // Ensure userId is returned and is a number
      const { token, role, login, userId } = response;
      console.log("AuthContext: Login API response - Token:", !!token, "Role:", role, "Login:", login, "UserID:", userId);

      if (!token || !login || userId === undefined || typeof userId !== 'number' || isNaN(userId)) {
         throw new Error("Login response missing token, login name, or valid User ID.");
      }
      // Validate role
      const validRoles: (UserRole | null)[] = ['admin', 'employee', 'user', null];
      if (!validRoles.includes(role)) {
          console.warn("AuthContext: Login received invalid role:", role);
           throw new Error("Received invalid user role during login."); // Treat invalid role as error
      }

      localStorage.setItem('authToken', token);
      localStorage.setItem('authUserLogin', login);
      localStorage.setItem('authUserRole', role); // Store the validated role
      localStorage.setItem('authUserId', String(userId)); // Store valid userId

      console.log("AuthContext: Setting state after successful login with UserID:", userId);
      setState({
        token,
        user: { login, role, userId }, // Set user with validated role and ID
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      toast.success(`Welcome back, ${login}!`);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      console.error("AuthContext: Login failed -", errorMessage);
      // Clear local storage on login failure
       localStorage.removeItem('authToken');
       localStorage.removeItem('authUserLogin');
       localStorage.removeItem('authUserRole');
       localStorage.removeItem('authUserId');
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
     setState({ ...initialState, isLoading: false }); // Reset state but keep isLoading false

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
      // Assuming API now returns the created user object including ID and assigned role
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


  return (
    <AuthContext.Provider value={{ ...state, login, logout, register, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;