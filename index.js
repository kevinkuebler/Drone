var TURN_THRESHHOLD = 12;
var FRAME_RATE = 10;

var arDrone = require('ar-drone');
var client = arDrone.createClient({
  frameRate: FRAME_RATE
});
var PNGReader = require('png.js');
var fs = require('fs');

var shouldTrack = false;
var direction = null;
var nextDirection = null;

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

    for (x = 0; x < w; x += 20) {
      for (y = 0; y < h; y += 30) {
        pixel = png.getPixel(x, y);
        r = pixel[0];
        g = pixel[1];
        b = pixel[2];

        if (g > 110 && g > r+r/10 && g > b+b/10) {
          if (x < w / 2) {
            green.left++;
          } else if (x >= w / 2) {
            green.right++;
          }
        }
      }
    }

    if (green.left - green.right >= TURN_THRESHHOLD) {
      if (direction !== "left" && nextDirection === "left") {
        direction = "left";
        client.stop();

        console.log("counter clockwise");
        client.counterClockwise(0.14);
        client.animateLeds('leftMissile', 6, 1);
      }
      nextDirection = "left";
    } else if (green.right - green.left >= TURN_THRESHHOLD) {
      if (direction !== "right" && nextDirection === "right") {
        direction = "right";
        client.stop();

        console.log("clockwise");
        client.clockwise(0.14);
        client.animateLeds('rightMissile', 6, 1);
      }
      nextDirection = "right";
    } else if ((green.left + green.right) > TURN_THRESHHOLD * 1.1 &&
        Math.abs(green.left - green.right) <= TURN_THRESHHOLD) {
      if (direction !== "forwards" && nextDirection === "forwards") {
        console.log("forwards");
        client.stop();
        client.front(0.2);
        direction = "forwards";
        client.animateLeds("blinkRed", 6, 1);
        client.after(100, function() {
          client.stop();
          direction = "";
        });
      }
      nextDirection = "forwards";
    } else {
      if (direction !== "" && (nextDirection === "" || nextDirection === "forwards")) {
        direction = "";
        client.stop();

        console.log("stay the course");
        client.animateLeds('blinkGreen', 2, 1);
      }
      nextDirection = "";
    }

    fs.writeFile('imgs/frame' + Date.now() + JSON.stringify([green.left, green.right]) + '.png', data, function() {
    });
  });
});

console.log("takeoff");
client.takeoff(function() {
  console.log("ascend");
  client.after(2000, function() {
    client.up(0.15);
    client.after(2000, function() {
      console.log("stopped ascent")
      client.stop();
      client.after(0, function() {
        console.log("started tracking");
        shouldTrack = true;
        client.after(30000, function() {
          console.log("landing");
          shouldTrack = false;
          client.land();
        });
      });
    });
  });
});
