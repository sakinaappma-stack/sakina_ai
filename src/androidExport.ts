import zlib from 'zlib';

export interface ZipEntry {
  name: string;
  data: Buffer;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function buildZipBuffer(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const uncompressed = entry.data;
    const compressed = zlib.deflateRawSync(uncompressed);
    const useDeflate = compressed.length < uncompressed.length;
    const payload = useDeflate ? compressed : uncompressed;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(uncompressed);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed to extract
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0x5421, 12); // mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(uncompressed.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra len

    localParts.push(localHeader, nameBuf, payload);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x5421, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(uncompressed.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDir.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, endRecord]);
}

export const MOROCCO_30D_FALLBACK = [
  { date: '18-11-2026', fajr: '05:28', sunrise: '07:02', dhuhr: '12:12', asr: '15:03', maghrib: '17:22', isha: '18:46' },
  { date: '19-11-2026', fajr: '05:29', sunrise: '07:03', dhuhr: '12:13', asr: '15:02', maghrib: '17:21', isha: '18:46' },
  { date: '20-11-2026', fajr: '05:30', sunrise: '07:04', dhuhr: '12:13', asr: '15:02', maghrib: '17:21', isha: '18:46' },
  { date: '21-11-2026', fajr: '05:31', sunrise: '07:05', dhuhr: '12:13', asr: '15:01', maghrib: '17:20', isha: '18:45' },
  { date: '22-11-2026', fajr: '05:31', sunrise: '07:06', dhuhr: '12:13', asr: '15:01', maghrib: '17:20', isha: '18:45' },
  { date: '23-11-2026', fajr: '05:32', sunrise: '07:07', dhuhr: '12:14', asr: '15:01', maghrib: '17:20', isha: '18:45' },
  { date: '24-11-2026', fajr: '05:33', sunrise: '07:08', dhuhr: '12:14', asr: '15:01', maghrib: '17:19', isha: '18:45' },
  { date: '25-11-2026', fajr: '05:34', sunrise: '07:09', dhuhr: '12:14', asr: '15:00', maghrib: '17:19', isha: '18:44' },
  { date: '26-11-2026', fajr: '05:35', sunrise: '07:10', dhuhr: '12:14', asr: '15:00', maghrib: '17:19', isha: '18:44' },
  { date: '27-11-2026', fajr: '05:35', sunrise: '07:11', dhuhr: '12:15', asr: '15:00', maghrib: '17:18', isha: '18:44' },
  { date: '28-11-2026', fajr: '05:36', sunrise: '07:12', dhuhr: '12:15', asr: '15:00', maghrib: '17:18', isha: '18:44' },
  { date: '29-11-2026', fajr: '05:37', sunrise: '07:13', dhuhr: '12:15', asr: '15:00', maghrib: '17:18', isha: '18:44' },
  { date: '30-11-2026', fajr: '05:38', sunrise: '07:14', dhuhr: '12:16', asr: '15:00', maghrib: '17:18', isha: '18:44' },
  { date: '01-12-2026', fajr: '05:38', sunrise: '07:14', dhuhr: '12:16', asr: '15:00', maghrib: '17:18', isha: '18:44' },
  { date: '02-12-2026', fajr: '05:39', sunrise: '07:15', dhuhr: '12:17', asr: '15:00', maghrib: '17:18', isha: '18:44' },
  { date: '03-12-2026', fajr: '05:40', sunrise: '07:16', dhuhr: '12:17', asr: '15:00', maghrib: '17:18', isha: '18:44' },
  { date: '04-12-2026', fajr: '05:41', sunrise: '07:17', dhuhr: '12:17', asr: '15:00', maghrib: '17:18', isha: '18:44' },
  { date: '05-12-2026', fajr: '05:41', sunrise: '07:18', dhuhr: '12:18', asr: '15:00', maghrib: '17:18', isha: '18:44' },
  { date: '06-12-2026', fajr: '05:42', sunrise: '07:19', dhuhr: '12:18', asr: '15:00', maghrib: '17:18', isha: '18:44' },
  { date: '07-12-2026', fajr: '05:43', sunrise: '07:19', dhuhr: '12:19', asr: '15:00', maghrib: '17:18', isha: '18:44' },
  { date: '08-12-2026', fajr: '05:44', sunrise: '07:20', dhuhr: '12:19', asr: '15:00', maghrib: '17:18', isha: '18:44' },
  { date: '09-12-2026', fajr: '05:44', sunrise: '07:21', dhuhr: '12:20', asr: '15:00', maghrib: '17:18', isha: '18:45' },
  { date: '10-12-2026', fajr: '05:45', sunrise: '07:22', dhuhr: '12:20', asr: '15:00', maghrib: '17:18', isha: '18:45' },
  { date: '11-12-2026', fajr: '05:46', sunrise: '07:22', dhuhr: '12:20', asr: '15:00', maghrib: '17:18', isha: '18:45' },
  { date: '12-12-2026', fajr: '05:46', sunrise: '07:23', dhuhr: '12:21', asr: '15:01', maghrib: '17:19', isha: '18:45' },
  { date: '13-12-2026', fajr: '05:47', sunrise: '07:24', dhuhr: '12:21', asr: '15:01', maghrib: '17:19', isha: '18:46' },
  { date: '14-12-2026', fajr: '05:48', sunrise: '07:25', dhuhr: '12:22', asr: '15:01', maghrib: '17:19', isha: '18:46' },
  { date: '15-12-2026', fajr: '05:48', sunrise: '07:25', dhuhr: '12:22', asr: '15:01', maghrib: '17:19', isha: '18:46' },
  { date: '16-12-2026', fajr: '05:49', sunrise: '07:26', dhuhr: '12:23', asr: '15:02', maghrib: '17:20', isha: '18:47' },
  { date: '17-12-2026', fajr: '05:49', sunrise: '07:26', dhuhr: '12:23', asr: '15:02', maghrib: '17:20', isha: '18:47' },
];

