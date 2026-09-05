# Tutorial 1: Day and Night Effect

Source: https://docs.workadventu.re/blog/day-and-night/

This tutorial shows you how to switch tiles at a specific time of the day.

---

# Tutorial 1: Day and Night Effect

September 26, 2023 · 5 min readKateIT administrator and privacy advocate

This tutorial shows you how to switch tiles at a specific time of the day. 

You can create effects like:

- switching day tiles to night tiles- add or remove food from a buffet- change the weather- ... and much moreWe will demonstrate this effect with appearing and disappearing laptops.

We assume you have a basic understanding of how to build a map with Tiled
and JavaScript / Typescript.

## Preparation​

- make sure your map was built on the WorkAdventure Starter-Kit in order to have an activated API 
## On the map (using Tiled)​

Create a folder in the layer section called `above` and place it over the `floorLayer`
Create a new layer inside the folder and call it `laptops`. You can also use any other name, but then you need to make sure to change the name in the code. 

Place the laptops at a location of your choice.

Then click in the Navigation on `Map` then `Map Properties`
and double-check the custom property `script` is set to `src/main.ts`.

`Save` your map.

## Code preparation​

The first step will be to find a Javascript package that can help us with the time-based switching.
We could of course develop this ourselves, but a package will make our life easier.
We will use cron-schedule for this.

Importing a package in a map is done like in any other Javascript project: using `npm`.

In your map repository, run the following command:

```
`npm install cron-schedule
`
```

## The Code​

Make sure you have a `src` folder in your map repository. You can also use this Github Repo as a reference.

There should be a `main.ts` file here. If not, create the `main.ts` file.

infoThe `.ts` extension is the extension for Typescript files. Typescript is a superset of Javascript that adds types to the language.
The WorkAdventure starter kit comes with support for Typescript. It is automatically compiled to Javascript using
a bundler called `vite`. If you are not familiar with Typescript, you can simply write Javascript code in your `main.ts` file.

Add the following code:

cautionPlease note that if you changed the layer name `laptops` to something else you need to change the name in the code as well. 

This script shows the laptops at 7 am and hides it at 7 pm. If you like to change the times simply change the following lines: `    const cronStartNight = parseCronExpression('0 19 * * *');` and `const cronStartDay = parseCronExpression('0 7 * * *');`. Additionally you can also read about CronJobs. 

```
`/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";
import { parseCronExpression } from "cron-schedule";
import { TimerBasedCronScheduler as scheduler } from "cron-schedule/schedulers/timer-based.js";

console.log('Script started successfully');

// Waiting for the API to be ready
WA.onInit().then(() => {
    console.log('Scripting API ready');

    // At 19:00, hide the laptops
    const cronStartNight = parseCronExpression('0 19 * * *');
    scheduler.setInterval(cronStartNight, () => {
        WA.room.hideLayer("above/laptops");
    });

    // At 7:00, show the laptops
    const cronStartDay = parseCronExpression('0 7 * * *');
    scheduler.setInterval(cronStartDay, () => {
        WA.room.showLayer("above/laptops");
    });

    // If the player enters the room between 19:00 and 7:00, hide the laptops
    const now = new Date();
    const startNight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0);
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0);
    if (now > startNight || now < startDay) {
        WA.room.hideLayer("above/laptops");
    }
}).catch(e => console.error(e));

export {};
`
```
A quick explanation of the code:

The script makes use of the `WA` global object that is provided by the WorkAdventure scripting API.
This object provides a few methods that we will use:

- `WA.onInit()` is a method that returns a Promise that is resolved when the scripting API is ready to be used.
We need to wait for WorkAdventure to be ready before we can use the complete scripting API.- `WA.room.showLayer()` and `WA.room.hideLayer()` are methods that allow us to show or hide a layer on the map.
In our case, we want to show or hide the `above/laptops` layer depending on the time of the day.infoIn Tiled, the `laptops` layer is in the group layer named `above`.
In the scripting API, we reference this layer as `above/laptops`.

- The `scheduler.setInterval` method is triggered at a specific time of the day.
We use it to show or hide the laptops at 7 am and 7 pm.- Using `scheduler.setInterval` is not enough though. When a user enters the map, we need to check if the laptops should be shown or hidden.
We do this by checking the current time and comparing it to 7 am and 7 pm. By default, the laptops are shown. But
if we are between 7 pm and 7 am, we need to hide them.
## Going further​

We could of course go further and make a complete different map depending on the time of the day.
We could also play sounds at night. Or simply trigger special decorations for Halloween or Christmas at given dates!

We only used 2 methods of the scripting API in this tutorial but there are hundreds! Don't hesitate to check
the full scripting API documentation to see what you can do with it.

Tags:- scripting- tutorial
