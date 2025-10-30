import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan, MoreThan } from 'typeorm';
import { Subscription } from '../../database/entities/subscription.entity';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  RenewSubscriptionDto,
  CancelSubscriptionDto,
} from './dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
  ) {}

  /**
   * Créer un nouvel abonnement
   */
  async create(
    dto: CreateSubscriptionDto,
    organizationId: string,
  ): Promise<Subscription> {
    // Vérifier que l'utilisateur existe
    const user = await this.usersRepository.findOne({
      where: { id: dto.user_id, deleted_at: IsNull() },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.user_id} not found`);
    }

    // Vérifier que l'utilisateur appartient à l'organisation
    if (user.organization_id !== organizationId) {
      throw new ForbiddenException('User does not belong to this organization');
    }

    // Calculer la date de fin en fonction de la durée
    const startDate = new Date(dto.start_date);
    const endDate = new Date(startDate);
    endDate.setMonth(
      endDate.getMonth() + dto.subscription_type.duration_months,
    );

    // Créer l'abonnement
    const subscription = this.subscriptionsRepository.create({
      organization_id: organizationId,
      user_id: dto.user_id,
      subscription_type: dto.subscription_type,
      status: 'active',
      start_date: startDate,
      end_date: endDate,
      amount_paid: dto.amount_paid ?? dto.subscription_type.price,
      currency: dto.currency ?? dto.subscription_type.currency,
      payment_status: dto.payment_status ?? 'pending',
      payment_method: dto.payment_method,
      payment_reference: dto.payment_reference,
      payment_date:
        dto.payment_status === 'paid' ? new Date() : undefined,
      auto_renew: dto.auto_renew ?? false,
      notes: dto.notes,
    });

    return this.subscriptionsRepository.save(subscription);
  }

  /**
   * Récupérer tous les abonnements d'une organisation
   */
  async findAll(organizationId: string): Promise<Subscription[]> {
    return this.subscriptionsRepository.find({
      where: { organization_id: organizationId, deleted_at: IsNull() },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Récupérer un abonnement par ID
   */
  async findOne(id: string, organizationId: string): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { id, organization_id: organizationId, deleted_at: IsNull() },
      relations: ['user', 'cancelled_by_user'],
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return subscription;
  }

  /**
   * Récupérer l'abonnement actif d'un utilisateur
   */
  async findActiveByUser(
    userId: string,
    organizationId: string,
  ): Promise<Subscription | null> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        status: 'active',
        deleted_at: IsNull(),
      },
      order: { end_date: 'DESC' },
    });

    return subscription;
  }

  /**
   * Récupérer tous les abonnements d'un utilisateur (historique)
   */
  async findByUser(
    userId: string,
    organizationId: string,
  ): Promise<Subscription[]> {
    return this.subscriptionsRepository.find({
      where: {
        user_id: userId,
        organization_id: organizationId,
        deleted_at: IsNull(),
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Récupérer les abonnements qui expirent bientôt (dans les 7 jours)
   */
  async findExpiringSoon(organizationId: string): Promise<Subscription[]> {
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);

    return this.subscriptionsRepository.find({
      where: {
        organization_id: organizationId,
        status: 'active',
        end_date: MoreThan(today),
        deleted_at: IsNull(),
      },
      relations: ['user'],
      order: { end_date: 'ASC' },
    });
  }

  /**
   * Récupérer les abonnements expirés
   */
  async findExpired(organizationId: string): Promise<Subscription[]> {
    const today = new Date();

    return this.subscriptionsRepository.find({
      where: {
        organization_id: organizationId,
        status: 'active',
        end_date: LessThan(today),
        deleted_at: IsNull(),
      },
      relations: ['user'],
      order: { end_date: 'DESC' },
    });
  }

  /**
   * Marquer les abonnements expirés (tâche automatique)
   */
  async markExpiredSubscriptions(organizationId: string): Promise<number> {
    const expiredSubscriptions = await this.findExpired(organizationId);

    for (const subscription of expiredSubscriptions) {
      subscription.status = 'expired';
      await this.subscriptionsRepository.save(subscription);
    }

    return expiredSubscriptions.length;
  }

  /**
   * Renouveler un abonnement
   */
  async renew(
    id: string,
    dto: RenewSubscriptionDto,
    organizationId: string,
  ): Promise<Subscription> {
    const subscription = await this.findOne(id, organizationId);

    // Vérifier que l'abonnement peut être renouvelé
    if (subscription.status === 'cancelled') {
      throw new BadRequestException('Cannot renew a cancelled subscription');
    }

    // Calculer nouvelle date de fin (à partir de l'ancienne date de fin)
    const newEndDate = new Date(subscription.end_date);
    newEndDate.setMonth(
      newEndDate.getMonth() + subscription.subscription_type.duration_months,
    );

    // Mettre à jour
    subscription.end_date = newEndDate;
    subscription.status = 'active';
    subscription.last_renewed_at = new Date();
    subscription.amount_paid =
      dto.amount_paid ?? subscription.subscription_type.price;
    subscription.payment_status = dto.payment_status ?? 'pending';
    subscription.payment_method = dto.payment_method ?? subscription.payment_method;
    if (dto.payment_reference !== undefined) {
      subscription.payment_reference = dto.payment_reference;
    }
    subscription.payment_date =
      dto.payment_status === 'paid' ? new Date() : subscription.payment_date;
    if (dto.notes) {
      subscription.notes = dto.notes;
    }

    return this.subscriptionsRepository.save(subscription);
  }

  /**
   * Mettre à jour un abonnement
   */
  async update(
    id: string,
    dto: UpdateSubscriptionDto,
    organizationId: string,
  ): Promise<Subscription> {
    const subscription = await this.findOne(id, organizationId);

    // Mise à jour des champs
    if (dto.status !== undefined) {
      subscription.status = dto.status;
    }
    if (dto.end_date !== undefined) {
      subscription.end_date = dto.end_date;
    }
    if (dto.amount_paid !== undefined) {
      subscription.amount_paid = dto.amount_paid;
    }
    if (dto.payment_status !== undefined) {
      subscription.payment_status = dto.payment_status;
      if (dto.payment_status === 'paid' && !subscription.payment_date) {
        subscription.payment_date = new Date();
      }
    }
    if (dto.payment_method !== undefined) {
      subscription.payment_method = dto.payment_method;
    }
    if (dto.payment_reference !== undefined) {
      subscription.payment_reference = dto.payment_reference;
    }
    if (dto.auto_renew !== undefined) {
      subscription.auto_renew = dto.auto_renew;
    }
    if (dto.notes !== undefined) {
      subscription.notes = dto.notes;
    }

    return this.subscriptionsRepository.save(subscription);
  }

  /**
   * Annuler un abonnement
   */
  async cancel(
    id: string,
    dto: CancelSubscriptionDto,
    cancelledByUserId: string,
    organizationId: string,
  ): Promise<Subscription> {
    const subscription = await this.findOne(id, organizationId);

    if (subscription.status === 'cancelled') {
      throw new BadRequestException('Subscription is already cancelled');
    }

    subscription.status = 'cancelled';
    subscription.cancelled_at = new Date();
    subscription.cancellation_reason = dto.reason;
    subscription.cancelled_by_user_id = cancelledByUserId;
    if (dto.notes) {
      subscription.notes = dto.notes;
    }

    return this.subscriptionsRepository.save(subscription);
  }

  /**
   * Suspendre un abonnement (temporaire)
   */
  async suspend(
    id: string,
    reason: string,
    organizationId: string,
  ): Promise<Subscription> {
    const subscription = await this.findOne(id, organizationId);

    if (subscription.status !== 'active') {
      throw new BadRequestException('Only active subscriptions can be suspended');
    }

    subscription.status = 'suspended';
    subscription.notes = `Suspendu: ${reason}${subscription.notes ? '\n' + subscription.notes : ''}`;

    return this.subscriptionsRepository.save(subscription);
  }

  /**
   * Réactiver un abonnement suspendu
   */
  async reactivate(id: string, organizationId: string): Promise<Subscription> {
    const subscription = await this.findOne(id, organizationId);

    if (subscription.status !== 'suspended') {
      throw new BadRequestException('Only suspended subscriptions can be reactivated');
    }

    // Vérifier si l'abonnement n'a pas expiré entre temps
    if (subscription.is_expired) {
      throw new BadRequestException(
        'Cannot reactivate: subscription has expired. Please renew instead.',
      );
    }

    subscription.status = 'active';

    return this.subscriptionsRepository.save(subscription);
  }

  /**
   * Supprimer un abonnement (soft delete)
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const subscription = await this.findOne(id, organizationId);
    await this.subscriptionsRepository.softDelete(id);
  }

  /**
   * Statistiques des abonnements d'une organisation
   */
  async getStats(organizationId: string) {
    const all = await this.subscriptionsRepository.find({
      where: { organization_id: organizationId, deleted_at: IsNull() },
    });

    const active = all.filter((s) => s.status === 'active' && !s.is_expired);
    const expired = all.filter((s) => s.is_expired || s.status === 'expired');
    const cancelled = all.filter((s) => s.status === 'cancelled');
    const suspended = all.filter((s) => s.status === 'suspended');
    const expiringSoon = active.filter((s) => s.is_expiring_soon);

    // Revenus
    const totalRevenue = all
      .filter((s) => s.payment_status === 'paid')
      .reduce((sum, s) => sum + Number(s.amount_paid), 0);

    const monthlyRevenue = all
      .filter(
        (s) =>
          s.payment_status === 'paid' &&
          s.payment_date &&
          new Date(s.payment_date).getMonth() === new Date().getMonth(),
      )
      .reduce((sum, s) => sum + Number(s.amount_paid), 0);

    // Répartition par type
    const byType = all.reduce(
      (acc, s) => {
        const name = s.subscription_type.name;
        if (!acc[name]) {
          acc[name] = { count: 0, revenue: 0 };
        }
        acc[name].count++;
        if (s.payment_status === 'paid') {
          acc[name].revenue += Number(s.amount_paid);
        }
        return acc;
      },
      {} as Record<string, { count: number; revenue: number }>,
    );

    return {
      total: all.length,
      active: active.length,
      expired: expired.length,
      cancelled: cancelled.length,
      suspended: suspended.length,
      expiring_soon: expiringSoon.length,
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
      by_type: byType,
    };
  }
}
