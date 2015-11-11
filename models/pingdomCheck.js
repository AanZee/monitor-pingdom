var r = null;

exports.init = function (db) {
	r = db;
}

// Create new moduleData or update existing one
exports.insertOrUpdateChecks = function(id, pingdomCheck, callback) {
	pingdomCheck.updatedAt = Date.now();
	pingdomCheck.delete = false;

	r.table('pingdomChecks')
	.get(id)
	.replace(
		function (row) {
			return r.branch(
				row.eq(null),
				r.expr(pingdomCheck).merge({createdAt: Date.now()}),
				row.merge(pingdomCheck).merge({})
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

// Before inserting/updating pingdomChecks, mark pingdomChecks to delete
exports.markToDelete = function() {
	return function(callback) {
		r.table('pingdomChecks')
		.update({delete: true})
		.run()
		.then(function(marked){
			callback(null);
		})
		.error(function(err){
			callback(err);
		});
	}
}

// After inserting/updating pingdomChecks, delete pingdomChecks that doesn't exist anymore
exports.deleteMarked = function() {
	r.table('pingdomChecks')
	.getAll(true, {index: 'delete'})
	.delete()
	.run()
	.then(function(deleted){
		// Deleted
	})
	.error(function(err){
		// Error
	});
}