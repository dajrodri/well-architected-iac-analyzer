import React from 'react';
import {
  Container,
  StatusIndicator,
  Table,
  Button,
  SpaceBetween,
  Header,
  KeyValuePairs,
  ButtonDropdown,
} from '@cloudscape-design/components';
import { HelpButton } from './utils/HelpButton';
import { RiskSummary as RiskSummaryType, RiskSummaryProps } from '../types';

export const RiskSummary: React.FC<RiskSummaryProps> = ({
  summary,
  onUpdate,
  onGenerateReport,
  onDeleteWorkload,
  onRefresh,
  isUpdating,
  isRefreshing,
  isGeneratingReport,
  isDeleting,
  canDeleteWorkload,
  hasProvidedWorkloadId
}) => {
  const totalHighRisks = summary?.reduce((acc, s) => acc + s.highRisks, 0) ?? 0;
  const totalMediumRisks = summary?.reduce((acc, s) => acc + s.mediumRisks, 0) ?? 0;
  const totalQuestions = summary?.reduce((acc, s) => acc + s.totalQuestions, 0) ?? 0;
  const totalAnswered = summary?.reduce((acc, s) => acc + s.answeredQuestions, 0) ?? 0;

  const dropdownItems = [
    {
      id: 'generate-report',
      text: 'Generate Well-Architected Tool Report',
      disabled: !summary || isUpdating || isGeneratingReport
    },
    {
      id: 'delete-workload',
      text: 'Delete Well-Architected Tool Workload',
      disabled: !canDeleteWorkload || hasProvidedWorkloadId || isDeleting
    }
  ];

  const handleDropdownAction = ({ detail: { id } }: { detail: { id: string } }) => {
    switch (id) {
      case 'generate-report':
        onGenerateReport();
        break;
      case 'delete-workload':
        onDeleteWorkload();
        break;
    }
  };

  return (
    <div>
      <Container
        variant="stacked"
      >
        <KeyValuePairs
          columns={3}
          items={[
            {
              label: "Questions Answered",
              value: isRefreshing || isUpdating ?
                <StatusIndicator type="loading">Loading</StatusIndicator> :
                <StatusIndicator type="info">{totalAnswered}/{totalQuestions}</StatusIndicator>
            },
            {
              label: "High Risks",
              value: isRefreshing || isUpdating ?
                <StatusIndicator type="loading">Loading</StatusIndicator> :
                <StatusIndicator type="error">{totalHighRisks}</StatusIndicator>
            },
            {
              label: "Medium Risks",
              value: isRefreshing || isUpdating ?
                <StatusIndicator type="loading">Loading</StatusIndicator> :
                <StatusIndicator type="warning">{totalMediumRisks}</StatusIndicator>
            }
          ]}
        />
      </Container>
      <Table
        variant="stacked"
        columnDefinitions={[
          { id: 'pillar', header: 'Pillar', cell: item => item.pillarName },
          {
            id: 'progress',
            header: 'Progress',
            cell: (item: RiskSummaryType) => {
              const { answeredQuestions, totalQuestions } = item;
              return `${answeredQuestions}/${totalQuestions}`;
            }
          },
          { id: 'high', header: 'High Risks', cell: item => item.highRisks },
          { id: 'medium', header: 'Medium Risks', cell: item => item.mediumRisks },
        ]}
        loading={isRefreshing || isUpdating}
        loadingText="Loading risk summary data..."
        items={summary || []}
        header={
          <Header
            variant="h3"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <ButtonDropdown
                  items={dropdownItems}
                  loading={isUpdating || isGeneratingReport}
                  loadingText="Updating workload..."
                  onItemClick={handleDropdownAction}
                  mainAction={{
                    text: 'Complete Well-Architected Tool Review',
                    onClick: onUpdate
                  }}
                />
                <Button
                  iconName="refresh"
                  variant="icon"
                  onClick={onRefresh}
                  loading={isRefreshing}
                  disabled={!summary || isUpdating}
                />
              </SpaceBetween>
            }
            info={<HelpButton contentId="wellArchitectedTool" />}
          >
            Risk Summary
          </Header>
        }
      />
    </div>
  );
};