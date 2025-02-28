import React, { useState } from 'react';
import {
  FormField,
  Header,
  SpaceBetween,
  Alert,
  StatusIndicator,
  Spinner,
  FileUpload as CloudscapeFileUpload
} from '@cloudscape-design/components';
import { UploadedFile } from '../types';
import { HelpButton } from './utils/HelpButton';
import { storageApi } from '../services/storage';

interface FileUploadProps {
  onFileUploaded: (file: UploadedFile, fileId: string) => void;
  acceptedFileTypes: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  acceptedFileTypes,
}) => {
  const [value, setValue] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'initial' | 'success' | 'error'>('initial');

  const handleFileChange = async (files: File[]) => {
    setValue(files);
    setError(null);

    if (!files.length) {
      return;
    }

    try {
      setIsUploading(true);
      const file = files[0];

      // Get file type
      const fileType = file.type.startsWith('image/') 
        ? file.type 
        : file.name.endsWith('.tf') 
          ? 'application/terraform'
          : file.name.endsWith('.yaml') || file.name.endsWith('.yml')
            ? 'application/yaml'
            : file.name.endsWith('.json')
              ? 'application/json'
              : file.type;

      // Create the uploaded file object
      const uploadedFile: UploadedFile = {
        name: file.name,
        content: '', // We'll no longer send the content in the request
        type: fileType,
        size: file.size,
      };

      // Upload file to S3 and create work item
      const { fileId } = await storageApi.uploadFile(file);

      setUploadStatus('success');
      onFileUploaded(uploadedFile, fileId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SpaceBetween size="l">
      <FormField
        label={
          <>
            <Header variant="h3">
              1. Upload your IaC document or architecture diagram image <HelpButton contentId="fileUpload" />
            </Header>
          </>
        }
        errorText={error}
      >
        <SpaceBetween size="s">
          <CloudscapeFileUpload
            onChange={({ detail }) => handleFileChange(detail.value)}
            value={value}
            constraintText={`Supported file types ${acceptedFileTypes.join(' or ')}`}
            accept={acceptedFileTypes.join(',')}
            i18nStrings={{
              uploadButtonText: () => isUploading ? 'Uploading...' : 'Choose file',
              dropzoneText: () => isUploading ? 'Uploading...' : 'Drop file to upload',
            }}
            showFileLastModified
            showFileSize
            tokenLimit={1}
            multiple={false}
          />
          {isUploading && (
            <Spinner />
          )}
          {uploadStatus === 'success' && !isUploading && (
            <StatusIndicator type="success">
              File uploaded successfully
            </StatusIndicator>
          )}
        </SpaceBetween>
      </FormField>

      {error && (
        <Alert type="error" header="Error uploading file">
          {error}
        </Alert>
      )}
    </SpaceBetween>
  );
};