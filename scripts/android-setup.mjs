import { readFile, writeFile, cp, mkdir } from 'node:fs/promises';

const javaPath = 'android/app/src/main/java/com/focalizador/personal';
await mkdir(javaPath, { recursive: true });
await cp('native/android', javaPath, { recursive: true, filter: source => !source.endsWith('.xml') });
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = await readFile(manifestPath, 'utf8');
if (!manifest.includes('com.focalizador.personal.ReminderReceiver')) {
  manifest = manifest.replace('<application', `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <application`);
  manifest = manifest.replace('</application>', `<receiver android:name="com.focalizador.personal.ReminderReceiver" android:exported="false" />
      <receiver android:name="com.focalizador.personal.BootReceiver" android:exported="false">
        <intent-filter><action android:name="android.intent.action.BOOT_COMPLETED" /><action android:name="android.intent.action.MY_PACKAGE_REPLACED" /><action android:name="android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED" /></intent-filter>
      </receiver>
      <service android:name="com.focalizador.personal.AlarmService" android:foregroundServiceType="mediaPlayback" android:exported="false" />
    </application>`);
  manifest = manifest.replace(/android:allowBackup="true"/, 'android:allowBackup="false"');
  await writeFile(manifestPath, manifest);
}
const gradlePath = 'android/app/build.gradle';
let gradle = await readFile(gradlePath, 'utf8');
if (!gradle.includes('play-services-auth:')) { gradle += "\ndependencies { implementation 'com.google.android.gms:play-services-auth:21.4.0' }\n"; await writeFile(gradlePath, gradle); }
await mkdir('android/app/src/main/res/drawable', { recursive: true });
await cp('native/android/ic_stat_focus.xml', 'android/app/src/main/res/drawable/ic_stat_focus.xml');
console.log('Permissões, alarmes e Google Agenda preparados no Android.');
