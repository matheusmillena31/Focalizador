package com.focalizador.personal;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import org.json.JSONObject;

public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            JSONObject event = new JSONObject(intent.getStringExtra("event"));
            String namespace = intent.getStringExtra("namespace");
            if (!ReminderScheduler.preferences(context).getString("namespace", "local").equals(namespace)) return;
            String fired = "fired:" + namespace + ":" + event.getString("key");
            if (ReminderScheduler.preferences(context).getBoolean(fired, false)) return;
            ReminderScheduler.preferences(context).edit().putBoolean(fired, true).commit();
            if ("alarm".equals(event.getString("mode"))) {
                Intent service = new Intent(context, AlarmService.class).putExtra("title", event.getString("title"));
                if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(service); else context.startService(service);
            } else Notifications.show(context, event.getString("id").hashCode(), event.getString("title"));
        } catch (Exception error) { android.util.Log.e("Focalizador", "Falha no lembrete", error); }
    }
}
