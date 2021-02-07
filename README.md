# three-types-bot

> A GitHub App built with [Probot](https://github.com/probot/probot) that Helps create manage the three-types organization shared code

## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Docker

```sh
# 1. Build container
docker build -t three-types-bot .

# 2. Start container
docker run -e APP_ID=<app-id> -e PRIVATE_KEY=<pem-value> three-types-bot
```

## Contributing

If you have suggestions for how three-types-bot could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2021 Josh Ellis <joshua.ellis18@gmail.com>
