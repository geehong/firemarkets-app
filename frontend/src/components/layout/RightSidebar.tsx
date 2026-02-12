'use client';

import React from 'react';
import SidebarAdsWidget from './SidebarAdsWidget';

const RightSidebar = () => {
    return (
        <div className="hidden lg:block w-[300px] min-w-[300px] space-y-6">
            <div className="sticky top-28 space-y-6">
                <SidebarAdsWidget />
            </div>
        </div>
    );
};

export default RightSidebar;
