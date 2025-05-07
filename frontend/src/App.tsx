import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import AuthLayout from '@/components/auth/AuthLayout'; // Import the new AuthLayout
import NotesPage from '@/components/notes/NotesPage';
import TagsPage from '@/components/tags/TagsPage';
import ComponentsPage from '@/components/signatures/ComponentsPage';
import ElementsPage from '@/components/signatures/ElementsPage';
import ArchivePage from '@/components/archive/ArchivePage';
import AdminPage from '@/components/admin/AdminPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
// UserRole includes 'employee', 'user'
import type { UserRole } from '../../backend/src/functionalities/user/models';
import { t } from '@/translations/utils'; // Import translation utility

// Simple Dashboard component
const DashboardPage = () => {
    const { user, preferredLanguage } = useAuth(); // Get preferredLanguage
    return (
        <div className="p-4 md:p-6 space-y-4">
            {/* Use translated welcome message */}
            <h1 className="text-2xl font-semibold">{t('welcomeMessage', preferredLanguage, { userLogin: user?.login || 'User' })}</h1>
            <p className="text-muted-foreground">
                 {/* Use translated prompts */}
                 {user?.role === 'user'
                    ? t('userRestrictedSearchPrompt', preferredLanguage)
                    : t('selectSectionPrompt', preferredLanguage)}
            </p>
             {/* Optionally add role-specific dashboard info here */}
        </div>
    );
};


// Main App Content manages routing logic
function AppContent() {
    const { isAuthenticated, isLoading, preferredLanguage } = useAuth(); // Get preferredLanguage
    const location = useLocation();
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen w-full bg-background">
                <LoadingSpinner />
            </div>
        );
    }

    // AuthLayout is now a separate component

    return (
        <Routes>
            {/* --- Public Routes (Login/Register) --- */}
            <Route path="/login" element={
                !isAuthenticated ? (
                    <AuthLayout> <LoginForm onSwitchToRegister={() => navigate('/register', { replace: true, state: location.state })} /> </AuthLayout>
                ) : ( <Navigate to={location.state?.from?.pathname || "/"} replace /> )
            } />
            <Route path="/register" element={
                 !isAuthenticated ? (
                    <AuthLayout> <RegisterForm onSwitchToLogin={() => navigate('/login', { replace: true, state: location.state })} /> </AuthLayout>
                 ) : ( <Navigate to={location.state?.from?.pathname || "/"} replace /> )
            } />

            {/* --- Protected Routes (Inside Main Layout) --- */}
            <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}> {/* Main App Layout */}
                    <Route index element={<DashboardPage />} />
                    {/* Archive access for all roles (permissions handled inside) */}
                    <Route path="archive" element={<ArchivePage />} />
                    {/* Employee & Admin Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['admin', 'employee']} />}>
                        <Route path="signatures" element={<ComponentsPage />} />
                        <Route path="signatures/:componentId/elements" element={<ElementsPage />} />
                        <Route path="tags" element={<TagsPage />} />
                        <Route path="notes" element={<NotesPage />} />
                    </Route>
                    {/* Admin Only Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                        <Route path="admin" element={<AdminPage />} />
                    </Route>
                    {/* Fallback inside Layout */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Route>

             {/* --- Catch-all Fallback (Redirect to Login if not authenticated) --- */}
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