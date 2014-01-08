var arDrone = require('ar-drone');
var client = arDrone.createClient({
  frameRate: 2
});
var fs = require('fs');

var frame = 0;

client.getPngStream().on('data', function(data) {
  frame++;
  fs.writeFile('imgs/frame' + frame + ".png", data, function() {
  });
});

client.takeoff();

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
