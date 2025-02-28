import React, { useState, useEffect, useCallback } from 'react';
import { DocumentView } from './DocumentView';
import { SpaceBetween, Container, Button, StatusIndicator, ProgressBar, Tabs, Alert, ExpandableSection } from '@cloudscape-design/components';
import { FileUpload } from './FileUpload';
import { WorkloadIdInput } from './WorkloadIdInput';
import { PillarSelector } from './PillarSelector';
import { AnalysisResults } from './AnalysisResults';
import { RiskSummary } from './RiskSummary';
import { useAnalyzer } from '../hooks/useAnalyzer';
import { UploadedFile, WellArchitectedPillar, IaCTemplateType, UpdatedDocument, WorkItem, WorkItemResponse, WorkItemContent } from '../types';
import { analyzerApi } from '../services/api';
import { storageApi } from '../services/storage';
import { socketService } from '../services/socket';
import { IaCTemplateSelector } from './IaCTemplateSelector';

const DEFAULT_PILLARS: WellArchitectedPillar[] = [
  { id: 'operational-excellence', name: 'Operational Excellence', selected: true },
  { id: 'security', name: 'Security', selected: true },
  { id: 'reliability', name: 'Reliability', selected: true },
  { id: 'performance-efficiency', name: 'Performance Efficiency', selected: true },
  { id: 'cost-optimization', name: 'Cost Optimization', selected: true },
  { id: 'sustainability', name: 'Sustainability', selected: true },
];

interface ImplementationProgress {
  status: string;
  progress: number;
}

interface Props {
  onWorkItemsRefreshNeeded?: () => void;
}

