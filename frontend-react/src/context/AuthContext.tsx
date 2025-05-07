import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '@/lib/api';
// Correct the import path assuming backend/src is sibling to frontend/src
import type { UserCredentials, UserRole, SupportedLanguage } from '../../../backend/src/functionalities/user/models';
import { supportedLanguages as backendSupportedLanguages } from '../../../backend/src/functionalities/user/models'; // Keep for validation
// --- UPDATED IMPORT: Import defaultLanguage from frontend translations ---
import { defaultLanguage as frontendDefaultLanguage } from '@/translations/models';
// ----------------------------------------------------------------------
import { toast } from "sonner"; // Import toast
import { t } from '@/translations/utils'; // Import translation util

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
  preferredLanguage: SupportedLanguage; // Add preferredLanguage to the main state
}

interface AuthContextProps extends Omit<AuthState, 'preferredLanguage'> { // Exclude preferredLanguage here as it's within user or top-level
  preferredLanguage: SupportedLanguage; // Explicitly define preferredLanguage here for easy access
  login: (credentials: UserCredentials) => Promise<boolean>; // Removed preferredLanguage param from login call
  logout: () => Promise<void>;
  register: (credentials: UserCredentials, preferredLanguage?: SupportedLanguage) => Promise<boolean>; // Keep lang here
  clearError: () => void;
  updateContextUser: (updatedUser: Partial<UserState>) => void;
  setContextPreferredLanguage: (language: SupportedLanguage) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Function to get initial language preference
const getInitialLanguagePreference = (): SupportedLanguage => {
    const storedLang = localStorage.getItem('authPreferredLanguage') as SupportedLanguage | null;
    if (storedLang && backendSupportedLanguages.includes(storedLang)) {
        return storedLang;
    }
    // --- UPDATED: Use frontend's default language ---
    return frontendDefaultLanguage;
    // --------------------------------------------
};

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start loading to check localStorage
  error: null,
  preferredLanguage: getInitialLanguagePreference(), // Initialize with preference
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);

  // Check localStorage on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUserLogin = localStorage.getItem('authUserLogin');
    const storedUserRole = localStorage.getItem('authUserRole') as UserRole | null;
    const storedUserIdStr = localStorage.getItem('authUserId');
    // Load initial language preference separately
    const initialLang = getInitialLanguagePreference();

    console.log("AuthContext: Initial load check. Token:", !!storedToken, "Login:", storedUserLogin, "Role:", storedUserRole, "UserID Str:", storedUserIdStr, "Initial Lang:", initialLang);

    if (storedToken && storedUserLogin && storedUserIdStr) {
        const parsedUserId = parseInt(storedUserIdStr, 10);
        const validRoles: (UserRole | null)[] = ['admin', 'employee', 'user', null];

        if (validRoles.includes(storedUserRole) && !isNaN(parsedUserId)) {
            console.log("AuthContext: Initial load - Setting state from storage.");
            setState({
                token: storedToken,
                user: {
                    login: storedUserLogin,
                    role: storedUserRole,
                    userId: parsedUserId,
                    // Initially, set user's preferredLanguage from the determined initialLang
                    // This might be updated later if the user object fetched from DB has a different preference
                    preferredLanguage: initialLang,
                },
                isAuthenticated: true,
                isLoading: false,
                error: null,
                preferredLanguage: initialLang, // Set top-level language
             });
        } else {
            console.error("AuthContext: Initial load - Invalid UserID or Role found in storage. Role:", storedUserRole, "UserID:", parsedUserId);
             // Clear only auth-related items, keep language preference
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUserLogin');
            localStorage.removeItem('authUserRole');
            localStorage.removeItem('authUserId');
            setState(prevState => ({ ...initialState, isLoading: false, preferredLanguage: initialLang })); // Reset but keep lang
        }
    } else {
        console.log("AuthContext: Initial load - Missing token, login, or userId.");
         // Keep language preference even if not logged in
        setState(prevState => ({ ...initialState, isLoading: false, preferredLanguage: initialLang }));
    }
  }, []);


   // Login function no longer needs preferredLanguage param, gets it from API response
   const login = useCallback(async (credentials: UserCredentials): Promise<boolean> => {
       setState(prevState => ({ ...prevState, isLoading: true, error: null }));
       try {
           const response = await api.login(credentials);
           const { token, role, login, userId, preferredLanguage: dbPreferredLanguage } = response;
           console.log("AuthContext: Login API response - Token:", !!token, "Role:", role, "Login:", login, "UserID:", userId, "DB Lang:", dbPreferredLanguage);

           if (!token || !login || userId === undefined || typeof userId !== 'number' || isNaN(userId)) {
                throw new Error("Login response missing token, login name, or valid User ID.");
           }
           const validRoles: (UserRole | null)[] = ['admin', 'employee', 'user', null];
           if (!validRoles.includes(role)) {
               console.warn("AuthContext: Login received invalid role:", role);
               throw new Error("Received invalid user role during login.");
           }
            // --- UPDATED: Use frontend's default language as fallback ---
           const langToStore: SupportedLanguage = dbPreferredLanguage && backendSupportedLanguages.includes(dbPreferredLanguage) ? dbPreferredLanguage : frontendDefaultLanguage;
            // ----------------------------------------------------------

           localStorage.setItem('authToken', token);
           localStorage.setItem('authUserLogin', login);
           localStorage.setItem('authUserRole', role || ''); // Store empty string for null role
           localStorage.setItem('authUserId', String(userId));
           localStorage.setItem('authPreferredLanguage', langToStore); // Store the authoritative language

           console.log("AuthContext: Setting state after successful login with UserID:", userId, "Lang:", langToStore);
           setState({
               token,
               user: { login, role, userId, preferredLanguage: langToStore }, // Set user object with DB language
               isAuthenticated: true,
               isLoading: false,
               error: null,
               preferredLanguage: langToStore, // Update top-level language state
           });
           // Use the *newly set* language for the toast
           toast.success(t('welcomeMessage', langToStore, { userLogin: login }));
           return true;
       } catch (err: any) {
           const errorMessage = err.message || 'Login failed';
           console.error("AuthContext: Login failed -", errorMessage);
           // Clear everything on login failure
           localStorage.removeItem('authToken');
           localStorage.removeItem('authUserLogin');
           localStorage.removeItem('authUserRole');
           localStorage.removeItem('authUserId');
           localStorage.removeItem('authPreferredLanguage');
           setState(prevState => ({
               ...initialState, // Reset to initial state, which includes default language
               isLoading: false,
               error: errorMessage,
               preferredLanguage: getInitialLanguagePreference(), // Re-evaluate initial preference on failure
           }));
           toast.error(errorMessage);
           return false;
       }
   }, []);

  const logout = useCallback(async () => {
    const currentToken = state.token;
    const currentLogin = state.user?.login;
    console.log("AuthContext: logout called.");

     // Clear auth-related items, but *keep* language preference
     localStorage.removeItem('authToken');
     localStorage.removeItem('authUserLogin');
     localStorage.removeItem('authUserRole');
     localStorage.removeItem('authUserId');
     // localStorage.removeItem('authPreferredLanguage'); // <-- KEEP THIS

     const languageToKeep = state.preferredLanguage; // Get current language before resetting
     setState({ ...initialState, isLoading: false, preferredLanguage: languageToKeep }); // Reset but keep language

     if (currentLogin) toast.info(`User ${currentLogin} logged out.`); // Translate if needed
     else toast.info("Logged out."); // Translate if needed

    try {
        if (currentToken) {
           console.log("AuthContext: Calling logout API.");
           await api.logout(currentToken);
        }
    } catch (err: any) {
      console.error('AuthContext: Logout API call failed:', err);
       toast.warning("Logged out locally, but failed to notify the server."); // Translate if needed
    }
  }, [state.token, state.user?.login, state.preferredLanguage]); // Include preferredLanguage dependency

  // --- UPDATED: Use frontend's default language ---
  const register = useCallback(async (credentials: UserCredentials, preferredLanguage: SupportedLanguage = frontendDefaultLanguage): Promise<boolean> => {
  // --------------------------------------------
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));
    try {
      const newUser = await api.register({ ...credentials, preferredLanguage });
      setState(prevState => ({ ...prevState, isLoading: false, error: null }));
      toast.success(`Registration successful for ${newUser.login}! Please log in.`); // Translate if needed
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

  const updateContextUser = useCallback((updatedUserPartial: Partial<UserState>) => {
    setState(prevState => {
        if (prevState.user) {
            const newUserState = { ...prevState.user, ...updatedUserPartial };
            let langChanged = false;
            // Check if language actually changed and is valid
            if (updatedUserPartial.preferredLanguage && backendSupportedLanguages.includes(updatedUserPartial.preferredLanguage) && updatedUserPartial.preferredLanguage !== prevState.user.preferredLanguage) {
                localStorage.setItem('authPreferredLanguage', updatedUserPartial.preferredLanguage);
                langChanged = true; // Flag that language was updated
            }
            if (updatedUserPartial.role !== undefined && updatedUserPartial.role !== prevState.user.role) {
                localStorage.setItem('authUserRole', updatedUserPartial.role || '');
            }
            // Update top-level language only if it changed via this update
            const topLevelLang = langChanged ? newUserState.preferredLanguage : prevState.preferredLanguage;
            return { ...prevState, user: newUserState, preferredLanguage: topLevelLang };
        }
        return prevState;
    });
  }, []);

  // Function to update the preferred language globally (context + localStorage)
  const setContextPreferredLanguage = useCallback((language: SupportedLanguage) => {
      if (backendSupportedLanguages.includes(language)) {
          setState(prevState => {
              // Only update if the language is actually different
              if (prevState.preferredLanguage !== language) {
                  localStorage.setItem('authPreferredLanguage', language);
                  // Update user object if it exists
                  const updatedUser = prevState.user ? { ...prevState.user, preferredLanguage: language } : null;
                  return { ...prevState, user: updatedUser, preferredLanguage: language };
              }
              return prevState; // No change needed
          });
      } else {
           console.warn(`AuthContext: Attempted to set invalid preferred language: ${language}`);
      }
  }, []);


  return (
    <AuthContext.Provider value={{ ...state, preferredLanguage: state.preferredLanguage, login, logout, register, clearError, updateContextUser, setContextPreferredLanguage }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;