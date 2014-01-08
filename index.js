var arDrone = require('ar-drone');
var client = arDrone.createClient();

client.takeoff();

// client
//   .after(5000, function() {
//     this.clockwise(0.5);
//   })
//   .after(3000, function() {
//     this.animate('flipLeft', 15);
//   })
//   .after(1000, function() {
//     this.stop();
//     this.land();
//   });
client.after(5000, function() {
  client.on('navdata', function(d) {
    console.log(d);
  });
  client.up(0.15);
  client.after(2000, function() {
    client.stop();
    client.after(1000, function() {
      client.land();
    });
  });
});
