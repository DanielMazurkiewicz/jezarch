import { Component } from 'solid-js';
import { useAuth } from '@/context/AuthContext';
import styles from './DashboardPage.module.css'; // Import CSS Module (Typed)

const DashboardPage: Component = () => {
    // Access state directly from the store provided by useAuth
    const [authState] = useAuth();

    return (
        <div class={styles.dashboardContainer}>
            {/* Access user properties using optional chaining and signal access */}
            <h1 class={styles.dashboardTitle}>Welcome, {authState.user?.login}!</h1>
            <p class={styles.dashboardText}>
                Select a section from the sidebar to get started or manage your account settings.
            </p>
            {/* Add more dashboard content here */}
        </div>
    );
};

export default DashboardPage;