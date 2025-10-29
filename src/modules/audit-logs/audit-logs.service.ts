import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { QueryAuditLogsDto } from './dto';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Récupérer tous les logs d'une organisation avec filtres
   */
  async findAll(
    organizationId: string,
    query: QueryAuditLogsDto,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const {
      user_id,
      action,
      entity_type,
      entity_id,
      start_date,
      end_date,
      ip_address,
      limit = 50,
      offset = 0,
    } = query;

    // Construire les conditions
    const where: any = { organization_id: organizationId };

    if (user_id) where.user_id = user_id;
    if (action) where.action = action;
    if (entity_type) where.entity_type = entity_type;
    if (entity_id) where.entity_id = entity_id;
    if (ip_address) where.ip_address = ip_address;

    // Filtrer par dates
    if (start_date && end_date) {
      where.created_at = Between(start_date, end_date);
    } else if (start_date) {
      where.created_at = MoreThanOrEqual(start_date);
    } else if (end_date) {
      where.created_at = LessThanOrEqual(end_date);
    }

    // Exécuter la requête
    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { data, total };
  }

  /**
   * Récupérer un log par ID
   */
  async findOne(id: string, organizationId: string): Promise<AuditLog> {
    const log = await this.auditLogRepository.findOne({
      where: { id, organization_id: organizationId },
      relations: ['user'],
    });

    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return log;
  }

  /**
   * Récupérer l'historique d'une entité spécifique
   */
  async findByEntity(
    entityType: string,
    entityId: string,
    organizationId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: {
        organization_id: organizationId,
        entity_type: entityType,
        entity_id: entityId,
      },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Récupérer l'historique d'un utilisateur
   */
  async findByUser(
    userId: string,
    organizationId: string,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: {
        organization_id: organizationId,
        user_id: userId,
      },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Récupérer les actions récentes (dernières 24h)
   */
  async findRecent(
    organizationId: string,
    hours: number = 24,
  ): Promise<AuditLog[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    return this.auditLogRepository.find({
      where: {
        organization_id: organizationId,
        created_at: MoreThanOrEqual(since),
      },
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  /**
   * Récupérer les tentatives de connexion échouées
   */
  async findFailedLogins(
    organizationId: string,
    hours: number = 24,
  ): Promise<AuditLog[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    return this.auditLogRepository.find({
      where: {
        organization_id: organizationId,
        action: 'FAILED_LOGIN',
        created_at: MoreThanOrEqual(since),
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Statistiques des logs
   */
  async getStats(organizationId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.auditLogRepository.find({
      where: {
        organization_id: organizationId,
        created_at: MoreThanOrEqual(since),
      },
    });

    // Compter par action
    const byAction = logs.reduce(
      (acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Compter par type d'entité
    const byEntityType = logs.reduce(
      (acc, log) => {
        acc[log.entity_type] = (acc[log.entity_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Compter par utilisateur
    const byUser = logs.reduce(
      (acc, log) => {
        if (log.user_email) {
          acc[log.user_email] = (acc[log.user_email] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    // Compter succès/échecs
    const success = logs.filter((l) => l.success).length;
    const failed = logs.filter((l) => !l.success).length;

    return {
      total: logs.length,
      success,
      failed,
      by_action: byAction,
      by_entity_type: byEntityType,
      by_user: byUser,
      period_days: days,
    };
  }

  /**
   * Export des logs au format JSON (pour RGPD)
   */
  async exportLogs(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditLog[]> {
    const where: any = { organization_id: organizationId };

    if (startDate && endDate) {
      where.created_at = Between(startDate, endDate);
    } else if (startDate) {
      where.created_at = MoreThanOrEqual(startDate);
    } else if (endDate) {
      where.created_at = LessThanOrEqual(endDate);
    }

    return this.auditLogRepository.find({
      where,
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Nettoyer les logs anciens (retention policy)
   * À exécuter via un cron job
   */
  async cleanOldLogs(organizationId: string, retentionDays: number = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('organization_id = :organizationId', { organizationId })
      .andWhere('created_at < :cutoffDate', { cutoffDate })
      .execute();

    return {
      deleted: result.affected || 0,
      cutoff_date: cutoffDate,
      retention_days: retentionDays,
    };
  }
}
