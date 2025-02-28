import React from 'react';
import { Select, FormField } from '@cloudscape-design/components';
import { HelpButton } from './utils/HelpButton';
import { IaCTemplateType } from '../types';

interface IaCTemplateSelectorProps {
  value: IaCTemplateType;
  onChange: (value: IaCTemplateType) => void;
  disabled?: boolean;
}

export const IaCTemplateSelector: React.FC<IaCTemplateSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <FormField
      label={
        <>
          IaC Template Type <HelpButton contentId="iacTypeSelection" />
        </>
      }
      description="Select the type of IaC template to generate from the architectural diagrams uploaded"
    >
      <Select
        selectedOption={{ label: value, value: value }}
        onChange={({ detail }) =>
          onChange(detail.selectedOption.value as IaCTemplateType)
        }
        options={Object.values(IaCTemplateType).map(type => ({
          label: type,
          value: type,
        }))}
        disabled={disabled}
      />
    </FormField>
  );
};