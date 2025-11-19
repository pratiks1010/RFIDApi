import React from 'react';
import { Outlet } from 'react-router-dom';
import SidebarLayout from './SidebarLayout';

const Layout = () => {
  return (
    <SidebarLayout>
      <Outlet />
    </SidebarLayout>
  );
};

export default Layout; 