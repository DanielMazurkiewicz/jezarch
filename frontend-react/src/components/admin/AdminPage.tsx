import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from './UserManagement';
import SettingsForm from './SettingsForm';
// Removed SslConfig import
import LogViewer from './LogViewer';
import DatabaseManagement from './DatabaseManagement';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminPage: React.FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
      return (
          <div className='p-4 md:p-6'>
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
    <div className="space-y-6">
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
           <h1 className="text-2xl font-bold">Admin Panel</h1>
           {/* Updated description */}
           <p className='text-muted-foreground'>Manage application users, settings, database, and logs.</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <div className="overflow-x-auto pb-1 border-b">
            {/* Removed SSL Tab */}
            <TabsList className='inline-flex w-auto min-w-full'>
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="settings">App Settings</TabsTrigger>
                <TabsTrigger value="database">Database</TabsTrigger>
                <TabsTrigger value="logs">System Logs</TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="users" className='mt-6'>
           <UserManagement />
        </TabsContent>
        <TabsContent value="settings" className='mt-6'>
            <SettingsForm />
        </TabsContent>
        {/* Removed SSL Tab Content */}
        <TabsContent value="database" className='mt-6'>
             <DatabaseManagement />
         </TabsContent>
        <TabsContent value="logs" className='mt-6'>
            <LogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;