import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
const Layout = ({ children }) => {
    return (
        <div className="layout">
            <Header />
            <main className="main-content">
                <div className="content-inner">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
