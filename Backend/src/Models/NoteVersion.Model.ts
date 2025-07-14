import mongoose from "mongoose";

const NoteVersionSchema=new mongoose.Schema({
    baseVersionId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"notes",
        required:true
    },
    usersId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"users",
        required:true
    },
    diff:[{type:Object}],
    
},
    {timestamps:true})