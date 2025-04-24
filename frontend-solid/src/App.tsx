import { Component, JSX, lazy, Show, Suspense } from 'solid-js';
// RouteDefinition is problematic for nested index routes, simplifying
// import { Router, Route, Navigate, useLocation, A, type RouteDefinition } from '@solidjs/router';
import { Router, Route, Navigate, useLocation, A } from '@solidjs/router'; // Removed RouteDefinition import
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import styles from './App.module.css'; // Import CSS Module (Now typed via global.d.ts)

// Layouts
const MainLayout = lazy(() => import('@/components/layout/Layout'));
const AuthLayout = lazy(() => import('@/components/auth/AuthLayout'));

// Pages (Keep lazy loading)
const LoginPage = lazy(() => import('@/components/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/components/auth/RegisterPage'));
const DashboardPage = lazy(() => import('@/components/dashboard/DashboardPage'));
const NotesPage = lazy(() => import('@/components/notes/NotesPage'));
const TagsPage = lazy(() => import('@/components/tags/TagsPage'));
const ComponentsPage = lazy(() => import('@/components/signatures/ComponentsPage'));
const ElementsPage = lazy(() => import('@/components/signatures/ElementsPage'));
const ArchivePage = lazy(() => import('@/components/archive/ArchivePage'));
const AdminPage = lazy(() => import('@/components/admin/AdminPage'));

// Auth Components
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Loading fallback component
const FullPageLoader: Component = () => (
    <div class={`${styles.appContainer} ${styles.centered}`}>
        <LoadingSpinner size="lg" />
    </div>
);

// --- REMOVED getRedirectPath helper ---

// --- Define routes using JSX structure for clarity and nesting ---
const AppRoutes: Component = () => {
    // Remove useLocation from here
    const [authState] = useAuth();

    // Define component for Login route to use useLocation internally
    const LoginRouteComponent: Component = () => {
        const location = useLocation(); // Call useLocation *inside* the route component
        const state = location.state as { from?: string } | null | undefined;
        const redirectPath = state?.from || "/"; // Calculate redirect path here

        return (
            <Show when={!authState.isAuthenticated} fallback={<Navigate href={redirectPath} />}>
                <Suspense fallback={<FullPageLoader />}>
                    <AuthLayout>
                        <LoginPage />
                    </AuthLayout>
                </Suspense>
            </Show>
        );
    };

    // Define component for Register route
    const RegisterRouteComponent: Component = () => {
         const location = useLocation(); // Call useLocation *inside* the route component
         const state = location.state as { from?: string } | null | undefined;
         const redirectPath = state?.from || "/"; // Calculate redirect path here

        return (
            <Show when={!authState.isAuthenticated} fallback={<Navigate href={redirectPath} />}>
                <Suspense fallback={<FullPageLoader />}>
                    <AuthLayout>
                        <RegisterPage />
                    </AuthLayout>
                </Suspense>
            </Show>
        );
    };


    return (
        <>
            {/* Public Routes */}
            {/* Use the specific route components */}
            <Route path="/login" component={LoginRouteComponent} />
            <Route path="/register" component={RegisterRouteComponent} />

             {/* Protected Routes Container */}
             {/* Apply Protection Layer using component prop of Route */}
             <Route path="/" component={ProtectedRoute}>
                 {/* Apply Main Layout */}
                 <Route path="/" component={MainLayout}>
                      {/* Default Route (Dashboard) */}
                      <Route path="/" component={() => <Suspense fallback={<LoadingSpinner />}><DashboardPage /></Suspense>} />
                      {/* Other Protected Routes */}
                      <Route path="/notes" component={() => <Suspense fallback={<LoadingSpinner />}><NotesPage /></Suspense>} />
                      <Route path="/tags" component={() => <Suspense fallback={<LoadingSpinner />}><TagsPage /></Suspense>} />
                      <Route path="/signatures">
                          {/* Default signature route */}
                          <Route path="/" component={() => <Suspense fallback={<LoadingSpinner />}><ComponentsPage /></Suspense>} />
                          {/* Nested signature route */}
                          <Route path="/:componentId/elements" component={() => <Suspense fallback={<LoadingSpinner />}><ElementsPage /></Suspense>} />
                      </Route>
                      <Route path="/archive" component={() => <Suspense fallback={<LoadingSpinner />}><ArchivePage /></Suspense>} />
                      <Route path="/admin" component={() => (
                         // Specific role protection for Admin page
                         <ProtectedRoute allowedRoles={['admin']}>
                              <Suspense fallback={<LoadingSpinner />}><AdminPage /></Suspense>
                         </ProtectedRoute>
                      )} />
                      {/* Catch-all INSIDE protected layout */}
                      <Route path="*all" component={() => <Navigate href="/" />} />
                 </Route>
             </Route>

             {/* Top-level Catch-all (if no other route matches) */}
             <Route path="*all" component={() => <Navigate href="/login" />} />
        </>
    );
};

// Main App Content manages routing logic based on auth state
const AppContent: Component = () => {
    const [authState] = useAuth(); // Get only the state part

    return (
        <Show
            when={!authState.isLoading}
            fallback={<FullPageLoader />}
        >
             {/* Router now renders the AppRoutes component */}
             <Router>
                 <AppRoutes />
             </Router>
        </Show>
    );
};

// Main App component wrapping everything with providers
const App: Component = () => {
    return (
        // AuthProvider needs to wrap the part of the app that uses useAuth,
        // which includes the Router and its routes.
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;