
import nodemailer from "nodemailer";

const transporter=nodemailer.createTransport({service:"gmail",
    auth:{
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS,
    },
    logger: true,
    debug: true,
})

export const SendMail=async(email:string,subject:string,body:string)=>{
    
        try {
            const options={
                from:process.env.EMAIL_USER,
                to:email,
                subject:subject,
                html:body
            }
           
            await transporter.sendMail(options)
            return "Email Successfull"
        } catch (error) {
            console.error("Email sending error:", error);
            return "Failed"
        }
    }
    