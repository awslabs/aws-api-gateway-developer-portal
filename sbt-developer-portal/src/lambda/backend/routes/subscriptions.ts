import { Router } from 'express';
import { CustomersController } from '../lib/customers-controller';
import { getCognitoIdentityId } from '../lib/utils';
import { APIGateway } from '@aws-sdk/client-api-gateway';

export const subscriptionsRouter = Router();

const customersController = new CustomersController();
const apigateway = new APIGateway({});

/**
 * GET /subscriptions
 * Get all subscriptions for the authenticated user
 */
subscriptionsRouter.get('/', async (req, res, next) => {
  try {
    const cognitoIdentityId = getCognitoIdentityId(req);
    console.log(`GET /subscriptions for Cognito Identity ID: ${cognitoIdentityId}`);

    const subscriptions = await customersController.getSubscriptionsForCustomer(cognitoIdentityId);

    res.json(subscriptions);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /subscriptions/:usagePlanId
 * Subscribe to a usage plan
 */
subscriptionsRouter.put('/:usagePlanId', async (req, res, next) => {
  try {
    const cognitoIdentityId = getCognitoIdentityId(req);
    const { usagePlanId } = req.params;

    console.log(`PUT /subscriptions/${usagePlanId} for Cognito Identity ID: ${cognitoIdentityId}`);

    // Verify usage plan exists
    try {
      await apigateway.getUsagePlan({ usagePlanId });
    } catch (error) {
      return res.status(404).json({ error: 'Invalid Usage Plan ID' });
    }

    const subscription = await customersController.subscribe(cognitoIdentityId, usagePlanId);

    res.status(201).json(subscription);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /subscriptions/:usagePlanId
 * Unsubscribe from a usage plan
 */
subscriptionsRouter.delete('/:usagePlanId', async (req, res, next) => {
  try {
    const cognitoIdentityId = getCognitoIdentityId(req);
    const { usagePlanId } = req.params;

    console.log(`DELETE /subscriptions/${usagePlanId} for Cognito Identity ID: ${cognitoIdentityId}`);

    await customersController.unsubscribe(cognitoIdentityId, usagePlanId);

    res.json({ message: 'Successfully unsubscribed' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /subscriptions/:usagePlanId/usage
 * Get usage statistics for a usage plan
 */
subscriptionsRouter.get('/:usagePlanId/usage', async (req, res, next) => {
  try {
    const cognitoIdentityId = getCognitoIdentityId(req);
    const { usagePlanId } = req.params;

    console.log(`GET /subscriptions/${usagePlanId}/usage for Cognito Identity ID: ${cognitoIdentityId}`);

    // Get API key for customer
    const apiKey = await customersController.getApiKeyForCustomer(cognitoIdentityId);

    if (!apiKey) {
      return res.status(404).json({ error: 'No API Key found' });
    }

    // Get usage data from API Gateway
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    const usage = await apigateway.getUsage({
      usagePlanId,
      keyId: apiKey.id,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });

    // Transform usage data for frontend
    const dates: string[] = [];
    const used: number[] = [];
    const remaining: number[] = [];

    if (usage.items) {
      Object.entries(usage.items).forEach(([date, values]) => {
        dates.push(date);
        const usedValue = values[0]?.[0] || 0;
        const remainingValue = values[0]?.[1] || 0;
        used.push(usedValue);
        remaining.push(remainingValue);
      });
    }

    // Get usage plan details for quota/throttle info
    const usagePlan = await apigateway.getUsagePlan({ usagePlanId });

    res.json({
      dates,
      used,
      remaining,
      quota: usagePlan.quota?.limit,
      throttle: usagePlan.throttle
        ? {
            rateLimit: usagePlan.throttle.rateLimit,
            burstLimit: usagePlan.throttle.burstLimit,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});
