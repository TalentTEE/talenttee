import {
  Controller, Post, Body, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { RelayService, type ActionDescriptor } from './relay.service.js';

@Controller('relay')
@UseGuards(JwtGuard)
export class RelayController {
  constructor(private readonly relayService: RelayService) {}

  @Post('prepare')
  async prepare(
    @Req() req: any,
    @Body() body: { receiverId: string; actions: ActionDescriptor[] },
  ) {
    const { nearAccountId, publicKey } = req.user;
    if (!nearAccountId || !publicKey) {
      throw new BadRequestException('JWT missing nearAccountId or publicKey');
    }
    if (!body.receiverId || !Array.isArray(body.actions) || body.actions.length === 0) {
      throw new BadRequestException('receiverId and actions[] are required');
    }

    return this.relayService.prepareDelegate(
      nearAccountId,
      publicKey,
      body.receiverId,
      body.actions,
    );
  }

  @Post('submit')
  async submit(
    @Req() req: any,
    @Body() body: { requestId: string; signature: string },
  ) {
    const { nearAccountId } = req.user;
    if (!body.requestId || !body.signature) {
      throw new BadRequestException('requestId and signature are required');
    }

    return this.relayService.submitDelegate(
      body.requestId,
      body.signature,
      nearAccountId,
    );
  }
}
