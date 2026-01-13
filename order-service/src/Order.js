import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  userEmail: String, 
  status: {
    type: String,
    default: "PENDING" 
  },
  totalPrice: Number, 
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