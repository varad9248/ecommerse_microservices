import amqp from 'amqplib';

let channel = null;

const connectToRabbitMQ = async () => {
    try {
        // 1. Connect to the RabbitMQ server
        // If running locally: "amqp://localhost"
        // If running in Docker: "amqp://rabbitmq"
        const connection = await amqp.connect(process.env.RABBITMQ_URI || 'amqp://localhost');
        
        // 2. Create the channel (the "tunnel" for messages)
        channel = await connection.createChannel();
        
        console.log("Connected to RabbitMQ");
        return channel;
    } catch (error) {
        console.error(" RabbitMQ Connection Failed:", error);
        // Retry logic or exit would usually go here
        process.exit(1);
    }
};

// Helper to get the existing channel without reconnecting
export const getChannel = () => channel;

export default connectToRabbitMQ;