import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from './UserManagement';
import SettingsForm from './SettingsForm';
import SslConfig from './SslConfig';
import LogViewer from './LogViewer';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Use Card for consistency

const AdminPage: React.FC = () => {
  const { user } = useAuth();

  // Double check role, though ProtectedRoute should handle access control
  if (user?.role !== 'admin') {
      return (
          <div className='p-4 md:p-6'>
              {/* Use Card for error display too */}
              <Card className='border-destructive'>
                  <CardHeader>
                      <CardTitle className='text-destructive'>Access Denied</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p>You do not have the necessary permissions to view this page. Administrator privileges are required.</p>
                  </CardContent>
              </Card>
          </div>
      );
  }

  return (
    // Add overall spacing for the page content
    <div className="space-y-6">
      {/* Page Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
           <h1 className="text-2xl font-bold">Admin Panel</h1>
           <p className='text-muted-foreground'>Manage application users, settings, and logs.</p>
        </div>
        {/* Add global admin actions here if needed, e.g., trigger backup */}
      </div>

      {/* Tabs for different admin sections */}
      <Tabs defaultValue="users" className="w-full">
        {/* Make tabs list scrollable on small screens and add bottom border */}
        <div className="overflow-x-auto pb-1 border-b">
             <TabsList className='grid w-full grid-cols-2 sm:grid-cols-4'>
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="settings">App Settings</TabsTrigger>
                <TabsTrigger value="ssl">SSL Config</TabsTrigger>
                <TabsTrigger value="logs">System Logs</TabsTrigger>
             </TabsList>
        </div>
        {/* Add margin top to content areas for spacing below tabs */}
        {/* Each Tab Content now renders its specific component, which should be wrapped in a Card */}
        <TabsContent value="users" className='mt-6'>
           <UserManagement />
        </TabsContent>
        <TabsContent value="settings" className='mt-6'>
            <SettingsForm />
        </TabsContent>
        <TabsContent value="ssl" className='mt-6'>
            <SslConfig />
        </TabsContent>
        <TabsContent value="logs" className='mt-6'>
            <LogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;