import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

const firebaseConfig = Object.freeze({
  apiKey: "AIzaSyCgTj2X08NOXboQxjmv-Yiz2RfaMRReCVc",
  authDomain: "noan-beauty.firebaseapp.com",
  projectId: "noan-beauty",
  storageBucket: "noan-beauty.firebasestorage.app",
  messagingSenderId: "938629057592",
  appId: "1:938629057592:web:c13ecd5056ee8fc6136acd",
  measurementId: "G-QSLX3541Z5"
});

export const firebaseApp = initializeApp(firebaseConfig);
