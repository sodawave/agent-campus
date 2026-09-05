# WorkAdventure Tutorials / Blog

Canonical: https://docs.workadventu.re/blog/

Indexed in codebase-memory as **`workadventure-blog-docs`**.

## Posts

- [Interrupting the OpenAI RealTime API](./realtime-api-interrupting-the-model.md) — https://docs.workadventu.re/blog/realtime-api-interrupting-the-model/
  - In this article, I'm going to describe a very specific thing one must be aware of when implementing the
- [Using OpenAI's RealTime API](./realtime-api.md) — https://docs.workadventu.re/blog/realtime-api/
  - In this article, I'm going to describe our experience creating a WorkAdventure bot using the new OpenAI's Realtime API.
- [Tutorial 6: Developing a bot using Tock.ai](./tock-bot.md) — https://docs.workadventu.re/blog/tock-bot/
  - This tutorial shows you how to use Tock.ai to create a bot that can move around your map and chat with your players.
- [Tutorial 5: Developing a bot using ChatGPT](./gpt-bot.md) — https://docs.workadventu.re/blog/gpt-bot/
  - This tutorial shows you how to use OpenAI's ChatGPT to create a bot that can move around your map and chat with your players.
- [Tutorial 4: Coding a bell](./bell-from-scratch.md) — https://docs.workadventu.re/blog/bell-from-scratch/
  - This tutorial shows you how to create a bell that anyone on a map can ring.
- [Tutorial 3: Closing Doors](./closing-doors.md) — https://docs.workadventu.re/blog/closing-doors/
  - This tutorial shows you how to create doors, which
- [Tutorial 2: Note taking](./note-taking.md) — https://docs.workadventu.re/blog/note-taking/
  - This tutorial shows you how to take notes as an admin and leave it to read for other users.
- [Tutorial 1: Day and Night Effect](./day-and-night.md) — https://docs.workadventu.re/blog/day-and-night/
  - This tutorial shows you how to switch tiles at a specific time of the day.

## Relevance to Agent Campus

- **gpt-bot / tock-bot / realtime-api**: map-script bots that move + talk — prior art for `apps/wa-bridge` MotionMotor + chat (scripting API vs headless JoinRoom).
- **closing-doors / bell / day-and-night / note-taking**: map scripting (zones, audio, variables, time).
- Keep high-frequency motion out of campus-engine; use bridge / map scripts.
- **Do not** deploy these map bots as a second campus agent fleet — embodiment is `apps/wa-bridge` only ([WORKADVENTURE.md](../WORKADVENTURE.md)).

