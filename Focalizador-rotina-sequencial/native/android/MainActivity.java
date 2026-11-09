package com.focalizador.personal;

import android.os.Bundle;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginCall;
import com.getcapacitor.JSObject;
import com.google.android.gms.auth.api.identity.Identity;

public class MainActivity extends BridgeActivity {
    private ActivityResultLauncher<IntentSenderRequest> authorization;
    private PluginCall authorizationCall;
    private ActivityResultLauncher<String> saveFile;
    private PluginCall saveCall;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FocusNativePlugin.class);
        super.onCreate(savedInstanceState);
        authorization = registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(), result -> {
            PluginCall call = authorizationCall;
            authorizationCall = null;
            if (call == null) return;
            try {
                String token = Identity.getAuthorizationClient(this).getAuthorizationResultFromIntent(result.getData()).getAccessToken();
                if (token == null) throw new Exception("Permissão do Google não concedida.");
                JSObject response = new JSObject();
                response.put("accessToken", token);
                call.resolve(response);
            } catch (Exception error) { call.reject("Autorização Google cancelada ou indisponível.", error); }
        });
        saveFile = registerForActivityResult(new ActivityResultContracts.CreateDocument("application/octet-stream"), uri -> {
            PluginCall call = saveCall;
            saveCall = null;
            if (call == null) return;
            try {
                JSObject response = new JSObject();
                response.put("saved", uri != null);
                if (uri != null) {
                    try (java.io.OutputStream output = getContentResolver().openOutputStream(uri)) {
                        if (output == null) throw new Exception("Arquivo indisponível.");
                        output.write(call.getString("text", "").getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    }
                }
                call.resolve(response);
            } catch (Exception error) { call.reject("Não foi possível salvar o arquivo.", error); }
        });
    }

    public void authorize(PluginCall call, android.app.PendingIntent resolution) {
        if (authorizationCall != null) { call.reject("Uma autorização já está em andamento."); return; }
        authorizationCall = call;
        authorization.launch(new IntentSenderRequest.Builder(resolution.getIntentSender()).build());
    }

    public void saveText(PluginCall call) {
        if (saveCall != null) { call.reject("Uma gravação já está em andamento."); return; }
        saveCall = call;
        saveFile.launch(call.getString("name", "focalizador.json"));
    }
}
