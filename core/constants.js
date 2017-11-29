module.exports = {
	statusCode: {
		success: 1,
		databaseRelatedError: 6000,
		requiredParamsMissingError: 6001,
		httpError: 6002,
		responseIsNull: 6003,
		jsonParsedError: 6004,
		httpResponseErrorEvent: 6005,
		httpRequestErrorEvent: 6006,
		internetConnectionError: 6006,
		invalidAccessToken: 6007,
		sessionKeyAndOpenIdRequestError: 6008,
		openIdNotMatch: 6009,
		unknownError: 9999
	}
}