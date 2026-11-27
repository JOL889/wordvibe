#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ADMOB_APP_ID = 'ca-app-pub-7584471711915098~8594351362';
const ADMOB_META_NAME = 'com.google.android.gms.ads.APPLICATION_ID';

export function resolveConfiguredAdMobAppId(rootDir) {
  const capConfigPath = path.join(rootDir, 'capacitor.config.ts');
  if (fs.existsSync(capConfigPath)) {
    const raw = fs.readFileSync(capConfigPath, 'utf8');
    const match = raw.match(/androidAppId\s*:\s*['"]([^'"]+)['"]/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  const admobTsPath = path.join(rootDir, 'src', 'config', 'admob.ts');
  if (fs.existsSync(admobTsPath)) {
    const raw = fs.readFileSync(admobTsPath, 'utf8');
    const match = raw.match(/ADMOB_ANDROID_APP_ID\s*=\s*['"]([^'"]+)['"]/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return DEFAULT_ADMOB_APP_ID;
}

export function upsertAdMobStringResource(stringsXml, appId) {
  const entry = `    <string name="admob_app_id">${appId}</string>`;
  if (/<string\s+name=["']admob_app_id["'][^>]*>[\s\S]*?<\/string>/.test(stringsXml)) {
    return stringsXml.replace(
      /\s*<string\s+name=["']admob_app_id["'][^>]*>[\s\S]*?<\/string>/,
      `\n${entry}`
    );
  }
  if (/<\/resources>/.test(stringsXml)) {
    return stringsXml.replace(/<\/resources>/, `${entry}\n</resources>`);
  }
  return `<?xml version='1.0' encoding='utf-8'?>\n<resources>\n${entry}\n</resources>\n`;
}

export function upsertAdMobManifestMeta(manifestXml) {
  const metaTag =
    `        <meta-data\n` +
    `            android:name="${ADMOB_META_NAME}"\n` +
    `            android:value="@string/admob_app_id" />`;

  const existingMetaRegex = new RegExp(
    `[ \\t]*<meta-data[^>]*android:name=["']${ADMOB_META_NAME.replace(/\./g, '\\.')}["'][^>]*\\/?>`,
    'm'
  );
  if (existingMetaRegex.test(manifestXml)) {
    return manifestXml.replace(existingMetaRegex, metaTag);
  }

  if (/[ \t]*<\/application>/.test(manifestXml)) {
    return manifestXml.replace(/[ \t]*<\/application>/, `${metaTag}\n    </application>`);
  }
  return manifestXml;
}

export function configureAndroidAdMobFiles(rootDir) {
  const androidDir = path.join(rootDir, 'android');
  if (!fs.existsSync(androidDir)) {
    return { configured: false, reason: 'android_dir_missing' };
  }

  const appId = resolveConfiguredAdMobAppId(rootDir);
  const stringsPath = path.join(
    androidDir,
    'app',
    'src',
    'main',
    'res',
    'values',
    'strings.xml'
  );
  const manifestPath = path.join(
    androidDir,
    'app',
    'src',
    'main',
    'AndroidManifest.xml'
  );

  if (fs.existsSync(stringsPath)) {
    const currentStrings = fs.readFileSync(stringsPath, 'utf8');
    const nextStrings = upsertAdMobStringResource(currentStrings, appId);
    if (nextStrings !== currentStrings) {
      fs.writeFileSync(stringsPath, nextStrings, 'utf8');
    }
  }

  if (fs.existsSync(manifestPath)) {
    const currentManifest = fs.readFileSync(manifestPath, 'utf8');
    const nextManifest = upsertAdMobManifestMeta(currentManifest);
    if (nextManifest !== currentManifest) {
      fs.writeFileSync(manifestPath, nextManifest, 'utf8');
    }
  }

  return {
    configured: true,
    appId,
    stringsUpdated: fs.existsSync(stringsPath),
    manifestUpdated: fs.existsSync(manifestPath),
  };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const rootDir = process.cwd();
  const result = configureAndroidAdMobFiles(rootDir);
  if (result.configured) {
    console.log(
      `[Wordvibe AdMob] Configured AndroidManifest.xml & strings.xml with App ID ${result.appId}`
    );
  }
}
