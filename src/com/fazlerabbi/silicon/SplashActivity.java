package com.fazlerabbi.silicon;

import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
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
        setContentView(R.layout.activity_splash);

        applyStatusBar();

        // Entrance animation: fade in, pop the mark in.
        final View root = findViewById(R.id.splash_root);
        final View mark = findViewById(R.id.splash_mark);
        root.setAlpha(0f);
        mark.setScaleX(0.88f);
        mark.setScaleY(0.88f);
        root.animate().alpha(1f).setDuration(320)
                .setInterpolator(new DecelerateInterpolator()).start();
        mark.animate().scaleX(1f).scaleY(1f).setDuration(460)
                .setStartDelay(60).setInterpolator(new DecelerateInterpolator()).start();

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

    /** Transparent status bar with icon colour that matches the splash theme. */
    private void applyStatusBar() {
        Window w = getWindow();
        w.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        w.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        w.setStatusBarColor(Color.TRANSPARENT);

        boolean night =
                (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                        == Configuration.UI_MODE_NIGHT_YES;

        int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
        if (!night) {
            // Dark icons on the light backdrop.
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= 26) {
                // SplashTheme tints the navigation bar with @color/splash_bg too.
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
        }
        w.getDecorView().setSystemUiVisibility(flags);
    }
}
