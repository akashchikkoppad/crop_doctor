# CropDoctor: APK and QR code setup

Result: someone scans the QR code, the download page opens, they tap Download and install the APK. No Play Store.
Android only. iPhone cannot install APK files, so the download page tells iPhone users to use "Add to Home Screen".

## What changed in this zip (folder: crop-doctor)
- Function renamed `analyze (6).js` to `analyze.js` (the old name would break the live URL).
- Function: total time kept under Netlify's ~10 s limit, bad request bodies return 400, errors no longer leak Google's raw message.
- Page: unknown severity from the AI now falls back to "Moderate".
- New: `manifest.webmanifest`, `sw.js`, `icons/`, `get-app.html`, `netlify.toml`, `.well-known/assetlinks.json` (placeholder).

## Steps (do them in this order)

1. **Deploy.** Replace the files in your `crop-doctor` GitHub repo with the contents of the `crop-doctor` folder (delete the old `analyze (6).js`). Netlify redeploys. Check these open in a browser:
   `https://YOUR-SITE/manifest.webmanifest` and `https://YOUR-SITE/get-app.html`.
   Check the analysis still works on a real photo.

2. **Build the APK (free, about 5 minutes).** Open https://www.pwabuilder.com, paste your site URL, press Start, then Package for stores, Android.
   - Package ID: something like `in.cropdoctor.app`
   - App name: CropDoctor
   - Signing key: choose **New** and let it generate one
   - Download the zip. It contains the signed `.apk`, `signing.keystore`, a key info text file and `assetlinks.json`.

3. **Keep the signing key safe.** Copy `signing.keystore` and the password from the info file somewhere private (not in GitHub). If you lose them you cannot ship updates that install over the old app.

4. **Add the APK to the site.**
   - Rename the APK to `crop-doctor.apk` and put it in the `crop-doctor` folder (next to `index.html`).
   - Replace `.well-known/assetlinks.json` with the `assetlinks.json` from PWABuilder. Without it the app shows a browser address bar at the top.
   - Push to GitHub. Netlify redeploys.
   - Test: open `https://YOUR-SITE/crop-doctor.apk` on an Android phone. It should download.

5. **Make the QR code.**
   ```
   pip install "qrcode[pil]"
   python make_qr.py https://YOUR-SITE/get-app.html
   ```
   This writes `cropdoctor-qr.png`. Point the QR at `get-app.html`, not at the APK itself, so people see the install steps in Kannada and English.

## What users will see
Scan, then open the page, tap Download, open the file, allow "Install unknown apps" for their browser once, tap Install.
Chrome may say the file "can harm your device" and Play Protect may ask for confirmation. This happens with any APK outside the Play Store and cannot be switched off. The download page explains it.

## Updating later
Change the website and push. The app shows the new version on its own. You only rebuild the APK if you change the app name, icon or package settings, and then you must sign it with the same keystore.
