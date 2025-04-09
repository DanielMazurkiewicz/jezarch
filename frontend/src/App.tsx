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

// Simple Dashboard component
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

// Public routes (Login/Register) don't need a layout
function PublicRoutes() {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const from = location.state?.from?.pathname || "/";

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
    }

    if (isAuthenticated) {
        return <Navigate to={from} replace />;
    }

    return (
        <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
            <Routes>
                 <Route path="login" element={<LoginForm onSwitchToRegister={() => navigate('/register', { replace: true, state: location.state })} />} />
                 <Route path="register" element={<RegisterForm onSwitchToLogin={() => navigate('/login', { replace: true, state: location.state })} />} />
                 {/* Redirect base to login */}
                 <Route path="*" element={<Navigate to="login" replace />} />
            </Routes>
        </div>
    );
}

// Refactored AppContent to use nested routes for protection
function AppContent() {
    const { isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
    }

    return (
        <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<PublicRoutes />} />
            <Route path="/register" element={<PublicRoutes />} />

            {/* Protected Routes */}
            {/* Route requiring authentication */}
            <Route element={<ProtectedRoute />}>
                {/* Routes wrapped in the main Layout */}
                <Route path="/*" element={<Layout />}>
                    {/* Default page inside layout */}
                    <Route index element={<DashboardPage />} />
                    {/* Other standard protected routes */}
                    <Route path="notes" element={<NotesPage />} />
                    <Route path="tags" element={<TagsPage />} />
                    <Route path="signatures" element={<SignaturesPage />} />
                    <Route path="archive" element={<ArchivePage />} />

                    {/* Route requiring 'admin' role */}
                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                        <Route path="admin" element={<AdminPage />} />
                        {/* Add other admin-only routes here */}
                    </Route>

                    {/* Fallback for unknown routes *inside* the protected layout */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Route>

            {/* Fallback for any other path (e.g., root when not logged in) */}
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
