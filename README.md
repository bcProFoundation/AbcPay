Ionic version  : 6
NodeJS version : 14

For MAC : 
Install bundletool --> run : brew install bundletool

### Android

When your development environment is ready, run the `start:android` package script.

```sh
1. npm run prepare:abcpay
2. Option 1 : Build Android with Android studio
    + npm run start:android
    + Open android studio --> open source abcpay/android
    + Build and run with android studio
3. Option 2 : Render .apk file without Android studio 
    + npm run build:android (.apk file in android/app/build/outputs/aps/debug/app-debug.apk)
    + npm run build:android-release (.apk file in android/app/build/outputs/aps/release/app-release-unsigned.apk)
-- Note: if build error Run --> : "npx jetify" to fix
```

### iOS

When your development environment is ready, run the `start:ios` package script.

- Rename '.env.example' file to .env and change AWS_URL_CONFIG variable value, which points to correct the backend API service. 

```sh
1. npm run prepare:abcpay
2. npm run env:dev // update AWS_URL_CONFIG
3. npm run apply // update pinfo.list
4. npm run start:ios
5. Build and run with Xcode

_Note: if build returns error. Run to fix : "npx jetify" then "run npm run start:ios" again._

Additional iOS configuration steps require in order to enable notification feature during build. Please refer to: https://capacitorjs.com/docs/guides/push-notifications-firebase#prerequisites for detail:

1. Add the GoogleService-Info.plist file to your iOS app
2. Add the Firebase SDK via CocoaPods
3. Update the Project
4. Add Initialization Code

```
