import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDT-XDCK1h_NhKBr6uz841ooaQPBgGQVzI",
  authDomain: "guesswar.firebaseapp.com",
  databaseURL: "https://guesswar-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "guesswar",
  storageBucket: "guesswar.firebasestorage.app",
  messagingSenderId: "83995175164",
  appId: "1:83995175164:web:812b23565074a81b818f79"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);

const auth = getAuth(app);

export let currentUser = null;

signInAnonymously(auth)
  .then((userCredential) => {
    currentUser = userCredential.user.uid;
    console.log("Logged In:", currentUser);
  })
  .catch((error) => {
    console.error(error);
  });