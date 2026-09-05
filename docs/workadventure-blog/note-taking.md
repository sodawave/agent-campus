# Tutorial 2: Note taking

Source: https://docs.workadventu.re/blog/note-taking/

This tutorial shows you how to take notes as an admin and leave it to read for other users.

---

# Tutorial 2: Note taking

September 27, 2023 · 10 min readKateIT administrator and privacy advocate

This tutorial shows you how to take notes as an admin and leave it to read for other users. 

In the example picture above no note was left. 

## Preparation​

- Make sure your map was built on the WorkAdventure Starter-Kit in order to have a ready to use API
## Our battle plan​

We will make this not taking system in 3 steps:

- Create a variable on the map that can store the text of the note we want to display- Design a web page that will display the note- Open and close this web page (as an iframe) when someone walks near the note post

To implement a proper note-taking system, we will rely on WorkAdventure scripting API. The scripting API allows you to write Javascript / Typescript code
that will be executed in the browser of each player.

Of course, when I write a note on the map, I want other users to see this note when they are coming in.
To do so, we will use a feature of the scripting API called "variables". Variables are used to hold the "state" of the map.
The state is a key/value store that is shared between all players. When a player changes the state, all other players are notified of the change.

We will create a variable attached to the map named `noteText` that will contain the text of the note.

## Step 1. On the map (using Tiled)​

Create a new object point  called `noteText`.
Give it the class name `variable` and add a custom property of the type `boolean` and name it `persist`. Add a check.

info`persist` is used to make sure that the variable is saved on WorkAdventure servers. If you don't set this property,
the variable will be lost as soon as the last user leaves the map.

Now add a new layer and call it `visibleNote`. Place a tile where you want the note to be visible.

Make sure you have a `src` folder in your map repository. You can also use this Github Repo as a reference.

There should be a `main.ts` file here. If not, create the `main.ts` file.

Then click in the Navigation on `Map` then `Map Properties` and make sure there is an existing `script` property and that is points to `src/main.ts`.

`Save` your map.

## Step 2. Creating an HTML page for the note​

We are going to add a new `note.html` file that will contain the HTML code of the note.
The starter kit of WorkAdventure is using Vite to build the map. Vite is a tool that allows you to use modern Javascript features
and compile them to a version of Javascript that is compatible with all browsers.

Let's start by running Vite:

```
`npm run dev
`
```
This will start a local web server on port 3000. You can access it at http://localhost:3000.

Now, let's create our `note.html` file. Create a new file in the `src` folder and name it `note.html`.

src/note.html
```
`<!DOCTYPE html>
<html lang="en">
    <head>
        <style>
            body {
                background-color: white;
            }
            textarea {
                width: 100%;
                height: 100px;
            }
            pre {
                text-align: center;
            }
        </style>
    </head>

    <body>
        <div id="editSection">
            <div>
                <textarea id="noteTextArea"></textarea>
            </div>
            <div>
                <button id="saveButton">Save</button>
            </div>
        </div>
        <pre id="displayText"></pre>
    </body>
</html>
`
```
We could certainly do a way better job at styling this page, but this is not the point of this tutorial.

We need to tell Vite that this file exists. To do so, we need to edit the `vite.config.ts` file. This file is used by Vite to know which files to compile.

In the `build.rollupOptions.input` section, add the following line:

vite.config.ts
```
`// ...
export default defineConfig({
    // ...
    build: {
        rollupOptions: {
            input: {
                index: "./index.html",
                note: "./note.html",
                ...getMapsScripts(maps),
            },
        },
    },
    // ...
});
`
```
Let's check that everything is working fine. Open your browser at http://localhost:3000/note.html. You should see the note page.

## Step 3. Opening and closing the note​

We are now going to write the Javascript code that will open and close the note when a player enters or leaves the `visibleNote` layer.

In the `main.ts` file, add the following code:

src/main.ts
```
`/// <reference types="@workadventure/iframe-api-typings" />

console.log('Script started successfully');

// Waiting for the API to be ready
WA.onInit().then(() => {
    console.log('Scripting API ready');

    let noteWebsite: any;

    WA.room.onEnterLayer("visibleNote").subscribe(async () => {
        console.log("Entering visibleNote layer");

        noteWebsite = await WA.ui.website.open({
            url: "./note.html",
            position: {
                vertical: "top",
                horizontal: "middle",
            },
            size: {
                height: "30vh",
                width: "50vw",
            },
            margin: {
                top: "10vh",
            },
            allowApi: true,
        });

    });

    WA.room.onLeaveLayer("visibleNote").subscribe(() => {
        noteWebsite.close();
    });

}).catch(e => console.error(e));

export {};
`
```
A quick explanation of this code:

