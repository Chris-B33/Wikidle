import { startGame } from "./game.js"; 
const startButton = document.querySelector<HTMLButtonElement>( "#start-button" ); 
startButton?.addEventListener( "click", startGame );