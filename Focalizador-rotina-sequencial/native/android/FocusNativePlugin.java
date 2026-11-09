package com.focalizador.personal;

import android.Manifest;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;
import java.util.Collections;

@CapacitorPlugin(name = "FocusNative", permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) })
public class FocusNativePlugin extends Plugin {
    @PluginMethod
    public void permissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "permissionResult");
        } else permissionResult(call);
    }

    @PermissionCallback
    private void permissionResult(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) { call.reject("Permita notificações nas configurações do Android."); return; }
        AlarmManager manager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (Build.VERSION.SDK_INT >= 31 && !manager.canScheduleExactAlarms()) {
            getActivity().startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName())));
            call.reject("Autorize alarmes e lembretes no Android e depois salve novamente.");
            return;
        }
        JSObject response = new JSObject(); response.put("granted", true); call.resolve(response);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        try {
            JSArray events = call.getArray("events", new JSArray());
            if (events.length() > 2000) throw new Exception("Muitos lembretes.");
            ReminderScheduler.replace(getContext(), events, call.getString("namespace", "local"));
            JSObject response = new JSObject(); response.put("scheduled", events.length()); call.resolve(response);
        } catch (Exception error) { call.reject("Não foi possível agendar. Verifique as permissões de notificações e alarmes exatos.", error); }
    }

    @PluginMethod
    public void authorizeCalendar(PluginCall call) {
        AuthorizationRequest request = AuthorizationRequest.builder().setRequestedScopes(Collections.singletonList(new Scope("https://www.googleapis.com/auth/calendar.events"))).build();
        Identity.getAuthorizationClient(getActivity()).authorize(request).addOnSuccessListener(result -> {
            if (result.hasResolution()) getActivity().runOnUiThread(() -> ((MainActivity) getActivity()).authorize(call, result.getPendingIntent()));
            else {
                String token = result.getAccessToken();
                if (token == null) { call.reject("Acesso ao Google Agenda não concedido."); return; }
                JSObject response = new JSObject(); response.put("accessToken", token); call.resolve(response);
            }
        }).addOnFailureListener(error -> call.reject("Google indisponível. Confira o cliente OAuth Android, o pacote e o SHA-1.", error));
    }

    @PluginMethod
    public void saveText(PluginCall call) {
        String text = call.getString("text", "");
        if (text.length() > 10000000) { call.reject("Arquivo muito grande."); return; }
        getActivity().runOnUiThread(() -> ((MainActivity) getActivity()).saveText(call));
    }
}
