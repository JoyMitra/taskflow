import { subscribeEvent } from "./messaging.js";

export type MessageHandler = (data: any) => Promise<void> | void;

export interface SubscriberConfig {
  exchange: string;
  queue: string;
  routingKey: string;
  handler: MessageHandler;
}

export async function registerSubscribers(configs: SubscriberConfig[]) {
  for (const config of configs) {
    await subscribeEvent(
      config.exchange,
      config.queue,
      config.routingKey,
      config.handler
    );
  }
}
