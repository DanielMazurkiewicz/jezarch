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
  isLoading: boolean; // Combined loading state for auth check & initial lang fetch
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

// Function to get language preference from local storage or default
const getStoredLanguagePreference = (): SupportedLanguage => {
    const storedLang = localStorage.getItem('authPreferredLanguage') as SupportedLanguage | null;
    if (storedLang && backendSupportedLanguages.includes(storedLang)) {
        return storedLang;
    }
    return frontendDefaultLanguage; // Return frontend default if nothing stored/valid
};


const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start loading to check localStorage AND potentially fetch default lang
  error: null,
  preferredLanguage: frontendDefaultLanguage, // Initialize with frontend default, might be updated
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);

  // --- Updated Initialization Effect ---
  useEffect(() => {
      const initializeAuth = async () => {
          const storedToken = localStorage.getItem('authToken');
          const storedUserLogin = localStorage.getItem('authUserLogin');
          const storedUserRole = localStorage.getItem('authUserRole') as UserRole | null;
          const storedUserIdStr = localStorage.getItem('authUserId');
          let initialLang = getStoredLanguagePreference(); // Start with stored/default

          console.log("AuthContext: Initializing Auth. Stored Token:", !!storedToken, "Stored Lang:", initialLang);

          if (storedToken && storedUserLogin && storedUserIdStr) {
              // User is logged in, language preference is already known (from storage or last session)
              const parsedUserId = parseInt(storedUserIdStr, 10);
              const validRoles: (UserRole | null)[] = ['admin', 'employee', 'user', null];

              if (validRoles.includes(storedUserRole) && !isNaN(parsedUserId)) {
                  console.log("AuthContext: Found valid stored session. Setting state.");
                  setState({
                      token: storedToken,
                      user: {
                          login: storedUserLogin,
                          role: storedUserRole,
                          userId: parsedUserId,
                          preferredLanguage: initialLang, // Use the determined initialLang
                      },
                      isAuthenticated: true,
                      isLoading: false,
                      error: null,
                      preferredLanguage: initialLang, // Set top-level language
                  });
              } else {
                  // Invalid stored session data
                  console.error("AuthContext: Invalid UserID or Role found in storage. Clearing auth data.");
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('authUserLogin');
                  localStorage.removeItem('authUserRole');
                  localStorage.removeItem('authUserId');
                  // Keep language preference
                  setState(prevState => ({ ...initialState, isLoading: false, preferredLanguage: initialLang }));
              }
          } else {
              // User is NOT logged in
              console.log("AuthContext: No stored session found.");
              // Check if language is already stored (e.g., from previous visit or AuthLayout interaction)
              const storedLang = localStorage.getItem('authPreferredLanguage') as SupportedLanguage | null;

              if (storedLang && backendSupportedLanguages.includes(storedLang)) {
                   console.log(`AuthContext: Using stored language preference: ${storedLang}`);
                   initialLang = storedLang;
                   setState({ ...initialState, isLoading: false, preferredLanguage: initialLang });
              } else {
                  // No stored session AND no stored language preference, fetch default from backend
                   console.log("AuthContext: No stored language. Fetching default language from backend.");
                   try {
                       const response = await api.getDefaultLanguage();
                       const backendDefault = response.defaultLanguage;
                       if (backendDefault && backendSupportedLanguages.includes(backendDefault)) {
                           console.log(`AuthContext: Using backend default language: ${backendDefault}`);
                           initialLang = backendDefault;
                           localStorage.setItem('authPreferredLanguage', initialLang); // Store fetched default
                       } else {
                           console.warn(`AuthContext: Backend default language "${backendDefault}" is invalid or missing. Using frontend default "${frontendDefaultLanguage}".`);
                           initialLang = frontendDefaultLanguage; // Fallback
                       }
                   } catch (fetchError) {
                       console.error("AuthContext: Failed to fetch default language from backend. Using frontend default.", fetchError);
                       initialLang = frontendDefaultLanguage; // Fallback on API error
                   } finally {
                       setState({ ...initialState, isLoading: false, preferredLanguage: initialLang });
                   }
              }
          }
      };

      initializeAuth();
  }, []); // Run only once on mount


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
           // Clear auth-related items, but keep language preference from *before* login attempt
           const langBeforeLogin = state.preferredLanguage;
           localStorage.removeItem('authToken');
           localStorage.removeItem('authUserLogin');
           localStorage.removeItem('authUserRole');
           localStorage.removeItem('authUserId');
           // localStorage.removeItem('authPreferredLanguage'); // KEEP language
           setState(prevState => ({
               ...initialState, // Reset auth state
               isLoading: false,
               error: errorMessage,
               preferredLanguage: langBeforeLogin, // Restore language from before failed login
           }));
           toast.error(errorMessage);
           return false;
       }
   }, [state.preferredLanguage]); // Include preferredLanguage in dependency for restoring on failure

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
                  console.log("AuthContext: Setting preferred language to", language);
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