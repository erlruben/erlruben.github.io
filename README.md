# erlruben.github.io

Portfolio of Earl Batenga, game and web developer. Live at https://erlruben.github.io/

Plain HTML, CSS and JavaScript, no build step:

- `index.html`: the page
- `assets/css/style.css`: the CV look, layout and scroll animations
- `assets/js/main.js`: scroll reveals, the timeline, the project filter and the game player
- `games/<name>/`: Unity WebGL builds that play inside the page

## Adding a playable game

1. In Unity, set Player Settings > Publishing Settings > Compression Format to **Disabled**
   (or Gzip with **Decompression Fallback** on). GitHub Pages can't send the headers that compressed builds need.
2. Build for WebGL into `games/<name>/`. Keep each file under 100 MB.
3. On the game's card, add:
   `<button type="button" class="play" data-game="games/<name>/index.html" data-title="Game name">Play here</button>`

To preview locally, run `python -m http.server` in this folder and open http://localhost:8000
(games don't load from a plain file).
