const admin = require('firebase-admin')

// Initialize Firebase Admin with credentials from environment variables
// Add "require('dotenv').config()" to your main/index file if you don't already configure dotenv
const serviceAccount = {
    type: process.env.FIREBASE_TYPE || "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "your-project-id",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "your-private-key-id",
    private_key: process.env.FIREBASE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n",
    client_email: process.env.FIREBASE_CLIENT_EMAIL || "your-service-account-email@your-project-id.iam.gserviceaccount.com",
    client_id: process.env.FIREBASE_CLIENT_ID || "your-client-id",
    auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
    token_uri: process.env.FIREBASE_TOKEN_URI || "https://accounts.google.com/o/oauth2/token",
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account-email@your-project-id.iam.gserviceaccount.com",
}

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    })
}

module.exports = admin