import mongoose from "mongoose";

const NoteVersionSchema=new mongoose.Schema({
    baseVersionId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Note",
        required:true
    },
    modifiedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    diff:[{type:Object}],
    
},
    {timestamps:true})

export default mongoose.model("NoteVersion",NoteVersionSchema)