export const WellArchitectedAnalyzer: React.FC<Props> = ({ onWorkItemsRefreshNeeded }) => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [updatedDocument, setUpdatedDocument] = useState<UpdatedDocument | null>(null);
  const [workloadId, setWorkloadId] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState('analysis');
  const [selectedPillars, setSelectedPillars] = useState(
    DEFAULT_PILLARS.filter(p => p.selected).map(p => p.id)
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImplementing, setIsImplementing] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [implementationProgress, setImplementationProgress] = useState<ImplementationProgress | null>(null);
  const [selectedIaCType, setSelectedIaCType] = useState<IaCTemplateType>(
    IaCTemplateType.CLOUDFORMATION_YAML
  );
  const [isImageFile, setIsImageFile] = useState(false);
  const [showCancellationAlert, setShowCancellationAlert] = useState(false);
  const [documentViewTabTitle, setDocumentViewTabTitle] = useState('IaC Document');
  const [showGenerationErrorWarning, setShowGenerationErrorWarning] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [activeWorkItem, setActiveWorkItem] = useState<WorkItem | null>(null);
  const [currentWorkItemName, setCurrentWorkItemName] = useState<string>('');

  const {
    analyze,
    cancelAnalysis,
    isCancellingAnalysis,
    showAnalysisCancellationAlert,
    setShowAnalysisCancellationAlert,
    updateWorkload,
    generateReport,
    downloadRecommendations,
    refreshSummary,
    deleteWorkload,
    setError,
    analysisResults,
    riskSummary,
    isAnalyzing,
    isUpdating,
    error,
    progress,
    isRefreshing,
    isGeneratingReport,
    isDeleting,
    canDeleteWorkload,
    createdWorkloadId,
    showPartialResultsWarning,
    setShowPartialResultsWarning,
    partialResultsError,
    setAnalysisResults,
    setPartialResultsError,
  } = useAnalyzer();

  useEffect(() => {
    const cleanup = socketService.onImplementationProgress((progressData: ImplementationProgress) => {
      setImplementationProgress(progressData);
    });

    return () => {
      cleanup();
    };
  }, []);

  const handleAnalyze = async () => {
    if (!uploadedFile || !activeWorkItem) return;

    try {
      // Refresh side navigation when analysis starts
      onWorkItemsRefreshNeeded?.();

      const result = await analyze(
        activeWorkItem.fileId,
        workloadId,
        selectedPillars,
      );

      // Update activeWorkItem with fileId from analysis result, even for partial results
      if (result.fileId && activeWorkItem) {
        // If we have an existing activeWorkItem, update it
        setActiveWorkItem({
          ...activeWorkItem,
          fileId: result.fileId,
        });
        setCurrentWorkItemName(`${activeWorkItem.fileName}`);
        if (!activeWorkItem?.fileType.startsWith('image/')) {
          setUpdatedDocument(null);
        }
      } else if (result.fileId) {
        // If we don't have an activeWorkItem but have a fileId, create a new minimal WorkItem
        setActiveWorkItem({
          userId: '', // This will be set by the backend
          fileId: result.fileId,
          fileName: uploadedFile.name,
          fileType: uploadedFile.type,
          uploadDate: new Date().toISOString(),
          analysisStatus: 'IN_PROGRESS',
          analysisProgress: 0,
          iacGenerationStatus: 'NOT_STARTED',
          iacGenerationProgress: 0,
          s3Prefix: `${result.fileId}`, // The actual prefix will be managed by backend
          lastModified: new Date().toISOString()
        });
        setCurrentWorkItemName(`${activeWorkItem.fileName}`);
        if (!activeWorkItem?.fileType.startsWith('image/')) {
          setUpdatedDocument(null);
        }
      }
    } catch (err) {
      // Handle any errors that might occur during analysis
      console.error("Analysis failed:", err);
      setError(err instanceof Error ? err.message : 'Analysis failed unexpectedly. Please try again.');
    } finally {
      // Always refresh side navigation when analysis completes or fails
      onWorkItemsRefreshNeeded?.();
    }
  };

  const handleUpdate = async () => {
    await updateWorkload(workloadId);
  };

  const getFileType = (fileName: string, currentType: string | undefined): string => {
    if (fileName.endsWith('.tf')) return 'application/terraform';
    if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) return 'application/yaml';
    if (fileName.endsWith('.json')) return 'application/json';
    return currentType || 'undefined';
  };

  const handleFileUploaded = (file: UploadedFile, fileId: string) => {
    const processedFile = {
      ...file,
      type: getFileType(file.name, file.type)
    };

    setUploadedFile(processedFile);
    setIsImageFile(processedFile.type.startsWith('image/'));
    setActiveWorkItem(null);

    // Store the fileId for later use
    setActiveWorkItem({
      userId: '', // This will be set by the backend
      fileId: fileId,
      fileName: file.name,
      fileType: processedFile.type,
      uploadDate: new Date().toISOString(),
      analysisStatus: 'NOT_STARTED',
      analysisProgress: 0,
      iacGenerationStatus: 'NOT_STARTED',
      iacGenerationProgress: 0,
      s3Prefix: `${fileId}`,
      lastModified: new Date().toISOString()
    });
  };

  const handleGenerateReport = async () => {
    const activeWorkloadId = workloadId || createdWorkloadId;
    if (!activeWorkloadId) return;
    await generateReport(activeWorkloadId, uploadedFile?.name || 'unknown_file');
  };

  const handleRefresh = () => {
    const activeWorkloadId = workloadId || createdWorkloadId;
    if (!activeWorkloadId) return;
    refreshSummary(activeWorkloadId);
  };

  const handleGenerateIacDocument = async () => {
    if (!uploadedFile || !analysisResults || !activeWorkItem) return;

    try {
      // Refresh side navigation when IaC generation starts
      onWorkItemsRefreshNeeded?.();

      setIsImplementing(true);
      setShowGenerationErrorWarning(false);
      setGenerationError(null);

      const result = await analyzerApi.generateIacDocument(
        activeWorkItem.fileId,
        analysisResults,
        selectedIaCType
      );

      // Refresh side navigation when IaC generation completes (success, failure, or cancelled)
      onWorkItemsRefreshNeeded?.();

      if (result.error) {
        onWorkItemsRefreshNeeded?.();
        setShowGenerationErrorWarning(true);
        setGenerationError(result.error);
      }

      if (result.content) {
        setUpdatedDocument({
          content: result.content,
          name: uploadedFile.name,
          templateType: selectedIaCType
        });
        setDocumentViewTabTitle('IaC Document (Updated)');

        if (result.isCancelled) {
          setShowCancellationAlert(true);
        }
      }
    } catch (error) {
      setShowGenerationErrorWarning(true);
      setGenerationError('An unexpected error occurred during generation.');
    } finally {
      setIsImplementing(false);
      setImplementationProgress(null);
    }
  };

  const handleDownloadRecommendations = async () => {
    try {
      setIsDownloading(true);
      await downloadRecommendations(uploadedFile?.name || 'unknown_file');
    } finally {
      setIsDownloading(false);
    }
  };

  const acceptedFileTypes = [
    '.yaml', '.yml', '.json', '.tf',  // IaC files
    '.png', '.jpg', '.jpeg'           // Image files
  ];

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const pad = (num: number) => String(num).padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    const second = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };

  const handleWorkItemSelect = useCallback(async (workItem: WorkItem) => {
    try {
      setActiveWorkItem(workItem);

      setCurrentWorkItemName(`[${formatDateTime(workItem.lastModified)}] ${workItem.fileName}`);

      // Get the complete work item with all results
      const result = await storageApi.getWorkItem(workItem.fileId) as WorkItemResponse;

      // Only proceed if we got results
      if (!result) {
        setError('Failed to load work item results');
        return;
      }

      if (workItem?.fileType.startsWith('image/')) {
        setIsImageFile(true);
      }

      if (workItem?.iacGenerationStatus === 'NOT_STARTED' || workItem?.iacGenerationStatus === 'FAILED') {
        setUpdatedDocument(null);
        // If currently on the IaC Document tab, switch to analysis tab
        if (activeTabId === 'diff') {
          setActiveTabId('analysis');
        }
      }

      // Set the uploaded file info
      if (result.content) {
        let fileContent: string;

        // Handle different content types
        if (typeof result.content === 'string') {
          fileContent = result.content;
        } else {
          const contentObj = result.content as WorkItemContent;
          if (workItem.fileType.startsWith('image/')) {
            // For images, ensure proper base64 format
            fileContent = contentObj.data.startsWith('data:')
              ? contentObj.data
              : `data:${workItem.fileType};base64,${contentObj.data}`;
          } else {
            // For text content
            fileContent = contentObj.data;
          }
        }

        setUploadedFile({
          name: workItem.fileName,
          content: fileContent,
          type: workItem.fileType,
          size: new Blob([fileContent]).size,
        });
      }

      // Load analysis results if completed
      if ((workItem.analysisStatus === 'COMPLETED' || workItem.analysisStatus === 'PARTIAL') && result.analysisResults) {
        setAnalysisResults(result.analysisResults);
        setActiveTabId('analysis');
      }

      // Load IaC document if completed
      if ((workItem.iacGenerationStatus === 'COMPLETED' || workItem.iacGenerationStatus === 'PARTIAL') && result.iacDocument) {
        setUpdatedDocument({
          content: result.iacDocument,
          name: workItem.fileName,
          templateType: selectedIaCType,
        });
        if (!result.analysisResults) {
          setActiveTabId('diff');
        }
      }

      // Show any errors if either process failed
      if (workItem.analysisError || workItem.iacGenerationError) {
        setShowPartialResultsWarning(true);
        setPartialResultsError(
          `Previous errors encountered: ${[
            workItem.analysisError,
            workItem.iacGenerationError,
          ]
            .filter(Boolean)
            .join(', ')}`
        );
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load work item');
    }
  }, [setActiveWorkItem, setError, setUploadedFile, setAnalysisResults, setActiveTabId, setUpdatedDocument, selectedIaCType]);

  // Effect to listen for workItemSelected events
  useEffect(() => {
    const handleWorkItemSelected = async (event: Event) => {
      const customEvent = event as CustomEvent<{ workItem: WorkItem }>;
      try {
        await handleWorkItemSelect(customEvent.detail.workItem);

        // Dispatch loadComplete event
        const element = document.querySelector('[data-testid="well-architected-analyzer"]');
        if (element) {
          element.dispatchEvent(new CustomEvent('loadComplete', { bubbles: true }));
        }
      } catch (error) {
        console.error('Error handling work item selection:', error);
        // Still dispatch loadComplete even if there's an error
        const element = document.querySelector('[data-testid="well-architected-analyzer"]');
        if (element) {
          element.dispatchEvent(new CustomEvent('loadComplete', { bubbles: true }));
        }
      }
    };

    const element = document.querySelector('[data-testid="well-architected-analyzer"]');
    if (element) {
      element.addEventListener('workItemSelected', handleWorkItemSelected);
    }

    return () => {
      if (element) {
        element.removeEventListener('workItemSelected', handleWorkItemSelected);
      }
    };
  }, [handleWorkItemSelect]);

  return (
    <SpaceBetween size="l">
      <Container key="main-upload-container">
        <SpaceBetween size="l">
          <FileUpload
            key="file-upload"
            onFileUploaded={handleFileUploaded}
            acceptedFileTypes={acceptedFileTypes}
          />

          <PillarSelector
            key="pillar-selector"
            pillars={DEFAULT_PILLARS}
            selectedPillars={selectedPillars}
            onChange={setSelectedPillars}
            disabled={isAnalyzing || isUpdating}
          />

          <ExpandableSection
            key="optional-settings"
            variant="inline"
            headerText="Optional settings"
          >
            <SpaceBetween size="l">
              <WorkloadIdInput
                key="workload-id-input"
                value={workloadId || ''}
                onChange={(value) => setWorkloadId(value || null)}
                optional={true}
                disabled={!!createdWorkloadId}
              />
              <IaCTemplateSelector
                key="iac-template-selector"
                value={selectedIaCType}
                onChange={setSelectedIaCType}
                disabled={isAnalyzing || isUpdating || !isImageFile}
              />
            </SpaceBetween>
          </ExpandableSection>



          {error && (
            <Alert
              key="error-alert"
              type="error"
              dismissible
              onDismiss={() => setError(null)}
              header="Error"
            >
              {error}
            </Alert>
          )}

          <SpaceBetween key="action-buttons" size="xs" direction="horizontal">
            <Button
              key="analyze-button"
              variant="primary"
              onClick={handleAnalyze}
              loading={isAnalyzing}
              disabled={!uploadedFile || selectedPillars.length === 0}
              iconName="gen-ai"
            >
              Start Review
            </Button>
            {isAnalyzing && (
              <Button
                key="cancel-button"
                onClick={cancelAnalysis}
                iconName="close"
                disabled={isCancellingAnalysis || !progress}
                loading={isCancellingAnalysis}
              >
                {isCancellingAnalysis ? 'Cancelling...' : 'Cancel Review'}
              </Button>
            )}
          </SpaceBetween>
        </SpaceBetween>
      </Container>

      {isAnalyzing && progress && (
        <Container key="main-analysis-progress">
          <SpaceBetween size="m">
            <StatusIndicator key="analysis-progress-status" type="in-progress">
              [{progress.processedQuestions}/{progress.totalQuestions}] Analyzing uploaded file according to:
              '{progress.currentPillar} - {progress.currentQuestion}'
            </StatusIndicator>
            <ProgressBar
              key="analysis-progress-bar"
              value={Math.round((progress.processedQuestions / progress.totalQuestions) * 100)}
              description="Analysis progress"
            />
          </SpaceBetween>
        </Container>
      )}

      {isImplementing && implementationProgress && (
        <Container key="main-implementation-progress">
          <SpaceBetween size="m">
            <StatusIndicator key="implementation-progress-status" type="in-progress">
              {implementationProgress.status}
            </StatusIndicator>
            <ProgressBar
              key="implementation-progress-bar"
              value={implementationProgress.progress}
              description="IaC document generation progress"
            />
          </SpaceBetween>
        </Container>
      )}

      {isLoadingDetails && implementationProgress && (
        <Container key="main-loading-progress">
          <SpaceBetween size="m">
            <StatusIndicator key="loading-progress-status" type="in-progress">
              {implementationProgress.status}
            </StatusIndicator>
            <ProgressBar
              key="loading-progress-bar"
              value={implementationProgress.progress}
              description="Analysis progress"
            />
          </SpaceBetween>
        </Container>
      )}

      {showAnalysisCancellationAlert && (
        <Alert
          key="main-analysis-cancellation-alert"
          onDismiss={() => setShowAnalysisCancellationAlert(false)}
          dismissible
          type="warning"
          header="Analysis cancelled"
        >
          The analysis of the uploaded file was cancelled. Partial results are shown below.
          You can either use these partial results or try analyzing the complete
          file again.
        </Alert>
      )}

      {showCancellationAlert && (
        <Alert
          key="main-cancellation-alert"
          onDismiss={() => setShowCancellationAlert(false)}
          dismissible
          type="warning"
          header="Generation cancelled"
        >
          The IaC document generation was cancelled. A partial version has been generated
          and can be viewed in the 'IaC Document' tab. You can either use this partial
          version or try generating the complete document again.
        </Alert>
      )}

      {showPartialResultsWarning && (
        <Alert
          key="main-partial-results-warning"
          onDismiss={() => setShowPartialResultsWarning(false)}
          dismissible
          type="warning"
          header="Partial Analysis Results"
        >
          {partialResultsError + ' ' || 'Analysis was interrupted. Showing partial results.'}
          You can either use these partial results or try
          analyzing the complete file again after waiting a few minutes.
        </Alert>
      )}

      {showGenerationErrorWarning && (
        <Alert
          key="main-generation-error-warning"
          onDismiss={() => setShowGenerationErrorWarning(false)}
          dismissible
          type="warning"
          header="Partial IaC Document Generation"
        >
          {generationError + ' ' || 'Template generation was interrupted. Showing partial results.'}
          You can try generating the complete document again after waiting a few minutes.
        </Alert>
      )}

      {currentWorkItemName && (
        <Alert
          key="main-current-work-item-alert"
          type="info"
          statusIconAriaLabel="Info"
        >
          Current work item: "{currentWorkItemName}"
        </Alert>
      )}

      {analysisResults && (
        <Tabs
          key="main-results-tabs"
          activeTabId={activeTabId}
          onChange={({ detail }) => {
            setActiveTabId(detail.activeTabId);
            if (detail.activeTabId == 'diff')
              setDocumentViewTabTitle('IaC Document')
          }}
          tabs={[
            {
              id: 'analysis',
              label: 'Analysis Results',
              content: (
                <div key="analysis-tab-content">
                  <AnalysisResults
                    key="analysis-results"
                    results={analysisResults}
                    isAnalyzing={isAnalyzing}
                    onDownloadRecommendations={handleDownloadRecommendations}
                    onGenerateIacDocument={handleGenerateIacDocument}
                    isDownloading={isDownloading}
                    isImplementing={isImplementing}
                    isLoadingDetails={isLoadingDetails}
                    setIsLoadingDetails={setIsLoadingDetails}
                    uploadedFileType={uploadedFile?.type || ''}
                    selectedIaCType={selectedIaCType}
                    setError={setError}
                    fileId={activeWorkItem?.fileId || ''}
                    fileName={uploadedFile?.name || 'unknown_file'}
                  />
                </div>
              )
            },
            {
              id: 'wat',
              label: 'Well-Architected Tool',
              disabled: isLoadingDetails || isImplementing,
              content: (
                <div key="wat-content">
                  <RiskSummary
                    key="risk-summary"
                    summary={riskSummary}
                    onUpdate={handleUpdate}
                    onGenerateReport={handleGenerateReport}
                    onDeleteWorkload={deleteWorkload}
                    onRefresh={handleRefresh}
                    isUpdating={isUpdating}
                    isRefreshing={isRefreshing}
                    isGeneratingReport={isGeneratingReport}
                    isDeleting={isDeleting}
                    canDeleteWorkload={canDeleteWorkload}
                    hasProvidedWorkloadId={!!workloadId}
                  />
                </div>
              )
            },
            {
              id: 'diff',
              label: documentViewTabTitle,
              disabled: isLoadingDetails || isImplementing || !updatedDocument,
              content: (
                <div key="diff-content">
                  {updatedDocument && (
                    <DocumentView
                      key="document-view"
                      content={updatedDocument.content}
                      fileName={updatedDocument.name}
                      selectedIaCType={selectedIaCType}
                    />
                  )}
                </div>
              )
            }
          ]}
        />
      )}
    </SpaceBetween>
  );
};