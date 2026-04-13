import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { DatasourceService } from './datasource.service.js';
import { DataSourceProvider } from '../common/enums/index.js';

@Controller('datasource')
@UseGuards(JwtGuard)
export class DatasourceController {
  constructor(private readonly datasourceService: DatasourceService) {}

  @Post('connect/github')
  async connectGithub(@Req() req) {
    const userId = req.user.id ?? req.user.nearAccountId;
    return this.datasourceService.connectMock(userId, DataSourceProvider.GITHUB);
  }

  @Post('connect/mock')
  async connectMock(@Req() req, @Body() body: { provider: string }) {
    const userId = req.user.id ?? req.user.nearAccountId;
    const provider = body.provider.toUpperCase() as DataSourceProvider;
    return this.datasourceService.connectMock(userId, provider);
  }

  @Get('status')
  async getStatus(@Req() req) {
    const userId = req.user.id ?? req.user.nearAccountId;
    return this.datasourceService.getStatus(userId);
  }

  @Post('sync')
  async sync(@Req() req) {
    const userId = req.user.id ?? req.user.nearAccountId;
    const data = await this.datasourceService.collectAllData(userId);
    return { message: '동기화 완료', connectedSources: Object.keys(data).filter((k) => data[k] !== null) };
  }
}
