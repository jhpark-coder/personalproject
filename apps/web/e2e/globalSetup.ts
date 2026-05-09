import { preview, type PreviewServer } from 'vite';

const HOST = '127.0.0.1';
const PORT = 4173;

export default async function globalSetup() {
  process.env.VITE_CHAT_SERVER_URL ??= 'http://127.0.0.1:4010';

  let server: PreviewServer | undefined = await preview({
    logLevel: 'silent',
    preview: {
      host: HOST,
      port: PORT,
      strictPort: true,
    },
  });

  return async () => {
    await server?.close();
    server = undefined;
  };
}
