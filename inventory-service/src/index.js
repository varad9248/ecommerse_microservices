import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectToRabbitMQ, { getChannel } from "./rabbitmq.js";
import Inventory from "./Inventory.js";

dotenv.config();
const app = express();
app.use(express.json());

// --- THE CONSUMER LOGIC ---
const consumeOrderCreated = async () => {
  const channel = getChannel();
  await channel.assertQueue("ORDER_CREATED"); // Ensure queue exists

  console.log(" Waiting for messages in ORDER_CREATED...");

  // This function runs whenever a message arrives
  channel.consume("ORDER_CREATED", async (msg) => {
    if (!msg) return;

    const data = JSON.parse(msg.content.toString());
    const { orderId, items } = data;

    console.log(`Processing Order: ${orderId}`);

    let orderSuccess = true;

    // FIX 1: Use for...of to handle async/await correctly
    for (const item of items) {
      // FIX 2 & 3: Atomic Check & Update
      // "Find product WHERE ID is matches AND quantity is enough"
      // If matched, subtract immediately.
      const result = await Inventory.updateOne(
        {
          productId: item.productId,
          quantity: { $gte: item.quantity }, // Condition: Must have enough stock
        },
        {
          $inc: { quantity: -item.quantity }, // Action: Subtract actual order amount
        }
      );

      // result.modifiedCount will be 1 if it worked, 0 if stock was too low
      if (result.modifiedCount === 0) {
        console.error(`❌ Out of Stock for ${item.productId}`);
        orderSuccess = false;
        // In a real world, you would need to trigger a "Rollback" here for previous items!
        break; // Stop processing this order
      }
    }

    if (orderSuccess) {
      console.log(`✅ Order ${orderId} Fulfilled!`);
      await channel.assertQueue("ORDER_UPDATED");
      channel.sendToQueue("ORDER_UPDATED" , Buffer.from(JSON.stringify({ orderId, status: "CONFIRMED" })));
    } else {
      console.log(`🚫 Order ${orderId} Failed`);
      await channel.assertQueue("ORDER_UPDATED");
      channel.sendToQueue("ORDER_UPDATED" , Buffer.from(JSON.stringify({ orderId, status: "CANCELLED" })));
    }

    channel.ack(msg);
  });
};

app.post("/products", async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity === undefined) {
    res.status(400).send({ message: "Inefficient dat." });
  }

  try {
    const newProduct = new Inventory({ productId, quantity });
    await newProduct.save();
    res.status(201).json({ message: "Stock added", product: newProduct });
  } catch (error) {
    console.log(error);
    res.status(500).send("Something went wrong");
  }
});

app.get("/" , async (_, res) => {
    const products = await Inventory.find({});
    res.send(
        { 
            products : products
        }
    );
})

// --- DATABASE & SERVER ---
const startServer = async () => {
  try {
    await mongoose.connect(
      process.env.INVENTORY_DB_URI ||
        "mongodb://localhost:27017/inventory_service_db"
    );
    console.log(" Inventory DB Connected");

    // Connect to RabbitMQ
    await connectToRabbitMQ();

    // START CONSUMING
    await consumeOrderCreated();

    app.listen(process.env.PORT || 3001, () => {
      console.log(
        `Inventory Service running on port ${process.env.PORT || 3001}`
      );
    });
  } catch (err) {
    console.error("Failed to start:", err);
  }
};

startServer();
