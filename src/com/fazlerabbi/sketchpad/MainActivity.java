package com.fazlerabbi.sketchpad;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.DisplayMetrics;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * SketchPad: a WebView shell that demonstrates which native Android capabilities
 * can be wired to plain HTML/CSS/JS with zero third-party dependencies.
 */
public class MainActivity extends Activity {

    private static final int REQ_MEDIA = 1001;
    private static final int REQ_LOCATION = 1002;
    private static final int REQ_FILE = 1003;
    private static final int REQ_NOTIFY = 1004;
    private static final int REQ_DOWNLOAD = 1005;

    private static final String CHANNEL_ID = "sketchpad_default";
    private static final String PREFS = "sketchpad_prefs";

    private WebView webView;

    private PermissionRequest pendingMediaRequest;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;
    private ValueCallback<Uri[]> fileCallback;

    private String pendingNotifyTitle;
    private String pendingNotifyBody;

    private String pendingDownloadUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = (WebView) findViewById(R.id.web);

        // Lets you inspect this page from chrome://inspect on your desktop.
        WebView.setWebContentsDebuggingEnabled(true);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.setBackgroundColor(0xFF0B1020);
        webView.addJavascriptInterface(new Bridge(), "Native");
        webView.setWebChromeClient(new ChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        webView.setDownloadListener(new android.webkit.DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimetype, long contentLength) {
                // API 23-28: writing to public Download/ is a runtime permission.
                if (Build.VERSION.SDK_INT <= 28
                        && !has(Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
                    pendingDownloadUrl = url;
                    requestPermissions(
                            new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_DOWNLOAD);
                    return;
                }
                enqueueDownload(url);
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    // ---------------------------------------------------------------- helpers

    private boolean has(String permission) {
        return checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    private void enqueueDownload(String url) {
        try {
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
            req.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            req.setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS, "sketchpad-" + System.currentTimeMillis());
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm != null) dm.enqueue(req);
            toast("Download queued");
        } catch (Exception e) {
            toast("Download failed: " + e.getMessage());
        }
    }

    /** {"error": "..."} so the web layer can show why a bridge call failed. */
    private static String errorJson(Exception e) {
        try {
            JSONObject o = new JSONObject();
            o.put("error", e.getClass().getSimpleName() + ": " + e.getMessage());
            return o.toString();
        } catch (Exception ignored) {
            return "{\"error\":\"unknown\"}";
        }
    }

    private void toast(final String message) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                showToast(message);
            }
        });
    }

    /**
     * Real Toast, but with our own icon and text. Some vendor ROMs substitute the
     * default Android robot for the app icon in system toasts, which made the
     * bridge look unbranded. A custom view is only honoured while the app is in
     * the foreground (Android 11+), which is exactly when this bridge fires.
     */
    private void showToast(String message) {
        try {
            Toast t = new Toast(this);
            View v = getLayoutInflater().inflate(R.layout.toast_custom, null);
            ((ImageView) v.findViewById(R.id.toast_icon)).setImageResource(R.mipmap.ic_launcher);
            ((TextView) v.findViewById(R.id.toast_text)).setText(message);
            t.setView(v);
            t.setDuration(Toast.LENGTH_SHORT);
            t.show();
        } catch (Exception e) {
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
        }
    }

    private void emitToJs(final String js) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                webView.evaluateJavascript(js, null);
            }
        });
    }

    /**
     * Opens a link, preferring a real app handler (WhatsApp, Telegram, Maps,
     * YouTube ...) over a browser. Android resolves every https link to a
     * browser, so a plain ACTION_VIEW would send https://wa.me/... to Chrome.
     * Here we skip packages that are registered for generic web links.
     */
    private void openExternal(Uri uri) {
        // intent://some.deep/link#Intent;scheme=xyz;package=com.foo;end
        if ("intent".equals(uri.getScheme())) {
            try {
                Intent parsed = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
                parsed.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(parsed);
                return;
            } catch (Exception ignored) {
                // fall through to normal handling
            }
        }

        Intent direct = new Intent(Intent.ACTION_VIEW, uri);
        direct.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        // Some installs don't publish verified App Links, so nudge the known app
        // directly before falling back to generic resolution.
        String[] prefer = preferredPackages(uri.getHost());
        if (prefer != null) {
            for (String pkg : prefer) {
                try {
                    Intent i = new Intent(Intent.ACTION_VIEW, uri);
                    i.setPackage(pkg);
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    if (getPackageManager().resolveActivity(i, PackageManager.MATCH_DEFAULT_ONLY) != null) {
                        startActivity(i);
                        return;
                    }
                } catch (Exception ignored) {
                    // try the next package
                }
            }
        }

        List<String> browsers = browserPackages();
        List<ResolveInfo> candidates = getPackageManager().queryIntentActivities(direct, 0);
        if (candidates != null) {
            for (ResolveInfo ri : candidates) {
                if (ri.activityInfo == null) continue;
                String pkg = ri.activityInfo.packageName;
                if (browsers.contains(pkg) || getPackageName().equals(pkg)) continue;
                Intent appIntent = new Intent(Intent.ACTION_VIEW, uri);
                appIntent.setPackage(pkg);
                appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    startActivity(appIntent);
                    return;
                } catch (Exception ignored) {
                    // try the next candidate
                }
            }
        }
        startActivity(direct);
    }

    /** Apps that should get a link even if their App Links aren't verified. */
    private static String[] preferredPackages(String host) {
        if (host == null) return null;
        String h = host.toLowerCase(java.util.Locale.US);
        if (h.equals("wa.me") || h.equals("api.whatsapp.com") || h.endsWith(".whatsapp.com")) {
            return new String[]{"com.whatsapp", "com.whatsapp.w4b"};
        }
        if (h.equals("t.me") || h.equals("telegram.me") || h.equals("telegram.org")
                || h.endsWith(".telegram.org")) {
            return new String[]{"org.telegram.messenger", "org.telegram.messenger.web"};
        }
        return null;
    }

    /** Packages that claim to open a plain web link, i.e. browsers and web wrappers. */
    private List<String> browserPackages() {
        List<String> out = new ArrayList<String>();
        Intent probe = new Intent(Intent.ACTION_VIEW, Uri.parse("https://example.com/"));
        List<ResolveInfo> list = getPackageManager().queryIntentActivities(probe, 0);
        if (list != null) {
            for (ResolveInfo ri : list) {
                if (ri.activityInfo != null) out.add(ri.activityInfo.packageName);
            }
        }
        return out;
    }

    // ------------------------------------------------------- WebChromeClient

    private class ChromeClient extends WebChromeClient {

        @Override
        public void onPermissionRequest(final PermissionRequest request) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    pendingMediaRequest = request;
                    List<String> need = new ArrayList<String>();
                    for (String res : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)
                                && !has(Manifest.permission.CAMERA)) {
                            need.add(Manifest.permission.CAMERA);
                        }
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)
                                && !has(Manifest.permission.RECORD_AUDIO)) {
                            need.add(Manifest.permission.RECORD_AUDIO);
                        }
                    }
                    if (need.isEmpty()) {
                        request.grant(request.getResources());
                        pendingMediaRequest = null;
                    } else {
                        requestPermissions(need.toArray(new String[0]), REQ_MEDIA);
                    }
                }
            });
        }

        @Override
        public void onPermissionRequestCanceled(PermissionRequest request) {
            pendingMediaRequest = null;
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin,
                                                       GeolocationPermissions.Callback callback) {
            if (has(Manifest.permission.ACCESS_FINE_LOCATION)) {
                callback.invoke(origin, true, false);
                return;
            }
            pendingGeoCallback = callback;
            pendingGeoOrigin = origin;
            requestPermissions(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
            }, REQ_LOCATION);
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                         FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            try {
                startActivityForResult(params.createIntent(), REQ_FILE);
                return true;
            } catch (Exception e) {
                fileCallback = null;
                return false;
            }
        }

        @Override
        public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
            new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Native alert")
                    .setMessage(message)
                    .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface d, int w) {
                            result.confirm();
                        }
                    })
                    .setOnCancelListener(new DialogInterface.OnCancelListener() {
                        @Override
                        public void onCancel(DialogInterface d) {
                            result.cancel();
                        }
                    })
                    .show();
            return true;
        }

        @Override
        public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
            new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Native confirm")
                    .setMessage(message)
                    .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface d, int w) {
                            result.confirm();
                        }
                    })
                    .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface d, int w) {
                            result.cancel();
                        }
                    })
                    .setOnCancelListener(new DialogInterface.OnCancelListener() {
                        @Override
                        public void onCancel(DialogInterface d) {
                            result.cancel();
                        }
                    })
                    .show();
            return true;
        }
    }

    // ------------------------------------------------------------- results

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE) {
            if (fileCallback == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            fileCallback.onReceiveValue(results);
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == REQ_MEDIA) {
            if (pendingMediaRequest != null) {
                boolean allGranted = grantResults.length > 0;
                for (int g : grantResults) {
                    if (g != PackageManager.PERMISSION_GRANTED) allGranted = false;
                }
                if (allGranted) {
                    pendingMediaRequest.grant(pendingMediaRequest.getResources());
                } else {
                    pendingMediaRequest.deny();
                }
                pendingMediaRequest = null;
            }
            return;
        }

        if (requestCode == REQ_LOCATION) {
            if (pendingGeoCallback != null) {
                boolean granted = grantResults.length > 0
                        && grantResults[0] == PackageManager.PERMISSION_GRANTED;
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
                pendingGeoCallback = null;
            }
            return;
        }

        if (requestCode == REQ_DOWNLOAD) {
            String url = pendingDownloadUrl;
            pendingDownloadUrl = null;
            if (url == null) return;
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                enqueueDownload(url);
            } else {
                toast("Storage permission denied - download cancelled");
            }
            return;
        }

        if (requestCode == REQ_NOTIFY) {
            if (pendingNotifyTitle != null && grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                showNotification(pendingNotifyTitle, pendingNotifyBody);
            } else {
                toast("Notification permission denied");
            }
            pendingNotifyTitle = null;
            pendingNotifyBody = null;
            return;
        }

        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    // ------------------------------------------------------------- bridge

    private class Bridge {

        @JavascriptInterface
        public String deviceInfo() {
            try {
                DisplayMetrics dm = getResources().getDisplayMetrics();
                JSONObject o = new JSONObject();
                o.put("manufacturer", Build.MANUFACTURER);
                o.put("brand", Build.BRAND);
                o.put("model", Build.MODEL);
                o.put("device", Build.DEVICE);
                o.put("android", Build.VERSION.RELEASE);
                o.put("sdk", Build.VERSION.SDK_INT);
                o.put("app", getString(R.string.app_name));
                o.put("package", getPackageName());
                o.put("version", getPackageManager()
                        .getPackageInfo(getPackageName(), 0).versionName);
                o.put("density", dm.density);
                o.put("screenPx", dm.widthPixels + "x" + dm.heightPixels);
                o.put("locale", java.util.Locale.getDefault().toString());
                return o.toString();
            } catch (Exception e) {
                return "{\"error\":\"" + e.getMessage() + "\"}";
            }
        }

        @JavascriptInterface
        public void toastMsg(String message) {
            toast(message);
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) {
                toast("No vibrator");
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                v.vibrate(ms);
            }
        }

        @JavascriptInterface
        public void copyText(String text) {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                cm.setPrimaryClip(ClipData.newPlainText("SketchPad", text));
                toast("Copied to clipboard");
            }
        }

        @JavascriptInterface
        public String readClipboard() {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm == null || !cm.hasPrimaryClip() || cm.getPrimaryClip() == null) return "";
            ClipData.Item item = cm.getPrimaryClip().getItemAt(0);
            CharSequence t = item.coerceToText(MainActivity.this);
            return t == null ? "" : t.toString();
        }

        @JavascriptInterface
        public void shareText(final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("text/plain");
                    i.putExtra(Intent.EXTRA_TEXT, text);
                    startActivity(Intent.createChooser(i, "Share via"));
                }
            });
        }

        @JavascriptInterface
        public void openUrl(final String url) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        openExternal(Uri.parse(url));
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "No app to open this link",
                                Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void setValue(String key, String value) {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(key, value).apply();
        }

        @JavascriptInterface
        public String getValue(String key) {
            return getSharedPreferences(PREFS, MODE_PRIVATE).getString(key, "");
        }

        @JavascriptInterface
        public String storageDump() {
            try {
                JSONObject o = new JSONObject();
                Map<String, ?> all = getSharedPreferences(PREFS, MODE_PRIVATE).getAll();
                for (Map.Entry<String, ?> e : all.entrySet()) {
                    o.put(e.getKey(), String.valueOf(e.getValue()));
                }
                return o.toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        @JavascriptInterface
        public String batteryInfo() {
            try {
                BatteryManager bm = (BatteryManager) getSystemService(Context.BATTERY_SERVICE);
                JSONObject o = new JSONObject();
                o.put("percent", bm == null ? -1
                        : bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY));
                o.put("charging", bm != null && bm.isCharging());
                return o.toString();
            } catch (Exception e) {
                return errorJson(e);
            }
        }

        @JavascriptInterface
        public String networkInfo() {
            try {
                JSONObject o = new JSONObject();
                ConnectivityManager cm =
                        (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                Network n = cm == null ? null : cm.getActiveNetwork();
                NetworkCapabilities caps = n == null ? null : cm.getNetworkCapabilities(n);
                o.put("online", caps != null);
                o.put("wifi", caps != null
                        && caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI));
                o.put("cellular", caps != null
                        && caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR));
                o.put("metered", cm != null && cm.isActiveNetworkMetered());
                return o.toString();
            } catch (Exception e) {
                // Missing ACCESS_NETWORK_STATE ends up here as a SecurityException.
                return errorJson(e);
            }
        }

        @JavascriptInterface
        public String notifyUser(final String title, final String body) {
            if (Build.VERSION.SDK_INT >= 33 && !has("android.permission.POST_NOTIFICATIONS")) {
                pendingNotifyTitle = title;
                pendingNotifyBody = body;
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        requestPermissions(
                                new String[]{"android.permission.POST_NOTIFICATIONS"}, REQ_NOTIFY);
                    }
                });
                return "asking-permission";
            }
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    showNotification(title, body);
                }
            });
            return "shown";
        }

        @JavascriptInterface
        public void printPage() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        String job = "SketchPad-" + System.currentTimeMillis();
                        if (pm != null) {
                            pm.print(job, webView.createPrintDocumentAdapter(job), null);
                        }
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Print failed: " + e.getMessage(),
                                Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public String saveFile(String name, String content) {
            try {
                byte[] bytes = content.getBytes("UTF-8");
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, "text/plain");
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    // Avoid referencing the API 29 MediaStore.Downloads class on older devices.
                    Uri collection = Uri.parse("content://media/external/downloads");
                    Uri uri = getContentResolver().insert(collection, cv);
                    if (uri == null) return "failed: could not create file";
                    OutputStream os = getContentResolver().openOutputStream(uri);
                    if (os == null) return "failed: no output stream";
                    os.write(bytes);
                    os.close();
                    return "Download/" + name;
                }
                File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) return "failed: no external dir";
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, name);
                FileOutputStream fos = new FileOutputStream(f);
                fos.write(bytes);
                fos.close();
                return f.getAbsolutePath();
            } catch (Exception e) {
                return "failed: " + e.getMessage();
            }
        }

        /**
         * Async round-trip demo: native work off the UI thread, then a JS callback.
         */
        @JavascriptInterface
        public void ping(final String payload, final String callbackId) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    long start = System.currentTimeMillis();
                    String reversed = new StringBuilder(payload).reverse().toString();
                    try {
                        Thread.sleep(350);
                    } catch (InterruptedException ignored) {
                    }
                    try {
                        JSONObject result = new JSONObject();
                        result.put("echo", payload);
                        result.put("reversed", reversed);
                        result.put("nativeMs", System.currentTimeMillis() - start);
                        result.put("thread", Thread.currentThread().getName());
                        emitToJs("window.SketchPad && window.SketchPad.onNative("
                                + JSONObject.quote(callbackId) + ", " + result + ")");
                    } catch (Exception ignored) {
                    }
                }
            }).start();
        }
    }

    // --------------------------------------------------------- notifications

    private void showNotification(String title, String body) {
        try {
            NotificationManager nm =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel ch = new NotificationChannel(
                        CHANNEL_ID, "SketchPad", NotificationManager.IMPORTANCE_DEFAULT);
                nm.createNotificationChannel(ch);
            }

            Intent open = new Intent(this, MainActivity.class);
            PendingIntent pi = PendingIntent.getActivity(this, 0, open,
                    Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);

            Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? new Notification.Builder(this, CHANNEL_ID)
                    : new Notification.Builder(this);
            b.setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setAutoCancel(true)
                    .setContentIntent(pi);
            nm.notify((int) (System.currentTimeMillis() % 10000), b.build());
            toast("Notification posted");
        } catch (Exception e) {
            toast("Notification failed: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------- lifecycle

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
