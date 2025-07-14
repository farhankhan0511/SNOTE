import mongoose from "mongoose";

let DBNAME="SNOTE"
export const DBconnect=async()=>{
    try {
        console.log(process.env.MONGODB_URI)
        const connection=await mongoose.connect(`${process.env.MONGODB_URI}/${DBNAME}`);
        console.log(connection.connection.host);
    } catch (error:any) {
        console.log(`Error while connecting to Database: ${error.message}`);
        process.exit(1);
    }
}