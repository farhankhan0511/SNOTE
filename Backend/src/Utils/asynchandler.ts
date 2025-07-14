import { NextFunction, Request, Response } from "express"

export const asynchandler=async(requesthadler:any)=>{
    return (req:Request,res:Response,next:NextFunction)=>{
        Promise.resolve(requesthadler(req,res,next))
        .catch((err)=>next(err))
    }
}