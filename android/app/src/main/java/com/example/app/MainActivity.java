package com.example.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {

    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1001;
    private PermissionRequest pendingWebViewPermissionRequest;

    /**
     * Concede acceso a cámara/micrófono para iframes cross-origin (VDID SDK / Suma México).
     * Primero verifica el permiso de sistema Android; si no está concedido, muestra el
     * diálogo nativo antes de aprobar la solicitud del WebView.
     */
    @Override
    public void onStart() {
        super.onStart();
        getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                pendingWebViewPermissionRequest = request;

                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                        != PackageManager.PERMISSION_GRANTED) {
                    // Permiso aún no concedido — mostrar diálogo nativo de Android
                    ActivityCompat.requestPermissions(
                        MainActivity.this,
                        new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO},
                        CAMERA_PERMISSION_REQUEST_CODE
                    );
                } else {
                    // Ya concedido — aprobar directamente la solicitud del WebView
                    request.grant(request.getResources());
                    pendingWebViewPermissionRequest = null;
                }
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE && pendingWebViewPermissionRequest != null) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                pendingWebViewPermissionRequest.grant(pendingWebViewPermissionRequest.getResources());
            } else {
                pendingWebViewPermissionRequest.deny();
            }
            pendingWebViewPermissionRequest = null;
        }
    }
}
