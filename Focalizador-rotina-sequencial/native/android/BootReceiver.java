package com.focalizador.personal;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONArray;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            SharedPreferences prefs = ReminderScheduler.preferences(context);
            ReminderScheduler.replace(context, new JSONArray(prefs.getString("events", "[]")), prefs.getString("namespace", "local"));
        } catch (Exception error) { android.util.Log.e("Focalizador", "Abra o aplicativo para reagendar os lembretes", error); }
    }
}
