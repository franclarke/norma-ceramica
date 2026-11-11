# Conectar el WhatsApp real de Norma

El bot ya está hecho y es el mismo que usa `/simulador`. Para conectarlo a WhatsApp de verdad con la **WhatsApp Cloud API** de Meta:

## 1. Cuenta y app de Meta (unos 20 minutos)

1. Con una cuenta de Facebook, registrate en https://developers.facebook.com/ (se verifica con el celular).
2. **Create App** → caso de uso **Connect with customers through WhatsApp** → crear o elegir un business portfolio.
3. En **WhatsApp → API Setup** Meta te da un **número de prueba gratis**. No hace falta un chip propio para probar.
4. En **To**, agregá el WhatsApp de Norma (o el tuyo para probar) y confirmá el código que llega.
5. Anotá el **Phone number ID**.

## 2. Token permanente

En https://business.facebook.com/latest/settings → **System users** → creá uno, asignale la app y la cuenta de WhatsApp con control total, y generá un token con los permisos `whatsapp_business_messaging`, `whatsapp_business_management` y `business_management`.

## 3. Variables en Vercel

| Variable | Valor |
|---|---|
| `WHATSAPP_TOKEN` | el token del paso 2 |
| `WHATSAPP_PHONE_NUMBER_ID` | el Phone number ID |
| `WHATSAPP_APP_SECRET` | App settings → Basic → App secret (para verificar la firma) |
| `WHATSAPP_VERIFY_TOKEN` | cualquier texto secreto que elijas |
| `NORMA_WHATSAPP` | el número de Norma en formato internacional sin `+`, ej. `5491123456789` (puede ser una lista separada por comas) |
| `NORMA_CONTACT_PHONE` | el número que ven los compradores, tal cual se muestra, ej. `11 2345-6789` |

```bash
vercel env add WHATSAPP_TOKEN production
```

## 4. Webhook

En **WhatsApp → Configuration → Webhook**:

- **Callback URL:** `https://norma-ceramica.vercel.app/api/whatsapp`
- **Verify token:** el mismo `WHATSAPP_VERIFY_TOKEN`
- Suscribirse al campo **messages**.

Listo: Norma le escribe "hola" al número y el bot le contesta con los botones.

## Cómo se protege

- Solo los números de `NORMA_WHATSAPP` pueden modificar la página. A cualquier otro, el bot le contesta con amabilidad y le pasa el número de Norma.
- Cada pedido se verifica con la firma `X-Hub-Signature-256`. Si WhatsApp está configurado y falta el `WHATSAPP_APP_SECRET`, el webhook rechaza todo.
- WhatsApp reintenta los webhooks: cada mensaje se procesa una sola vez (se guardan los últimos ids).
- Responder mensajes que inicia Norma (dentro de la ventana de 24 h) no tiene costo en la Cloud API.
