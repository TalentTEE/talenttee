import { Controller, Post, Get, Body, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtGuard } from '../auth/jwt.guard.js';
import { DatasourceService } from './datasource.service.js';
import { DataSourceProvider } from '../common/enums/index.js';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL ?? 'http://localhost:3001/datasource/callback/github';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3001';

@Controller('datasource')
export class DatasourceController {
  constructor(private readonly datasourceService: DatasourceService) {}

  @Get('connect/github')
  @UseGuards(JwtGuard)
  async connectGithub(@Req() req, @Res() res: Response) {
    const userId = req.user.id ?? req.user.nearAccountId;
    const githubAuthUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(GITHUB_CALLBACK_URL)}` +
      `&scope=read:user,repo` +
      `&state=${userId}`;
    return res.redirect(githubAuthUrl);
  }

  @Get('callback/github')
  async callbackGithub(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const accessToken = await this.datasourceService.exchangeGithubCode(code);
    await this.datasourceService.connectGithub(state, accessToken);
    return res.redirect(`${FRONTEND_URL}/datasource?github=connected`);
  }

  @Post('connect/mock')
  @UseGuards(JwtGuard)
  async connectMock(@Req() req, @Body() body: { provider: string }) {
    const userId = req.user.id ?? req.user.nearAccountId;
    const provider = body.provider.toUpperCase() as DataSourceProvider;
    return this.datasourceService.connectMock(userId, provider);
  }

  @Get('status')
  @UseGuards(JwtGuard)
  async getStatus(@Req() req) {
    const userId = req.user.id ?? req.user.nearAccountId;
    return this.datasourceService.getStatus(userId);
  }

  @Post('sync')
  @UseGuards(JwtGuard)
  async sync(@Req() req) {
    const userId = req.user.id ?? req.user.nearAccountId;
    const data = await this.datasourceService.collectAllData(userId);
    return { message: '동기화 완료', connectedSources: Object.keys(data).filter((k) => data[k] !== null) };
  }
}
