# `rjweb-server`

<img style="float: right;" alt="RJWEB Icon" height="104" src="https://cdn.rjns.dev/rjweb/icon.svg">

Easy and Lightweight Web Server Library

🏠 [Homepage](https://github.com/0x7d8/rjweb-sentry#readme)
🔍 [Documentation](https://server.rjweb.dev)

![lines of code](https://tokei.rs/b1/github/0x7d8/rjweb-sentry?category=code)
![files](https://tokei.rs/b1/github/0x7d8/rjweb-sentry?category=files)

## Disclaimer

This Package is intended to be used in the backend.

- ✔️ ESM
- ✔️ CJS
- ✔️ Typescript

## Install

```sh
npm install @rjweb/sentry
yarn add @rjweb/sentry
pnpm install @rjweb/sentry
bun install @rjweb/sentry
```

## Usage

Initialize

```js
import { Server } from "rjweb-server"
import { Runtime } from "@rjweb/runtime-node"
import { sentry } from "@rjweb/sentry"

const server = new Server(Runtime, {
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

Copyright © 2023 0x7d8.
This project is MIT licensed.
