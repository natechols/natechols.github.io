/** this source code is in the public domain
  * natechols 2020-11-28
  * inspired by the classic Mac game Mombasa
  *
  * changelog:
  *   2020-11-28: initial version
  *   2020-12-01: make number of images configurable
  */

// the layout should be a 2d array of "tuples" (so technically a 3d array)
// which represent tile positions as unit (i,j) coordinates (these can be
// fractional, but usually in increments of 0.5).  the outer dimension of
// the array represents layers, starting from the bottom.
function make_board (layout, numImages, tileSize) {
let tileIdx = 0;
const ROWS = 14;
const COLS = 8;
const BOARD_BORDER_X = 0.5;
const BOARD_BORDER_Y = 1;
const OFFSET_3D = tileSize / 10;
const TILE_BORDER = "#000000";
const LAYER_BORDERS = ["#404040", "#606060", "#808080", "#b0b0b0", "#e0e0e0"];
const SELECTED_HIGHLIGHT = 'rgba(0, 0, 0, 0.5)'
const SELECTED_LAYER_HIGHLIGHT = "#000000";

function load_tile_images () {
  const images = [];
  for (let i = 1; i <= numImages; i++) {
    const tileImg = new Image();
    tileImg.src = `images/tiles/tile${i}.jpg`;
    images.push(tileImg);
  }
  return images;
};

function to_screen_pos(n, layer, border) {
  const offset = layer * OFFSET_3D;
  return (border * tileSize) + (n * tileSize) - offset;
};

function make_tile (coords, layer, tileId) {
  return {
    "idx": tileIdx++,
    "tileId": tileId,
    "i": coords[0],
    "j": coords[1],
    "x": to_screen_pos(coords[0], layer, BOARD_BORDER_X),
    "y": to_screen_pos(coords[1], layer, BOARD_BORDER_Y),
    "layer": layer,
    "isActive": true,
    "isSelected": false
  };
}

// https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
function fisher_yates_shuffle (arr) {
  for (let i = arr.length - 1; i >= 1; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmpJ = arr[j];
    arr[j] = arr[i];
    arr[i] = tmpJ;
  }
  console.log(arr);
  return arr;
};

function make_tiles () {
  let nTiles = layout.map((l) => l.length).reduce((a, b) => a + b);
  console.assert(nTiles % 2 == 0, `nTiles=${nTiles}, must be even`);
  const tileIds = [];
  let tileId = 0;
  for (let i = 0; i < nTiles / 2; i++) {
    tileIds.push(tileId);
    tileIds.push(tileId);
    tileId++;
    if (tileId >= numImages) {
      tileId = 0;
    }
  }
  const randomTiles = fisher_yates_shuffle(tileIds);
  const tiles = [];
  let tileIdx = 0;
  for (let i = 0; i < layout.length; i++) {
    const layer = layout[i];
    for (let j = 0; j < layer.length; j++) {
      const tile = make_tile(layer[j], i, randomTiles[tileIdx]);
      tiles.push(tile);
      tileIdx++;
    }
  }
  return tiles;
};

function draw_tile (ctx, tile, images) {
  const img = images[tile.tileId];
  ctx.beginPath();
  ctx.strokeStyle = TILE_BORDER;
  const x = tile.x;
  const y = tile.y;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, tileSize - 2, tileSize - 2);
  // bottom and right tile sides in 3D
  ctx.beginPath();
  if (tile.isSelected) {
    ctx.fillStyle = SELECTED_LAYER_HIGHLIGHT;
  } else {
    ctx.fillStyle = LAYER_BORDERS[tile.layer];
  }
  ctx.lineWidth = 2;
  ctx.moveTo(x, y + tileSize);
  ctx.lineTo(x + OFFSET_3D, y + tileSize + OFFSET_3D);
  ctx.lineTo(x + tileSize + OFFSET_3D, y + tileSize + OFFSET_3D);
  ctx.lineTo(x + tileSize + OFFSET_3D, y + OFFSET_3D);
  ctx.lineTo(x + tileSize, y);
  ctx.lineTo(x + tileSize, y + tileSize);
  ctx.lineTo(x, y + tileSize);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // lower right corner edge
  ctx.beginPath();
  ctx.moveTo(x + tileSize, y + tileSize);
  ctx.lineTo(x + tileSize + OFFSET_3D, y + tileSize + OFFSET_3D);
  ctx.stroke();
  // tile image
  ctx.drawImage(img, x, y, tileSize - 2, tileSize - 2);
  // selection highlight
  if (tile.isSelected) {
    ctx.fillStyle = SELECTED_HIGHLIGHT;
    ctx.fillRect(x, y, tileSize, tileSize);
  }
};

