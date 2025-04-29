import mongoose , { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber : {
        type : Schema.Types.ObjectId, //One whose is subscribing
        ref : "User" 
    },
    channel : {
        type : Schema.Types.ObjectId, //One to whom "subscriber" is subscribing to
        ref : "User"
    }
},{timestamps : true})

export const Subscription = mongoose.model("Subscription" , subscriptionSchema)