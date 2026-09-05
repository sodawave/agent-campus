# Interrupting the OpenAI RealTime API

Source: https://docs.workadventu.re/blog/realtime-api-interrupting-the-model/

In this article, I'm going to describe a very specific thing one must be aware of when implementing the

---

# Interrupting the OpenAI RealTime API

October 20, 2024 · 8 min readDavid NégrierCTO of WorkAdventureIn this article, I'm going to describe a very specific thing one must be aware of when implementing the
OpenAI Realtime API in a project: how to revert the conversation when the user interrupts the model.

When you are chatting with a model using the Realtime API, you receive audio data from OpenAI on a websocket.
The Realtime will generate a response and send audio faster than you can actually play it.

This is especially true when the model is sending long responses.

Just imagine this conversation:

- Hey bot, can you tell me the story of Cinderella?- Of course. Once upon a time, there was a beautiful young girl...- Wait bot! Can you repeat the last sentence?- And they lived happily ever after.What happened? When you say "Wait bot!", you heard only the beginning of the story. But it is not unlikely that the model has already
generated and sent to you the entire story.

So each time there is an interruption of the model, you must revert the conversation to the point where the user interrupted the model.

When you use the `openai/openai-realtime-api-beta` NPM package, the client has a method dedicated to this: `client.cancelResponse`.

Usage:

```
`// id is the id of the item currently being generated
// sampleCount is the number of audio samples that have been heard by the listener
client.cancelResponse(id, sampleCount);
`
```
In this article, we will see how we can modify our previously built AudioWorklet to find the "id" and the "sampleCount"
of the item currently being generated.

infoThis article builds upon the previous article: Creating a WorkAdventure bot using the new OpenAI's Realtime API.
If you haven't read it yet, you should start by this article.

## Tracking when an audio worklet played a sound​

AudioWorklet has a method called `process` that is called each time the AudioWorklet needs to generate audio samples.
We can assume that each time `process` is called, the data returned in the `output` parameter is played.

So each time the process method is called, we can send back to the main process what sample was played via the
postMessage API.

From a pure "developer experience" point of view, we might want to avoid exposing this "msg ID" out of the `OutputPCMStreamer`
method.

Instead, the `OutputPCMStreamer` class already has a `appendPCMData` method that we use to append the PCM data to the
audio worklet. Instead of returning `void`, this method will not return a promise that will resolve when the audio data
is actually played. The "msg ID" will remain internal to the `OutputPCMStreamer` / `OutputAudioWorkletProcessor` classes.

```
`import {Deferred} from "ts-deferred";
import audioWorkletProcessorUrl from "./OutputAudioWorkletProcessor.ts?worker&url";

export class OutputPCMStreamer {
    /**
     * Method to append new PCM data to the audio stream.
     * The promise resolves when the sound is played.
     * @param float32Array
     */
    public appendPCMData(float32Array: Float32Array): Promise<void> {
        //...
    }
}
`
```
When we send a new audio chunk to the audio worklet, we will pass next to the Float32 array a unique ID (auto-incremented).
At the same time, we will create a new `Deferred` object that will be resolved when the audio data is played.

If you are not familiar with the `Deferred` pattern, it is a way to create a promise that you can resolve or reject manually.

```
`import {Deferred} from "ts-deferred";

export class OutputPCMStreamer {
    //...
    // Counter to keep track of the last ID that was sent to the AudioWorkletProcessor
    private currentPcmDataId = 0;
    // A map to store the promises that resolve when the audio data is played
    private readonly audioSentPromises: Map<number, Deferred<void>> = new Map<number, Deferred<void>>();

    /**
     * Method to append new PCM data to the audio stream.
     * The promise resolves when the sound is played. 
     * If the audio buffer is reset with resetAudioBuffer before.
     * the data was played, the promise will reject.
     * @param float32Array
     */
    public appendPCMData(float32Array: Float32Array): Promise<void> {
        // Send the PCM data to the AudioWorkletProcessor via its port
        this.workletNode.port.postMessage({ 
                pcmData: float32Array, 
                id: this.currentPcmDataId
            },
            { 
                transfer: [float32Array.buffer] 
            });
        const deferred = new Deferred<void>();
        this.audioSentPromises.set(this.currentPcmDataId, deferred);
        this.currentPcmDataId++;
        return deferred.promise;
    }
}
`
```
Then we need to modify the `OutputAudioWorkletProcessor` to handle the `id` and return a message on the postMessage API
when the audio data is played.

```
`interface PCMData {
    pcmData: Float32Array;
    id: number;
}

function isPcmData(data: any): data is PCMData {
    return typeof data === "object" && data.pcmData instanceof Float32Array && typeof data.id === "number";
}

class OutputAudioWorkletProcessor extends AudioWorkletProcessor {
    private audioQueue: PCMData[] = [];