function draw_board (board) {
  const canvas = document.querySelector("canvas");
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  board.tiles.forEach(function (tile) {
    if (tile.isActive) {
      draw_tile(ctx, tile, board.images);
    }
  });
};

function is_inside (tile, x, y) {
  const X_MAX = tile.x + tileSize;
  const Y_MAX = tile.y + tileSize;
  return (x >= tile.x && x <= X_MAX && y >= tile.y && y < Y_MAX);
}

function is_touching_side (tile, other) {
  const J_MAX = other.j + 1;
  return (tile.idx !== other.idx &&
          tile.layer === other.layer &&
          is_overlap(tile.j, other.j) &&
          (tile.i === (other.i + 1) || tile.i === (other.i - 1)));
}

function is_overlap (n1, n2) {
  return (n1 >= n2 && n1 < (n2 + 1)) || (n2 >= n1 && n2 < (n1 + 1));
}

function is_below (tile, other) {
  return (tile.idx !== other.idx &&
          tile.layer < other.layer &&
          is_overlap(tile.i, other.i) &&
          is_overlap(tile.j, other.j));
}

// yes this is N^2, because I'm feeling lazy
function is_selectable(tile, others) {
  const on_side = new Set(
    others.filter(function (other) {
      return is_touching_side(tile, other);
    }).map((t) => t.i)
  );
  const above = others.filter((other) => is_below(tile, other));
  return on_side.size < 2 && above.length === 0;
}

function process_click(board, x, y) {
  let clicked = null;
  // potentstart at the top layer
  const activeTiles = board.tiles.filter((t) => t.isActive);
  for (let i = activeTiles.length - 1; i >= 0; i--) {
    const tile = activeTiles[i];
    if (is_inside(tile, x, y)) {
      if (!is_selectable(tile, activeTiles)) {
        console.log(`tile ${tile.idx} not selectable`);
      } else {
        tile.isSelected = !tile.isSelected;
        clicked = tile;
      }
      break;
    }
  }
  activeTiles.forEach(function (tile) {
    if (clicked === null ||
        (clicked !== null &&
         tile.idx !== clicked.idx &&
         (tile.tileId !== clicked.tileId || !clicked.isSelected))) {
      tile.isSelected = false;
    }
  });
  draw_board(board);
};

function set_status (msg) {
  if (msg !== undefined) {
    document.getElementById("status").textContent = msg;
  } else {
    document.getElementById("status").textContent = " ";
  }
};

function set_score (score) {
  document.getElementById("score").textContent = `${score}`;
}

function update_from_selection(board, cheatMode) {
  const selected = board.tiles.filter((t) => t.isSelected);
  if (selected.length === 2) {
    selected.forEach(function (tile) {
      tile.isSelected = false;
      tile.isActive = false;
      board.score++;
    });
    draw_board(board);
    set_score(board.score);
  } else if (selected.length === 1 && cheatMode === true) {
    const activeTiles = board.tiles.filter((t) => t.isActive);
    const current = selected[0]
    console.log("cheat mode activated!");
    const possible = activeTiles.filter(function (t) {
      return (t.idx != current.idx &&
              t.tileId == current.tileId &&
              is_selectable(t, activeTiles));
    });
    if (possible.length > 0) {
      possible.forEach(function (tile) {
        tile.isSelected = true;
      });
      draw_board(board);
    } else {
      set_status("No available matches");
    }
  } else if (selected.length > 2) {
    console.log("clearing cheat mode");
    selected.forEach((t) => t.isSelected = false);
    draw_board(board);
  }
  const active = board.tiles.filter((t) => t.isActive);
  if (active.length === 0) {
    set_status("YOU WON!  Reload to play again");
  }
};

function setup_events(board) {
  function onMouseDown (evt) {
    set_status();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    console.log("Coordinate x: " + x,
                "Coordinate y: " + y);
    const cheatMode = event.getModifierState("Shift");
    process_click(board, x, y);
    update_from_selection(board, cheatMode);
  };
  const canvas = document.querySelector("canvas");
  canvas.addEventListener("mousedown", onMouseDown);
};

const board = {
  "tiles": make_tiles(),
  "images": load_tile_images(),
  "score": 0,
  "maxScore": 0
};
set_status("Reload to generate a new board with random layout");
set_score(0);
setup_events(board);
draw_board(board);
};
