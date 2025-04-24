import { Component, Show, Suspense, lazy } from 'solid-js'; // Added lazy, Suspense
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'; // Import Tabs components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'; // Use Card, added Desc
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Import LoadingSpinner

// Lazy load tab contents for better initial performance
const UserManagement = lazy(() => import('./UserManagement'));
const SettingsForm = lazy(() => import('./SettingsForm'));
const SslConfig = lazy(() => import('./SslConfig'));
const LogViewer = lazy(() => import('./LogViewer'));

import styles from './AdminPage.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn if needed

const AdminPage: Component = () => {
    const [authState] = useAuth();
    const user = () => authState.user; // Reactive accessor for user

    return (
        <div class={styles.adminPageContainer}>
            <Show when={user()?.role === 'admin'}
                fallback={
                    // Access Denied Message
                    <Card class={styles.accessDeniedCard}>
                        <CardHeader>
                            <CardTitle class={styles.accessDeniedTitle}>Access Denied</CardTitle>
                            <CardDescription>Administrator privileges are required to view this page.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>You do not have the necessary permissions.</p>
                        </CardContent>
                    </Card>
                }
            >
                {/* Admin Content */}
                <div class={styles.pageHeaderContainer}>
                     <div class={styles.pageHeaderText}>
                        <h1 class={styles.pageTitle}>Admin Panel</h1>
                        <p class={styles.pageDescription}>Manage application users, settings, and logs.</p>
                     </div>
                     {/* Optional global admin actions button */}
                </div>

                <Tabs defaultValue="users" class={styles.tabsWrapper}>
                    <TabsList>
                        <TabsTrigger value="users">User Management</TabsTrigger>
                        <TabsTrigger value="settings">App Settings</TabsTrigger>
                        <TabsTrigger value="ssl">SSL Config</TabsTrigger>
                        <TabsTrigger value="logs">System Logs</TabsTrigger>
                    </TabsList>

                    {/* Wrap each content in Suspense for lazy loading */}
                    <TabsContent value="users">
                        <Suspense fallback={<div class="p-10 flex justify-center"><LoadingSpinner size="lg"/></div>}>
                           <UserManagement />
                        </Suspense>
                    </TabsContent>
                    <TabsContent value="settings">
                         <Suspense fallback={<div class="p-10 flex justify-center"><LoadingSpinner size="lg"/></div>}>
                             <SettingsForm />
                         </Suspense>
                    </TabsContent>
                    <TabsContent value="ssl">
                         <Suspense fallback={<div class="p-10 flex justify-center"><LoadingSpinner size="lg"/></div>}>
                             <SslConfig />
                         </Suspense>
                    </TabsContent>
                    <TabsContent value="logs">
                         <Suspense fallback={<div class="p-10 flex justify-center"><LoadingSpinner size="lg"/></div>}>
                             <LogViewer />
                         </Suspense>
                    </TabsContent>
                </Tabs>
            </Show>
        </div>
    );
};

export default AdminPage;