var r = null;

exports.init = function (db) {
	r = db;
}

// Create new moduleData or update existing one
exports.insertOrUpdateChecks = function(id, pingdomCheck, callback) {
	r.table('pingdomChecks')
	.get(id)
	.replace(
		function (row) {
			return r.branch(
				row.eq(null),
				r.expr(pingdomCheck).merge({createdAt: Date.now(), updatedAt: Date.now()}),
				row.merge(pingdomCheck).merge({updatedAt: Date.now()})
			)
		},
		{ returnChanges: true }
	)
	.run()
	.then(function(newPingdomCheck){
		if(newPingdomCheck.errors > 0)
			callback(newPingdomCheck.first_error);
		
		else {
			if(newPingdomCheck.unchanged > 0)
				callback(null, pingdomCheck);
			
			else {
				newPingdomCheck = newPingdomCheck.changes[0].new_val;
				
				callback(null, newPingdomCheck);
			}
		}
	})
	.error(function(err){
		callback(err);
	});
}

exports.getChecksWithMonitorClientId = function() {
	r.table('pingdomChecks')
	.contains('monitorClientId')
	.run()
	.then(function(newPingdomChecks){

	})
	.error(function(err){
		callback(err);
	});
}