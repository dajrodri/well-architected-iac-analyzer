import React from 'react';
import { Input, FormField, Link } from '@cloudscape-design/components';
import { HelpButton } from './utils/HelpButton';

interface WorkloadIdInputProps {
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  disabled?: boolean;
}

export const WorkloadIdInput: React.FC<WorkloadIdInputProps> = ({
  value,
  onChange,
  optional = false,
  disabled = false,
}) => {
  return (
    <FormField
      label={
        <>
          Well-Architected Tool Workload Id <HelpButton contentId="workloadId" />
        </>
      }
      description={
        <>
          {optional
            ? 'Optionally enter an existing Well-Architected Tool workload ID, or leave empty to create a new one.'
            : 'Enter the Workload ID from your Well-Architected Tool workload.'}{' '}
          <Link
            external
            href="https://docs.aws.amazon.com/wellarchitected/latest/userguide/define-workload.html"
          >
            Learn more
          </Link>
        </>
      }
    >
      <Input
        value={value}
        onChange={event => onChange(event.detail.value)}
        placeholder={optional ? "Enter workload ID (optional)" : "Enter workload ID"}
        disabled={disabled}
      />
    </FormField>
  );
};