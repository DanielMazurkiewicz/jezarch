import React from 'react';
import { Outlet } from 'react-router-dom'; // Import Outlet
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  // State for mobile sidebar toggle if needed in the future
  // const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex min-h-screen w-full bg-muted/40"> {/* Add bg color */}
      {/* Sidebar - conditional rendering for mobile could be added here */}
      <Sidebar className="hidden md:flex" />
      <div className="flex flex-col flex-1">
         <Header /* toggleSidebar={toggleSidebar} // Pass toggle function if needed */ />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Add max-width and center content */}
          <div className="max-w-7xl mx-auto">
             <Outlet /> {/* Child routes render here */}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;