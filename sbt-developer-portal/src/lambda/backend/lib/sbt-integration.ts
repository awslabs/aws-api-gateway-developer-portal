import axios, { AxiosInstance } from 'axios';

const SBT_CONTROL_PLANE_URL = process.env.SBT_CONTROL_PLANE_URL || '';

export interface TenantRegistration {
  tenantId: string;
  tenantName: string;
  email: string;
  tier?: string;
}

/**
 * Client for integrating with AWS SBT (SaaS Builder Toolkit) Control Plane
 */
export class SBTClient {
  private client: AxiosInstance | null = null;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = SBT_CONTROL_PLANE_URL !== '';

    if (this.enabled) {
      this.client = axios.create({
        baseURL: SBT_CONTROL_PLANE_URL,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  }

  /**
   * Check if SBT integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Register a new tenant with SBT Control Plane
   */
  async registerTenant(registration: TenantRegistration): Promise<any> {
    if (!this.enabled || !this.client) {
      console.log('SBT integration is disabled');
      return null;
    }

    try {
      console.log(`Registering tenant with SBT: ${registration.tenantId}`);

      const response = await this.client.post('/tenants', {
        tenantId: registration.tenantId,
        tenantName: registration.tenantName,
        email: registration.email,
        tier: registration.tier || 'free',
      });

      return response.data;
    } catch (error) {
      console.error('Failed to register tenant with SBT:', error);
      throw error;
    }
  }

  /**
   * Get tenant information from SBT Control Plane
   */
  async getTenant(tenantId: string): Promise<any> {
    if (!this.enabled || !this.client) {
      return null;
    }

    try {
      const response = await this.client.get(`/tenants/${tenantId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get tenant ${tenantId} from SBT:`, error);
      return null;
    }
  }

  /**
   * Register API key with SBT for usage tracking
   */
  async registerApiKey(cognitoIdentityId: string, apiKeyId: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      console.log(`Registering API key ${apiKeyId} for tenant ${cognitoIdentityId}`);

      await this.client.post('/api-keys', {
        tenantId: cognitoIdentityId,
        apiKeyId: apiKeyId,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to register API key with SBT:', error);
      // Don't throw - this is optional tracking
    }
  }

  /**
   * Notify SBT Control Plane of subscription changes
   */
  async notifySubscription(
    cognitoIdentityId: string,
    usagePlanId: string,
    action: 'subscribe' | 'unsubscribe'
  ): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      console.log(`Notifying SBT of ${action} for tenant ${cognitoIdentityId}, plan ${usagePlanId}`);

      await this.client.post('/subscriptions', {
        tenantId: cognitoIdentityId,
        usagePlanId: usagePlanId,
        action: action,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to notify SBT of subscription change:', error);
      // Don't throw - this is optional tracking
    }
  }

  /**
   * Record usage metrics to SBT for analytics
   */
  async recordUsage(
    cognitoIdentityId: string,
    usagePlanId: string,
    requestCount: number
  ): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.post('/usage', {
        tenantId: cognitoIdentityId,
        usagePlanId: usagePlanId,
        requestCount: requestCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record usage to SBT:', error);
      // Don't throw - this is optional tracking
    }
  }

  /**
   * Update tenant tier (for tiered pricing)
   */
  async updateTenantTier(tenantId: string, tier: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      console.log(`Updating tier for tenant ${tenantId} to ${tier}`);

      await this.client.patch(`/tenants/${tenantId}`, {
        tier: tier,
      });
    } catch (error) {
      console.error('Failed to update tenant tier:', error);
      throw error;
    }
  }

  /**
   * Get usage analytics for a tenant from SBT
   */
  async getUsageAnalytics(tenantId: string, startDate: string, endDate: string): Promise<any> {
    if (!this.enabled || !this.client) {
      return null;
    }

    try {
      const response = await this.client.get(`/analytics/usage`, {
        params: {
          tenantId,
          startDate,
          endDate,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get usage analytics from SBT:', error);
      return null;
    }
  }
}
