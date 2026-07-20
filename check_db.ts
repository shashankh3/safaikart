import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = require('./serviceAccountKey.json'); // I'll need to figure out where the emulator or credentials are. Wait, is it using an emulator?
