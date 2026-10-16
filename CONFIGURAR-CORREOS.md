# Notificaciones de citas por correo

La función `emailAppointmentRequest` envía un correo a `mauriciocaicedo743@gmail.com` cuando se crea una **nueva** solicitud en `appointmentRequests`. Normalmente llega unos segundos después de enviar el formulario. Las solicitudes anteriores no se reenvían.

El correo se envía desde una cuenta Gmail remitente que tú controlas. La contraseña de aplicación se guarda en Firebase Secret Manager; no la pongas en HTML, JavaScript, Git ni en este documento, y no la compartas por el chat.

## Configurar Gmail

1. En la cuenta Gmail remitente, activa la verificación en dos pasos y crea una contraseña de aplicación para correo. Usa esa contraseña de aplicación, no la contraseña normal de Gmail.
2. Desde PowerShell, en la carpeta del proyecto, inicia sesión en Firebase si todavía no lo hiciste:

   ```powershell
   npx firebase login
   ```

3. Guarda la cuenta remitente y la contraseña de aplicación como secretos. La CLI te pedirá cada valor; introdúcelos en el prompt y no los agregues al comando:

   ```powershell
   npx firebase functions:secrets:set SMTP_USER
   npx firebase functions:secrets:set SMTP_APP_PASSWORD
   ```

4. Instala las dependencias de las funciones y despliega:

   ```powershell
   npm --prefix functions install
   npm run deploy:firebase
   ```

El proyecto Firebase debe tener habilitado el plan Blaze para desplegar Cloud Functions. El despliegue también aplica las reglas de Firestore configuradas para este proyecto.

## Comprobar el envío

Envía una nueva solicitud desde el formulario de citas y revisa la bandeja de entrada y spam de `mauriciocaicedo743@gmail.com`. En Firebase Console → Functions → Logs puedes revisar errores de envío. La colección interna `emailNotificationJobs` registra el estado del envío; las reglas generales de Firestore impiden su acceso público.

Los pedidos de la tienda y sus precios se guardan por otra función y no forman parte de este correo de citas.
