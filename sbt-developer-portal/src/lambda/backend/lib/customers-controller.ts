import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { APIGateway } from '@aws-sdk/client-api-gateway';
import { SBTClient } from './sbt-integration';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const apigateway = new APIGateway({});
const sbtClient = new SBTClient();

const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE!;
const ENABLE_SBT = process.env.SBT_CONTROL_PLANE_URL !== '';

export interface ApiKey {
  id: string;
  value: string;
}

export interface Subscription {
  usagePlanId: string;
  name: string;
  apis: any[];
}

export class CustomersController {
  /**
   * Get API key for a customer by Cognito Identity ID
   */
  async getApiKeyForCustomer(cognitoIdentityId: string): Promise<ApiKey | null> {
    console.log(`Getting API Key for customer: ${cognitoIdentityId}`);

    // Query API Gateway for API keys by name (which is set to cognito identity ID)
    const response = await apigateway.getApiKeys({
      nameQuery: cognitoIdentityId,
      limit: 1,
      includeValues: true,
    });

    if (!response.items || response.items.length === 0) {
      console.log(`No API Key found for customer ${cognitoIdentityId}`);
      return null;
    }

    const apiKey = response.items[0];
    return {
      id: apiKey.id!,
      value: apiKey.value!,
    };
  }

  /**
   * Create API key for a customer
   */
  async createApiKey(cognitoIdentityId: string, userId: string, enabled: boolean = true): Promise<ApiKey> {
    console.log(`Creating API Key for Identity ID: ${cognitoIdentityId}, User ID: ${userId}`);

    const response = await apigateway.createApiKey({
      name: `${cognitoIdentityId}/${userId}`,
      description: `Developer Portal API Key for ${userId}`,
      enabled,
      generateDistinctId: true,
    });

    // Update customer record with API key ID
    await this.updateCustomerApiKeyId(cognitoIdentityId, response.id!);

    // If SBT is enabled, register with Control Plane
    if (ENABLE_SBT) {
      try {
        await sbtClient.registerApiKey(cognitoIdentityId, response.id!);
      } catch (error) {
        console.error('Failed to register API key with SBT Control Plane:', error);
      }
    }

    return {
      id: response.id!,
      value: response.value!,
    };
  }

  /**
   * Subscribe customer to a usage plan
   */
  async subscribe(cognitoIdentityId: string, usagePlanId: string): Promise<any> {
    console.log(`Subscribing ${cognitoIdentityId} to usage plan ${usagePlanId}`);

    // Get or create API key
    let apiKey = await this.getApiKeyForCustomer(cognitoIdentityId);

    if (!apiKey) {
      // Create API key if it doesn't exist
      const userId = cognitoIdentityId; // This should be extracted from the request context
      apiKey = await this.createApiKey(cognitoIdentityId, userId);
    }

    // Create usage plan key (subscribe API key to usage plan)
    const response = await apigateway.createUsagePlanKey({
      usagePlanId,
      keyId: apiKey.id,
      keyType: 'API_KEY',
    });

    // If SBT is enabled, notify Control Plane
    if (ENABLE_SBT) {
      try {
        await sbtClient.notifySubscription(cognitoIdentityId, usagePlanId, 'subscribe');
      } catch (error) {
        console.error('Failed to notify SBT Control Plane:', error);
      }
    }

    return response;
  }

  /**
   * Unsubscribe customer from a usage plan
   */
  async unsubscribe(cognitoIdentityId: string, usagePlanId: string): Promise<void> {
    console.log(`Unsubscribing ${cognitoIdentityId} from usage plan ${usagePlanId}`);

    const apiKey = await this.getApiKeyForCustomer(cognitoIdentityId);

    if (!apiKey) {
      throw new Error('No API Key found for customer');
    }

    // Delete usage plan key (unsubscribe API key from usage plan)
    await apigateway.deleteUsagePlanKey({
      usagePlanId,
      keyId: apiKey.id,
    });

    // If SBT is enabled, notify Control Plane
    if (ENABLE_SBT) {
      try {
        await sbtClient.notifySubscription(cognitoIdentityId, usagePlanId, 'unsubscribe');
      } catch (error) {
        console.error('Failed to notify SBT Control Plane:', error);
      }
    }
  }

  /**
   * Get all subscriptions for a customer
   */
  async getSubscriptionsForCustomer(cognitoIdentityId: string): Promise<Subscription[]> {
    const apiKey = await this.getApiKeyForCustomer(cognitoIdentityId);

    if (!apiKey) {
      return [];
    }

    // Get all usage plans
    const usagePlansResponse = await apigateway.getUsagePlans({ limit: 500 });

    if (!usagePlansResponse.items) {
      return [];
    }

    // Check which usage plans this API key is subscribed to
    const subscriptions: Subscription[] = [];

    for (const usagePlan of usagePlansResponse.items) {
      try {
        await apigateway.getUsagePlanKey({
          usagePlanId: usagePlan.id!,
          keyId: apiKey.id,
        });

        // If we get here, the key is subscribed to this usage plan
        subscriptions.push({
          usagePlanId: usagePlan.id!,
          name: usagePlan.name!,
          apis: usagePlan.apiStages || [],
        });
      } catch (error) {
        // Key is not subscribed to this usage plan
        continue;
      }
    }

    return subscriptions;
  }

  /**
   * Update customer record with API key ID
   */
  private async updateCustomerApiKeyId(cognitoIdentityId: string, apiKeyId: string): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: CUSTOMERS_TABLE,
        Item: {
          Id: cognitoIdentityId,
          ApiKeyId: apiKeyId,
          UpdatedAt: new Date().toISOString(),
        },
      })
    );
  }
}
