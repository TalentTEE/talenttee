const mockEnableCors = jest.fn();
const mockListen = jest.fn().mockResolvedValue(undefined);
const mockCreate = jest.fn().mockResolvedValue({
  enableCors: mockEnableCors,
  listen: mockListen,
});

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: mockCreate,
  },
}));

describe('bootstrap CORS', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    delete process.env.FRONTEND_URL;
    delete process.env.CORS_ORIGINS;
    mockCreate.mockClear();
    mockEnableCors.mockClear();
    mockListen.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('allows the deployed Vercel frontend in production', async () => {
    require('../main.js');
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockEnableCors).toHaveBeenCalledWith({
      origin: expect.arrayContaining(['https://talenttee-sepia.vercel.app']),
      credentials: true,
    });
  });
});
