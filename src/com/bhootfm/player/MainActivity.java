package com.bhootfm.player;

import android.annotation.TargetApi;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import android.os.Environment;
import android.content.pm.PackageManager;
import android.Manifest;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Locale;

public class MainActivity extends Activity {

    private WebView webView;
    private static final int PERM_REQ = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = (WebView) findViewById(R.id.web);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return false;
            }

            @TargetApi(Build.VERSION_CODES.N)
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setAllowContentAccess(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            webView.getSettings().setAllowFileAccessFromFileURLs(true);
            webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
        }
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new AudioBridge(), "BhootFM");

        requestAudioPermissionIfNeeded();
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void requestAudioPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.READ_MEDIA_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.READ_MEDIA_AUDIO}, PERM_REQ);
            }
        } else if (Build.VERSION.SDK_INT >= 23) {
            if (checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, PERM_REQ);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == PERM_REQ && webView != null) {
            webView.evaluateJavascript("window.__onStoragePermission && window.__onStoragePermission()", null);
        }
    }

    public class AudioBridge {
        @JavascriptInterface
        public String listTracks() {
            try {
                File dir = findMusicDir();
                JSONArray arr = new JSONArray();
                if (dir == null) return arr.toString();
                File[] files = dir.listFiles();
                if (files == null) return arr.toString();
                Arrays.sort(files, new Comparator<File>() {
                    public int compare(File a, File b) { return a.getName().compareToIgnoreCase(b.getName()); }
                });
                for (File f : files) {
                    if (!f.isFile()) continue;
                    String n = f.getName().toLowerCase(Locale.US);
                    if (n.endsWith(".mp3") || n.endsWith(".m4a") || n.endsWith(".wav")
                            || n.endsWith(".ogg") || n.endsWith(".opus") || n.endsWith(".flac")
                            || n.endsWith(".aac") || n.endsWith(".3gp")) {
                        JSONObject o = new JSONObject();
                        o.put("name", f.getName());
                        o.put("uri", "file://" + f.getAbsolutePath());
                        o.put("size", f.length());
                        arr.put(o);
                    }
                }
                return arr.toString();
            } catch (Exception e) {
                return "[]";
            }
        }

        @JavascriptInterface
        public String getFolderInfo() {
            try {
                File dir = findMusicDir();
                JSONObject o = new JSONObject();
                if (dir == null) {
                    File ext = Environment.getExternalStorageDirectory();
                    o.put("expected", new File(ext, "bhoot-fm").getAbsolutePath());
                    o.put("found", false);
                } else {
                    o.put("expected", dir.getAbsolutePath());
                    o.put("found", true);
                }
                return o.toString();
            } catch (Exception e) {
                return "{\"found\":false}";
            }
        }

        private File findMusicDir() {
            File ext = Environment.getExternalStorageDirectory();
            String[] candidates = {
                "bhoot-fm", "Bhoot-FM", "BhootFm",
                "Music/bhoot-fm", "Download/bhoot-fm",
                "Music/Bhoot-FM", "Sounds/bhoot-fm"
            };
            for (String c : candidates) {
                File d = new File(ext, c);
                if (d.exists() && d.isDirectory()) return d;
            }
            return null;
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            switch (keyCode) {
                case KeyEvent.KEYCODE_BACK:
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        finish();
                    }
                    return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }
}
