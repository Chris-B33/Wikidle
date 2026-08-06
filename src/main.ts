const message: string = "Hello, w-w-w-World!";

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.textContent = message;
}