// Set to false if using real quad!
SIMULATION=false;

// Load necessary NodeJS modules
var express = require('express');
var app=express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
if (!SIMULATION) {
  var copter = require('./serial');
}

// Global variable holding the control status
var copter_control={};
copter_control.throttle=0;
copter_control.yaw=0;
copter_control.pitch=0;
copter_control.roll=0;

// Make documentation available on web server
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
app.use("/doc",express.static(__dirname + '/doc/'));
app.use("/",express.static(__dirname + '/'));


io.on('connection', function(socket){
  // Is called once a new device connects
  console.log('device connected');

  // Receiving a 'bind' message
  socket.on('bind', function(data){
    console.log('Requested binding!...');
    if (!SIMULATION) {
      copter.bind(0);
    }
  });
  // Receiving an 'emergency' message
  socket.on('emergency', function(data){
    console.log('Setting emergency!...');
    console.log(data);
    if (!SIMULATION)  {
      copter.set_emergency(1);
    }
    socket.emit('emergency_received');
  });

  socket.on('set_copter', function(watch){
    // Received values from smartwatch
    if (watch.left) {
          // Scale and map angles for left arm here
          watch.roll=watch.roll-40;
          watch.pitch=watch.pitch*-1+75;
          if (watch.pitch<0) {
            watch.pitch=0;
          }
          if (watch.pitch>=95) {
            watch.pitch=95;
          }
          if (watch.roll<-90) {
            watch.roll=-90;
          }
          if (watch.roll>90) {
            watch.roll=90;
          }
          copter_control.throttle=watch.pitch;
          copter_control.yaw=watch.roll*-1;
          if (SIMULATION) {
            // Send current control state to visualization
            io.emit('control_sim',copter_control);
          }
          else {
          // Send data to quadcopter
          copter.set_copter(copter.COPTER_ID,copter_control);
        }
    }
    else {
          // Scale and map angles for right arm here
          watch.roll=watch.roll-40;
          watch.roll=watch.roll;
          watch.pitch=watch.pitch;
          if (watch.roll<-90) {
          watch.roll=-90;
          }
          if (watch.roll>90) {
             watch.roll=90;
          }
          if (watch.pitch<-90) {
            watch.pitch=-90;
          }
          if (watch.pitch>90) {
            watch.pitch=90;
          }
          copter_control.pitch=watch.pitch*-1;
          copter_control.roll=watch.roll;
    }
  });

  socket.on('disconnect', function(){
  // Is called on disconnection
  console.log('device disconnected');
  });
});

// Setup server on port 3000
http.listen(3000, function(){
  console.log('listening on *:3000');
});
