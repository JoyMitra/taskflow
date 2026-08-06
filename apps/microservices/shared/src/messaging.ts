import amqp from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";

let connection: amqp.ChannelModel;
let channel: amqp.Channel;

export async function connectMessaging() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log("Connected to RabbitMQ");
  } catch (err) {
    console.error("Failed to connect to RabbitMQ", err);
  }
}

export async function publishEvent(exchange: string, routingKey: string, data: any) {
  try {
    if (!channel) {
      console.error("Messaging channel not initialized");
      return;
    }
    await channel.assertExchange(exchange, "topic", { durable: true });
    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)));
  } catch (err) {
    console.error("Error publishing event:", err);
  }
}

export async function subscribeEvent(exchange: string, queue: string, routingKey: string, onMessage: (data: any) => void) {
  try {
    if (!channel) {
      await connectMessaging();
    }
    if (!channel) return;

    await channel.assertExchange(exchange, "topic", { durable: true });
    const q = await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(q.queue, exchange, routingKey);
    await channel.consume(q.queue, (msg) => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString());
          onMessage(data);
          channel.ack(msg);
        } catch (err) {
          console.error("Error processing message:", err);
          channel.ack(msg);
        }
      }
    });
  } catch (err) {
    console.error("Error subscribing to event:", err);
  }
}

export async function closeMessaging() {
  await channel?.close();
  await connection?.close();
}
