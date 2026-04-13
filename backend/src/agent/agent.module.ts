import { Global, Module } from '@nestjs/common';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';
import { NearAiCloudClient } from './near-ai.client.js';

@Global()
@Module({
  providers: [
    {
      provide: NEAR_AI_CLIENT,
      useClass: NearAiCloudClient,
    },
  ],
  exports: [NEAR_AI_CLIENT],
})
export class AgentModule {}
