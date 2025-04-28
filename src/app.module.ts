/* eslint-disable @typescript-eslint/no-unused-vars */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './auth/entities/user.entity';
import { Document } from './documents/entities/document.entity';
// import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { ProcessingModule } from './processing/processing.module';

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
          uploads: {
            directory: process.env.UPLOADS_DIRECTORY || './uploads',
          },
          microservice: {
            url: process.env.MICROSERVICE_URL,
            apiKey: process.env.MICROSERVICE_API_KEY,
          },
          webhooks: {
            secret: process.env.WEBHOOK_SECRET,
          },
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
        entities: [User, Document],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dest: configService.get<string>('UPLOAD_DIRECTORY', './uploads'),
      }),
    }),
    AuthModule,
    // UsersModule
    DocumentsModule,
    ProcessingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
