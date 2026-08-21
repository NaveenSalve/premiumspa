import { createApp } from '../server.ts';
import type { Request, Response } from 'express';

let appInstance: Awaited<ReturnType<typeof createApp>> | undefined;

export default async function handler(req: Request, res: Response) {
  if (!appInstance) {
    appInstance = await createApp();
  }
  return appInstance(req, res);
}