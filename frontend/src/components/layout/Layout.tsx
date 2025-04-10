import React from 'react';
import { Outlet } from 'react-router-dom'; // Import Outlet
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  // State for mobile sidebar toggle if needed in the future
  // const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    // Use flexbox for sidebar + main content layout
    <div className="flex min-h-screen w-full bg-muted/40"> {/* Add bg color */}
      {/* Sidebar - Always visible on md+, hidden on smaller screens (can add toggle later) */}
      <Sidebar className="hidden md:flex" />

      {/* Main content area */}
      <div className="flex flex-col flex-1">
         <Header /* toggleSidebar={toggleSidebar} // Pass toggle function if needed */ />
        {/* Main content section with padding and max-width for centering */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Add max-width and center content within the main area */}
          <div className="max-w-7xl mx-auto">
             <Outlet /> {/* Child routes (pages) render here */}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;