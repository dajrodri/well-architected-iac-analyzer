import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Headers,
    HttpException,
    HttpStatus,
    Res,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash } from 'crypto';
import { WorkItem } from '../../shared/interfaces/storage.interface';

@Controller('storage')
export class StorageController {
    constructor(
        private readonly storageService: StorageService,
        private readonly configService: ConfigService,
    ) { }

    private getUserId(email: string): string {
        return createHash('sha256').update(email).digest('hex');
    }

    private getUserEmail(userDataHeader: string): string | null {
        // Check if authentication is enabled
        const isAuthEnabled = this.configService.get<boolean>('auth.enabled', false);
        
        if (!isAuthEnabled) {
            // Return default "iac-analyzer" common profile when auth is disabled
            return 'iac-analyzer';
        }

        // Check if in development mode
        const isDevMode = this.configService.get<boolean>('auth.devMode', false);
        const devEmail = this.configService.get<string>('auth.devEmail');

        if (isDevMode && devEmail) {
            return devEmail;
        }

        // Production mode - parse from header
        if (!userDataHeader) {
            return null;
        }

        try {
            const userData = JSON.parse(
                Buffer.from(userDataHeader.split('.')[1], 'base64').toString(),
            );
            return userData.email;
        } catch (error) {
            return null;
        }
    }

    @Post('work-items/upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Headers('x-amzn-oidc-data') userDataHeader: string,
    ) {
        try {
            const email = this.getUserEmail(userDataHeader);
            if (!email) {
                throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
            }

            const userId = this.storageService.createUserIdHash(email);
            
            const workItem = await this.storageService.createWorkItem(
                userId,
                file.originalname,
                file.mimetype,
                file.buffer,
            );

            return { fileId: workItem.fileId };
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to upload file',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('work-items')
    async listWorkItems(@Headers('x-amzn-oidc-data') userDataHeader: string) {
        try {
            const email = this.getUserEmail(userDataHeader);

            if (!email) {
                throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
            }

            const userId = this.getUserId(email);

            return await this.storageService.listWorkItems(userId);
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to list work items',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Delete('work-items/:fileId')
    async deleteWorkItem(
        @Param('fileId') fileId: string,
        @Headers('x-amzn-oidc-data') userDataHeader: string,
    ) {
        try {
            const email = this.getUserEmail(userDataHeader);
            if (!email) {
                throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
            }
            const userId = this.getUserId(email);

            await this.storageService.deleteWorkItem(userId, fileId);
            return { message: 'Work item deleted successfully' };
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to delete work item',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('work-items/:fileId')
    async getWorkItem(
        @Param('fileId') fileId: string,
        @Headers('x-amzn-oidc-data') userDataHeader: string,
    ): Promise<{
        workItem: WorkItem;
        content?: string;
        analysisResults?: any;
        iacDocument?: string;
    }> {
        try {
            const email = this.getUserEmail(userDataHeader);

            if (!email) {
                throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
            }

            const userId = this.getUserId(email);

            const workItem = await this.storageService.getWorkItem(userId, fileId);
            const response: any = { workItem };

            // Get original content
            response.content = await this.storageService.getOriginalContent(
                userId,
                fileId,
            );

            // Get analysis results if completed
            if (workItem.analysisStatus === 'COMPLETED' || workItem.analysisStatus === 'PARTIAL') {
                response.analysisResults = await this.storageService.getAnalysisResults(
                    userId,
                    fileId,
                );
            }

            // Get IaC document if completed
            if (workItem.iacGenerationStatus === 'COMPLETED' || workItem.iacGenerationStatus === 'PARTIAL') {
                // Determine extension based on file type or template type
                const extension = workItem.fileType.includes('yaml') ? 'yaml' :
                    workItem.fileType.includes('json') ? 'json' : 'tf';

                response.iacDocument = await this.storageService.getIaCDocument(
                    userId,
                    fileId,
                    extension,
                    workItem,
                );
            }

            return response;
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to get work item',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('work-items/:fileId/content')
    async getWorkItemContent(
        @Param('fileId') fileId: string,
        @Headers('x-amzn-oidc-data') userDataHeader: string,
        @Res() response: Response,
    ) {
        try {
            const email = this.getUserEmail(userDataHeader);
            if (!email) {
                throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
            }
            const userId = this.getUserId(email);

            // First get the work item to get the file type
            const workItem = await this.storageService.getWorkItem(userId, fileId);

            // Get content with forDownload = true
            const { data, contentType } = await this.storageService.getOriginalContent(
                userId,
                fileId,
                true // It's for download
            );

            // Set response headers
            response.setHeader('Content-Type', contentType);
            response.setHeader(
                'Content-Disposition',
                `attachment; filename="${workItem.fileName}"`
            );

            // Send the binary data directly
            response.end(data);
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to get work item content',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('work-items/:fileId/analysis')
    async getWorkItemAnalysis(
        @Param('fileId') fileId: string,
        @Headers('x-amzn-oidc-data') userDataHeader: string,
    ) {
        try {
            const email = this.getUserEmail(userDataHeader);
            if (!email) {
                throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
            }
            const userId = this.getUserId(email);

            return await this.storageService.getAnalysisResults(userId, fileId);
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to get analysis results',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('work-items/:fileId/iac-document/:extension')
    async getWorkItemIaCDocument(
        @Param('fileId') fileId: string,
        @Param('extension') extension: string,
        @Headers('x-amzn-oidc-data') userDataHeader: string,
    ) {
        try {
            const email = this.getUserEmail(userDataHeader);
            if (!email) {
                throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
            }
            const userId = this.getUserId(email);

            return await this.storageService.getIaCDocument(userId, fileId, extension);
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to get IaC document',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}