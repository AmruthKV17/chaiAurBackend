// require('dotenv').config({path : './env'})
import dotenv from 'dotenv';
import connectDB from './db/index.js';
import { app } from './app.js';
dotenv.config({path : './env'})

connectDB()
.then(()=>{
    // app.on((err)=>{
    //     console.log("Error occured after Mongodb connection:",err);
    // })
    app.listen(process.env.PORT || 3001, ()=>{
        console.log(`App listening at http://localhost:${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.error("Mongo Connection failed : ",err); 
})














/*
(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
    } catch (error) {
        console.error("Error :",error);
        throw error

    }
})()*/