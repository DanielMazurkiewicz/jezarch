import { Component, JSX, Show } from 'solid-js';
// Outlet is automatically handled by nesting Routes in App.tsx
import { Navigate, useLocation } from '@solidjs/router';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { UserRole } from '../../../../backend/src/functionalities/user/models';
import appStyles from '@/App.module.css'; // Import App CSS Module (Typed)

interface ProtectedRouteProps {
    children?: JSX.Element; // Child routes are passed via Route definition's children
    allowedRoles?: UserRole[];
}

const ProtectedRoute: Component<ProtectedRouteProps> = (props) => {
    const [authState] = useAuth();
    const location = useLocation();

    // console.log(`ProtectedRoute Render - Path: ${location.pathname}, Loading: ${authState.isLoading}, Authenticated: ${authState.isAuthenticated}, Role: ${authState.user?.role}`);

    const checkAccess = () => {
        // While loading, show nothing (handled by outer Show)
        if (authState.isLoading) {
            // console.log("ProtectedRoute: Still loading auth state.");
            return null; // Render nothing while loading, outer Show handles spinner
        }

        // If not authenticated, redirect to login, preserving intended destination
        if (!authState.isAuthenticated) {
            console.log(`ProtectedRoute: Not authenticated. Redirecting from ${location.pathname} to /login.`);
            // Pass the current path in state for redirection after login
            return <Navigate href="/login" state={{ from: location.pathname + location.search }} />;
        }

        // Check roles if specified
        if (props.allowedRoles && props.allowedRoles.length > 0) {
            const userRole = authState.user?.role;
            if (!userRole || !props.allowedRoles.includes(userRole)) {
                 console.warn(`ProtectedRoute: Access denied to ${location.pathname} for role: ${userRole}. Required: ${props.allowedRoles.join(', ')}. Redirecting to dashboard.`);
                 // Redirect unauthorized roles to the main dashboard
                 return <Navigate href="/" />;
            }
            // console.log(`ProtectedRoute: Role access granted for ${location.pathname}. Role: ${userRole}`);
        } else {
            // console.log(`ProtectedRoute: Authenticated access granted for ${location.pathname}. No specific roles required.`);
        }

        // Access granted: Render the child routes/components
        // console.log(`ProtectedRoute: Rendering children for ${location.pathname}`);
        return props.children;
    };

    // Use a Show component to handle the loading state cleanly
    return (
        <Show
            when={!authState.isLoading}
            fallback={
                // Use the full page loader centered style
                <div class={`${appStyles.appContainer} ${appStyles.centered}`}>
                    <LoadingSpinner size="lg" />
                </div>
            }
        >
            {/* Render the result of checkAccess (redirect or children) */}
            {checkAccess()}
        </Show>
    );
};

export default ProtectedRoute;