package com.example.app;

import android.webkit.PermissionRequest;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    /**
     * Concede acceso a cámara/micrófono para iframes cross-origin (VDID SDK / Suma México).
     * Sin esto, el WebView de Android bloquea getUserMedia() dentro del iframe.
     */
    @Override
    public void onStart() {
        super.onStart();
        getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                request.grant(request.getResources());
            }
        });
    }
}
