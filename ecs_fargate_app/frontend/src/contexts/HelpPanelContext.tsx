import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HelpPanelContextType {
  isToolsOpen: boolean;
  content: {
    header: string;
    body: ReactNode;
  } | null;
  setIsToolsOpen: (isOpen: boolean) => void;
  setHelpContent: (header: string, body: ReactNode) => void;
}

const HelpPanelContext = createContext<HelpPanelContextType | undefined>(undefined);

export const HelpPanelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [content, setContent] = useState<{ header: string; body: ReactNode } | null>(null);

  const setHelpContent = (header: string, body: ReactNode) => {
    setContent({ header, body });
    setIsToolsOpen(true);
  };

  return (
    <HelpPanelContext.Provider value={{ 
      isToolsOpen, 
      content, 
      setIsToolsOpen,
      setHelpContent 
    }}>
      {children}
    </HelpPanelContext.Provider>
  );
};

export const useHelpPanel = () => {
  const context = useContext(HelpPanelContext);
  if (undefined === context) {
    throw new Error('useHelpPanel must be used within a HelpPanelProvider');
  }
  return context;
};