import { JobQueue } from './jobQueue';
import { IntegrationService } from './integrationService';
import { WebhookService } from './webhookService';
import { NotificationService } from './notificationService';

export interface SystemObservabilityMetrics {
  tenantId: string;
  timestamp: string;
  jobs: {
    total: number;
    queued: number;
    running: number;
    retrying: number;
    completed: number;
    failed: number;
    deadLetter: number;
  };
  integrations: {
    total: number;
    connected: number;
    error: number;
    disconnected: number;
  };
  webhooks: {
    endpointsTotal: number;
    endpointsActive: number;
    deliveriesTotal: number;
    deliveriesSuccessful: number;
    deliveriesFailed: number;
    blockedSsrf: number;
  };
  notifications: {
    unreadCount: number;
  };
  health: 'healthy' | 'degraded' | 'critical';
}

export class MetricsService {
  static getTenantMetrics(tenantId: string): SystemObservabilityMetrics {
    const { jobs } = JobQueue.listJobs({ tenantId, limit: 1000 });
    const integrations = IntegrationService.listIntegrations(tenantId);
    const endpoints = WebhookService.listEndpoints(tenantId);
    const deliveries = WebhookService.listDeliveries(tenantId, 1000);
    const { unreadCount } = NotificationService.listNotifications(tenantId, 1);

    const queued = jobs.filter((j) => j.status === 'QUEUED').length;
    const running = jobs.filter((j) => j.status === 'RUNNING').length;
    const retrying = jobs.filter((j) => j.status === 'RETRYING').length;
    const completed = jobs.filter((j) => j.status === 'COMPLETED').length;
    const failed = jobs.filter((j) => j.status === 'FAILED').length;
    const deadLetter = jobs.filter((j) => j.isDeadLetter).length;

    const connectedInteg = integrations.filter((i) => i.status === 'connected').length;
    const errorInteg = integrations.filter((i) => i.status === 'error').length;
    const disconnectedInteg = integrations.filter((i) => i.status === 'disconnected').length;

    const activeEndpoints = endpoints.filter((e) => e.isActive).length;
    const successDeliveries = deliveries.filter((d) => d.status === 'success').length;
    const failedDeliveries = deliveries.filter((d) => d.status === 'failed').length;
    const blockedSsrf = deliveries.filter((d) => d.status === 'blocked_ssrf').length;

    let health: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (deadLetter > 5 || errorInteg > 2) {
      health = 'critical';
    } else if (retrying > 0 || errorInteg > 0 || failedDeliveries > 0) {
      health = 'degraded';
    }

    return {
      tenantId,
      timestamp: new Date().toISOString(),
      jobs: {
        total: jobs.length,
        queued,
        running,
        retrying,
        completed,
        failed,
        deadLetter,
      },
      integrations: {
        total: integrations.length,
        connected: connectedInteg,
        error: errorInteg,
        disconnected: disconnectedInteg,
      },
      webhooks: {
        endpointsTotal: endpoints.length,
        endpointsActive: activeEndpoints,
        deliveriesTotal: deliveries.length,
        deliveriesSuccessful: successDeliveries,
        deliveriesFailed: failedDeliveries,
        blockedSsrf,
      },
      notifications: {
        unreadCount,
      },
      health,
    };
  }
}
