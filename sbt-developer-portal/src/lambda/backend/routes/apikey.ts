import { Router } from 'express';
import { CustomersController } from '../lib/customers-controller';
import { getCognitoIdentityId } from '../lib/utils';

export const apiKeyRouter = Router();

const customersController = new CustomersController();

/**
 * GET /apikey
 * Get the API key for the authenticated user
 */
apiKeyRouter.get('/', async (req, res, next) => {
  try {
    const cognitoIdentityId = getCognitoIdentityId(req);
    console.log(`GET /apikey for Cognito Identity ID: ${cognitoIdentityId}`);

    const apiKey = await customersController.getApiKeyForCustomer(cognitoIdentityId);

    if (!apiKey) {
      return res.status(404).json({ error: 'No API Key found for customer' });
    }

    res.json({
      id: apiKey.id,
      value: apiKey.value,
    });
  } catch (error) {
    next(error);
  }
});
