import { WorkItem, WorkItemResponse } from '../types';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/storage',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const storageApi = {
  async listWorkItems(): Promise<WorkItem[]> {
    try {
      const response = await api.get('/work-items');
      return response.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to list work items'
      );
    }
  },

  async getWorkItem(fileId: string): Promise<WorkItemResponse> {
    try {
      const response = await api.get(`/work-items/${fileId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to get work item'
      );
    }
  },

  async uploadFile(file: File): Promise<{ fileId: string }> {
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/work-items/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to upload file'
      );
    }
  },

  async deleteWorkItem(fileId: string): Promise<void> {
    try {
      await api.delete(`/work-items/${fileId}`);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to delete work item'
      );
    }
  },

  async downloadOriginalContent(fileId: string, fileName: string): Promise<void> {
    try {
      // Get the content with responseType arraybuffer for binary data
      const response = await api.get(`/work-items/${fileId}/content`, {
        responseType: 'arraybuffer'
      });

      // Get the content type from headers
      const contentType = response.headers['content-type'] || 'application/octet-stream';

      // Create blob from array buffer
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to download original content'
      );
    }
  }
};