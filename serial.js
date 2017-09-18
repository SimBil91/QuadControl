// NodeJS library for serialport quadcopter communication

// Serial port used (CHANGE IF NECESSARY!):
var port_used="COM18"

// Command defines corresponding to implemented protocol on arduino
COPTER_BIND = 0x01,
COPTER_THROTTLE = 0x02,
COPTER_YAW = 0x03,
COPTER_ROLL = 0x04,
COPTER_PITCH = 0x05,
COPTER_LED = 0x06,
COPTER_FLIP = 0x07,
COPTER_VIDEO = 0x08,
COPTER_GETSTATE = 0x09,
COPTER_TELEMETRY = 0x0A,
COPTER_EMERGENCY = 0x0B,
COPTER_DISCONNECT = 0x0C,
COPTER_LISTCOPTERS = 0x0D;

// Global variable to save current led state
var LED_STATE=1;
// Currently copter ID fixed to 1.
var COPTER_ID=0x01;

// Connection and binding state:
var connected=0;
var bound=0;


var SerialPort = require("serialport");
function list_ports() {
    SerialPort.list(function (err, ports) {
      ports.forEach(function(port) {
	if (port.pnpId!=undefined) {
		console.log(port.comName);
		console.log(port.pnpId);
		console.log(port.manufacturer);
	}

      });
    });
}

var sp = new SerialPort(port_used, {
  baudRate: 115200,
  parser: SerialPort.parsers.readline('\n')
}, function (err) {
  	if (err) {
    	  console.log('Error: ', err.message);
        console.log('Linux users: sudo usermod -a -G dialout <username>')
        console.log('Login and logout afterwards!\n')
        console.log('Available Ports:');
        return list_ports();
  }});

/**
 * Copter control module
 * @module copter_control
 */
var copter=module.exports = {
/**
 * Bind the copter
 * @param {integer} id - Currently not used
 */
  bind: function (id) {
    if (connected==1&&bound==0) {
      // Only bind if connected
      write_data(0,COPTER_BIND,0x01);
    }
    else {
      setTimeout(function(){
        // Retry until connected
        copter.bind(id);
      }, 500);
    }
  },
    /**
     * Switch the state of the LEDs
     * @param {integer} id - ID of the copter, normally use 1
     */
  switch_leds: function (id) {
    LED_STATE=!LED_STATE;
    write_data(id,COPTER_LED,LED_STATE);
  },
    /**
     * Set throttle of copter
     * @param {integer} id - ID of the copter, normally use 1
     * @param {double} percent - percent from 0-100
     */
  set_throttle: function (id,percent) {
      if (bound){
            if (percent < 0) percent = 0;
        var value = Math.round((percent / 100) * 255 + 0.5);
        write_data(id, COPTER_THROTTLE, value);
      }
  },
    /**
     * Set roll of copter
     * @param {integer} id - ID of the copter, normally use 1
     * @param {double} percent - percent from -100-100, - --> left + --> right
     */
  set_roll: function (id,percent) {
  	// (195-69) 126 steps 0 at 132, 63 steps in each direction
    if (bound) {
        percent = -percent;
        var value = Math.round((132 + (percent / 100) * 63) + 0.5);
        write_data(id, COPTER_ROLL, value);
    }
  },
    /**
     * Set pitch of copter
     * @param {integer} id - ID of the copter, normally use 1
     * @param {double} percent - percent from -100-100, - --> back + --> forward

     */
  set_pitch: function (id,percent) {
  	// (188-62) 126 steps 0 at 125, 63 steps in each direction
    if (bound) {
        var value = Math.round((125 + (percent / 100) * 63) + 0.5);
        write_data(id, COPTER_PITCH, value);
    }
  },
    /**
     * Set yaw of copter
     * @param {integer} id - ID of the copter, normally use 1
     * @param {double} percent - percent from -100-100, - --> counter-clockwise + -->  clockwise
     */
   set_yaw: function (id,percent) {
  	// (204-52) 152 steps 0 at 128, 76 steps in each direction
    if (bound) {
        percent = -percent;
        var value = Math.round((128 + (percent / 100) * 76) + 0.5);
        write_data(id, COPTER_YAW, value);
    }
  },
    /**
     * Set all 4 axis of copter
     * @param {integer} id - ID of the copter, normally use 1
     * @param {Object} vals - json object containting throttle, pitch, roll and yaw percentages
     */
  set_copter: function (id,vals) {
    // Set copter values: throttle, pitch, roll, yaw
    if (bound==1) {
        //only when bound
        copter.set_throttle(0x01, vals.throttle);
        copter.set_pitch(0x01, vals.pitch);
        copter.set_roll(0x01, vals.roll);
        copter.set_yaw(0x01, vals.yaw);
    }
  },
    /**
     * Set emergency state
     * @param {integer} id - ID of the copter, normally use 1
     */
  set_emergency: function (id) {
      /**
       * @param id
       * test
       */
    // If this function is called, the copter falls down immediately
    write_data(id,COPTER_EMERGENCY,0);
  }


};

sp.on('data', function (data) {
  // Receive data from the arduino, needed for binding and connecting
  if (data.localeCompare('init')==1) {
    connected=1;
    console.log("Controller initialized");
  }
  else {
    COPTER_ID=parseInt(data);
    // Wait after binding, to ensure connection is established
    setTimeout(function(){
      console.log('Copter ID: '+ data);
      bound=1;
    },4000);

  }
});
sp.on('open', function() {
    console.log('Connection established!');
    // Wait after connection, to ensure connection to arduino established!
    setTimeout(function(){
      connected=1;
}, 2000);
});


function write_data(copter_id,command,value) {
  // Function to send command to arduino
  if (connected==1) {
    var pack=[copter_id,command,value,calculate_checksum(copter_id,command,value)];
    sp.write(new Buffer(pack), function () {

      sp.drain( function () {});

      //console.log(new Buffer(pack));
    });
  }
}

function calculate_checksum(copter_id, command, value)
{
  // Checksum to identify wrongly sent data on the arduino side
	var sum = copter_id + command + value;
	return ((256 - (sum % 256)) & 0xFF);
}
