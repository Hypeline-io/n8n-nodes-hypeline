import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HypelineApi implements ICredentialType {
	name = 'hypelineApi';

	displayName = 'Hypeline API';

	documentationUrl = 'https://hypeline.io/docs';

	icon: Icon = { light: 'file:hypeline.svg', dark: 'file:hypeline.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'A hype_ API key from your Hypeline account, under Settings then API keys',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.hypeline.io',
			url: '/v1/sources',
			method: 'GET',
		},
	};
}
