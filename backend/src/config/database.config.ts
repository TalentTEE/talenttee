import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5434', 10),
  username: process.env.DATABASE_USER || 'near_agent',
  password: process.env.DATABASE_PASSWORD || 'near_agent_dev',
  database: process.env.DATABASE_NAME || 'near_agent',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: true, // PoC only — disable in production
  logging: process.env.NODE_ENV === 'development',
});
