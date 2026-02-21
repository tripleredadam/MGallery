import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = 'mgallery-visits';

export const handler = async (event) => {
  const method = event.requestContext.http.method;
  const headers = { 'Content-Type': 'application/json' };

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (method === 'GET') {
      const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
      const visits = {};
      for (const item of result.Items || []) {
        visits[item.hotelId] = {
          marielle: item.marielle || false,
          adam: item.adam || false
        };
      }
      return { statusCode: 200, headers, body: JSON.stringify(visits) };
    }

    if (method === 'POST') {
      const { hotelId, person, visited } = JSON.parse(event.body);

      if (!hotelId || !person || visited === undefined) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
      }

      if (!['marielle', 'adam'].includes(person)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid person' }) };
      }

      await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { hotelId },
        UpdateExpression: 'SET #person = :val',
        ExpressionAttributeNames: { '#person': person },
        ExpressionAttributeValues: { ':val': visited }
      }));

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
