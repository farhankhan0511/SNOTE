import mongoose from "mongoose";

const NoteSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true,
        trim:true
    },
    Content:{
        type:Object
    },
    tags:[{type:String,trim:true}],
    isPublic:{
        type:Boolean,
        required:true,
        default:false,
    },
    authorId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"users",
        required:true
    },
    rating:{
        type:Number,
        requird:true,
        default:0
    },
    history:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"noteversions",
    }],
    collaborators:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"users"
        }
    ]
},{timestamps:true})

export const Notes=mongoose.model("notes",NoteSchema)