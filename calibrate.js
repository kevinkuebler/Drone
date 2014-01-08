var arDrone = require('ar-drone');
var client = arDrone.createClient();

client.takeoff();

client.after(3000, function() {
	client.calibrate(0);

	client.after(3000, function() {
		client.land();
	});
});