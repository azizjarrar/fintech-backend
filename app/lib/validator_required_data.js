
class CustomError extends Error {
    constructor(obj) {
        super(obj.message);
        this.statusCode = obj.statusCode;
        this.message = obj.message;
    }
}


module.exports = { CustomError };
