import { db } from "./firebase-config.js";

import {
  ref,
  set,
  update,
  get,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ------------------------- */
/* ELEMENTS */
/* ------------------------- */

const screens = {
  home: document.getElementById("homeScreen"),
  waiting: document.getElementById("waitingScreen"),
  secret: document.getElementById("secretScreen"),
  game: document.getElementById("gameScreen")
};

const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");

const roomInput = document.getElementById("roomInput");
const roomCodeBox = document.getElementById("roomCodeBox");
const copyBtn = document.getElementById("copyBtn");

const secretInput = document.getElementById("secretInput");
const readyBtn = document.getElementById("readyBtn");
const readyStatus = document.getElementById("readyStatus");

const guessInput = document.getElementById("guessInput");
const guessBtn = document.getElementById("guessBtn");

const hintBox = document.getElementById("hintBox");
const turnBox = document.getElementById("turnBox");

const myAttempts = document.getElementById("myAttempts");
const enemyAttempts = document.getElementById("enemyAttempts");

const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const playAgainBtn = document.getElementById("playAgainBtn");

/* ------------------------- */
/* VARIABLES */
/* ------------------------- */

let roomId = "";
let myRole = "";
let gameEnded = false;

/* ------------------------- */
/* SCREEN SYSTEM */
/* ------------------------- */

function showScreen(screenName){

  Object.values(screens).forEach(screen=>{
    screen.classList.remove("active");
  });

  screens[screenName].classList.add("active");
}

/* ------------------------- */
/* ROOM CODE */
/* ------------------------- */

function generateRoomCode(){

  return Math.random()
    .toString(36)
    .substring(2,7)
    .toUpperCase();
}

/* ------------------------- */
/* CREATE ROOM */
/* ------------------------- */

createBtn.onclick = async ()=>{

  roomId = generateRoomCode();

  myRole = "player1";

  await set(
    ref(db, "rooms/" + roomId),
    {
      state:"waiting",
      turn:null,
      winner:null
    }
  );

  roomCodeBox.innerText = roomId;

  showScreen("waiting");

  listenRoom();
};

/* ------------------------- */
/* JOIN ROOM */
/* ------------------------- */

joinBtn.onclick = async ()=>{

  roomId = roomInput.value.toUpperCase();

  if(roomId.length !== 5){
    alert("Invalid Room Code");
    return;
  }

  const snapshot = await get(
    ref(db, "rooms/" + roomId)
  );

  if(!snapshot.exists()){
    alert("Room Not Found");
    return;
  }

  myRole = "player2";

  await update(
    ref(db, "rooms/" + roomId),
    {
      state:"choosing"
    }
  );

  showScreen("secret");

  listenRoom();
};

/* ------------------------- */
/* COPY ROOM */
/* ------------------------- */

copyBtn.onclick = ()=>{

  navigator.clipboard.writeText(roomId);

  copyBtn.innerText = "Copied!";

  setTimeout(()=>{
    copyBtn.innerText = "Copy Room Code";
  },1500);
};

/* ------------------------- */
/* READY */
/* ------------------------- */

readyBtn.onclick = async ()=>{

  const secret = Number(secretInput.value);

  if(secret < 1 || secret > 9999){
    alert("Choose number between 1-9999");
    return;
  }

  await update(
    ref(db, "rooms/" + roomId + "/" + myRole),
    {
      secret:secret,
      attempts:0,
      ready:true,
      rematch:false
    }
  );

  secretInput.value = "";

  secretInput.disabled = true;

  readyBtn.disabled = true;

  readyStatus.innerText = "Waiting for opponent...";
};

/* ------------------------- */
/* GUESS */
/* ------------------------- */

guessBtn.onclick = async ()=>{

  if(gameEnded) return;

  const guess = Number(guessInput.value);

  if(!guess){
    return;
  }

  const snapshot = await get(
    ref(db, "rooms/" + roomId)
  );

  const data = snapshot.val();

  if(data.turn !== myRole){

    hintBox.innerText = "WAIT FOR YOUR TURN";

    return;
  }

  const opponent =
    myRole === "player1"
    ? data.player2
    : data.player1;

  const me =
    myRole === "player1"
    ? data.player1
    : data.player2;

  if(!opponent || !opponent.ready){
    return;
  }

  const attempts = (me.attempts || 0) + 1;

  await update(
    ref(db, "rooms/" + roomId + "/" + myRole),
    {
      attempts:attempts,
      lastGuess:guess
    }
  );

  myAttempts.innerText = attempts;

  if(guess > opponent.secret){

    hintBox.innerText = "LOWER";

    await update(
      ref(db, "rooms/" + roomId),
      {
        turn:
          myRole === "player1"
          ? "player2"
          : "player1"
      }
    );
  }

  else if(guess < opponent.secret){

    hintBox.innerText = "HIGHER";

    await update(
      ref(db, "rooms/" + roomId),
      {
        turn:
          myRole === "player1"
          ? "player2"
          : "player1"
      }
    );
  }

  else{

    gameEnded = true;

    hintBox.innerText = "CORRECT";

    await update(
      ref(db, "rooms/" + roomId),
      {
        state:"ended",
        winner:myRole
      }
    );

    showResult(true, attempts);
  }

  guessInput.value = "";
};

/* ------------------------- */
/* RESULT MODAL */
/* ------------------------- */

function showResult(win, attempts=0){

  resultModal.classList.remove("hidden");

  if(win){

    resultTitle.innerText = "YOU WON";

    resultText.innerText =
      "Attempts Used: " + attempts;
  }

  else{

    resultTitle.innerText = "YOU LOST";

    resultText.innerText =
      "Opponent guessed first.";
  }
}

/* ------------------------- */
/* PLAY AGAIN */
/* ------------------------- */

playAgainBtn.onclick = async ()=>{

  await update(
    ref(db, "rooms/" + roomId + "/" + myRole),
    {
      rematch:true
    }
  );

  playAgainBtn.innerText = "Waiting...";
};

/* ------------------------- */
/* LISTENER */
/* ------------------------- */

function listenRoom(){

  onValue(
    ref(db, "rooms/" + roomId),
    async (snapshot)=>{

      const data = snapshot.val();

      if(!data) return;

      /* PLAYER JOINED */

      if(
        data.state === "choosing" &&
        myRole === "player1"
      ){
        showScreen("secret");
      }

      /* START GAME */

      if(
        myRole === "player1" &&
        data.player1?.ready &&
        data.player2?.ready &&
        data.state === "choosing"
      ){

        const randomTurn =
          Math.random() < 0.5
          ? "player1"
          : "player2";

        await update(
          ref(db, "rooms/" + roomId),
          {
            state:"playing",
            turn:randomTurn
          }
        );
      }

      /* GAME SCREEN */

      if(data.state === "playing"){

        showScreen("game");
      }

      /* TURN SYSTEM */

      if(data.turn === myRole){

        turnBox.innerText = "YOUR TURN";

        guessBtn.disabled = false;
      }

      else{

        turnBox.innerText = "OPPONENT TURN";

        guessBtn.disabled = true;
      }

      /* ATTEMPTS */

      const opponent =
        myRole === "player1"
        ? data.player2
        : data.player1;

      if(opponent){

        enemyAttempts.innerText =
          opponent.attempts || 0;
      }

      /* GAME END */

      if(
        data.state === "ended" &&
        data.winner !== myRole &&
        !gameEnded
      ){

        gameEnded = true;

        showResult(false);
      }

      /* REMATCH */

      if(
        data.player1?.rematch &&
        data.player2?.rematch
      ){

        gameEnded = false;

        resultModal.classList.add("hidden");

        playAgainBtn.innerText = "PLAY AGAIN";

        hintBox.innerText = "Make your guess";

        myAttempts.innerText = "0";

        enemyAttempts.innerText = "0";

        secretInput.disabled = false;

        readyBtn.disabled = false;

        readyStatus.innerText = "";

        await update(
          ref(db, "rooms/" + roomId),
          {
            state:"choosing",
            turn:null,
            winner:null,
            player1:{
              ready:false,
              attempts:0,
              rematch:false
            },
            player2:{
              ready:false,
              attempts:0,
              rematch:false
            }
          }
        );

        showScreen("secret");
      }

    }
  );
}
