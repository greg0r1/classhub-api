import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from '../../database/entities/subscription.entity';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, User, Organization])],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
