package qolware.watchcontrol;

import android.app.Activity;
import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Bundle;
import android.view.View;
import android.widget.Toast;
import org.json.JSONException;
import org.json.JSONObject;

// SocketIO
import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;

public class MainActivity extends Activity implements SensorEventListener {    // Declare socket
    private Socket msocket;

    // Declare Sensor
    private SensorManager senSensorManager;
    private Sensor senAccelerometer;

    //// Define Server IP with port ////
    private String server_ip= "http://192.168.137.1:3000";

    // CHANGE LEFT/RIGHT ARM HERE
    boolean left=false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Try to initialize socket
        try {
            msocket=IO.socket(server_ip);
            msocket.connect();

        } catch (Exception e) {
            // Show message if something went wrong
            Toast.makeText(this,"Could not initialize SocketIO client!",Toast.LENGTH_SHORT).show();
        }
        // Receiving an object with topic emergency_received
        msocket.on("emergency_received", new Emitter.Listener() {
            @Override
            public void call(Object... args) {
                // Play short indication sound
                ToneGenerator toneGen1 = new ToneGenerator(AudioManager.STREAM_MUSIC, 100);
                toneGen1.startTone(ToneGenerator.TONE_DTMF_3,200);
            }
        });

        // Register acceleration sensor
        senSensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        senAccelerometer = senSensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        senSensorManager.registerListener(this, senAccelerometer , SensorManager.SENSOR_DELAY_NORMAL);
    }

    public void bind(View view) {
        // Callback when bind button is pressed
        msocket.emit("bind", "");
        Toast.makeText(this,"Binding...",Toast.LENGTH_SHORT).show();
    }
    public void emergency(View view) {
        // Callback when emergency button is pressed
        try {
            // Try to create JSON Object and send message
            JSONObject obj = new JSONObject();
            obj.put("type", 2);
            obj.put("urgent", "yes!");
            msocket.emit("emergency", obj);
        }
        catch (JSONException e) {
            // Error message if failed
            Toast.makeText(this,"Cannot create JSONObject",Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            float x = event.values[0];
            float y = event.values[1];
            float z = event.values[2];

            // Compute roll and pitch
            float roll,pitch;
            roll=(float)(Math.atan(-y/z)/Math.PI*180);
            pitch=(float)(Math.atan(-x/Math.sqrt(y*y+z*z))/Math.PI*180);

            // Limit roll and pitch (e.g. arm behind back should not set throttle!)
            if (roll<0&&y<-2) {
                roll=90;
            }
            if (roll>0&&y>2) {
                roll=-90;
            }
            if (z<0) {
                pitch=90;
            }
            // Package and send control data
            JSONObject obj = new JSONObject();
            try {
                    obj.put("pitch", pitch);
                    obj.put("roll", roll);
                    obj.put("left", left);
                    msocket.emit("set_copter", obj);
            }
            catch (JSONException e) {
                Toast.makeText(this,"Cannot send control data!",Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {

    }
}
