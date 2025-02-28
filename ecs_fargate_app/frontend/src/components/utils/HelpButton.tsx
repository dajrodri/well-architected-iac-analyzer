import React from 'react';
import { Button } from '@cloudscape-design/components';
import { useHelpPanel } from '../../contexts/HelpPanelContext';
import { helpContent } from './help-content';

interface HelpButtonProps {
  contentId: keyof typeof helpContent;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ contentId }) => {
  const { setHelpContent } = useHelpPanel();
  const content = helpContent[contentId];

  return (
    <Button
      variant="inline-icon"
      iconName="support"
      onClick={() => setHelpContent(content.header, content.body)}
      ariaLabel={`Help for ${content.header}`}
    />
  );
};