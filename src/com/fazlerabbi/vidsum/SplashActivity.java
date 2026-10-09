package com.fazlerabbi.vidsum;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;

public class SplashActivity extends Activity {

    private static final int SPLASH_DELAY_MS = 1600;

    /** Holds a warmed-up WebView so Chromium initializes while the splash shows. */
    private static WebView warmup;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setContentView(R.layout.activity_splash);

        // Warm up the WebView engine now; MainActivity's real WebView then starts fast.
        if (warmup == null) {
            try {
                warmup = new WebView(getApplicationContext());
            } catch (Exception ignored) { /* very first run on some ROMs */ }
        }

        new Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                startActivity(new Intent(SplashActivity.this, MainActivity.class));
                finish();
            }
        }, SPLASH_DELAY_MS);
    }
}
