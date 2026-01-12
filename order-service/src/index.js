import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const connectDB = async() => {
    await mongoose.connect(process.env.ORDER_DB_URI , {
        timeoutMS : 3000,
    }).then(() => {
        console.log("Order DB is connected.");
    }).catch((err) => {
        console.log("Mongoose conncetion error : " + err);
    })
}

connectDB();

app.listen(process.env.PORT , () => {
    console.log(`Order service is running on port : ${process.env.PORT}`);
})