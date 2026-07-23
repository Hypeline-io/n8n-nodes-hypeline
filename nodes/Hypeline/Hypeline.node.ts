import {
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

// POST /v1/sources takes a batch envelope ({ sources: [ { url, ... } ] }) and
// returns { results: [ { status, detected_type, source } ] }; a flat single-source
// body is rejected 422. The node collects the create fields flat, so this preSend
// wraps them into the one-item batch and splits the comma-separated tags string
// into the array the API requires.
export async function wrapCreateSourceBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const item = (requestOptions.body ?? {}) as IDataObject;
	if (typeof item.tags === 'string') {
		item.tags = item.tags
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0);
	}
	requestOptions.body = { sources: [item] };
	return requestOptions;
}

export class Hypeline implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hypeline',
		name: 'hypeline',
		icon: { light: 'file:hypeline.svg', dark: 'file:hypeline.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage Hypeline monitoring: sources, alerts, and delivery destinations, so an agent or workflow can watch the web and act on new content',
		defaults: {
			name: 'Hypeline',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'hypelineApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.hypeline.io',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Alert',
						value: 'alert',
					},
					{
						name: 'Destination',
						value: 'destination',
					},
					{
						name: 'Source',
						value: 'source',
					},
				],
				default: 'source',
			},

			// Source operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['source'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a source',
						description: 'Add one URL as a source and start surfacing deduplicated new content from it',
						routing: {
							request: {
								method: 'POST',
								url: '/v1/sources',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: { property: 'results' },
									},
								],
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete a source',
						description: 'Remove a source and stop surfacing changes from it',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/v1/sources/{{$parameter["sourceId"]}}',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get a source',
						description: 'Retrieve one source by its ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/v1/sources/{{$parameter["sourceId"]}}',
							},
						},
					},
					{
						name: 'List',
						value: 'list',
						action: 'List sources',
						description: 'List the sources this key can see, with detected tier, health, and tags',
						routing: {
							request: {
								method: 'GET',
								url: '/v1/sources',
							},
						},
					},
				],
				default: 'create',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://example.com/changelog',
				description: 'The URL to watch. The tier (feed, web page, or push source) is detected automatically.',
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['create'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'url',
						preSend: [wrapCreateSourceBody],
					},
				},
			},
			{
				displayName: 'Source ID',
				name: 'sourceId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the source to act on',
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['get', 'delete'],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'sourceAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Locale Hint',
						name: 'locale_hint',
						type: 'string',
						default: '',
						placeholder: 'en',
						description: 'A language hint for extraction and matching',
						routing: {
							send: {
								type: 'body',
								property: 'locale_hint',
							},
						},
					},
					{
						displayName: 'Schedule',
						name: 'schedule',
						type: 'string',
						default: '',
						placeholder: '5m',
						description: 'A polling interval as a Go duration, for example 5m or 1h',
						routing: {
							send: {
								type: 'body',
								property: 'schedule',
							},
						},
					},
					{
						displayName: 'Selector',
						name: 'selector',
						type: 'string',
						default: '',
						description: 'A CSS selector to narrow the watched region of a page',
						routing: {
							send: {
								type: 'body',
								property: 'selector',
							},
						},
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'Comma-separated grouping tags stored on the source',
						routing: {
							send: {
								type: 'body',
								property: 'tags',
							},
						},
					},
				],
			},

			// Alert operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['alert'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create an alert',
						description: 'Create a keyword or Boolean query matched against the content of changes',
						routing: {
							request: {
								method: 'POST',
								url: '/v1/alerts',
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete an alert',
						description: 'Delete an alert and stop matching; attached destinations are detached, not deleted',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/v1/alerts/{{$parameter["alertId"]}}',
							},
						},
					},
					{
						name: 'List',
						value: 'list',
						action: 'List alerts',
						description: 'List alerts with their query, watched source IDs, language, and enabled state',
						routing: {
							request: {
								method: 'GET',
								url: '/v1/alerts',
							},
						},
					},
					{
						name: 'Update',
						value: 'update',
						action: 'Update an alert',
						description: 'Replace an alert definition: query, watched sources, language, and enabled state',
						routing: {
							request: {
								method: 'PATCH',
								url: '=/v1/alerts/{{$parameter["alertId"]}}',
							},
						},
					},
				],
				default: 'create',
			},
			{
				displayName: 'Alert ID',
				name: 'alertId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the alert to act on',
				displayOptions: {
					show: {
						resource: ['alert'],
						operation: ['update', 'delete'],
					},
				},
			},
			{
				displayName: 'Filter Query',
				name: 'filterQuery',
				type: 'string',
				default: '',
				placeholder: 'acquisition OR "series a"',
				description:
					'Optional keyword or Boolean query matched against each change. Leave blank to match all new content from the alert\'s sources.',
				displayOptions: {
					show: {
						resource: ['alert'],
						operation: ['create'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'filter_query',
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'alertAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['alert'],
						operation: ['create', 'update'],
					},
				},
				options: [
					{
						displayName: 'Enabled',
						name: 'enabled',
						type: 'boolean',
						default: true,
						description: 'Whether the alert is active',
						routing: {
							send: {
								type: 'body',
								property: 'enabled',
							},
						},
					},
					{
						displayName: 'Filter Query',
						name: 'filter_query',
						type: 'string',
						default: '',
						description:
							'Replace the keyword or Boolean query. An empty value clears it so the alert matches all new content.',
						routing: {
							send: {
								type: 'body',
								property: 'filter_query',
							},
						},
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'options',
						options: [
							{ name: 'Danish', value: 'da' },
							{ name: 'English', value: 'en' },
							{ name: 'Finnish', value: 'fi' },
							{ name: 'Norwegian', value: 'no' },
							{ name: 'Swedish', value: 'sv' },
						],
						default: 'en',
						description: 'The stemming language used when matching',
						routing: {
							send: {
								type: 'body',
								property: 'language',
							},
						},
					},
					{
						displayName: 'Minimum Novelty',
						name: 'min_novelty',
						type: 'number',
						default: 0,
						typeOptions: {
							minValue: 0,
							maxValue: 100,
						},
						description: 'How different a change must be to count, from 0 to 100',
						routing: {
							send: {
								type: 'body',
								property: 'min_novelty',
							},
						},
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description:
							'Optional human-friendly alert name; blank falls back to the derived scope+filter sentence',
						routing: {
							send: {
								type: 'body',
								property: 'name',
							},
						},
					},
					{
						displayName: 'Source IDs',
						name: 'source_ids',
						type: 'string',
						default: '',
						description: 'Comma-separated source IDs the alert watches',
						routing: {
							send: {
								type: 'body',
								property: 'source_ids',
							},
						},
					},
				],
			},

			// Destination operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['destination'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a destination',
						description: 'Attach a delivery target under an alert: webhook, Slack, Discord, Telegram, or ntfy',
						routing: {
							request: {
								method: 'POST',
								url: '=/v1/alerts/{{$parameter["alertId"]}}/destinations',
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete a destination',
						description: 'Delete a delivery destination',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/v1/destinations/{{$parameter["destinationId"]}}',
							},
						},
					},
					{
						name: 'List',
						value: 'list',
						action: 'List destinations',
						description: 'List delivery destinations, per alert or across the key alerts',
						routing: {
							request: {
								method: 'GET',
								url: '/v1/destinations',
							},
						},
					},
					{
						name: 'Update',
						value: 'update',
						action: 'Update a destination',
						description: 'Replace a delivery destination definition',
						routing: {
							request: {
								method: 'PATCH',
								url: '=/v1/destinations/{{$parameter["destinationId"]}}',
							},
						},
					},
				],
				default: 'create',
			},
			{
				displayName: 'Alert ID',
				name: 'alertId',
				type: 'string',
				default: '',
				required: true,
				description: 'The alert the destination is attached under',
				displayOptions: {
					show: {
						resource: ['destination'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Destination ID',
				name: 'destinationId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the destination to act on',
				displayOptions: {
					show: {
						resource: ['destination'],
						operation: ['update', 'delete'],
					},
				},
			},
			{
				displayName: 'Kind',
				name: 'kind',
				type: 'options',
				options: [
					{ name: 'Discord', value: 'discord' },
					{ name: 'Ntfy', value: 'ntfy' },
					{ name: 'Slack', value: 'slack' },
					{ name: 'Telegram', value: 'telegram' },
					{ name: 'Webhook', value: 'webhook' },
				],
				default: 'webhook',
				required: true,
				description: 'The kind of delivery target',
				displayOptions: {
					show: {
						resource: ['destination'],
						operation: ['create'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'kind',
					},
				},
			},
			{
				displayName: 'Target URL',
				name: 'destinationUrl',
				type: 'string',
				default: '',
				required: true,
				description: 'The webhook or chat URL that receives deliveries',
				displayOptions: {
					show: {
						resource: ['destination'],
						operation: ['create'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'url',
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'destinationAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['destination'],
						operation: ['create', 'update'],
					},
				},
				options: [
					{
						displayName: 'Delivery Mode',
						name: 'delivery_mode',
						type: 'options',
						options: [
							{ name: 'Daily', value: 'daily' },
							{ name: 'Hourly', value: 'hourly' },
							{ name: 'Instant', value: 'instant' },
							{ name: '15 Minutes', value: '15min' },
						],
						default: 'instant',
						description: 'How often matches are delivered',
						routing: {
							send: {
								type: 'body',
								property: 'delivery_mode',
							},
						},
					},
					{
						displayName: 'Secret',
						name: 'secret',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description: 'A signing secret for HMAC verification on webhook destinations',
						routing: {
							send: {
								type: 'body',
								property: 'secret',
							},
						},
					},
				],
			},
		],
	};
}
