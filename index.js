var TURN_THRESHHOLD = 6;
var FRAME_RATE = 3;

var arDrone = require('ar-drone');
var client = arDrone.createClient({
  frameRate: FRAME_RATE
});
var PNGReader = require('png.js');
var fs = require('fs');

var shouldTrack = false;
var direction = null;

client.getPngStream().on('data', function(data) {
  if (!shouldTrack)
    return;

  var reader = new PNGReader(data);
  reader.parse(function(err, png) {
    if (err) {
      console.log("PNG Error: " + err);
      return;
    }
    var w = png.getWidth();
    var h = png.getHeight();
    var x;
    var y;
    var green = { left: 0, right: 0 };
    var pixel, r, g, b;

    for (x = 0; x < w; x += 40) {
      for (y = 0; y < h; y += 30) {
        pixel = png.getPixel(x, y);
        r = pixel[0];
        g = pixel[1];
        b = pixel[2];

        if (g > 110 && g > r+r/10 && g > b+b/10) {
          if (x < w / 3) {
            green.left++;
          } else if (x > 2*(w / 3)) {
            green.right++;
          }
        }
      }
    }

    if (green.left - green.right >= TURN_THRESHHOLD) {
      if (direction !== "left") {
        direction = "left";
        client.stop();

        console.log("counter clockwise");
        client.counterClockwise(0.1);
        client.animateLeds('frontLeftGreenOthersRed', 40, 1);
      }
    } else if (green.right - green.left >= TURN_THRESHHOLD) {
      if (direction !== "right") {
        direction = "right";
        client.stop();

        console.log("clockwise");
        client.clockwise(0.1);
        client.animateLeds('frontRightGreenOthersRed', 40, 1);
      }
    } else {
      if (direction !== "") {
        direction = "";
        client.stop();

        console.log("stay the course");
        client.animateLeds('blinkGreen', 15, 1);
      }
    }

    fs.writeFile('imgs/frame' + Date.now() + JSON.stringify([green.left, green.right]) + '.png', data, function() {
    });
  });
});

console.log("takeoff");
client.takeoff();
client.after(5000, function() {
  client.on('navdata', function(d) {
    //console.log(d);
  });
  console.log("ascend");
  client.up(0.10);
  client.after(3000, function() {
    console.log("stopped ascent")
    client.stop();
    client.after(1000, function() {
      console.log("started tracking");
      shouldTrack = true;
      client.after(12000, function() {
        console.log("landing");
        shouldTrack = false;
        client.land();
      });
    });
  });
});
