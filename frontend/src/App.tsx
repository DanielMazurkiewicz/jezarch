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
import type { UserRole } from '../../backend/src/functionalities/user/models';

// Simple Dashboard component (can remain the same)
const DashboardPage = () => {
    const { user } = useAuth();
    return (
        <div className="p-4 md:p-6 space-y-4">
            <h1 className="text-2xl font-semibold">Welcome, {user?.login}!</h1>
            <p className="text-muted-foreground">
                Select a section from the sidebar to get started.
            </p>
        </div>
    );
};

// --- Removed PublicRoutes Component ---

// Main App Content manages routing logic
function AppContent() {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Display loading spinner while auth state is being determined
    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
    }

    // Define common elements for login/register to avoid duplication
    const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
            {children}
        </div>
    );

    return (
        <Routes>
            {/* --- Public Routes --- */}
            {/* Show Login/Register only if NOT authenticated */}
            <Route path="/login" element={
                !isAuthenticated ? (
                    <AuthLayout>
                        <LoginForm onSwitchToRegister={() => navigate('/register', { replace: true, state: location.state })} />
                    </AuthLayout>
                ) : (
                    // If authenticated, redirect away from login to intended page or dashboard
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

            {/* --- Protected Routes --- */}
            {/* All routes below require authentication */}
            <Route element={<ProtectedRoute />}> {/* Outer protection */}
                <Route element={<Layout />}> {/* Layout for authenticated users */}
                    {/* Default page inside layout */}
                    <Route index element={<DashboardPage />} />

                    {/* Standard protected routes */}
                    <Route path="notes" element={<NotesPage />} />
                    <Route path="tags" element={<TagsPage />} />
                    <Route path="signatures" element={<SignaturesPage />} />
                    <Route path="archive" element={<ArchivePage />} />

                    {/* Admin-specific routes nested inside Layout and ProtectedRoute */}
                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}> {/* Inner protection for role */}
                        <Route path="admin" element={<AdminPage />} />
                        {/* Add other admin-only routes here if needed */}
                    </Route>

                    {/* Fallback for unknown routes *inside* the protected layout */}
                    {/* Redirects any unmatched path within the layout to the dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route> {/* End Layout routes */}
            </Route> {/* End Protected Routes */}

            {/* --- Catch-all Fallback --- */}
            {/* If no routes matched above (e.g., accessing root '/' when not logged in),
                redirect to login. This handles the case where ProtectedRoute navigates
                to /login if not authenticated. */}
            <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;