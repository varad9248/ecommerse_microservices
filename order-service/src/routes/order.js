import express from 'express';
import { getChannel } from '../rabbitmq.js';
import Order from '../Order.js';

const router = express.Router();

router.post('/', async (req, res) => {
    const { items, userEmail, totalPrice } = req.body;
    
    // 1. Get the rabbitmq channel
    const channel = getChannel();

    try {
        // STEP A: Create the Order in MongoDB (Status defaults to PENDING)
        const newOrder = new Order ({
            status : "PENDING",
            userEmail : userEmail,
            items : items,
            totalPrice : totalPrice
        })
        await newOrder.save();

        // STEP B: Send the message to RabbitMQ
        // We need to send the orderId and the items so Inventory knows what to check.
        const payload = {
            orderId: newOrder._id,
            items: newOrder.items
        };
        
        channel.sendToQueue("ORDER_CREATED", Buffer.from(JSON.stringify(payload)));

        res.status(201).json({ message: "Order placed successfully!", order: newOrder });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to create order" });
    }
});

router.get("/" , async (req ,res) => {
    const orders = await Order.find({});
    res.send(orders);
})

export default router;