import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { AuthModule } from './modules/auth/auth.module';
import { AttendancesModule } from './modules/attendances/attendances.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuditLog } from './database/entities/audit-log.entity';

@Module({
  imports: [
    // ConfigModule permet d'accéder aux variables d'environnement partout
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Configuration TypeORM avec injection des variables d'environnement
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/database/entities/*.entity{.ts,.js}'],
        autoLoadEntities: true,
        synchronize: false, // JAMAIS true en production !
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Importer AuditLog pour l'AuditInterceptor
    TypeOrmModule.forFeature([AuditLog]),

    // Modules métier
    AuthModule,
    OrganizationsModule,
    UsersModule,
    CoursesModule,
    AttendancesModule,
    SubscriptionsModule,
    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Enregistrer l'intercepteur multi-tenant globalement
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    // Enregistrer l'intercepteur d'audit globalement
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Appliquer le middleware multi-tenant sur toutes les routes
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
