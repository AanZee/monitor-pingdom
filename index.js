exports.isMonitoringModule = true;
exports.hasCron = true;
exports.snapshotData = true;

var async = require('async');
var responseMessaging = require('monitor-response');
var pingdomApi = null;
var PingdomCheck = null;

var pingdomChecks = [];

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
			'monitorClientId',
			'delete'
		]
	}
];

exports.init = function (db) {
	pingdomApi = require('pingdom-api')(this.config);

	PingdomCheck = require('./models/pingdomCheck');
	PingdomCheck.init(db);
}

exports.executeCron = function (cb) {
	// Reset
	pingdomChecks = [];

	var actions = [];

	// mark existing pingdomChecks toDelete (afterwards deleting old pingdomChecks)
	actions.push(PingdomCheck.markToDelete());

	// Get all pingdomChecks
	actions.push(getChecks());

	// Insert/update all pingdomChecks
	actions.push(insertOrUpdatePingdomChecks(cb));


	// Execute all functions in 'actions' array
	async.waterfall(
		actions,
		function(err, result){
			if(err) {
				// console.log(err);
			} else {
				// console.log('DONE');

				// Delete old pingdomChecks
				PingdomCheck.deleteMarked();
			}
		}
	);
}

getChecks = function() {

	return function(callback) {
		pingdomApi.getChecks()
		.spread(function(checks, response){
			pingdomChecks = pingdomChecks.concat(checks);
			return callback(null);
		})
		.catch(function(err){
			return callback(err);
		});
	}

}

// insert or update all pingdomChecks
insertOrUpdatePingdomChecks = function(cb) {

	return function(callBack) {
		var checkActions = [];

		// Insert each instance
		for(var i in pingdomChecks) {
			checkActions.push(insertOrUpdatePingdomCheck(pingdomChecks[i], cb));
		}

		// Execute all functions in 'checkActions' array
		async.waterfall(
			checkActions,
			function(err, result){
				if(err)
					callBack(err);
				else 
					callBack(null);
			}
		);
	}

}

// insert or update loadBalancer
insertOrUpdatePingdomCheck = function(check, cb) {

	return function(callback) {
		PingdomCheck.insertOrUpdateChecks(check.id, check, function(err, pingdomCheck){
			if(err) callback(err);

			else {
				// PindomCheck is linked to monitorClient -> create moduleData and callback
				if(pingdomCheck.monitorClientId) {
					var monitorClientId = pingdomCheck.monitorClientId;
					delete pingdomCheck.monitorClientId;

					var moduleData = {
						monitorClientId: monitorClientId,
						data: pingdomCheck
					};

					cb(null, moduleData); // callback to moduleManager
				}

				callback(null);
			}
		});
	}

}

exports.getRoutes = function () {
	return [
		{method: 'GET', pattern: '/module/monitorPingdom', function: routeGetAll},
		{method: 'POST', pattern: '/module/monitorPingdom/update', function: routeUpdate}
	];
}

var routeGetAll = function(req, res, next) {

	// Protected route (only admins)
	if(req.user && req.user.role != 'admin')
		return res.status(401).json(responseMessaging.format(401));

	PingdomCheck.getAll(function(err, pingdomChecks){
		if(err)
			res.status(500).json(responseMessaging.format(500, {}, [err]));
		else
			res.status(200).json(responseMessaging.format(200, pingdomChecks));
	});

}

// Update pingdomCheck
var routeUpdate = function(req, res, next) {

	// Protected route (only admins)
	if(req.user && req.user.role != 'admin')
		return res.status(401).json(responseMessaging.format(401));

	var id = req.body.id;
	var data = {
		monitorClientId: req.body.monitorClientId
	};

	PingdomCheck.update(id, data, function(err, pingdomCheck){
		if(err)
			res.status(500).json(responseMessaging.format(500, {}, [err]));
		else			
			res.status(200).json(responseMessaging.format(200, pingdomCheck));
	});

};