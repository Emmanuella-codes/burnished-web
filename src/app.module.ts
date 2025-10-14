/* eslint-disable @typescript-eslint/no-unused-vars */
import { Module } from '@nestjs/common';
import { AuthModule } from './basic-auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { User } from './auth/entities/user.entity';
import { Document } from './documents/entities/document.entity';
import { DocumentsModule } from './documents/documents.module';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { ProcessingModule } from './processing/processing.module';
import { SupabaseProvider } from './supabase/superbase.provider';

@Module({
  imports: [
    // configure typeorm with postgresql
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => ({
          database: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT, 10) || 5432,
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
          },
          microservice: {
            url: process.env.MICROSERVICE_URL,
            apiKey: process.env.MICROSERVICE_API_KEY,
          },
          webhooks: {
            secret: process.env.WEBHOOK_SECRET,
          },
          // supabase: {
          //   url: process.env.SUPABASE_URL,
          //   serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          // },
        }),
      ],
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        timeout: 30000, // 30 seconds timeout
        maxRedirects: 5,
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [Document],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    AuthModule,
    DocumentsModule,
    ProcessingModule,
  ],
  controllers: [],
  providers: [SupabaseProvider],
})
export class AppModule {}
