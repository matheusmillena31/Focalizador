package com.focalizador.personal;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public final class Notifications {
    public static Notification build(Context context, String title, boolean alarm) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = alarm ? "focalizador-alarm-v1" : "focalizador-reminder-v1";
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(channelId, alarm ? "Alarmes" : "Lembretes", alarm ? NotificationManager.IMPORTANCE_HIGH : NotificationManager.IMPORTANCE_DEFAULT);
            if (alarm) channel.setSound(null, null);
            manager.createNotificationChannel(channel);
        }
        PendingIntent open = PendingIntent.getActivity(context, 10, new Intent(context, MainActivity.class), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(context, channelId) : new Notification.Builder(context);
        builder.setSmallIcon(com.focalizador.personal.R.drawable.ic_stat_focus).setContentTitle(title).setContentText(alarm ? "Alarme do Focalizador · toque em Parar" : "Seu compromisso está chegando.").setContentIntent(open).setAutoCancel(!alarm).setOngoing(alarm).setCategory(alarm ? Notification.CATEGORY_ALARM : Notification.CATEGORY_REMINDER);
        if (alarm) {
            PendingIntent stop = PendingIntent.getService(context, 11, new Intent(context, AlarmService.class).setAction("STOP"), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            builder.addAction(new Notification.Action.Builder(null, "Parar alarme", stop).build());
        }
        return builder.build();
    }
    public static void show(Context context, int id, String title) {
        ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).notify(id, build(context, title, false));
    }
}
