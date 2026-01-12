import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  userEmail: String, // Capital S
  status: {
    type: String,
    default: "PENDING" // You nailed this part
  },
  totalPrice: Number, // Capital N
  items: [
    {
      productId: String,
      name: String,
      price: Number,
      quantity: Number
    }
  ]
});

const Order = mongoose.model("Order", OrderSchema);
export default Order;