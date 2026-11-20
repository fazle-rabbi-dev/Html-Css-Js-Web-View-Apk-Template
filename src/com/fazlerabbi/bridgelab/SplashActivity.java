package com.fazlerabbi.bridgelab;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.webkit.WebView;

public class SplashActivity extends Activity {

    private static final int SPLASH_DELAY_MS = 1200;

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

        // Entrance animation: fade the whole screen in, pop the mark in.
        final View root = findViewById(R.id.splash_root);
        final View mark = findViewById(R.id.splash_mark);
        root.setAlpha(0f);
        mark.setScaleX(0.85f);
        mark.setScaleY(0.85f);
        root.animate().alpha(1f).setDuration(420).setInterpolator(new DecelerateInterpolator()).start();
        mark.animate().scaleX(1f).scaleY(1f).setDuration(520)
                .setStartDelay(80).setInterpolator(new DecelerateInterpolator()).start();

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
                overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
                finish();
            }
        }, SPLASH_DELAY_MS);
    }
}
