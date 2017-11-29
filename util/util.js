module.exports = {

  /**
   * Create a response message message.
   *
   * Return message string ready to be sent over network.
   */
  createResponseMessage: function(statusCode, statusMessage, response=null) {
    return JSON.stringify({
      status_code: statusCode,
      status_message: statusMessage,
      response: response
    });
  },

  /**
   * Generate a random string with input length.
   * It will return null if length is less than or equal 0, or equal null, or not number type.
   */
  generateRandomString: function(length) {
    if (length <= 0 || length == null || typeof length !== 'number') return null;

    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  },

  /**
   * Create an error object representing the specified error code and error message.
   * Error code will be added as 'code' property.
   *
   * Suitable to use for Promise response.
   * 
   * @param  {number} errorCode    Error number
   * @param  {string} errorMessage Error message
   * @return {object}              Error object.
   */
  createErrorObject: function(errorCode, errorMessage) {
    let e = new Error(errorMessage);
    e.code = errorCode;
    return e;
  },

  /**
   * Create a success object. Suitable to use for Promise response.
   * 
   * @param  {number} statusCode     Status code
   * @param {string}  statusMessage  Status message
   * @param  {object} responseObject Response object
   * @return {any}                Success data. It can be in any data type.
   */
  createSuccessObject: function(statusCode, statusMessage, responseObject) {
    return {
      status_code: statusCode,
      status_message: statusMessage,
      response: responseObject
    };
  }
}