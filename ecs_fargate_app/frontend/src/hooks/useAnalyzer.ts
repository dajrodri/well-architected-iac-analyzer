import { useState, useEffect } from 'react';
import { analyzerApi } from '../services/api';
import { socketService } from '../services/socket';
import { AnalysisResult, RiskSummary } from '../types';

export const useAnalyzer = () => {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[] | null>(null);
  const [riskSummary, setRiskSummary] = useState<RiskSummary[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    processedQuestions: number;
    totalQuestions: number;
    currentPillar: string;
    currentQuestion: string;
  } | null>(null);
  const [createdWorkloadId, setCreatedWorkloadId] = useState<string | null>(null);
  const [canDeleteWorkload, setCanDeleteWorkload] = useState(false);
  const [showAnalysisCancellationAlert, setShowAnalysisCancellationAlert] = useState(false);
  const [isCancellingAnalysis, setIsCancellingAnalysis] = useState(false);
  const [showPartialResultsWarning, setShowPartialResultsWarning] = useState(false);
  const [partialResultsError, setPartialResultsError] = useState<string | null>(null);

  useEffect(() => {
    const cleanup = socketService.onAnalysisProgress((progressData) => {
      setProgress(progressData);
    });

    return () => {
      cleanup();
      socketService.disconnect();
    };
  }, []);

  const analyze = async (
    fileId: string,
    workloadId: string | null,
    selectedPillars: string[],
  ): Promise<{ results: AnalysisResult[]; isCancelled: boolean; error?: string; fileId?: string }> => {
    setIsAnalyzing(true);
    setError(null);
    setProgress(null);
    setShowPartialResultsWarning(false);
    setPartialResultsError(null);
    let tempWorkloadId: string | null = null;
  
    try {
      // Create temp workload if no workloadId provided
      if (!workloadId) {
        tempWorkloadId = await analyzerApi.createWorkload(true);
        workloadId = tempWorkloadId;
      }
  
      const { results, isCancelled, error: analysisError, fileId: resultFileId } = await analyzerApi.analyze(
        fileId,
        workloadId,
        selectedPillars
      );
  
      setAnalysisResults(results);
  
      if (isCancelled) {
        setShowAnalysisCancellationAlert(true);
      } else if (analysisError) {
        setShowPartialResultsWarning(true);
        setPartialResultsError(analysisError);
      }
  
      // Delete temp workload if it was created
      if (tempWorkloadId) {
        await analyzerApi.deleteWorkload(tempWorkloadId);
      }
  
      return { results, isCancelled, error: analysisError, fileId: resultFileId };
  
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
  
      // If we have any results, show partial results warning
      if (analysisResults && analysisResults.length > 0) {
        setShowPartialResultsWarning(true);
        setPartialResultsError('Analysis failed unexpectedly. Showing partial results.');
      }
  
      // Return a failure result
      return {
        results: analysisResults || [],
        isCancelled: false,
        error: errorMessage
      };
  
    } finally {
      setIsAnalyzing(false);
      setIsCancellingAnalysis(false);
      setProgress(null);
    }
  };

  const cancelAnalysis = async () => {
    try {
      setIsCancellingAnalysis(true);
      await analyzerApi.cancelAnalysis();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel analysis');
    }
  };

  const updateWorkload = async (providedWorkloadId: string | null) => {
    if (!analysisResults) return;

    setIsUpdating(true);
    setError(null);
    try {
      let workloadId = providedWorkloadId;

      // Create new workload if no workloadId provided
      if (!workloadId) {
        workloadId = await analyzerApi.createWorkload(false);
        setCreatedWorkloadId(workloadId);
        setCanDeleteWorkload(true);
      }

      for (const result of analysisResults) {
        const appliedBestPractices = result.bestPractices
          .filter(bp => bp.applied)
          .map(bp => bp.id);

        if (appliedBestPractices.length > 0) {
          await analyzerApi.updateWorkload(
            workloadId,
            result.questionId,
            appliedBestPractices
          );
        }
      }

      const milestoneName = `Review completed on ${new Date().toISOString()}`;
      await analyzerApi.createMilestone(workloadId, milestoneName);

      const summary = await analyzerApi.getRiskSummary(workloadId);
      setRiskSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteWorkload = async () => {
    if (!createdWorkloadId || !canDeleteWorkload) return;

    setIsDeleting(true);
    try {
      await analyzerApi.deleteWorkload(createdWorkloadId);
      setCreatedWorkloadId(null);
      setCanDeleteWorkload(false);
      setRiskSummary(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workload');
    } finally {
      setIsDeleting(false);
    }
  };

  const generateReport = async (workloadId: string, originalFileName: string = 'unknown_file') => {
    setIsGeneratingReport(true);
    try {
      const base64String = await analyzerApi.generateReport(workloadId);
      if (!base64String) {
        throw new Error('No report data received');
      }

      const safeFileName = originalFileName.replace(/\./g, '_');

      // Convert base64 to Blob and download
      const binaryString = window.atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IaCAnalyzer_Review_Report_${safeFileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const downloadRecommendations = async (originalFileName: string = 'unknown_file') => {
    if (!analysisResults) return;

    try {
      const safeFileName = originalFileName.replace(/\./g, '_');

      const csv = await analyzerApi.generateRecommendations(analysisResults);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IaCAnalyzer_Analysis_Results_${safeFileName}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download recommendations');
    }
  };

  const refreshSummary = async (workloadId: string) => {
    setIsRefreshing(true);
    try {
      const summary = await analyzerApi.getRiskSummary(workloadId);
      setRiskSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh summary');
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    analyze,
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
    createdWorkloadId,
    canDeleteWorkload,
    isDeleting,
    cancelAnalysis,
    isCancellingAnalysis,
    showAnalysisCancellationAlert,
    setShowAnalysisCancellationAlert,
    showPartialResultsWarning,
    setShowPartialResultsWarning,
    partialResultsError,
    setAnalysisResults,
    setPartialResultsError,
  };
};