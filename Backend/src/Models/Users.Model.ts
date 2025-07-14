import mongoose from "mongoose";

interface UserI{
    email:string,
    password:string
    refreshToken:string
    provider:string
    googleid:string
}
enum Provider{
    local="local",
    google="google"
}

const UserSchema=new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true,
        index:true,
        trim:true
    },
    password:{
        type:String,
        required:true,   
    },
    refreshToken:{
        type:String
    },
    provider:{
        type:String,
        enum:Object.values(Provider)
    }
   
},
{timestamps:true}
)

export const User=mongoose.model<UserI>("users",UserSchema)