- The `WA.onInit()` function is called when the scripting API is ready. This is the entry point of our code.- The `WA.room.onEnterLayer("visibleNote")` and `WA.room.onLeaveLayer("visibleNote")` functions are called when the player enters or leaves the `visibleNote` layer.- The `WA.ui.website.open()` function opens a new website in an iframe.- Iframes opened via the `WA.ui.website` object are relative
to the "viewport". This means you can decide where the iframe will be displayed on the screen (top-left, bottom-right, middle, etc.) using the `position` option.- You can of course also decide the size of the iframe. Units are expressed in CSS units. We recommend using `vh` and `vw` units that are relative to the viewport size (30vh = 30% of the viewport height).- The `allowApi` option allows the website to use the scripting API. It is very important to not forget this one. Indeed, the "note.html" page will need to use the scripting API to read and write the note text.- The `url` parameter can be a full URL (starting with `http://` or `https://`) or a relative URL. In case of a relative URL, it is relative to the map URL. Because our map and the `note.html` are in
the same directory, we can simply write `./note.html`.- The `WA.ui.website.open()` function returns a `Promise` that resolves to a `UIWebsite` object. This object has a `close()` method that can be used to close the website.
We call this `close()` method when the user leaves the `visibleNote` layer.
## Step 4. Adding a script to the note page​

We now have a `note.html` webpage that opens when we walk on the `visibleNote` layer.
Let's add some code inside the `note.html` webpage to read and write the note text.

The first thing we need to do is to add 2 `<script>` tags to the `note.html` file. One will load the WorkAdventure scripting API. The other one will point to our code.

src/note.html
```
`<!DOCTYPE html>
<html lang="en">
    <head>
        <!-- ... -->
        <script src="https://play.workadventu.re/iframe_api.js"></script>
        <script type="module" src="src/note.ts"></script>
    </head>

    <body>
    <!-- ... -->
    </body>
</html>
`
```
noteIf you are using a self-hosted version of WorkAdventure, you will want to replace the `play.workadventu.re` domain
with your own server's domain.

Now, create a file called `note.ts` in your `src` folder with the following code:

src/note.ts
```
`/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";

console.log('Script started successfully');

const noteTextArea = document.getElementById("noteTextArea") as HTMLTextAreaElement;
const saveButton = document.getElementById("saveButton") as HTMLButtonElement;

// Waiting for the API to be ready
WA.onInit().then(() => {
    console.log('Scripting API ready');

    noteTextArea.value = (WA.state.noteText ?? "") as string;
    saveButton.addEventListener("click", () => {
        WA.state.noteText = noteTextArea.value;
    });

}).catch(e => console.error(e));

export {};
`
```
This code is pretty simple:

- We use the `WA.state` object to read and write the `noteText` variable. Remember that this variable is shared between all players.
So if a player modifies the variable, all other players will see the new variable value when they open the page.

- When the map is loaded and no variable has been set yet, the `WA.state.noteText` variable will be `undefined`. We use the `??` operator to set the value to an empty string in this case.

- Also, a variable can hold any kind of (serializable) value. Typescript does not know that the `noteText` variable is a string. We use a type assertion to tell Typescript that we know what we are doing.

infoIf we wanted to be technically exact, we should force checking that the `noteText` variable is indeed a string.

Something like:

```
`const text = (WA.state.noteText ?? "");
if (typeof text !== "string") {
    throw new Error("The noteText variable is not a string");
}
`
```
- We use the `addEventListener` function to listen to the `click` event on the `saveButton` button. When the button is clicked, we save the note text in the `noteText` variable.

## Step 5. Adding authorization checks to the note page​

With the code we have written so far, any player can open the note page and modify the note text.

Let's add some authorization checks to make sure that only users with the `admin` tag can modify the note text.

The `WA.player` object contains information about the current player. In particular, it contains the list of tags of the player in the `tags` property.

We will use this `tags` property to check if the player has the `admin` tag.

src/note.ts
```
`//...

const editSection = document.getElementById("editSection") as HTMLDivElement;
const displayText = document.getElementById("displayText") as HTMLDivElement;
const noteTextArea = document.getElementById("noteTextArea") as HTMLTextAreaElement;
const saveButton = document.getElementById("saveButton") as HTMLButtonElement;

// Waiting for the API to be ready
WA.onInit().then(() => {
    // ...

    if (WA.player.tags.includes("admin")) {
        displayText.style.display = "none";
        noteTextArea.value = (WA.state.noteText ?? "") as string;
        saveButton.addEventListener("click", () => {
            WA.state.noteText = noteTextArea.value;
        });
    } else {
        editSection.style.display = "none";
        displayText.innerText = (WA.state.noteText ?? 'No messages left') as string;
    }

}).catch(e => console.error(e));

export {};
`
```
The modifications are:

- We add a `editSection` variable that points to the `<div>` containing the edit section of the page.- We add a `displayText` variable that points to the `<div>` containing the text of the note.- We add an `if` statement to check if the player has the `admin` tag. If the player has the `admin` tag, we hide the `displayText` section and display the `editSection` section.- If the player does not have the `admin` tag, we hide the `editSection` section and display the `displayText` section.cautionIt is important to understand that anyone could modify the Javascript code of the page (using the browser developer tools) to remove the authorization checks, or worse, change the
value of the `noteText` variable.

Even if your code makes it impossible for a normal non-admin user to edit the text, an attacker with enough knowledge could still do it.

If you want to secure your `noteText` variable, you should edit the variable in the Tiled map, and add a `writableBy: admin` property to the `noteText` variable object.
When you do this, WorkAdventure will perform security checks on the server-side to ensure that only users with the `admin` tag can modify the variable.

About tagsTags can be added to members of your world from the WorkAdventure dashboard.

The default self-hosted version does not have a dashboard, so does not have this "tags" feature.

Tags:- scripting- tutorial
