package com.focalizador.personal;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

public final class ReminderScheduler {
    public static SharedPreferences preferences(Context context) { return context.getSharedPreferences("focalizador-reminders", Context.MODE_PRIVATE); }

    private static PendingIntent pending(Context context, JSONObject event, String namespace) throws Exception {
        String key = namespace + ":" + event.getString("id");
        Intent intent = new Intent(context, ReminderReceiver.class);
        intent.setData(Uri.parse("focalizador://reminder/" + Uri.encode(key)));
        intent.putExtra("event", event.toString());
        intent.putExtra("namespace", namespace);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    public static void replace(Context context, JSONArray events, String namespace) throws Exception {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (events.length() > 0 && Build.VERSION.SDK_INT >= 31 && !manager.canScheduleExactAlarms()) throw new SecurityException("Permita alarmes exatos.");
        SharedPreferences prefs = preferences(context);
        JSONArray previous = new JSONArray(prefs.getString("events", "[]"));
        String oldNamespace = prefs.getString("namespace", "local");
        for (int index = 0; index < previous.length(); index++) manager.cancel(pending(context, previous.getJSONObject(index), oldNamespace));
        if (!oldNamespace.equals(namespace)) context.stopService(new Intent(context, AlarmService.class));
        prefs.edit().putString("events", events.toString()).putString("namespace", namespace).commit();
        for (int index = 0; index < events.length(); index++) {
            JSONObject event = events.getJSONObject(index);
            long at = event.getLong("at");
            if (at > System.currentTimeMillis() && !prefs.getBoolean("fired:" + namespace + ":" + event.getString("key"), false)) manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending(context, event, namespace));
        }
    }
}
