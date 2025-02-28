export interface WellArchitectedPillar {
  id: string;
  name: string;
  selected: boolean;
}

export interface BestPractice {
  id: string;
  name: string;
  pillarId: string;
  questionId: string;
  applied: boolean;
  reasonApplied?: string;
  reasonNotApplied?: string;
  recommendations?: string;
}

export interface AnalysisResult {
  pillar: string;
  question: string;
  questionId: string;
  bestPractices: BestPractice[];
}

export interface WorkloadReview {
  workloadId: string;
  lensAlias: string;
  results: AnalysisResult[];
}

export interface RiskSummary {
  pillarName: string;
  totalQuestions: number;
  answeredQuestions: number;
  highRisks: number;
  mediumRisks: number;
}

export interface UploadedFile {
  name: string;
  content: string;
  type: string;
  size: number;
}

export enum FileType {
  IAC = 'iac',
  IMAGE = 'image'
}

export interface UpdatedDocument {
  content: string;
  name: string;
  templateType?: IaCTemplateType;
}

export interface WorkloadCreationResult {
  workloadId: string;
  isTemp: boolean;
}

export interface RiskSummaryProps {
  summary: RiskSummary[] | null;
  onUpdate: () => void;
  onGenerateReport: () => void;
  onDeleteWorkload: () => void;
  onRefresh: () => void;
  isUpdating: boolean;
  isRefreshing: boolean;
  isGeneratingReport: boolean;
  isDeleting: boolean;
  canDeleteWorkload: boolean;
  hasProvidedWorkloadId: boolean;
}

export interface SelectedAnalysisItem {
  pillar: string;
  question: string;
  questionId: string;
  bestPractices: BestPractice[];
}

export interface SelectedItem {
  pillar: string;
  question: string;
  bestPractices: {
      id: string;
      name: string;
      applied: boolean;
      recommendations?: string;
  }[];
}

export enum IaCTemplateType {
  CLOUDFORMATION_YAML = 'CloudFormation (.yaml) template',
  CLOUDFORMATION_JSON = 'CloudFormation (.json) template',
  TERRAFORM = 'Terraform (.tf) document'
}

export * from './auth';

export interface WorkItem {
  // Partition and Sort Keys
  userId: string;           // Partition key (email hash)
  fileId: string;          // Sort key (file hash)
  
  // Attributes
  fileName: string;        // Original file name
  fileType: string;        // MIME type
  uploadDate: string;      // ISO timestamp
  
  // Analysis Status
  analysisStatus: WorkItemStatus;
  analysisProgress: number;
  analysisError?: string;
  analysisPartialResults?: boolean;
  
  // IaC Generation Status
  iacGenerationStatus: WorkItemStatus;
  iacGenerationProgress: number;
  iacGenerationError?: string;
  iacPartialResults?: boolean;
  
  // S3 References
  s3Prefix: string;        // Base S3 path for this work item
  
  // Metadata
  lastModified: string;    // Last activity timestamp
  tags?: string[];         // Optional user tags
  workloadId?: string;     // Associated WA Tool workload ID
}

export type WorkItemStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export interface WorkItemContent {
  data: string;
  contentType: string;
}

export interface WorkItemResponse {
  workItem: WorkItem;
  content?: WorkItemContent | string;
  analysisResults?: any;
  iacDocument?: string;
}