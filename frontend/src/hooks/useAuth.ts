import { useContext } from 'react';
import AuthContext from '@/context/AuthContext'; // Correct path to context

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// No default export needed here if AuthProvider is exported from context file