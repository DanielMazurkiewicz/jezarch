import React from 'react';
import { Outlet } from 'react-router-dom'; // Import Outlet
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils'; // Import cn
import { QuickFilterProvider } from '@/context/QuickFilterContext';

const Layout: React.FC = () => {
  // State for mobile sidebar toggle if needed in the future
  // const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <QuickFilterProvider>
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar - Always display as flex item */}
      <Sidebar className="flex" />

      {/* Main content area */}
      <div className="flex flex-col flex-1">
         <Header />
        {/* Main content section with padding and max-width for centering */}
        {/* Ensure main content area has a solid background using the theme variable */}
        <main className={cn(
          "flex-1 overflow-auto p-4 md:p-6",
          "bg-background" // Apply the main background color here
        )}>
          {/* Add max-width and center content within the main area */}
          <div className="max-w-7xl mx-auto">
             <Outlet /> {/* Child routes (pages) render here */}
          </div>
        </main>
      </div>
    </div>
    </QuickFilterProvider>
  );
};

export default Layout;