export function buildAndroidProjectEntries(params: {
  appUrl: string;
  prayerTimesJson: string;
  adhanMp3: Buffer;
}): ZipEntry[] {
  const settingsGradle = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "SakinaAI"
include(":app")
`;

  const rootBuildGradle = `plugins {
    id("com.android.application") version "8.5.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}
`;

  const gradleProperties = `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`;

  const wrapperProps = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;

  const appBuildGradle = `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.sakina.ai"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.sakina.ai"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
}
`;

  const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:allowBackup="true"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.SakinaAI"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".AdhanPlaybackService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="mediaPlayback" />

        <receiver
            android:name=".AdhanAlarmReceiver"
            android:enabled="true"
            android:exported="false" />

        <receiver
            android:name=".BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>
`;

  const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">السكينة AI</string>
</resources>
`;

  const themesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.SakinaAI" parent="Theme.Material3.DayNight.NoActionBar">
        <item name="android:statusBarColor">#0B4F3A</item>
    </style>
</resources>
`;

  const mainActivityKt = `package com.sakina.ai

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val appUrl = "${params.appUrl}"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setGeolocationEnabled(true)
            mediaPlaybackRequiresUserGesture = false
            cacheMode = if (isOnline()) WebSettings.LOAD_DEFAULT else WebSettings.LOAD_CACHE_ELSE_NETWORK
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true && !isOnline()) {
                    view?.loadUrl("file:///android_asset/offline_fallback.html")
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }
        }

        requestRequiredPermissions()
        AdhanScheduler.scheduleAllFromAssets(this)

        if (isOnline()) {
            webView.loadUrl(appUrl)
        } else {
            webView.loadUrl("file:///android_asset/offline_fallback.html")
        }
    }

    private fun isOnline(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val net = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(net) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun requestRequiredPermissions() {
        val perms = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val missing = perms.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), 1001)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = getSystemService(ALARM_SERVICE) as AlarmManager
            if (!am.canScheduleExactAlarms()) {
                try {
                    startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM))
                } catch (_: Exception) {
                }
            }
        }

        val pm = getSystemService(POWER_SERVICE) as PowerManager
        if (!pm.isIgnoringBatteryOptimizations(packageName)) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            } catch (_: Exception) {
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
`;

  const adhanSchedulerKt = `package com.sakina.ai

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Locale

object AdhanScheduler {

    private val PRAYER_KEYS = listOf(
        "fajr" to "الفجر",
        "dhuhr" to "الظهر",
        "asr" to "العصر",
        "maghrib" to "المغرب",
        "isha" to "العشاء"
    )

    fun scheduleAllFromAssets(context: Context) {
        val jsonText = context.assets.open("prayer_times_morocco_30d.json")
            .bufferedReader().use { it.readText() }
        val days = JSONArray(jsonText)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val formatter = SimpleDateFormat("dd-MM-yyyy HH:mm", Locale.US)
        val nowMs = System.currentTimeMillis()

        for (i in 0 until days.length()) {
            val day = days.getJSONObject(i)
            val dateStr = day.getString("date")

            for ((pIdx, pair) in PRAYER_KEYS.withIndex()) {
                val (key, arabicName) = pair
                val hhmm = day.getString(key)
                val targetTime = formatter.parse("$dateStr $hhmm")?.time ?: continue
                if (targetTime <= nowMs) continue

                val requestCode = i * 10 + pIdx
                val intent = Intent(context, AdhanAlarmReceiver::class.java).apply {
                    putExtra("prayer_name", arabicName)
                    putExtra("prayer_time", hhmm)
                }

                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                val info = AlarmManager.AlarmClockInfo(targetTime, pendingIntent)
                alarmManager.setAlarmClock(info, pendingIntent)
            }
        }
    }
}
`;

  const adhanAlarmReceiverKt = `package com.sakina.ai

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class AdhanAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val prayerName = intent.getStringExtra("prayer_name") ?: "الصلاة"
        val prayerTime = intent.getStringExtra("prayer_time") ?: ""

        val serviceIntent = Intent(context, AdhanPlaybackService::class.java).apply {
            putExtra("prayer_name", prayerName)
            putExtra("prayer_time", prayerTime)
        }
        ContextCompat.startForegroundService(context, serviceIntent)
    }
}
`;

  const adhanPlaybackServiceKt = `package com.sakina.ai

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

class AdhanPlaybackService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    companion object {
        const val CHANNEL_ID = "sakina_adhan_alarm_channel"
        const val ACTION_STOP = "com.sakina.ai.STOP_ADHAN"
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        val prayerName = intent?.getStringExtra("prayer_name") ?: "الصلاة"
        val prayerTime = intent?.getStringExtra("prayer_time") ?: ""

        createChannel()

        val stopIntent = Intent(this, AdhanPlaybackService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPending = PendingIntent.getService(
            this, 0, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val openIntent = Intent(this, MainActivity::class.java)
        val openPending = PendingIntent.getActivity(
            this, 1, openIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("حان الآن وقت أذان $prayerName")
            .setContentText("السكينة AI · $prayerTime")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setContentIntent(openPending)
            .addAction(android.R.drawable.ic_media_pause, "إيقاف الأذان", stopPending)
            .build()

        startForeground(777, notification)

        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SakinaAI::AdhanWakeLock")
        wakeLock?.acquire(5 * 60 * 1000L)

        playMoroccanAdhan()
        return START_NOT_STICKY
    }

    private fun playMoroccanAdhan() {
        mediaPlayer?.release()
        mediaPlayer = MediaPlayer().apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            val afd = resources.openRawResourceFd(R.raw.adhan_moroccan)
            setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
            afd.close()
            setOnCompletionListener { stopSelf() }
            prepare()
            start()
        }
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "تنبيهات الأذان",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "إشعار صوتي وقت الأذان"
                setBypassDnd(true)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        mediaPlayer?.release()
        mediaPlayer = null
        if (wakeLock?.isHeld == true) wakeLock?.release()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
`;

  const bootReceiverKt = `package com.sakina.ai

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            AdhanScheduler.scheduleAllFromAssets(context)
        }
    }
}
`;

  const offlineFallbackHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>السكينة AI - أوقات الصلاة بدون إنترنت</title>
<style>
  body { font-family: sans-serif; background: #F8FAF7; color: #0A251C; margin: 0; padding: 16px; }
  .card { background: #fff; border: 1px solid #C59B38; border-radius: 18px; padding: 18px; max-width: 520px; margin: 0 auto; }
  h1 { color: #0B4F3A; margin: 0 0 6px; font-size: 22px; }
  p { color: #436155; font-size: 13px; margin: 0 0 14px; }
  .row { display: flex; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #DCE7E0; font-weight: bold; }
  .row:last-child { border-bottom: none; }
</style>
</head>
<body>
  <div class="card">
    <h1>السكينة AI</h1>
    <p id="dateLabel">أوقات الصلاة في المغرب (وضع بدون إنترنت) — الأذان مبرمج تلقائياً</p>
    <div id="list"></div>
  </div>
  <script>
    fetch('prayer_times_morocco_30d.json').then(r => r.json()).then(days => {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const key = dd + '-' + mm + '-' + yyyy;
      const today = days.find(d => d.date === key) || days[0];
      document.getElementById('dateLabel').textContent = 'أوقات الصلاة ليوم ' + today.date + ' (بدون إنترنت)';
      const rows = [
        ['الفجر', today.fajr],
        ['الشروق', today.sunrise],
        ['الظهر', today.dhuhr],
        ['العصر', today.asr],
        ['المغرب', today.maghrib],
        ['العشاء', today.isha]
      ];
      document.getElementById('list').innerHTML = rows.map(function(item) {
        return '<div class="row"><span>' + item[0] + '</span><span>' + item[1] + '</span></div>';
      }).join('');
    });
  </script>
</body>
</html>
`;

  return [
    { name: 'SakinaAI/settings.gradle.kts', data: Buffer.from(settingsGradle, 'utf8') },
    { name: 'SakinaAI/build.gradle.kts', data: Buffer.from(rootBuildGradle, 'utf8') },
    { name: 'SakinaAI/gradle.properties', data: Buffer.from(gradleProperties, 'utf8') },
    { name: 'SakinaAI/gradle/wrapper/gradle-wrapper.properties', data: Buffer.from(wrapperProps, 'utf8') },
    { name: 'SakinaAI/app/build.gradle.kts', data: Buffer.from(appBuildGradle, 'utf8') },
    { name: 'SakinaAI/app/src/main/AndroidManifest.xml', data: Buffer.from(manifestXml, 'utf8') },
    { name: 'SakinaAI/app/src/main/res/values/strings.xml', data: Buffer.from(stringsXml, 'utf8') },
    { name: 'SakinaAI/app/src/main/res/values/themes.xml', data: Buffer.from(themesXml, 'utf8') },
    { name: 'SakinaAI/app/src/main/res/raw/adhan_moroccan.mp3', data: params.adhanMp3 },
    { name: 'SakinaAI/app/src/main/assets/prayer_times_morocco_30d.json', data: Buffer.from(params.prayerTimesJson, 'utf8') },
    { name: 'SakinaAI/app/src/main/assets/offline_fallback.html', data: Buffer.from(offlineFallbackHtml, 'utf8') },
    { name: 'SakinaAI/app/src/main/java/com/sakina/ai/MainActivity.kt', data: Buffer.from(mainActivityKt, 'utf8') },
    { name: 'SakinaAI/app/src/main/java/com/sakina/ai/AdhanScheduler.kt', data: Buffer.from(adhanSchedulerKt, 'utf8') },
    { name: 'SakinaAI/app/src/main/java/com/sakina/ai/AdhanAlarmReceiver.kt', data: Buffer.from(adhanAlarmReceiverKt, 'utf8') },
    { name: 'SakinaAI/app/src/main/java/com/sakina/ai/AdhanPlaybackService.kt', data: Buffer.from(adhanPlaybackServiceKt, 'utf8') },
    { name: 'SakinaAI/app/src/main/java/com/sakina/ai/BootReceiver.kt', data: Buffer.from(bootReceiverKt, 'utf8') },
  ];
}
