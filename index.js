var TURN_THRESHHOLD = 20;
var FRAME_RATE = 10;
var TURN_SPEED = .19;

var arDrone = require('ar-drone');
var client = arDrone.createClient({
  frameRate: FRAME_RATE
});
var PNGReader = require('png.js');
var fs = require('fs');

var shouldTrack = false;

var directions = {
  "left": function() {
    client.stop();

    console.log("counter clockwise");
    client.counterClockwise(TURN_SPEED);
    client.animateLeds('leftMissile', 6, 1);
    lastDirection = directions.left;
  },
  "right": function() {
    client.stop();

    console.log("clockwise");
    client.clockwise(TURN_SPEED);
    client.animateLeds('rightMissile', 6, 1);
    lastDirection = directions.right;
  },
  "forwards": function() {
    console.log("forwards");
    client.stop();
    client.up(0.1);
    client.front(0.15);
    client.animateLeds("blinkRed", 6, 1);
    client.after(100, function() {
      client.stop();
      nextDirection = directions.none;
    });
  },
  "none": function() {
    client.stop();

    console.log("stay the course");
    client.animateLeds('blinkGreen', 2, 1);
  }
};

var direction = directions.none;
var nextDirection = null;
var lastDirection = directions.none, seek = 0;

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
    var green = { left: 0, right: 0, center: 0 };
    var pixel, r, g, b;
    var oldDirection = direction;

    for (x = 0; x < w; x += 10) {
      for (y = 0; y < h; y += 30) {
        pixel = png.getPixel(x, y);
        r = pixel[0];
        g = pixel[1];
        b = pixel[2];

        if (g > 110 && g > r+r/9 && g > b+b/9) {
          if (x < w / 2) {
            green.left++;
          } else if (x >= w / 2) {
            green.right++;
          }
          if (x > w/3 && x < w - w/3) {
            green.center++;
          }
        }
      }
    }

    if (green.center > TURN_THRESHHOLD &&
        (green.center >= (green.left+green.right) / 2)) {
      if (direction !== directions.forwards && nextDirection === directions.forwards) {
        direction = directions.forwards;
      }
      nextDirection = directions.forwards;
    } else if (green.left - green.right >= TURN_THRESHHOLD) {
      if (direction !== directions.left && nextDirection === directions.left) {
        direction = directions.left;
      }
      nextDirection = directions.left;
    } else if (green.right - green.left >= TURN_THRESHHOLD) {
      if (direction !== directions.right && nextDirection === directions.right) {
        direction = directions.right;
      }
      nextDirection = directions.right;
    } else {
      if (direction !== directions.none && (nextDirection === directions.none || nextDirection === directions.forwards)) {
        direction = directions.none;
      }
      nextDirection = directions.none;
    }

    if (direction !== oldDirection) {
      direction();
    }

    fs.writeFile('imgs/frame' + Date.now() + JSON.stringify([green.left, green.center, green.right]) + '.png', data, function() {
    });
  });
});

console.log("takeoff");
client.takeoff(function() {
  console.log("ascend");
  client.after(2000, function() {
    client.up(0.2);
    client.after(2000, function() {
      console.log("stopped ascent")
      client.stop();
      client.after(0, function() {
        console.log("started tracking");
        shouldTrack = true;
        client.after(30000, function() {
          console.log("landing");
          shouldTrack = false;
          client.land(function() {
            process.exit();
          });
        });
      });
    });
  });
});
