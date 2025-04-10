import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import NotesPage from '@/components/notes/NotesPage';
import TagsPage from '@/components/tags/TagsPage';
import SignaturesPage from '@/components/signatures/SignaturesPage';
import ArchivePage from '@/components/archive/ArchivePage';
import AdminPage from '@/components/admin/AdminPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
// Correct the import path assuming backend/src is sibling to frontend/src
import type { UserRole } from '../../backend/src/functionalities/user/models';

// Simple Dashboard component
const DashboardPage = () => {
    const { user } = useAuth();
    return (
        <div className="p-4 md:p-6 space-y-4">
            <h1 className="text-2xl font-semibold">Welcome, {user?.login}!</h1>
            <p className="text-muted-foreground">
                Select a section from the sidebar to get started or manage your account settings.
            </p>
        </div>
    );
};


// Main App Content manages routing logic
function AppContent() {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Display loading spinner while auth state is being determined
    if (isLoading) {
        // Ensure spinner covers the whole screen during initial load
        return (
            <div className="flex justify-center items-center min-h-screen w-full bg-background">
                <LoadingSpinner />
            </div>
        );
    }

    // Define a layout wrapper specifically for Auth pages (Login, Register)
    // This ensures the centering and background styling are applied correctly.
    const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div className="flex justify-center items-center min-h-screen w-full bg-muted/40 p-4">
             {/* The children here should be the Card-based LoginForm or RegisterForm */}
            {children}
        </div>
    );

    return (
        <Routes>
            {/* --- Public Routes (Login/Register) --- */}
            {/* Ensure these routes correctly use the AuthLayout */}
            <Route path="/login" element={
                !isAuthenticated ? (
                    <AuthLayout>
                        <LoginForm onSwitchToRegister={() => navigate('/register', { replace: true, state: location.state })} />
                    </AuthLayout>
                ) : (
                    // If authenticated, redirect away from login
                    <Navigate to={location.state?.from?.pathname || "/"} replace />
                )
            } />
            <Route path="/register" element={
                 !isAuthenticated ? (
                    <AuthLayout>
                        <RegisterForm onSwitchToLogin={() => navigate('/login', { replace: true, state: location.state })} />
                    </AuthLayout>
                 ) : (
                    // If authenticated, redirect away from register
                    <Navigate to={location.state?.from?.pathname || "/"} replace />
                 )
            } />

            {/* --- Protected Routes (Inside Main Layout) --- */}
            <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}> {/* Main App Layout with Sidebar/Header */}
                    <Route index element={<DashboardPage />} />
                    <Route path="notes" element={<NotesPage />} />
                    <Route path="tags" element={<TagsPage />} />
                    <Route path="signatures" element={<SignaturesPage />} />
                    <Route path="archive" element={<ArchivePage />} />
                    {/* Admin Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                        <Route path="admin" element={<AdminPage />} />
                    </Route>
                    {/* Fallback inside Layout */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Route>

             {/* --- Catch-all Fallback (Redirect to Login if not authenticated and no match) --- */}
             <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
    );
}

// Main App component wrapping everything with AuthProvider
function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;