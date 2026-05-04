import {
  Controller, Post, Get, Delete, Patch, Param, Body, Query, Req, Res,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { JwtGuard } from '../auth/jwt.guard.js';
import { DatasourceService } from './datasource.service.js';
import { PdfParserService } from './pdf-parser.service.js';
import { DataSourceProvider } from '../common/enums/index.js';

@Controller('datasource')
export class DatasourceController {
  constructor(
    private readonly datasourceService: DatasourceService,
    private readonly pdfParser: PdfParserService,
    private readonly config: ConfigService,
  ) {}

  @Get('connect/github')
  @UseGuards(JwtGuard)
  async connectGithub(@Req() req, @Res() res: Response) {
    const userId = req.user.id;
    const appSlug = this.config.get('GITHUB_APP_SLUG');

    if (!appSlug) {
      throw new BadRequestException('GITHUB_APP_SLUG is not configured');
    }

    const githubInstallUrl =
      `https://github.com/apps/${appSlug}/installations/new` +
      `?state=${encodeURIComponent(userId)}`;

    return res.redirect(githubInstallUrl);
  }

  @Get('callback/github')
  async callbackGithub(
    @Query('installation_id') installationIdRaw: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!state) {
      throw new BadRequestException('Missing state');
    }

    const installationId = Number(installationIdRaw);
    if (!installationId || Number.isNaN(installationId)) {
      throw new BadRequestException('Missing or invalid installation_id');
    }

    await this.datasourceService.connectGithubApp(state, installationId);

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

  @Post('pdf-upload')
  @UseGuards(JwtGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== 'application/pdf') {
        cb(new BadRequestException('Only PDF files are allowed'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async uploadPdf(@Req() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No PDF file provided');
    const userId = req.user.id;

    const parseResult = await this.pdfParser.parseBuffer(file.buffer);

    // Save as PDF datasource connection
    await this.datasourceService.connectPdf(userId, parseResult);

    return {
      provider: 'PDF',
      status: 'CONNECTED',
      parsed: parseResult.structured,
    };
  }

  @Patch('pdf')
  @UseGuards(JwtGuard)
  async updatePdf(@Req() req, @Body() body: Record<string, any>) {
    const userId = req.user.id;
    await this.datasourceService.updatePdfData(userId, body);
    return { message: 'PDF data updated' };
  }
}
