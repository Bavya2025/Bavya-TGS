import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import SecurityQuestionsSetupModal from './SecurityQuestionsSetupModal';

const Layout = ({ children }) => {
    return (
        <div className="layout">
            <Header />
            <main className="main-content">
                <div className="content-inner">
                    {children}
                </div>
            </main>
            <SecurityQuestionsSetupModal />
        </div>
    );
};

export default Layout;
