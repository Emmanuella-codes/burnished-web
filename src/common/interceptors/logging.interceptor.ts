import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { ip, method, originalUrl } = request;
    const userAgent = request.get('user-agent') || 'unknown';

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;

          this.logger.log(
            `${method} ${originalUrl} ${statusCode} - ${Date.now() - now}ms - ${ip} - ${userAgent}`,
          );
        },
        error: (err) => {
          const response = context.switchToHttp().getResponse();
          const statusCode = err.status || response.statusCode || 500;

          this.logger.error(
            `${method} ${originalUrl} ${statusCode} - ${Date.now() - now}ms - ${ip} - ${userAgent} - Error: ${err.message}`,
          );
        },
      }),
    );
  }
}
