import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from './UserManagement';
import SettingsForm from './SettingsForm';
// Removed SslConfig import
import LogViewer from './LogViewer';
import DatabaseManagement from './DatabaseManagement';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/translations/utils'; // Import translation utility

const AdminPage: React.FC = () => {
  const { user, preferredLanguage } = useAuth(); // Get preferredLanguage from context

  if (user?.role !== 'admin') {
      return (
          <div className='p-4 md:p-6'>
              <Card className='border-destructive'>
                  <CardHeader>
                      {/* Use translated title */}
                      <CardTitle className='text-destructive'>{t('accessDeniedTitle', preferredLanguage)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                      {/* Use translated message */}
                      <p>{t('accessDeniedMessage', preferredLanguage)}</p>
                  </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
           {/* Use translated title and description */}
           <h1 className="text-2xl font-bold">{t('adminPanelTitle', preferredLanguage)}</h1>
           <p className='text-muted-foreground'>{t('adminPanelDescription', preferredLanguage)}</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <div className="overflow-x-auto pb-1 border-b">
            {/* Removed SSL Tab */}
            {/* Use translated tab labels */}
            <TabsList className='inline-flex w-auto min-w-full'>
                <TabsTrigger value="users">{t('userManagementTab', preferredLanguage)}</TabsTrigger>
                <TabsTrigger value="settings">{t('appSettingsTab', preferredLanguage)}</TabsTrigger>
                <TabsTrigger value="database">{t('databaseTab', preferredLanguage)}</TabsTrigger>
                <TabsTrigger value="logs">{t('logsTab', preferredLanguage)}</TabsTrigger>
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