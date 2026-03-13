# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.12.5 create --template minimal --types ts --no-install website
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Contact Page Email Setup

The `/contact` page now includes a contact form that sends:

- an acknowledgement email to the sender
- a copy of the submitted message to your inbox

Configure SMTP environment variables before running the app:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="Sonar IDE <no-reply@example.com>"
CONTACT_INBOX_EMAIL=support@example.com
```

Notes:

- `SMTP_HOST` and `SMTP_FROM` are required.
- `SMTP_SECURE` can be `true` or `false` (if omitted, port `465` is treated as secure).
- `CONTACT_INBOX_EMAIL` is optional; if omitted, messages are copied to `SMTP_FROM`.
