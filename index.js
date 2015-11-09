exports.isMonitoringModule = true;
exports.hasCron = true;
exports.snapshotData = true;

var pingdomApi = null;
var PingdomCheck = null;

/**
 * Module config:
 * 
 * "monitor-pingdom" : {
 *		"user": "",
 *		"pass": "",
 *		"appkey": "",
 *		"cronTime": ""
 * }
 */

 // Tables this module need to function
exports.tables = [
	{
		name: 'pingdomChecks',
		index: [
			'monitorClientId'
		]
	}
];

exports.init = function (db) {
	pingdomApi = require('pingdom-api')(this.config);

	PingdomCheck = require('./models/PingdomCheck');
	PingdomCheck.init(db);
}

exports.executeCron = function (callback) {
	getChecks(function(err, checks) {
		if(err)
			return callback(err);

		else {
			// forEach loop -> insert/update all in db
			checks.forEach(function(check) {

				PingdomCheck.insertOrUpdateChecks(check.id, check, function(err, pingdomCheck){

					// PindomCheck is linked to monitorClient -> create moduleData and callback
					if(pingdomCheck.monitorClientId) {

						var monitorClientId = pingdomCheck.monitorClientId;
						delete pingdomCheck.monitorClientId;

						var moduleData = {
							monitorClientId: monitorClientId,
							data: pingdomCheck
						};

						callback(null, moduleData);
					}

				});

			});

			// create moduleData object for each check with monitorClientId
			// callback for each moduleData
		}
	});
}

getChecks = function(callback) {
	pingdomApi.getChecks()
	.spread(function(checks, response){
		callback(null, checks);
	})
	.catch(function(e){
		callback(e);
	});
}