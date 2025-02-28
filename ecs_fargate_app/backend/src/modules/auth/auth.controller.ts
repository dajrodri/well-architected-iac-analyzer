import { Controller, Get, Headers, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private configService: ConfigService) {}

  @Get('config')
  getAuthConfig() {
    return {
      enabled: this.configService.get<boolean>('auth.enabled', false),
      signOutUrl: this.configService.get<string>('auth.signOutUrl', '')
    };
  }

  @Get('user-info')
  getUserInfo(@Headers() headers: Record<string, string>) {
    // Check if authentication is enabled
    const isAuthEnabled = this.configService.get<boolean>('auth.enabled', false);
    
    if (!isAuthEnabled) {
      // Return default "iac-analyzer" user when auth is disabled
      return {
        username: 'iac-analyzer',
        email: 'iac-analyzer'
      };
    }

    // Check if in development mode with auth enabled
    const isDevMode = this.configService.get<boolean>('auth.devMode', false);
    const devEmail = this.configService.get<string>('auth.devEmail');
    
    if (isDevMode && devEmail) {
      return {
        username: 'Dev User',
        email: devEmail
      };
    }

    // ALB authentication headers
    const username = headers['x-amzn-oidc-identity'];
    const claims = headers['x-amzn-oidc-data'] ? 
      JSON.parse(Buffer.from(headers['x-amzn-oidc-data'].split('.')[1], 'base64').toString()) 
      : undefined;

    return {
      username: username || claims?.email || 'User',
      email: claims?.email
    };
  }

  @Post('logout')
  async logout(@Res() response: Response) {
    // For development mode or when auth is disabled, just return empty response
    if (this.configService.get<boolean>('auth.devMode', false) || 
        !this.configService.get<boolean>('auth.enabled', false)) {
      return response.json({ redirectUrl: '/' });
    }
    
    // Expire ALB auth cookies
    const cookiesToExpire = [
      'AWSELBAuthSessionCookie-0',
      'AWSELBAuthSessionCookie-1'
    ];

    cookiesToExpire.forEach(cookieName => {
      response.cookie(cookieName, '', {
        expires: new Date(0),
        path: '/',
        secure: true,
        httpOnly: true
      });
    });

    // Get the Cognito logout URL
    const signOutUrl = this.configService.get<string>('auth.signOutUrl', '');
    
    // Return the response with expired cookies and the redirect URL
    response.json({ redirectUrl: signOutUrl });
  }
}