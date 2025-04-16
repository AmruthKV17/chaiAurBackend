const asynsHandler = async (requestHandler) => {
    return (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
    }
    
}

export {asynsHandler}
/*
const asynsHandler  = (fn) => async (req,res,next) => {
    try {
        fn(req,res,next)
    } catch (error) {
        res.status(error.code || 500).json({
            success : false,
            message : error.message
        })
    }
    
}
*/