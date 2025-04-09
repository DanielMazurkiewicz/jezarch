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

  // Double check role, though navigation should prevent access
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
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      <Tabs defaultValue="users" className="w-full">
        {/* Make tabs list scrollable on small screens */}
        <div className="overflow-x-auto pb-1">
             <TabsList className='grid w-full grid-cols-2 sm:grid-cols-4'>
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="settings">App Settings</TabsTrigger>
                <TabsTrigger value="ssl">SSL Config</TabsTrigger>
                <TabsTrigger value="logs">System Logs</TabsTrigger>
             </TabsList>
        </div>
        <TabsContent value="users" className='mt-4'>
           <UserManagement />
        </TabsContent>
        <TabsContent value="settings" className='mt-4'>
            <SettingsForm />
        </TabsContent>
        <TabsContent value="ssl" className='mt-4'>
            <SslConfig />
        </TabsContent>
        <TabsContent value="logs" className='mt-4'>
            <LogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;