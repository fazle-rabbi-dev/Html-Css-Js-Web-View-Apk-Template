package com.bhootfm.player;

import android.annotation.TargetApi;
import android.app.Activity;
import android.content.ContentUris;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.Manifest;
import android.view.KeyEvent;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {

    private WebView webView;
    private static final int PERM_REQ = 1001;
    private static final int FILE_CHOOSER_REQ = 1002;
    private ValueCallback<Uri[]> filePathCallback;

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

        // Required so <input type="file"> opens a picker. Without this,
        // tapping "Browse files" is a dead button.
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                try {
                    Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("audio/*");
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(
                            Intent.createChooser(intent, "Select audio"),
                            FILE_CHOOSER_REQ);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
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

    @Override
    protected void onResume() {
        super.onResume();
        // Covers: grant happened earlier / reopen with permission already held.
        // The page may have scanned too early with an empty result.
        if (hasAudioPermission() && webView != null) {
            webView.evaluateJavascript(
                    "window.__onStoragePermission && window.__onStoragePermission(true)", null);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQ) {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                List<Uri> list = new ArrayList<Uri>();
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    for (int i = 0; i < n; i++) {
                        Uri u = data.getClipData().getItemAt(i).getUri();
                        if (u != null) list.add(u);
                    }
                } else if (data.getData() != null) {
                    list.add(data.getData());
                }
                if (!list.isEmpty()) {
                    results = list.toArray(new Uri[list.size()]);
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    private boolean hasAudioPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            return checkSelfPermission(Manifest.permission.READ_MEDIA_AUDIO)
                    == PackageManager.PERMISSION_GRANTED;
        } else if (Build.VERSION.SDK_INT >= 23) {
            return checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE)
                    == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private void requestAudioPermissionIfNeeded() {
        if (!hasAudioPermission()) {
            if (Build.VERSION.SDK_INT >= 33) {
                requestPermissions(new String[]{Manifest.permission.READ_MEDIA_AUDIO}, PERM_REQ);
            } else if (Build.VERSION.SDK_INT >= 23) {
                requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, PERM_REQ);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == PERM_REQ && webView != null) {
            boolean granted = grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            webView.evaluateJavascript(
                    "window.__onStoragePermission && window.__onStoragePermission(" + granted + ")",
                    null);
        }
    }

    public class AudioBridge {

        @JavascriptInterface
        public String listTracks() {
            try {
                // Scoped-storage-safe path first: MediaStore works on Android 10+
                // where direct File.listFiles() on shared storage returns null.
                JSONArray fromStore = queryMediaStore();
                if (fromStore != null && fromStore.length() > 0) return fromStore.toString();
                // Fallback for older ROMs / odd cases.
                return queryDirectFiles().toString();
            } catch (Exception e) {
                return "[]";
            }
        }

        @JavascriptInterface
        public String getFolderInfo() {
            try {
                JSONObject o = new JSONObject();
                JSONArray tracks = queryMediaStore();
                boolean viaStore = tracks != null && tracks.length() > 0;
                File dir = findMusicDir();
                boolean viaFile = dir != null && queryDirectFiles().length() > 0;
                o.put("found", viaStore || viaFile);
                o.put("expected", dir != null
                        ? dir.getAbsolutePath()
                        : new File(Environment.getExternalStorageDirectory(), "bhoot-fm")
                                .getAbsolutePath());
                return o.toString();
            } catch (Exception e) {
                return "{\"found\":false}";
            }
        }

        /** All device audio whose path or folder mentions bhoot-fm. content:// URIs play in WebView. */
        private JSONArray queryMediaStore() {
            JSONArray arr = new JSONArray();
            try {
                Uri collection;
                if (Build.VERSION.SDK_INT >= 29) {
                    collection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL);
                } else {
                    collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
                }
                String[] proj = {
                        MediaStore.Audio.Media._ID,
                        MediaStore.Audio.Media.DISPLAY_NAME,
                        MediaStore.Audio.Media.SIZE
                };
                String sel = MediaStore.Audio.Media.IS_MUSIC + " != 0";
                Cursor c = getContentResolver().query(collection, proj, sel, null, null);
                if (c == null) return arr;
                int idCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                int nameCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME);
                int pathCol = c.getColumnIndex(MediaStore.Audio.Media.DATA); // -1 on API 29+
                int relCol = -1;
                if (Build.VERSION.SDK_INT >= 29) {
                    relCol = c.getColumnIndex(MediaStore.Audio.Media.RELATIVE_PATH);
                }
                List<JSONObject> found = new ArrayList<JSONObject>();
                while (c.moveToNext()) {
                    long id = c.getLong(idCol);
                    String name = c.getString(nameCol);
                    if (name == null) continue;
                    String lower = name.toLowerCase(Locale.US);
                    boolean audio = lower.endsWith(".mp3") || lower.endsWith(".m4a")
                            || lower.endsWith(".wav") || lower.endsWith(".ogg")
                            || lower.endsWith(".opus") || lower.endsWith(".flac")
                            || lower.endsWith(".aac") || lower.endsWith(".3gp");
                    if (!audio) continue;
                    String fullPath = pathCol >= 0 ? c.getString(pathCol) : null;
                    String relPath = (relCol >= 0) ? c.getString(relCol) : null;
                    boolean inFolder = false;
                    if (fullPath != null && fullPath.toLowerCase(Locale.US).contains("bhoot-fm")) {
                        inFolder = true;
                    } else if (relPath != null && relPath.toLowerCase(Locale.US).contains("bhoot-fm")) {
                        inFolder = true;
                    }
                    if (!inFolder) continue;
                    Uri uri = ContentUris.withAppendedId(collection, id);
                    JSONObject o = new JSONObject();
                    o.put("name", name);
                    o.put("uri", uri.toString());
                    found.add(o);
                }
                c.close();
                Collections.sort(found, new Comparator<JSONObject>() {
                    public int compare(JSONObject a, JSONObject b) {
                        return a.optString("name").compareToIgnoreCase(b.optString("name"));
                    }
                });
                for (JSONObject o : found) arr.put(o);
            } catch (SecurityException se) {
                // Permission not yet granted — JS retries after the grant callback.
                return arr;
            } catch (Exception ignored) { }
            return arr;
        }

        private JSONArray queryDirectFiles() {
            JSONArray arr = new JSONArray();
            try {
                File dir = findMusicDir();
                if (dir == null) return arr;
                File[] files = dir.listFiles();
                if (files == null) return arr;
                java.util.Arrays.sort(files, new Comparator<File>() {
                    public int compare(File a, File b) {
                        return a.getName().compareToIgnoreCase(b.getName());
                    }
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
            } catch (Exception ignored) { }
            return arr;
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
