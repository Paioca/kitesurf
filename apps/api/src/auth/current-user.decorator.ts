import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Extrai o userId anexado pelo JwtAuthGuard.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    return ctx.switchToHttp().getRequest().userId;
  },
);
