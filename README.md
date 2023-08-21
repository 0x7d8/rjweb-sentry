<h1 align="center">Welcome to @rjweb/sentry 👋</h1>
<div align="center">
  Sentry Request Tracking Middleware for rjweb
</div>

## Install

```sh
npm i @rjweb/sentry
```

## Usage

Initialize
```js
const { Server } = require('rjweb-server')
const { sentry } = require('@rjweb/sentry')

const server = new Server({
	port: 8000
}, [
	sentry.config({
		environment: 'production',
		dsn: 'https://hmmm@hmmm.ingest.sentry.io/hmmm',
		tracesSampleRate: 0.1
	}) // config is just the default node sentry sdk's config
])

// ...
```

## Author

👤 **0x7d8** 

## Show your support

Give a Star if this project helped you!

## 📝 License

Copyright © 2023 0x7d8.<br />
This project is MIT licensed.