var TURN_THRESHHOLD = 6;
var FRAME_RATE = 3;

var arDrone = require('ar-drone');
var client = arDrone.createClient({
  frameRate: FRAME_RATE
});
var PNGReader = require('png.js');
var fs = require('fs');

var shouldTrack = false;
var direction = "";

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
      }
      console.log("counter clockwise");
      client.after(100, function() {
        client.counterClockwise(0.2);
        client.animateLeds('frontLeftGreenOthersRed', 40, 1);
      });
    } else if (green.right - green.left >= TURN_THRESHHOLD) {
      if (direction !== "right") {
        direction = "right";
        client.stop();
      }
      console.log("clockwise");
      client.after(100, function() {
        client.clockwise(0.2);
        client.animateLeds('frontRightGreenOthersRed', 40, 1);
      });
    } else {
      direction = "";
      if (direction !== "") {
        direction = 0;
        client.stop();
      }
      console.log("stay the course");
      client.animateLeds('blinkGreen', 15, 1);
    }

    fs.writeFile('imgs/frame' + Date.now() + JSON.stringify(green) + '.png', data, function() {
    });
  });
});

client.takeoff();

client.after(5000, function() {
  client.on('navdata', function(d) {
    //console.log(d);
  });
  client.up(0.15);
  client.after(2000, function() {
    client.stop();
    shouldTrack = true;
    client.after(8000, function() {
      client.land();
    });
  });
});
