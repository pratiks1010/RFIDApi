# Gati API – Fix 503 in Production (rfidapi.loyalstring.in)

The app calls **same-origin** URLs: `https://rfidapi.loyalstring.in/api/TamannaahBS/TestService` and `GetStockOnHand`.  
Your server must **proxy** these to the Gati API: `http://3.109.131.101:816/api/TamannaahBS/...`

If you see **503 Service Unavailable** or "Connection failed", the proxy is not active on the server.

---

## Option 0: PHP proxy (recommended for Hostinger / shared hosting)

The repo includes a **PHP proxy** that works without Apache/Nginx proxy:

1. After `npm run build`, in the **build** folder you should have:
   - `gati-proxy.php`
   - `.htaccess` (with the rewrite to `gati-proxy.php`)
2. Deploy the whole **build** folder to your server root (so `gati-proxy.php` and `.htaccess` are at the same level as `index.html`).
3. Ensure the server runs PHP and that **allow_url_fopen** is enabled (default on most hosts).
4. No further config needed. Requests to `https://rfidapi.loyalstring.in/api/TamannaahBS/TestService` will be rewritten to `gati-proxy.php?path=TestService`, which forwards to `http://3.109.131.101:816/api/TamannaahBS/TestService` and returns the response.

If 503 persists, the server may be ignoring `.htaccess` for the `/api/` path or PHP may be disabled; use Option 1 or 2 below.

---

## Option 1: Apache (if your host uses Apache and allows proxy)

Ensure `mod_proxy` and `mod_proxy_http` are enabled, then in the **server config** (vhost or main config), add **before** any SPA fallback:

```apache
ProxyPreserveHost On
ProxyPass /api/TamannaahBS http://3.109.131.101:816/api/TamannaahBS
ProxyPassReverse /api/TamannaahBS http://3.109.131.101:816/api/TamannaahBS
```

Restart Apache after changing config.

---

## Option 2: Nginx (if your host uses Nginx)

In the `server` block for `rfidapi.loyalstring.in`, add:

```nginx
location /api/TamannaahBS/ {
    proxy_pass http://3.109.131.101:816/api/TamannaahBS/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header AuthorizationToken $http_authorizationtoken;
}
```

Reload Nginx after changing config.

---

## Option 3: Hostinger / shared hosting

Many shared hosts **do not** allow proxy in `.htaccess`. You need to:

1. Open a ticket or use Hostinger’s “Apache/Nginx config” (or “Advanced”) if available.
2. Ask them to add a **reverse proxy** for path `/api/TamannaahBS` to `http://3.109.131.101:816/api/TamannaahBS` and to forward the `AuthorizationToken` request header.
3. Or use a **backend/PHP/Node** on the same domain that forwards requests to `http://3.109.131.101:816/api/TamannaahBS` and set `REACT_APP_TAMANNAAH_BS_API_URL` to that backend URL.

---

## Verify

After the proxy is in place:

- `https://rfidapi.loyalstring.in/api/TamannaahBS/TestService` should return:  
  `{"status":true,"message":"Service Connected : TamannaahBS"}`
- The Third Party Integration page “Test connection” should show “Service connected”.
