import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import connectToRabbitMQ, { getChannel } from "./rabbitmq.js"; // CHECK THIS PATH
import orderRoutes from "./routes/order.js"; // CHECK THIS PATH
import Order from "./Order.js"; // CHECK THIS PATH

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// --- CONSUMER LOGIC ---
const consumeOrderUpdated = async () => {
  const channel = getChannel();
  // Ensure the queue exists before listening
  await channel.assertQueue("ORDER_UPDATED");

  console.log("👂 Listening for ORDER_UPDATED...");

  channel.consume("ORDER_UPDATED", async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());
      const { orderId, status } = data;

      console.log(`🔄 Updating Order ${orderId} to ${status}`);

      // FIX 2: Use _id to find the document
      await Order.updateOne({ _id: orderId }, { status: status });

      // FIX 3: Acknowledge the message!
      channel.ack(msg);
      
    } catch (err) {
      console.error("Error processing message:", err);
      // If JSON parse fails, we might want to ack anyway to remove the bad message
      channel.ack(msg); 
    }
  });
};

// --- STARTUP LOGIC ---
const startServer = async () => {
  try {
    // 1. Connect to Mongo
    await mongoose.connect(process.env.ORDER_DB_URI, { timeoutMS: 3000 });
    console.log("✅ Order DB Connected");

    // 2. Connect to RabbitMQ (FIX 1: Wait for it!)
    await connectToRabbitMQ();
    
    // 3. Start the Listener
    await consumeOrderUpdated();

    // 4. Start the Web Server
    app.use("/orders", orderRoutes);
    
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Order service running on port ${process.env.PORT}`);
    });

  } catch (err) {
    console.error("Failed to start server:", err);
  }
};

startServer();