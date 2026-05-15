import React from 'react';
import { TopBar } from './TopBar';
import { LeftSidebar } from './LeftSidebar';
import { RightPanel } from './RightPanel';
import { BottomBar } from './BottomBar';
import { CanvasWorkspace } from '../canvas/CanvasWorkspace';

export const AppLayout: React.FC = () => {
  return (
    <div
      className="w-screen h-screen grid bg-[var(--bg-app)]"
      style={{
        gridTemplateAreas: `
          "topbar topbar topbar"
          "sidebar canvas rightpanel"
          "sidebar bottombar bottombar"
        `,
        gridTemplateColumns: 'var(--sidebar-w) 1fr var(--rightpanel-w)',
        gridTemplateRows: 'var(--topbar-h) 1fr var(--bottombar-h)',
        overflow: 'hidden',
      }}
    >
      <div style={{ gridArea: 'topbar' }} className="overflow-hidden">
        <TopBar />
      </div>

      <div style={{ gridArea: 'sidebar' }} className="overflow-hidden">
        <LeftSidebar />
      </div>

      <div style={{ gridArea: 'canvas' }} className="relative overflow-hidden">
        <CanvasWorkspace />
      </div>

      <div style={{ gridArea: 'rightpanel' }} className="overflow-y-auto overflow-x-hidden">
        <RightPanel />
      </div>

      <div style={{ gridArea: 'bottombar' }} className="overflow-hidden">
        <BottomBar />
      </div>
    </div>
  );
};
