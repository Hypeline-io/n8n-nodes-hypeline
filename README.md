# @hypeline-io/n8n-nodes-hypeline

Give your agents and workflows eyes on the web. This is an [n8n](https://n8n.io)
community node for [Hypeline](https://hypeline.io): point it at any feed,
streaming source, or web page, and act on genuinely new content inside n8n.

Hypeline detects whether a URL is a feed, a web page, or a streaming source,
renders JavaScript apps when a plain fetch comes back empty, and tells a real
change apart from a rotated ad or a ticking timestamp. It hands you one
deduplicated event stream. This node lets an n8n workflow start on those events
and manage the monitoring itself, so the automation platform an agent already
lives in can watch the web.

[Installation](#installation)
[Nodes](#nodes)
[Credentials](#credentials)
[Usage](#usage)
[Compatibility](#compatibility)
[Resources](#resources)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/):
in n8n, go to **Settings > Community Nodes**, select **Install**, and enter
`@hypeline-io/n8n-nodes-hypeline`.

## Nodes

### Hypeline Trigger

Starts a workflow when Hypeline surfaces new content.

On activation it creates a webhook destination (optionally creating a new alert
from a query first) pointed at the workflow's webhook URL. Every delivery is
verified with an HMAC signature on the raw body before the workflow runs, so a
tampered or replayed request never fires it. On deactivation it removes the
destination it created, and the alert too if it created that alert. A
pre-existing alert you attach to is never deleted.

### Hypeline

Manages monitoring from inside a workflow, with three resources:

- **Source**: create, get, list, delete. A source turns any feed, streaming
  source, or web page into an event stream. The tier is detected automatically.
- **Alert**: create, list, update, delete. An alert is a keyword or Boolean
  query matched against the content of changes from a set of sources.
- **Destination**: create, list, update, delete. A delivery target attached
  under an alert (webhook, Slack, Discord, Telegram, or ntfy).

## Credentials

You need a Hypeline account and an API key.

1. Sign up at [hypeline.io](https://hypeline.io) and create a `hype_` API key
   under **Settings > API keys**.
2. In n8n, create a new **Hypeline API** credential and paste the key.
3. Click **Test** to confirm it authenticates against the API.

The key is sent as an `Authorization: Bearer` header on every request.

## Usage

React to new content:

1. Add a **Hypeline Trigger** node.
2. Choose **Create New**. Leave the filter query blank to fire on all new
   content, or narrow it with a keyword or Boolean query (for example
   `acquisition OR "series a"`), optionally scoped to specific source ids. Or
   choose **Attach Existing** and paste an alert id.
3. Activate the workflow. The trigger registers itself and fires on each new
   matching change, with the event as JSON.

Manage monitoring:

1. Add a **Hypeline** node.
2. Pick a resource (Source, Alert, or Destination) and an operation.
3. For example, **Source > Create** with a URL starts watching a page; the
   detected tier and health come back in the response.

## Compatibility

Requires n8n with `n8nNodesApiVersion` 1. Tested against current n8n releases.

## Resources

- [Hypeline documentation](https://docs.hypeline.io)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
