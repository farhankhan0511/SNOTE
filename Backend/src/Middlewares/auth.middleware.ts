import { NextFunction, Request, Response } from "express";
import { asynchandler } from "../Utils/asynchandler";
import { ApiResponse } from "../Utils/ApiResponse";
import jwt from "jsonwebtoken"

export const verifyJWT=asynchandler(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const token=req.cookies?.accessToken || req.headers?.authorization?.replace("Bearer","")
        if(!token){
            return res.status(401).json(new ApiResponse(401,{},"Invalid access Token"))
        }
    
        const decode=await jwt.verify(token,process.env.ACCESS_TOKEN_SECRET!)
        
    } catch (error) {
        return res.status(401).json(new ApiResponse(401,{},"Invalid access Token"))
    }
})