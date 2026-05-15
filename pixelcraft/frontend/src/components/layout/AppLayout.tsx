import React from 'react';
import { TopBar } from './TopBar';
import { LeftSidebar } from './LeftSidebar';
import { RightPanel } from './RightPanel';
import { BottomBar } from './BottomBar';
import { CanvasWorkspace } from '../canvas/CanvasWorkspace';

export const AppLayout: React.FC = () => {
  return (
    <div
      className="w-screen h-screen grid bg-[var(--bg-app)] overflow-hidden"
      style={{
        gridTemplateAreas: `
          "topbar topbar topbar"
          "sidebar canvas rightpanel"
          "sidebar bottombar bottombar"
        `,
        gridTemplateColumns: 'var(--sidebar-w) 1fr var(--rightpanel-w)',
        gridTemplateRows: 'var(--topbar-h) 1fr var(--bottombar-h)',
      }}
    >
      <div style={{ gridArea: 'topbar' }}>
        <TopBar />
      </div>

      <div style={{ gridArea: 'sidebar' }}>
        <LeftSidebar />
      </div>

      <div style={{ gridArea: 'canvas' }} className="relative overflow-hidden">
        <CanvasWorkspace />
      </div>

      <div style={{ gridArea: 'rightpanel' }}>
        <RightPanel />
      </div>

      <div style={{ gridArea: 'bottombar' }}>
        <BottomBar />
      </div>
    </div>
  );
};
