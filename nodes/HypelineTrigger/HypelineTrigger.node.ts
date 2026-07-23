import {
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { verifySignature } from '../../utils/verifySignature';

const BASE_URL = 'https://api.hypeline.io';

export class HypelineTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hypeline Trigger',
		name: 'hypelineTrigger',
		icon: { light: 'file:hypeline.svg', dark: 'file:hypeline.dark.svg' },
		group: ['trigger'],
		version: 1,
		usableAsTool: true,
		subtitle: '={{$parameter["alertMode"]}}',
		description: 'Start a workflow when Hypeline surfaces genuinely new content. Registers a signed webhook destination and verifies every delivery',
		defaults: {
			name: 'Hypeline Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'hypelineApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'hypeline',
			},
		],
		properties: [
			{
				displayName: 'Alert',
				name: 'alertMode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create New',
						value: 'create',
						description: 'Create a new alert from a query and attach this trigger to it',
					},
					{
						name: 'Attach Existing',
						value: 'existing',
						description: 'Attach this trigger to an alert you already created',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Filter Query',
				name: 'filterQuery',
				type: 'string',
				default: '',
				placeholder: 'acquisition OR "series a"',
				description:
					'Optional keyword or Boolean query matched against each change. Leave blank to fire on all new content from the source.',
				displayOptions: {
					show: {
						alertMode: ['create'],
					},
				},
			},
			{
				displayName: 'Source Names or IDs',
				name: 'sourceIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getSources',
				},
				default: [],
				description: 'The sources whose new content this alert watches. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						alertMode: ['create'],
					},
				},
			},
			{
				displayName: 'Alert Name or ID',
				name: 'alertId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAlerts',
				},
				default: '',
				required: true,
				description: 'The existing alert to attach this trigger to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						alertMode: ['existing'],
					},
				},
			},
		],
	};

	// loadOptions populates the Sources / Alert pickers by calling the API with the
	// node's credential, so a user picks by name instead of pasting a raw id.
	methods = {
		loadOptions: {
			async getSources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'hypelineApi', {
					method: 'GET',
					baseURL: BASE_URL,
					url: '/v1/sources',
					qs: { limit: 200 },
					json: true,
				})) as IDataObject | IDataObject[];
				const rows = (Array.isArray(response) ? response : (response.data as IDataObject[])) ?? [];
				return rows.map((s) => ({
					name: (s.url as string) || (s.id as string),
					value: s.id as string,
				}));
			},

			async getAlerts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'hypelineApi', {
					method: 'GET',
					baseURL: BASE_URL,
					url: '/v1/alerts',
					qs: { limit: 200 },
					json: true,
				})) as IDataObject | IDataObject[];
				const rows = (Array.isArray(response) ? response : (response.data as IDataObject[])) ?? [];
				return rows.map((a) => {
					const q = (a.filter_query as string) || '';
					return {
						name: q ? q : '(all content)',
						value: a.id as string,
					};
				});
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const destinationId = webhookData.destinationId as string | undefined;
				if (!destinationId) return false;

				const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'hypelineApi', {
					method: 'GET',
					baseURL: BASE_URL,
					url: '/v1/destinations',
					json: true,
				})) as IDataObject;

				const items = (Array.isArray(response) ? response : (response.data as IDataObject[])) ?? [];
				return items.some((d) => (d as IDataObject).id === destinationId);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const alertMode = this.getNodeParameter('alertMode', 'create') as string;

				let alertId: string;
				if (alertMode === 'create') {
					const filterQuery = this.getNodeParameter('filterQuery') as string;
					const sourceIds = this.getNodeParameter('sourceIds', []) as string[];
					const body: IDataObject = { filter_query: filterQuery };
					if (sourceIds.length) {
						body.source_ids = sourceIds;
					}
					const created = (await this.helpers.httpRequestWithAuthentication.call(this, 'hypelineApi', {
						method: 'POST',
						baseURL: BASE_URL,
						url: '/v1/alerts',
						body,
						json: true,
					})) as IDataObject;
					alertId = created.id as string;
					// Record that THIS node created the alert, so delete() can tear it
					// down. When attaching to an existing alert we never touch it.
					webhookData.alertId = alertId;
				} else {
					alertId = this.getNodeParameter('alertId') as string;
				}

				const destination = (await this.helpers.httpRequestWithAuthentication.call(this, 'hypelineApi', {
					method: 'POST',
					baseURL: BASE_URL,
					url: `/v1/alerts/${alertId}/destinations`,
					body: { kind: 'webhook', url: webhookUrl },
					json: true,
				})) as IDataObject;

				webhookData.destinationId = destination.id as string;
				webhookData.signingSecret = destination.secret as string;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const destinationId = webhookData.destinationId as string | undefined;
				const alertId = webhookData.alertId as string | undefined;

				if (destinationId) {
					await this.helpers.httpRequestWithAuthentication.call(this, 'hypelineApi', {
						method: 'DELETE',
						baseURL: BASE_URL,
						url: `/v1/destinations/${destinationId}`,
						json: true,
					});
				}
				// Delete the alert ONLY if this node created it. A user's pre-existing
				// alert (Attach Existing mode) is never deleted.
				if (alertId) {
					await this.helpers.httpRequestWithAuthentication.call(this, 'hypelineApi', {
						method: 'DELETE',
						baseURL: BASE_URL,
						url: `/v1/alerts/${alertId}`,
						json: true,
					});
				}

				delete webhookData.destinationId;
				delete webhookData.signingSecret;
				delete webhookData.alertId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headers = this.getHeaderData();
		const webhookData = this.getWorkflowStaticData('node');
		const secret = webhookData.signingSecret as string | undefined;

		const id = headers['webhook-id'] as string | undefined;
		const timestamp = headers['webhook-timestamp'] as string | undefined;
		const signature = headers['webhook-signature'] as string | undefined;
		const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';

		if (!secret || !id || !timestamp || !signature) {
			return { workflowData: [] };
		}

		// Verify the raw bytes BEFORE JSON.parse, so a tampered or replayed
		// delivery never reaches the workflow.
		if (!verifySignature(secret, id, timestamp, rawBody, signature)) {
			return { workflowData: [] };
		}

		const event = JSON.parse(rawBody) as IDataObject;
		return { workflowData: [this.helpers.returnJsonArray(event)] };
	}
}
