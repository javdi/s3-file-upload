# Media Uploader - Technical Assessment

Create a Media class that can upload images & videos to an S3-compatible storage service.

## Environment Setup

1. Node.js >= 20.15
2. pnpm 9.x
3. Vitest for testing
4. Docker Compose

## Project Structure

```
src/
├── services/ 
      ├── media.ts      # service Implementation
├── tests
      ├── media.test.ts  # Test files
├── types
      ├── media.types.ts  # type files
└── fixtures.json  # Test fixtures
└── server.ts  # Test fixtures
└── compose.yaml   # Docker compose for S3-compatible storage service
```

### Local Development

Start S3-compatible storage:

```shell
$ docker compose up
```

```shell
update the .env file
```

```shell
$ pnpm install
$ pnpm build
$ pnpm dev
```
