import { Controller, Post, Get, Delete, Param, Body, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { JwtGuard } from '../auth/jwt.guard.js';
import { DatasourceService } from './datasource.service.js';
import { DataSourceProvider } from '../common/enums/index.js';

@Controller('datasource')
export class DatasourceController {
  constructor(
    private readonly datasourceService: DatasourceService,
    private readonly config: ConfigService,
  ) {}

  @Get('connect/github')
  @UseGuards(JwtGuard)
  async connectGithub(@Req() req, @Res() res: Response) {
    const userId = req.user.id;
    const clientId = this.config.get('GITHUB_CLIENT_ID');
    const callbackUrl = this.config.get('GITHUB_CALLBACK_URL', 'http://localhost:3001/datasource/callback/github');
    const githubAuthUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&scope=read:user,repo` +
      `&state=${userId}`;
    return res.redirect(githubAuthUrl);
  }

  @Get('callback/github')
  async callbackGithub(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const accessToken = await this.datasourceService.exchangeGithubCode(code);
    await this.datasourceService.connectGithub(state, accessToken);
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    return res.redirect(`${frontendUrl}/datasource?github=connected`);
  }

  @Post('connect/mock')
  @UseGuards(JwtGuard)
  async connectMock(@Req() req, @Body() body: { provider: string }) {
    const userId = req.user.id;
    const provider = body.provider.toUpperCase() as DataSourceProvider;
    return this.datasourceService.connectMock(userId, provider);
  }

  @Get('me/:provider/data')
  @UseGuards(JwtGuard)
  async getProviderData(@Req() req, @Param('provider') provider: string) {
    const userId = req.user.id;
    const normalizedProvider = provider.toUpperCase() as DataSourceProvider;
    return this.datasourceService.getProviderData(userId, normalizedProvider);
  }

  @Get('status')
  @UseGuards(JwtGuard)
  async getStatus(@Req() req) {
    const userId = req.user.id;
    return this.datasourceService.getStatus(userId);
  }

  @Delete(':provider')
  @UseGuards(JwtGuard)
  async disconnect(@Req() req, @Param('provider') provider: string) {
    const userId = req.user.id;
    const normalizedProvider = provider.toUpperCase() as DataSourceProvider;
    await this.datasourceService.disconnect(userId, normalizedProvider);
    return { message: `${normalizedProvider} disconnected` };
  }

  @Post('sync')
  @UseGuards(JwtGuard)
  async sync(@Req() req) {
    const userId = req.user.id;
    const data = await this.datasourceService.collectAllData(userId);
    return { message: 'Sync complete', connectedSources: Object.keys(data).filter((k) => data[k] !== null) };
  }
}
