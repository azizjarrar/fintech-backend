const {CustomError} = require('../lib/validator_required_data')
function errorHandler(err, req, res, next) {
    if (!err instanceof CustomError) {
        logger.error(`An error occurred during processing: ${errorMessage}\nStack trace: ${err.stack}`);
    }
    const statusCode = err.statusCode || 500;
    const errorMessage = err.message || 'An unknown error occurred';
    err.handledByExpress = true;
    if (err.statusCode === undefined) {
        return res.status(500).json({
            error: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal Server Error'
        });
    }else{
        return res.status(statusCode).json({
            error:errorMessage
        });
    }


}

module.exports = errorHandler;