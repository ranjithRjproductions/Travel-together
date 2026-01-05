
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// The service account key is hardcoded here to bypass environment variable parsing issues.
const serviceAccount = {
  "type": "service_account",
  "project_id": "studio-2888129045-980dc",
  "private_key_id": "c04f712d7b91f78d6c844785bf74a6d7701f1e3f",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDRR2dGK4AS5L/5\nhnVn1NLm2mJfyXQVxM9j+xh8/Y94KWc9SH2kn+tLKhztxqNLr8jE0BfoAn71ATKJ\nfdbIWnycP4KdMZhXWk8jtLgcn36isUmaWLUTwuKUE8sqfyU358457z+KeNZs/5A9\npRUW3T9VUTko7UjCEAOMWkUTm5hwmgA2gRWoMVPcOK3zMpxe2+XPIaqLNVKSM3M0\nqa8lBkczaZujyH2KD47XDGf0WniV/PMjL7XTV4H7IX2YxpmpmADmjo1+kcMQKPcv\noyg13nrY41PLJgNsNq15fYMWqMd6G9DmnFcYZJIOgIXjj4ZYD8Zq+cTgBVpDint3\nS2yXAFAnAgMBAAECggEABPoMOCx3prte31m1uArlGw1NcpaxVoUwI2IIwowrGcHu\nTRRIvJ368/Yj6vmiz312KkwCjYdlqoDlSUS/U1NnjDWsbv2LcGRa5m/5QuD+G3NY\n2z1JzRcA2WGhHrkYUvyFuHX6jlnyS3RGY1jmJ/2J8Ib2c4U1CjxkQTWyV9WG6gKM\nhXzZ+5aiB0JT6iOvEwrWue1/03OvoEYHEa62pnoAiK64rnrdHDFX8s/lSs0toQ1r\nlNEBXClP6cwoZbd5XhCzJlLlaNSyDWAPz7GQKRpQ2w+ltUS7iBQm2wWOl+insO6h\nhQUHEQ22qtBNIp1YiU4cb8DK96A5MFUchAQeVFU+aQKBgQDoDqJNqH2a+H+6lg+\nwvdCr/L3PlD30xJm3rExs6sfnrzqBwkHB3BuLr695Tj9X9p/SrNJDqBoyiGEdWdR\nnlruI7Xd1XxHjnoKH/3MzX57RoO593N2wOwDfZqo7FsoidR8a4CNQ/oKJbLzubGW\nkGISLv6uQye+7RtcaJERjIxAeQKBgQDm3x+rQIdiYmZsmLqg1iNCKhGVqMs1tmXm\nMWBUgr4erizW3cmh3aEoWiQW2WwmKzQBpU3+B4p9SkjKbTp5Jr28cDdDDAibcZEq\nCr0d3WobbyOaAUoc1rVcq73K5QbO42nVJ34Ag+HpecSgjNZGEve+7vyx2i+FZlFq\nRJVXG0ctnwKBgC7yvv1tusBbJTbYnI/eC/5O8J362pC5AFEVns3KZsWX7OqAD+B/\nLczs4iQzGuuQF/mG2Gzga62nr05IHmYR3p2tVd8SkPk9Jw2jWUq1DHDOXFokaRTO\nhTFTmRWx8+NotzeQ3Eo4RX8GD4VlvTsT7PN21InXBlSHTfDNKwRc5gcpAoGAB20N\n27hLooJ/wOZ4ukuo/qvTvPic8LFZPbpA2vcJnnsDvjWMEsTKNj4QAxwjOmcRWSw0\nAgPEFJubE8fHpbX1TGZfoKx2ammQvcVyp89DZnaAsqdv9tWBJ+XuSORs/6KY+N44\nU1PqpFPiWzesfLyHc4DEaAQYmzXbUIu8Mf0SoQkCgYEAw19lgct8pOJcTLlpk5VQ\nKeun+oqXGV2vELEQ6fXAMDa9TkZUaisP53P/3xU8gC3CLoTPq14pF7+xAATQbREj\nyaHxBzJsb8p6KPjV4HO7PPCEN81MISXNl4Q/29DmSgtFd1rRnJy11HApOoGGu4Ug\nif1n4k2bLBnyQNqqaIWwoFQ=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@studio-2888129045-980dc.iam.gserviceaccount.com",
  "client_id": "102523333640468475412",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40studio-2888129045-980dc.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// Initialize Admin SDK once
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminMessaging = getMessaging();
