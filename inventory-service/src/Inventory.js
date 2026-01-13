import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  quantity: { type: Number, required: true, default: 0 }
});

const Inventory = mongoose.model("Inventory", InventorySchema);
export default Inventory;