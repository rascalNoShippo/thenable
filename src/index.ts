import { Thenable } from "./Thenable";

const thenable = new Thenable<string>((resolve, reject) => {
  console.log("start");

  setTimeout(() => resolve("2.23"), 1000);
});

console.log(thenable.getState());
const awaited = await thenable;
console.log(thenable.getState(), awaited);