    constructor() {
        super();
        this.port.onmessage = (event: MessageEvent) => {
            if (event.data.emptyBuffer === true) {
                this.audioQueue = [];
            } else if (isPcmData(event.data)) {
                this.audioQueue.push(event.data);
            } else {
                console.error("Invalid data type received in worklet", event.data);
            }
        };
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
        const output = outputs[0];
        const outputData = output[0];

        let nextChunk: PCMData | undefined;
        let currentOffset = 0;
        // eslint-disable-next-line no-cond-assign
        while ((nextChunk = this.audioQueue[0])) {
            if (currentOffset + nextChunk.pcmData.length <= outputData.length) {
                outputData.set(nextChunk.pcmData, currentOffset);
                currentOffset += nextChunk.pcmData.length;
                const id = nextChunk.id;
                // Send the acknoledgement back to the main thread
                this.port.postMessage({ playedId: id });
                this.audioQueue.shift();
            } else {
                outputData.set(nextChunk.pcmData.subarray(0, outputData.length - currentOffset), currentOffset);
                this.audioQueue[0].pcmData = nextChunk.pcmData.subarray(outputData.length - currentOffset);
                break;
            }
        }

        return true; // Keep processor alive
    }
}

// Required registration for the worklet
registerProcessor("output-pcm-worklet-processor", OutputAudioWorkletProcessor);
export {};
`
```
Now, each time an audio chunk is played, this message is dispatched to the main thread.

```
`{
    playedId: number;
}
`
```
Back to the main thread, we just need to resolve the promise associated with the `playedId`.

```
`import {Deferred} from "ts-deferred";

export class OutputPCMStreamer {
    //...
    constructor() {
        //...
        this.workletNode.port.onmessage = (event: MessageEvent) => {
            if (typeof event.data === "object" && typeof event.data.playedId === "number") {
                const deferred = this.audioSentPromises.get(event.data.playedId);
                if (deferred) {
                    deferred.resolve();
                    this.audioSentPromises.delete(event.data.playedId);
                }
            }
        };
    }
}
`
```
And that's it for the audio worklet part!

Now, the `appendPCMData` method returns a promise that resolves when the audio data is played.

dangerIt is important to note that one should not `await` the promise returned by `appendPCMData`.
Indeed, if we wait for the audio to be finished before sending the next chunk, we will hear small glitches
between each chunk.

## Reverting the conversation when the user interrupts the model​

Now that we have a way to track when the audio data is played, we can use this information to revert the conversation
when the user interrupts the model.

When the user interrupts the model, in server VAD (voice activity detection) mode, the Realtime API sends a
`conversation.interrupted` event. We will use this event to revert the conversation.

Whenever this happens, we call the `client.cancelResponse` method.

```
`// id is the id of the item currently being generated
// sampleCount is the number of audio samples that have been heard by the listener
client.cancelResponse(id, sampleCount);
`
```
The sampleCount is the number of audio samples that have been heard by the listener. A "sample" here refers to one single value
in the Float32Array that represents the audio data.

```
`let lastAudioMessageItemId: string = "";
let audioSampleCounter = 0;
let lastAudioMessageItemIdPlayed = "";
let audioSampleCounterPlayed = 0;

this.realtimeClient.on('conversation.updated', (event) => {
    if (event.delta.audio) {
        if (event.item.id !== lastAudioMessageItemId) {
            audioSampleCounter = 0;
            lastAudioMessageItemId = event.item.id;
        }
        audioSampleCounter += event.delta.audio.length;

        const int16Array = event.delta.audio;
        // Convert Int16Array to Float32Array as the Web Audio API uses Float32
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0; // Convert 16-bit PCM to float [-1, 1]
        }

        // Assign the variable to const to fix the value when the promise resolves
        const constLastAudioMessageItemId = lastAudioMessageItemId;
        const constAudioSampleCounter = audioSampleCounter;
        
        outputPcmStreamer.appendPCMData(float32Array).then(() => {
            lastAudioMessageItemIdPlayed = constLastAudioMessageItemId;
            audioCounterPlayed = constAudioSampleCounter;
        }).catch(() => {
            // Let's do nothing in case of reject. This happens when we reset the audio buffer.
        });
    }
});

this.realtimeClient.on('conversation.interrupted', (event) => {
    // Let's remove the parts from the conversation that have not been played yet.
    if (lastAudioMessageItemIdPlayed) {
        this.realtimeClient.cancelResponse(lastAudioMessageItemIdPlayed, audioCounterPlayed);
    }

    outputPcmStreamer.resetAudioBuffer();
});
`
```

## Conclusion​

With those changes, we can now revert the conversation to the last point that was heard when the user interrupts the model.

Our bot is now more user-friendly and can handle interruptions gracefully.

In the next article, we will see how we can add support for tools in order to make the bot interact with the world
around it.

Tags:- scripting- tutorial- ai- openai- realtime- bot
