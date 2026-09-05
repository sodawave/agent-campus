# Tutorial 4: Coding a bell

Source: https://docs.workadventu.re/blog/bell-from-scratch/

This tutorial shows you how to create a bell that anyone on a map can ring.

---

# Tutorial 4: Coding a bell

October 19, 2023 · 6 min readDavid NégrierCTO of WorkAdventure

This tutorial shows you how to create a bell that anyone on a map can ring.

infoIf you followed the previous tutorial, you already know how to add a bell using
the Scripting API Extra library.

In this tutorial, we are going to do the same thing, but from scratch. Why? So that I can show you how the "Event" system
works in WorkAdventure.

If you are looking for a quick way to add a bell to your map, we recommend using the Scripting API Extra library.

## Preparation​

- Find a sound file for the bell. Make sure you got the right license for your project to use it.- Make sure your map was built on the WorkAdventure Starter-Kit in order to have a ready to use API
## Our battle plan​

We will make our bell in 2 steps:

- We will create an area on the map that triggers the display of a message to the user. The message will propose pressing space to ring the bell.
When the user presses space, an event will be dispatched to anyone on the map.- We will listen to the event and play the sound of the bell when the event is received.
## Step 1: Sending the event​

### On the map (using Tiled)​

Inside any object layer on the map, create a new rectangle  called `bellZone`.
By default, all maps have at least one object layer called `floorLayer`. You can use this layer if you want.

infoIf you want to create a map with several bells, each bell should have its own area with its own name.

On this `bellZone` object, set the `class` property to `area`.

noteThe `class` property can also be named `type` in older versions of Tiled.

We need to define the class to `area` because this makes the rectangle accessible from the scripting API using the
`WA.room.area.onEnter` and `WA.room.area.onLeave` methods.

### In the code​

Make sure you have a `src` folder in your map repository. You can also use this Github Repo as a reference.

There should be a `main.ts` file here. If not, create the `main.ts` file.

Add the following code:

```
`/// <reference types="@workadventure/iframe-api-typings" />

import {ActionMessage} from "@workadventure/iframe-api-typings";

console.log('Script started successfully');

// Waiting for the API to be ready
WA.onInit().then(() => {
  let actionMessage: ActionMessage | undefined;

  // When someone enters the bellZone area
  WA.room.area.onEnter("bellZone").subscribe(() => {
    // Display the action message
    actionMessage = WA.ui.displayActionMessage({
      type: "message",
      message: "Press SPACE to ring the bell",
      callback: () => {
        // When space is pressed, we send a "bell-rang" signal to everyone on the map.
        WA.event.broadcast("bell-rang", {});
      }
    });
  });

  // When someone leaves the bellZone area
  WA.room.area.onLeave("bellZone").subscribe(() => {
    if (actionMessage !== undefined) {
      // Hide the action message
      actionMessage.remove();
      actionMessage = undefined;
    }
  });

}).catch(e => console.error(e));

export {};
`
```
A quick explanation of the code:

The script makes use of the `WA` global object that is provided by the WorkAdventure scripting API.
This object provides a few objects / methods that we will use:

- `WA.onInit()` is a method that returns a Promise that is resolved when the scripting API is ready to be used.
We need to wait for WorkAdventure to be ready before we can use the complete scripting API.- `WA.room.area.onEnter` and `WA.room.area.onLeave` are methods that allows us to listen to a player entering / leaving an area.
In our case, we want to listen to players entering / leaving the `bellZone` area. Those methods are only triggered for the current player (not the other players).
Please not the `onEnter` on `onLeave` methods return an RxJS Observable. You can use the `subscribe` method to listen to events.- `WA.ui.displayActionMessage` can be used
to display a message to the user. The message will be displayed at the bottom of the screen.
- `WA.event.broadcast` is used to send an event to all players on the map.
In our case, we want to send an event named `bell-rang` with an empty payload. Each event has a "name" and a "payload". In our case, we only need the name.Areas or layers?In the previous tutorials, we used the `WA.room.onEnterLayer` and `WA.room.onLeaveLayer` methods. Those methods are triggered when the player enters / leaves a layer.

While those methods are perfectly valid, it is often advisable to use `WA.room.area.onEnter` and `WA.room.area.onLeave` instead.
Indeed, layers can weight a lot in terms of map size. If your map is very large, each layer will take more space.
In comparison, areas defined with rectangle objects are very light in terms of map size.
The advantage of a layer is that it does not have to be a rectangle. So if you want to define a zone with a complex shape, it will be easier to use layers.

With this script, we are sending an event to all players on the map when the user presses space. Now, we need to listen to this event.

## Step 2: Listening to the event​

We assume here you have found an MP3 file for the bell sound and that you have put it in the `public/sounds` folder.

In the `main.ts` file, add the following code:

```
`    const bellSound = WA.sound.loadSound("sounds/door-bell-1.mp3");

// When the bell-rang event is received
WA.event.on("bell-rang").subscribe(({name, data, senderId}) => {
  // Play the sound of the bell
  bellSound.play({})
});
`
```
A quick explanation of the code:

- `WA.sound.loadSound` is used to load a sound file.
The method returns a `Sound` object that can be used to play the sound.

About the sound file URLThe first parameter passed to `loadSound` is the URL of the sound file. This URL is relative to the URL of the map.
In our case, we need to keep in mind that the map is "built" by Vite. Vite will serve the built map from the '/' path
if the map is in the root of the repository. For static resources, Vite will take everything in the `public` folder
and serve them from the '/' path too. Therefore, if your map is in the root of the repository, and if your sound file
is `public/sounds/door-bell-1.mp3`, the URL of the sound file will be `sounds/door-bell-1.mp3`.

- `WA.event.on` is used to listen to an event.
The event dispatched contains the name of the event, the payload and the ID of the player that sent the event. We don't
need those elements in our code. Simply playing the bell sound is enough. If you want to improve the code, you could
implement a throttling mechanism that could prevent a user with a given `senderId` to abuse the bell by ringing it too often.

infoPlease note that the `broadcast` method sends the event to anyone on the map, including the player that sent the event.

Tags:- scripting- tutorial
