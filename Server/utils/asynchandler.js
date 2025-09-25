

export const asynchandler=(requesthadler)=>{
    return (req,res,next)=>{
        Promise.resolve(requesthadler(req,res,next))
        .catch((err)=>next(err))
    }
}
